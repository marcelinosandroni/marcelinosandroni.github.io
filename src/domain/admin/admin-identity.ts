/**
 * Admin access contract.
 *
 * The single most important property of this module is that authorisation is an
 * **exact set membership test on a normalised address**, never a substring
 * match. `includes("a@b.com")` is true for `xa@b.com` and for
 * `a@b.com.attacker.test`, which is the classic allowlist bypass, so the
 * comparison here is deliberately not written that way.
 *
 * Pure domain: no Next.js, no Auth.js, no environment access. The allowlist
 * arrives as a value, which is what makes the security rules testable without
 * spinning up an auth provider.
 */

/** Environment variable holding the comma-separated allowlist. */
export const ADMIN_EMAIL_ENV = "ADMIN_EMAIL";

export type AdminGate = {
  /** Exact, normalised addresses permitted to sign in. Empty means nobody. */
  readonly allowed: ReadonlySet<string>;
  isAllowed(email: string | null | undefined): boolean;
};

/**
 * Normalises an address for comparison.
 *
 * Lowercased because the domain part is case-insensitive in practice, and
 * trimmed because a stray space in an env file should not silently lock the
 * owner out — nor silently let someone in.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Parses the allowlist.
 *
 * An unset or empty variable yields an **empty** set, not an open door. Failing
 * closed is the only safe default for a configuration that gates an admin area.
 */
export function parseAllowlist(raw: string | null | undefined): ReadonlySet<string> {
  if (typeof raw !== "string" || raw.trim() === "") {
    return new Set<string>();
  }

  // Full syntactic validation, not a `includes("@")` shortcut: a bare "@" or
  // "not-an-email" would otherwise become a member of the allowlist.
  const entries = raw.split(",").map(normalizeEmail).filter(isSyntacticallyValidEmail);

  return new Set(entries);
}

/**
 * Rejects values that cannot be an address before they reach a provider.
 *
 * Kept separate from the membership test so a caller can validate input at the
 * edge without reimplementing normalisation.
 */
export function isSyntacticallyValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createAdminGate(rawAllowlist: string | null | undefined): AdminGate {
  const allowed = parseAllowlist(rawAllowlist);

  return {
    allowed,
    isAllowed: (email) => {
      if (typeof email !== "string") {
        return false;
      }

      const normalised = normalizeEmail(email);

      return normalised !== "" && allowed.has(normalised);
    },
  };
}

/**
 * Gate built from the process environment.
 *
 * Called on the server only. Reading `process.env` is kept here rather than
 * scattered through the auth config so there is exactly one place that decides
 * who the owner is.
 */
export function adminGateFromEnv(env: NodeJS.ProcessEnv = process.env): AdminGate {
  return createAdminGate(env[ADMIN_EMAIL_ENV]);
}

export class NotAdminError extends Error {
  constructor() {
    // Deliberately the same shape for "unknown address" and "not on the
    // allowlist": a distinct error for a non-member would let an unauthenticated
    // caller enumerate who the owner is.
    super("This address is not authorised to sign in.");
    this.name = "NotAdminError";
  }
}
