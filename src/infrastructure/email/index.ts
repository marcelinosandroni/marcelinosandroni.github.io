import {
  DEFAULT_EMAIL_ADAPTER_ID,
  isEmailAdapterId,
  type EmailAdapterId,
  type EmailSender,
} from "@/domain/email";
import {
  createMagicLinkAdminClient,
  resendConfigFromEnv,
  ResendEmailSender,
  RESEND_API_KEY_ENV,
  RESEND_FROM_ENV,
} from "./resend-email-sender";
import {
  createMagicLinkOtpClient,
  SupabaseEmailSender,
} from "./supabase-email-sender";
import { type EnvironmentLike } from "@/infrastructure/supabase/server";

/**
 * Composition root for email delivery.
 *
 * The only place in the codebase that knows both adapters exist. Everything
 * else asks for an {@link EmailSender} and gets one, which is what makes
 * swapping a configuration change rather than a refactor.
 */

/** Environment variable selecting the adapter. */
export const EMAIL_SENDER_ENV = "EMAIL_SENDER";

/**
 * The wired adapter, or why this deployment cannot have one.
 *
 * `configured: false` is a statement about environment variables, so it is safe
 * to surface as a `503`: it names the deployment and never the request. An
 * unrecognised selector resolves to the default *and* is reported, because
 * silently falling back would leave a deployment running an adapter nobody
 * chose.
 */
export type EmailSenderResolution =
  | { readonly configured: true; readonly adapterId: EmailAdapterId; readonly sender: EmailSender }
  | { readonly configured: false; readonly adapterId: EmailAdapterId; readonly reason: string };

export type GetEmailSenderOptions = {
  /**
   * Absolute origin of the deployment answering the request.
   *
   * Passed in rather than read from the environment because the redirect has to
   * point at whichever origin is serving — a local run and a preview deployment
   * are both correct answers, and a constant would be wrong for one of them.
   */
  readonly origin: string;
};

export function getEmailSender(
  options: GetEmailSenderOptions,
  env: EnvironmentLike = process.env,
): EmailSenderResolution {
  const requested = env[EMAIL_SENDER_ENV];
  const selector = typeof requested === "string" ? requested.trim().toLowerCase() : "";

  if (selector !== "" && !isEmailAdapterId(selector)) {
    return {
      configured: false,
      adapterId: DEFAULT_EMAIL_ADAPTER_ID,
      reason: `${EMAIL_SENDER_ENV}="${selector}" is not a known adapter`,
    };
  }

  const adapterId: EmailAdapterId = isEmailAdapterId(selector) ? selector : DEFAULT_EMAIL_ADAPTER_ID;

  if (adapterId === "resend") {
    const config = resendConfigFromEnv(env);

    if (!config.configured) {
      return { configured: false, adapterId, reason: config.reason };
    }

    return {
      configured: true,
      adapterId,
      sender: new ResendEmailSender({
        apiKey: config.apiKey,
        from: config.from,
        origin: options.origin,
        client: createMagicLinkAdminClient,
      }),
    };
  }

  /*
   * The Supabase adapter needs no credentials of its own: the same secret key
   * that makes the whole auth path work is what it sends with. If that key is
   * missing the endpoint has already answered `auth_not_configured` before
   * reaching this, so there is nothing further to check.
   */
  return {
    configured: true,
    adapterId,
    sender: new SupabaseEmailSender({
      origin: options.origin,
      client: createMagicLinkOtpClient,
    }),
  };
}

export {
  RESEND_API_KEY_ENV,
  RESEND_FROM_ENV,
  ResendEmailSender,
  SupabaseEmailSender,
  resendConfigFromEnv,
};
export type {
  EmailTransport,
  MagicLinkAdminClient,
  MagicLinkAdminClientFactory,
  ResendConfig,
  ResendEmailSenderOptions,
} from "./resend-email-sender";
export type { MagicLinkOtpClient, MagicLinkOtpClientFactory, SupabaseEmailSenderOptions } from "./supabase-email-sender";
