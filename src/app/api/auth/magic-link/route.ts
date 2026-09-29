import { NextResponse } from "next/server";

import { adminGateFromEnv, isSyntacticallyValidEmail } from "@/domain/admin";
import { isSupabaseConfigured, createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getSiteOrigin } from "@/infrastructure/supabase/site-origin";

/**
 * Requests a passwordless sign-in link.
 *
 * The allowlist is checked here, before `signInWithOtp` is reached, so a
 * non-owner never causes an email to be sent. That is the property that
 * mattered when this endpoint called Resend, and it is preserved exactly: the
 * gate is on token *creation*, not a check afterwards.
 *
 * ## The response is identical either way
 *
 * Both "address allowed" and "address not allowed" return `200` with the same
 * body. A distinct status or a distinct message would let an unauthenticated
 * caller enumerate who the owner is, and the only reason to reach this endpoint
 * is to find that out. The real error is only returned when the *deployment* is
 * misconfigured, which reveals nothing about any address.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "auth_not_configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return accepted();
  }

  if (!isSyntacticallyValidEmail(email)) {
    return accepted();
  }

  if (!adminGateFromEnv().isAllowed(email)) {
    return accepted();
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Must be an absolute URL on this deployment, or Supabase rejects the
      // request. Derived from the request origin so local and preview
      // deployments work without a rebuild.
      emailRedirectTo: `${getSiteOrigin(request)}/api/auth/callback`,
      /*
       * The owner may not have signed in before, so the user is created on
       * first use. That does make Supabase itself an open sign-up: a stranger
       * can create an account and hold a valid Supabase session.
       *
       * It cannot help them. `/admin` re-derives authorisation from
       * `ADMIN_EMAIL` on every request and this endpoint never issued them a
       * link, so the account grants nothing. Disabling open sign-ups in the
       * Supabase dashboard removes the accounts entirely; it is hardening, not
       * the boundary.
       */
      shouldCreateUser: true,
    },
  });

  if (error !== null) {
    // A provider failure is a deployment problem, not a statement about the
    // address, so it is safe to report and useful to surface.
    return NextResponse.json(
      { error: "auth_provider_error" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  return accepted();
}

/** The one response every non-deployed-failure path returns. */
function accepted(): Response {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
