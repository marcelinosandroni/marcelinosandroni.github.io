import { adminGateFromEnv } from "@/domain/admin";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
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
 *
 * Supabase additionally allows anyone to create an account by default, so
 * point 2 is a convenience and point 3 is the boundary: a stranger who signs
 * up with their own address gets a valid Supabase session and is still refused
 * here. See the note on disabling open sign-ups in `docs/release-process.md`.
 */

export type OwnerSession = {
  readonly email: string;
};

/** Whether this deployment can authenticate anyone at all. */
export function isAuthEnabled(): boolean {
  return isSupabaseConfigured();
}

/**
 * The owner session, or `null`.
 *
 * `getUser()` revalidates against Supabase rather than reading the cookie
 * claims, which is the difference between "the cookie says this person is the
 * owner" and "this person is the owner". A stale or forged cookie fails here.
 */
export async function getOwnerSession(): Promise<OwnerSession | null> {
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
  return adminGateFromEnv().isAllowed(email) && email !== null ? { email } : null;
}
