import { InMemoryClickAggregateRepository } from "@/infrastructure/analytics/in-memory-click-repository";
import { SupabaseClickAggregateRepository, type CountableClient } from "@/infrastructure/analytics/supabase-click-repository";
import type { ClickAggregateRepository } from "@/application/analytics/click-aggregate-repository";
import { supabaseConfigFromEnv, supabaseRestBase } from "@/infrastructure/supabase/server";
import { createPostgrestClient } from "@/infrastructure/supabase/postgrest";

/**
 * Composition root for click analytics.
 *
 * **Writes use the secret key, deliberately.** The migration grants the
 * anonymous role read access only, so nothing a browser can obtain may write.
 * That is the control that stops a scraper from inflating the counters by
 * posting to this endpoint from a loop, and it is why the increment path lives
 * on the server where the secret key never reaches the client.
 *
 * When Supabase is not configured — a contributor without an `.env`, CI, a fork
 * — the process-local repository answers instead, so the feature degrades to a
 * no-op rather than breaking the page.
 *
 * Configuration comes from `supabaseConfigFromEnv`, the same definition of
 * "configured" the auth path uses. Guarding on the key alone was a real bug
 * once: `createClient` throws on a missing URL, so a machine with the key but no
 * URL failed every write instead of degrading to the local repository. One
 * definition means that class of bug cannot come back in one place and not the
 * other.
 */
let cached: ClickAggregateRepository | null = null;

export async function getClickRepository(): Promise<ClickAggregateRepository> {
  if (cached) {
    return cached;
  }

  const config = supabaseConfigFromEnv();

  if (!config.configured) {
    cached = new InMemoryClickAggregateRepository();
    return cached;
  }

  /*
    `createPostgrestClient` rather than `createClient`.

    `supabase-js` resolves `new URL('rest/v1', url)` against the project URL, so
    against the local stack it asks a port whose PostgREST is mounted at the root
    for a `/rest/v1` that is not there, and every click write failed while the
    page looked fine. `supabaseRestBase` resolves the base once; the cast is the
    same one this line already needed, because the port is narrower than a client
    that cannot know the schema.
  */
  const client = createPostgrestClient(
    supabaseRestBase(config.url),
    config.secretKey,
  ) as unknown as CountableClient;

  cached = new SupabaseClickAggregateRepository(client);
  return cached;
}
