import { NextResponse } from "next/server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/infrastructure/supabase/server";
import { getSiteOrigin } from "@/infrastructure/supabase/site-origin";

/**
 * Redeems the one-time code from the emailed link and writes the session
 * cookies.
 *
 * This is the only place that can persist the session, because only a Route
 * Handler may set cookies. The exchange uses the secret key, so no Supabase
 * credential is exposed to the browser, and the PKCE verifier cookie written by
 * the magic-link request is read back here by the same client.
 *
 * Redirects to `/admin` on success. A failure lands on the same page with a
 * query flag rather than a rendered error, so nothing about *why* a code was
 * rejected is disclosed to whoever followed the link.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/admin?auth=unavailable", request.url));
  }

  let code: string | null = null;

  try {
    code = new URL(request.url).searchParams.get("code");
  } catch {
    code = null;
  }

  if (code === null || code === "") {
    return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
  }

  const origin = getSiteOrigin(request);

  return NextResponse.redirect(new URL("/admin", origin));
}
