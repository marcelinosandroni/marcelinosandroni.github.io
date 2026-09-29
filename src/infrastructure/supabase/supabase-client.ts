/**
 * Supabase client for **content reads** — articles, resume versions, PDF
 * artifacts.
 *
 * Uses the publishable key, not the secret key, so every query is still subject
 * to row level security. The migration grants the anonymous role read access
 * deliberately, which means a mistake in a content query returns nothing
 * instead of returning a draft. The secret key bypasses RLS and is reserved for
 * the auth path in `server.ts`.
 *
 * ## Why the client is a getter
 *
 * This used to be `createClient(...)` at module scope, which throws when the
 * URL is missing. The composition root in `repositories/index.ts` probes with
 * `isSupabaseContentConfigured()` before importing an adapter, so the throw was
 * normally unreachable — but "normally" is a bad place to leave a crash, and any
 * new import path would have found it.
 *
 * A caller resolves the client inside the method that queries, not at import
 * time, so a missing configuration throws where the composition root can catch
 * it rather than while a module is being loaded.
 */
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseReadConfig } from "@/infrastructure/supabase/server";

/**
 * Built here and typed from *this* call rather than from `typeof createClient`.
 *
 * `createClient` is generic over the database shape, and `ReturnType` of a
 * generic function resolves the type parameters to their defaults instead of to
 * what the call actually produced. That collapsed the untyped client's schema to
 * `"public"` and made every `.single()` response type `never`.
 */
function makeClient(url: string, publishableKey: string) {
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

type ContentClient = ReturnType<typeof makeClient>;

let cached: ContentClient | null = null;

export function getSupabaseClient(): ContentClient {
  if (cached === null) {
    const { url, publishableKey } = requireSupabaseReadConfig();

    cached = makeClient(url, publishableKey);
  }

  return cached;
}
