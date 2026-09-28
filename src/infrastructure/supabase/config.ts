/**
 * Side-effect-free Supabase configuration probe.
 *
 * Deliberately separate from `supabase-client.ts`: that module calls
 * `createClient` at import time, which throws when the URL is missing. Keeping
 * the probe on its own lets the composition root ask "is the database
 * configured?" *before* deciding to load the adapter, so a build machine without
 * credentials never touches the client and never fails.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return typeof url === "string" && url !== "" && typeof key === "string" && key !== "";
}
