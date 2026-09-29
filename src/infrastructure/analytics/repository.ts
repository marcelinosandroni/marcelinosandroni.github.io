import { createClient } from "@supabase/supabase-js";

import { InMemoryClickAggregateRepository } from "@/infrastructure/analytics/in-memory-click-repository";
import { SupabaseClickAggregateRepository, type CountableClient } from "@/infrastructure/analytics/supabase-click-repository";
import type { ClickAggregateRepository } from "@/application/analytics/click-aggregate-repository";
import { supabaseConfigFromEnv } from "@/infrastructure/supabase/server";

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

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as CountableClient;

  cached = new SupabaseClickAggregateRepository(client);
  return cached;
}
