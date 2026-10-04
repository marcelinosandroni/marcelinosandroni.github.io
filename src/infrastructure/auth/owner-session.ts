import { ADMIN_EMAIL_ENV, adminGateFromEnv } from "@/domain/admin";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
  type EnvironmentLike,
} from "@/infrastructure/supabase/server";

/**
 * Owner session, read on the server.
 *
 * Replaces Auth.js. The security properties are unchanged and each one is
 * still enforced here rather than delegated:
 *
 * 1. **Passwordless.** Supabase's `signInWithOtp` sends a one-time link. No
 *    password is created, stored, transmitted or phishable.
 * 2. **The allowlist is a gate on token creation.** It is evaluated in the
 *    magic-link route *before* `signInWithOtp` is called, so a non-owner never
 *    causes a message to be sent and cannot complete the flow by guessing a
 *    callback URL.
 * 3. **Exact set membership** on a normalised address — `src/domain/admin`.
 * 4. **Fails closed.** An unset `ADMIN_EMAIL` authorises nobody.
 * 5. **Re-derived on every request.** A session minted before the allowlist
 *    changed stops working immediately, because authorisation is computed here
 *    from the allowlist and never trusted from the token.
 * 6. **No bypass on a deployed build.** `ADMIN_AUTH_BYPASS` opens this area
 *    without a link, and it refuses itself on any Vercel production or preview.
 *    See `bypassRequested` — point 6 is the one that can be turned off by
 *    accident, which is why it does not trust a single variable.
 *
 * Supabase additionally allows anyone to create an account by default, so
 * point 2 is a convenience and point 3 is the boundary: a stranger who signs
 * up with their own address gets a valid Supabase session and is still refused
 * here. See the note on disabling open sign-ups in `docs/release-process.md`.
 */

export type OwnerSession = {
  readonly email: string;
  /**
   * True when the session was granted by the bypass rather than by a provider.
   *
   * Carried rather than inferred, because the page has to be able to *say* that it
   * is showing an unlocked owner area. A development bypass that is invisible on
   * screen is an owner area that looks production-ready while being open to anyone
   * who can reach the URL.
   */
  readonly bypassed: boolean;
};

/**
 * Environment variable that opens the owner area without a sign-in link.
 *
 * Development only, and the name carries the warning and the value carries the
 * switch. This is the one control on the site that can publish, reply to a visitor
 * and read a transcript, so the switch that disables its only boundary has to be
 * impossible to leave on by accident.
 */
export const AUTH_BYPASS_ENV = "ADMIN_AUTH_BYPASS";

/**
 * Whether this deployment has the bypass turned on.
 *
 * ## Why it refuses outside a development build
 *
 * Because the cost of being wrong is not symmetric. A developer who turns this on
 * and forgets pays a confusing afternoon. A deployment that ships with it on publishes
 * the owner's console to anyone who can reach the URL, and there is no session to
 * revoke because there was never a boundary to cross.
 *
 * So the bypass needs two things, not one: the variable set *and* a build that is
 * neither a Vercel production nor a Vercel preview.
 *
 * `VERCEL_ENV` rather than `NODE_ENV`, and the distinction is the whole reason this
 * works at all: Next sets `NODE_ENV=production` for `next start` and in CI, so
 * checking it would refuse the bypass on a laptop running a production build — and in
 * CI, which is the correct answer for both. `VERCEL_ENV` only exists on the platform,
 * so a local `next dev` turns it on with the one flag and nothing else.
 *
 * Previews are refused too, and that is deliberate rather than incidental: a preview
 * is reachable by anyone with the deployment URL and by every Vercel team member, and
 * "it is only a preview" is how a real one ships.
 */
function bypassRequested(env: EnvironmentLike): boolean {
  const requested = env[AUTH_BYPASS_ENV];

  if (typeof requested !== "string" || requested.trim() === "") {
    return false;
  }

  /*
    The same truthiness as the feature flags, and for the same reason: a half-typed
    value is a mistake and a mistake must read as *off*. Note that this runs after
    the quotes are stripped, so `ADMIN_AUTH_BYPASS="on"` set through a loader that
    does not unquote arrives as `"on"` and is refused rather than accepted — which is
    the right way round for a value that opens an admin area, and the reason
    `load-env.ps1` has to strip quotes for this flag to work at all.
   */
  if (!/^(1|true|yes|on)$/i.test(requested.trim())) {
    return false;
  }

  /*
    Both checks, and the order does not matter because either one refusing is enough.

    `VERCEL_ENV` catches the platform, where the whole cost of being wrong is paid by
    the owner rather than by the developer. `isDevelopmentServer` catches the laptop,
    where a production build is indistinguishable from a deployment by any variable
    that is actually set — see the comment on that function for the `.env.local` case
    it closes.
   */
  return (
    env.VERCEL_ENV !== "production" &&
    env.VERCEL_ENV !== "preview" &&
    isDevelopmentServer(env)
  );
}

/**
 * Whether the process is a Next.js build rather than a development server.
 *
 * ## Why this is here and not in `bypassRequested`
 *
 * Because of `.env.local`, and the hole it opened is worth writing down.
 *
 * Next loads `.env.local` **over** the process environment, and `.env.local` is where
 * this flag is meant to live. So a machine with `ADMIN_AUTH_BYPASS=on` in
 * `.env.local` will open the admin area under `next build && next start`, even though
 * that is a production build — and `VERCEL_ENV`, the check that was supposed to catch
 * it, is absent on anything that is not a Vercel deployment. Measured, not assumed:
 *
 *     com .env.local     VERCEL_ENV=production + BYPASS=on  ->  admin ABERTO
 *     sem .env.local     VERCEL_ENV=production + BYPASS=on  ->  admin fechado
 *
 * Same shell, same variables, opposite outcome, and the only difference was a file the
 * developer was never supposed to remove.
 *
 * `next dev` does not run the production build, so refusing it there costs nothing
 * and is what makes the guarantee hold for the case that actually occurs: someone
 * building locally to check a deploy. On the platform this is inert, because a Vercel
 * build is never `next dev` and `VERCEL_ENV` has already refused.
 */
function isDevelopmentServer(env: EnvironmentLike): boolean {
  return env.NODE_ENV === "development";
}

/** Whether the owner area is open without a sign-in link. */
export function isAuthBypassed(env: EnvironmentLike = process.env): boolean {
  return bypassRequested(env);
}

/**
 * Whether this deployment can authenticate anyone at all.
 *
 * Unchanged by the bypass on purpose. The CMS repositories read this same pair, and a
 * bypassed session does not make a missing `SUPABASE_SECRET_KEY` go away. Reporting
 * the deployment as able to authenticate keeps "auth is configured" and "the CMS can
 * be written" the same statement, which is the property the repositories rely on.
 */
export function isAuthEnabled(): boolean {
  return isSupabaseConfigured();
}

/**
 * The owner session, or `null`.
 *
 * `getUser()` revalidates against Supabase rather than reading the cookie claims,
 * which is the difference between "the cookie says this person is the owner" and
 * "this person is the owner". A stale or forged cookie fails here.
 */
export async function getOwnerSession(): Promise<OwnerSession | null> {
  /*
    The bypass comes first and returns before any provider is contacted, so a local
    run needs neither a session cookie nor a verified sender — which is the second
    thing that makes this worth having, because `RESEND_FROM` being absent otherwise
    means a local admin page cannot get past the sign-in form at all.
   */
  if (bypassRequested(process.env)) {
    /*
      The allowlist's own first entry rather than a placeholder. The page prints this
      address, and a panel asserting it is signed in as `local@dev` while the rest of
      the deployment is configured for a real owner is exactly the kind of detail
      that hides a mistake. With an empty allowlist there is no address to borrow, and
      naming the variable that would have supplied one says that without pretending.
     */
    const [first] = adminGateFromEnv().allowed;

    return {
      email: first ?? `${ADMIN_EMAIL_ENV}-unconfigured`,
      bypassed: true,
    };
  }

  if (!isAuthEnabled()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    return null;
  }

  const email = user.email ?? null;

  // Re-derived, never read from the session: the allowlist is the authority,
  // and it is consulted on every request so a change takes effect immediately.
  return adminGateFromEnv().isAllowed(email) && email !== null ? { email, bypassed: false } : null;
}
