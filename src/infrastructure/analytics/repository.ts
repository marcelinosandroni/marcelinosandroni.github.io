import { createClient } from "@supabase/supabase-js";

import { InMemoryClickAggregateRepository } from "@/infrastructure/analytics/in-memory-click-repository";
import { SupabaseClickAggregateRepository, type CountableClient } from "@/infrastructure/analytics/supabase-click-repository";
import type { ClickAggregateRepository } from "@/application/analytics/click-aggregate-repository";

/**
 * Composition root for click analytics.
 *
 * **Writes use a service-role client, deliberately.** The migration grants the
 * anonymous role read access only, so the browser's anon key cannot write. That
 * is the control that stops a scraper from inflating the counters by posting to
 * this endpoint from a loop, and it is why the increment path has to live on the
 * server where the service key never reaches the client.
 *
 * When Supabase is not configured — a contributor without an `.env`, CI, a fork
 * — the process-local repository answers instead, so the feature degrades to a
 * no-op rather than breaking the page.
 */
/**
 * Both values are required. Guarding on the service key alone was a real bug:
 * `createClient` throws on a missing URL, so a machine with the key but no URL
 * failed every single write instead of degrading to the local repository.
 */
function hasServiceRole(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    typeof url === "string" && url !== "" &&
    typeof key === "string" && key !== ""
  );
}

let cached: ClickAggregateRepository | null = null;

export async function getClickRepository(): Promise<ClickAggregateRepository> {
  if (cached) {
    return cached;
  }

  if (!hasServiceRole()) {
    cached = new InMemoryClickAggregateRepository();
    return cached;
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  ) as unknown as CountableClient;

  cached = new SupabaseClickAggregateRepository(client);
  return cached;
}
