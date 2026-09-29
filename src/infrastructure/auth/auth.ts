import NextAuth from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";
import type { Session } from "next-auth";

import { adminGateFromEnv, isSyntacticallyValidEmail } from "@/domain/admin";

/**
 * Owner authentication: passwordless magic link over Resend.
 *
 * Security posture, in order of importance:
 *
 * 1. **Passwordless.** No password is ever created, stored or transmitted, so
 *    there is no credential to leak, reuse or phish.
 * 2. **Allowlist enforced before the mail is sent.** The `signIn` callback
 *    rejects any address outside `ADMIN_EMAIL`, so a non-owner never receives a
 *    token and cannot complete the flow even by guessing a callback URL.
 * 3. **The check is exact set membership** on a normalised address — see
 *    `src/domain/admin/admin-identity.ts` for why a substring test is not used.
 * 4. **Fails closed.** With `ADMIN_EMAIL` unset the allowlist is empty, so no
 *    address is authorised rather than every address being authorised.
 * 5. **Same error for "unknown" and "not on the list"**, so the endpoint cannot
 *    be used to discover who the owner is.
 *
 * The provider is only constructed when its key exists, so a contributor
 * building without credentials gets a clear "not configured" state instead of a
 * crash inside the auth library.
 */
function isAuthConfigured(): boolean {
  return (
    typeof process.env.AUTH_SECRET === "string" &&
    process.env.AUTH_SECRET !== "" &&
    typeof process.env.RESEND_API_KEY === "string" &&
    process.env.RESEND_API_KEY !== ""
  );
}

function buildAdapter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return undefined;
  }

  return SupabaseAdapter(createClient(url, key, { auth: { persistSession: false } }) as never);
}

function buildHandler() {
  const gate = adminGateFromEnv();
  const adapter = buildAdapter();

  return NextAuth({
    adapter,
    secret: process.env.AUTH_SECRET,
    // Explicit so a missing secret can never silently fall back to a default
    // derived from the hostname, which is predictable in some deployments.
    trustHost: true,
    session: { strategy: "jwt" },
    pages: { signIn: "/admin" },
    providers: [
      ResendProvider({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
      }),
    ],
    callbacks: {
      /**
       * Runs when the link is requested, before anything is sent.
       *
       * Returning `false` is the refusal. Nothing is written and no mail leaves,
       * which is the point: the allowlist is a gate on token *creation*, not a
       * check after the fact.
       */
      signIn: async ({ user }) => {
        const email = user?.email ?? null;

        if (!isSyntacticallyValidEmail(email ?? "")) {
          return false;
        }

        return gate.isAllowed(email);
      },
      /**
       * Runs on every session read. A session minted before the allowlist
       * changed must stop working, so authorisation is re-derived here rather
       * than trusted from the token.
       */
      session: async ({ session, user }) => {
        if (session.user && !gate.isAllowed(user.email)) {
          // Strip the user rather than throw: the session survives but carries
          // no identity, so every server guard downstream denies by default.
          return { ...session, user: undefined } as unknown as typeof session;
        }

        return session;
      },
    },
  });
}

/**
 * The handler set, or `null` when the provider has no credentials.
 *
 * Exposed through guarded functions rather than destructured at the export
 * boundary: destructuring `undefined` here broke the build of every route that
 * imported it, including on a machine with no credentials at all.
 */
const configured = isAuthConfigured() ? buildHandler() : null;

export const isAuthEnabled = (): boolean => configured !== null;

/** Auth.js request handlers, or a 503 explaining what is missing. */
export async function handlers(request: Request, context: unknown): Promise<Response> {
  if (!configured) {
    return new Response(JSON.stringify({ error: "auth_not_configured" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  return (
    configured.handlers as unknown as (req: Request, ctx: unknown) => Promise<Response>
  )(request, context);
}

/** Current session, or `null` when auth is not configured or nobody is signed in. */
export async function auth(): Promise<Session | null> {
  if (!configured) {
    return null;
  }

  return configured.auth();
}

export type { Session } from "next-auth";
