import { NextResponse } from "next/server";

import { createSupabaseServerClient, isSupabaseConfigured } from "@/infrastructure/supabase/server";
import { getSiteOrigin } from "@/infrastructure/supabase/site-origin";

/**
 * Redeems the emailed link and writes the session cookies.
 *
 * This is the only place that can persist the session, because only a Route
 * Handler may set cookies. The exchange uses the secret key, so no Supabase
 * credential is exposed to the browser.
 *
 * ## Two link shapes, because there are two adapters
 *
 * `?code=` is the PKCE shape. The cookie-bound `@supabase/ssr` client writes the
 * verifier during the magic-link request and reads it back here through
 * `exchangeCodeForSession`. That is the `supabase` email adapter, unchanged.
 *
 * `?token_hash=&type=` is the shape GoTrue documents for a *custom* email
 * template, and it is what the `resend` adapter can actually produce. The
 * `generateLink` admin call takes only `{ data, redirectTo }` — there is no
 * `code_challenge` parameter and none is sent — so it cannot mint a PKCE code. GoTrue
 * decides the redirect shape from the token prefix, and a non-PKCE token puts the
 * session in the URL **fragment**, which the browser never sends to the server and
 * which would leave a session sitting in history.
 *
 * So the default adapter builds a `token_hash` link and redeems it here with
 * `verifyOtp`. That method takes the token directly and needs no cookie, which is
 * exactly why it is the only thing that can work without a verifier this route
 * never had.
 *
 * Both branches set the session cookies through the same cookie-bound client, and
 * both fail to the same `?auth=failed`, so nothing about *why* a link was rejected
 * is disclosed to whoever followed it.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/admin?auth=unavailable", request.url));
  }

  let params: URLSearchParams;
  try {
    params = new URL(request.url).searchParams;
  } catch {
    return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
  }

  const supabase = await createSupabaseServerClient();

  // The custom-template shape, and the one the default adapter sends.
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  if (tokenHash !== null && tokenHash !== "" && type === "magiclink") {
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });

    if (error !== null) {
      return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
    }

    return NextResponse.redirect(new URL("/admin", getSiteOrigin(request)));
  }

  // The PKCE shape, from the Supabase adapter.
  const code = params.get("code");

  if (code === null || code === "") {
    return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    return NextResponse.redirect(new URL("/admin?auth=failed", request.url));
  }

  const origin = getSiteOrigin(request);

  return NextResponse.redirect(new URL("/admin", origin));
}
