import { createClient } from "@supabase/supabase-js";

import { InMemoryThemeFeedbackRepository } from "@/infrastructure/feedback/in-memory-theme-feedback-repository";
import {
  SupabaseThemeFeedbackRepository,
  type FeedbackClient,
} from "@/infrastructure/feedback/supabase-theme-feedback-repository";
import type { ThemeFeedbackRepository } from "@/application/feedback/theme-feedback-repository";
import { supabaseConfigFromEnv } from "@/infrastructure/supabase/server";

/**
 * Composition root for theme feedback.
 *
 * **Writes use the secret key, deliberately.** The migration grants the
 * anonymous role read access only, so nothing a browser can obtain may write.
 * That is what stops a loop from voting a working theme down a thousand times,
 * and it is why the increment lives on the server where the secret key never
 * reaches the client.
 *
 * When Supabase is not configured — a contributor without an `.env`, CI, a fork
 * — the process-local repository answers instead, so the feature degrades to a
 * no-op rather than breaking the page.
 *
 * Shares `supabaseConfigFromEnv` with the click aggregate and the auth path, so
 * all three agree on what "configured" means. They did not once, and the result
 * was a client built from one variable and no other.
 */
let cached: ThemeFeedbackRepository | null = null;

export async function getThemeFeedbackRepository(): Promise<ThemeFeedbackRepository> {
  if (cached !== null) {
    return cached;
  }

  const config = supabaseConfigFromEnv();

  if (!config.configured) {
    cached = new InMemoryThemeFeedbackRepository();
    return cached;
  }

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as FeedbackClient;

  cached = new SupabaseThemeFeedbackRepository(client);

  return cached;
}
