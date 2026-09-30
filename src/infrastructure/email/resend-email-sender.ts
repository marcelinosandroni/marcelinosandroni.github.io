import { createClient } from "@supabase/supabase-js";

import {
  EmailDeliveryError,
  renderMagicLinkBody,
  type EmailSender,
  type MagicLinkMessage,
} from "@/domain/email";
import {
  requireSupabaseConfig,
  type EnvironmentLike,
} from "@/infrastructure/supabase/server";

/**
 * Owner sign-in delivered by Resend.
 *
 * ## Why the link is generated here at all
 *
 * Resend is a delivery service, not an identity provider: it cannot mint a
 * Supabase session and it does not know what a magic link is. So the message is
 * assembled from two halves — Supabase's admin API produces a one-time token,
 * Resend puts it in an envelope. Splitting it this way is what makes the
 * provider swappable, because the token is the only thing Supabase is asked
 * for and the envelope is the only thing Resend is asked for.
 *
 * ## The link lands on the callback as a token hash
 *
 * `auth.admin.generateLink` cannot produce a PKCE link. Its parameters are
 * `data` and `redirectTo` only — no `code_challenge` — so the token it returns
 * is not PKCE-bound, and Supabase's `/verify` issues the redirect for a
 * non-PKCE token in the URL *fragment* with a session in it, not as a `?code=`
 * parameter. A fragment cannot be read by a Route Handler, and a session in a
 * fragment is a session in browser history.
 *
 * So the emailed link is assembled here instead: the callback path, the token
 * hash as `token_hash`, and the type. That is the shape Supabase documents for
 * a custom email template, and it is verifiable server-side — the callback
 * redeems it with `verifyOtp` and never has to trust anything in a URL that the
 * browser could have edited. The cost is that the redemption is a token-hash
 * exchange rather than a PKCE code exchange; see ADR-006.
 *
 * ## The secret key never leaves this file
 *
 * `requireSupabaseConfig` reads the server-side secret key, and the client built
 * from it is created per call and handed to nothing. Neither key is in a
 * `NEXT_PUBLIC_` variable, so neither is in the browser bundle.
 */

/** Environment variable holding the Resend API key. */
export const RESEND_API_KEY_ENV = "RESEND_API_KEY";

/**
 * Environment variable holding the verified sender.
 *
 * Resend will only send from a domain the account has verified, so this is
 * deployment-specific and there is no safe default: an absent value means the
 * adapter cannot send, which is a configuration problem and is reported as one.
 * A friendly name may be included as `Name <address@example.com>`.
 */
export const RESEND_FROM_ENV = "RESEND_FROM";

const RESEND_SEND_ENDPOINT = "https://api.resend.com/emails";

export type ResendConfig =
  | { readonly configured: true; readonly apiKey: string; readonly from: string }
  | { readonly configured: false; readonly reason: string };

function readEnv(env: EnvironmentLike, key: string): string | null {
  const value = env[key];

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Reads the credentials Resend needs, or names what is missing.
 *
 * `reason` names environment variables and nothing else. It is a statement
 * about a deployment, so it is safe to log and safe to act on; it can never
 * contain an address because an address is not an input to this function.
 */
export function resendConfigFromEnv(env: EnvironmentLike = process.env): ResendConfig {
  const apiKey = readEnv(env, RESEND_API_KEY_ENV);
  const from = readEnv(env, RESEND_FROM_ENV);

  if (apiKey === null) {
    return { configured: false, reason: `${RESEND_API_KEY_ENV} is not set` };
  }

  if (from === null) {
    return { configured: false, reason: `${RESEND_FROM_ENV} is not set` };
  }

  return { configured: true, apiKey, from };
}

/**
 * The slice of the Supabase client this adapter uses.
 *
 * Declared structurally, as the click repository does, so the adapter stays
 * testable with a stub and cannot drift into depending on more of the SDK than
 * it calls. The response is narrowed to the one field that is read.
 */
export type MagicLinkAdminClient = {
  auth: {
    admin: {
      generateLink(params: {
        type: "magiclink";
        email: string;
        options?: { redirectTo?: string };
      }): Promise<{
        data: { properties: { hashed_token: string } | null } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/** Builds a client per call, never a module-level singleton. */
export type MagicLinkAdminClientFactory = () => Promise<MagicLinkAdminClient>;

/** The `fetch` shape used to reach Resend, so a test can hand over a stub. */
export type EmailTransport = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number }>;

export type ResendEmailSenderOptions = {
  readonly apiKey: string;
  readonly from: string;
  /** Absolute origin of this deployment, without a trailing slash. */
  readonly origin: string;
  readonly client: MagicLinkAdminClientFactory;
  readonly transport?: EmailTransport;
};

/** The path the emailed link must land on. Shares the callback route. */
const CALLBACK_PATH = "/api/auth/callback";

export class ResendEmailSender implements EmailSender {
  readonly adapterId = "resend" as const;

  constructor(private readonly options: ResendEmailSenderOptions) {}

  async sendMagicLink(message: MagicLinkMessage): Promise<void> {
    const link = await this.createLink(message.to);

    await this.send(renderMagicLinkBody(message.body, link), message);
  }

  /**
   * Asks Supabase for a one-time token, and builds the link the owner clicks.
   *
   * Every failure here throws rather than returning an empty link, because an
   * email with nothing where `{link}` was is worse than no email at all: it
   * looks like a delivered message.
   */
  private async createLink(email: string): Promise<string> {
    const client = await this.options.client();

    const { data, error } = await client.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${this.options.origin}${CALLBACK_PATH}` },
    });

    if (error !== null || data === null || data.properties === null) {
      throw new EmailDeliveryError("Supabase refused to generate a sign-in link.");
    }

    const tokenHash = data.properties.hashed_token;

    if (typeof tokenHash !== "string" || tokenHash === "") {
      throw new EmailDeliveryError("Supabase returned a sign-in link without a token.");
    }

    return `${this.options.origin}${CALLBACK_PATH}?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink`;
  }

  /**
   * Hands the message to Resend's REST API.
   *
   * Plain `fetch` and not the SDK, for one call to one endpoint: the request is
   * a bearer token and a JSON body, so a dependency would add a package to audit
   * and upgrade without removing a line of logic. The same reasoning already
   * kept the resume retriever free of an embedding service.
   *
   * `text` only. A plain-text authentication message renders correctly in every
   * client, and an HTML body would mean escaping a value that is a credential
   * — one link, no markup, one less thing to get subtly wrong.
   *
   * No `Idempotency-Key`: it would be a hash of the request, and the only thing
   * worth hashing here is the address.
   */
  private async send(body: string, message: MagicLinkMessage): Promise<void> {
    // Wrapped rather than referenced: an unbound `fetch` is an illegal
    // invocation in some runtimes, and the cost of the arrow is one line.
    const transport: EmailTransport =
      this.options.transport ?? ((input, init) => fetch(input, init));

    const response = await transport(RESEND_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.options.from,
        to: [message.to],
        subject: message.subject,
        text: body,
      }),
    });

    if (!response.ok) {
      /*
       * The status, never the provider's message body: Resend echoes the
       * recipient in validation errors, and the recipient is the one value that
       * must not reach a log line or a response.
       */
      throw new EmailDeliveryError(`Resend refused the message (status ${response.status}).`);
    }
  }
}

/** Builds the admin client this adapter needs, from the server-side secret key. */
export function createMagicLinkAdminClient(): Promise<MagicLinkAdminClient> {
  const { url, secretKey } = requireSupabaseConfig();

  return Promise.resolve(
    createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }) as unknown as MagicLinkAdminClient,
  );
}
