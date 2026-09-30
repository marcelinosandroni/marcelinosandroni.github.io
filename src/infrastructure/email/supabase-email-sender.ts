import { EmailDeliveryError, type EmailSender, type MagicLinkMessage } from "@/domain/email";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * Owner sign-in delivered by Supabase's own mailer.
 *
 * The behaviour this adapter has to preserve exactly is the one the endpoint had
 * before the provider became swappable: `signInWithOtp` on a client bound to the
 * request cookies. That binding is not incidental. `@supabase/ssr` writes the
 * PKCE verifier into a cookie when the OTP is requested, and
 * `/api/auth/callback` redeems the code with that same client, so a client built
 * without the cookie store would issue a link whose code cannot be exchanged.
 *
 * The consequence is that this adapter is server-only and cannot be exercised
 * outside a request, which is why the client arrives as a factory: the test
 * hands over a stub and never touches `next/headers`.
 *
 * The translated subject and body are not used here. Supabase renders the
 * message from the template in its dashboard, so there is nowhere for this
 * project's copy to go. That is a real difference between the two adapters and
 * it is stated in the port rather than papered over: swapping to this adapter
 * hands the wording back to Supabase.
 */
export type MagicLinkOtpClient = {
  auth: {
    signInWithOtp(params: {
      email: string;
      options: { emailRedirectTo: string; shouldCreateUser: boolean };
    }): Promise<{ error: { message: string } | null }>;
  };
};

export type MagicLinkOtpClientFactory = () => Promise<MagicLinkOtpClient>;

/** The path the emailed link must land on. Shares the callback route. */
const CALLBACK_PATH = "/api/auth/callback";

export type SupabaseEmailSenderOptions = {
  /** Absolute origin of this deployment, without a trailing slash. */
  readonly origin: string;
  readonly client: MagicLinkOtpClientFactory;
};

export class SupabaseEmailSender implements EmailSender {
  readonly adapterId = "supabase" as const;

  constructor(private readonly options: SupabaseEmailSenderOptions) {}

  async sendMagicLink(message: MagicLinkMessage): Promise<void> {
    const client = await this.options.client();

    const { error } = await client.auth.signInWithOtp({
      email: message.to,
      options: {
        // Absolute, or Supabase rejects the request. Derived from the incoming
        // request origin so local and preview deployments work without a
        // rebuild.
        emailRedirectTo: `${this.options.origin}${CALLBACK_PATH}`,
        /*
         * The owner may not have signed in before, so the user is created on
         * first use. That does make Supabase itself an open sign-up: a stranger
         * can create an account and hold a valid Supabase session.
         *
         * It cannot help them. `/admin` re-derives authorisation from
         * `ADMIN_EMAIL` on every request and this adapter is only reached for an
         * allowlisted address, so the account grants nothing. Disabling open
         * sign-ups in the Supabase dashboard removes the accounts entirely; it
         * is hardening, not the boundary.
         */
        shouldCreateUser: true,
      },
    });

    if (error !== null) {
      throw new EmailDeliveryError("Supabase refused to send the sign-in link.");
    }
  }
}

/** The cookie-bound client, which is what makes the PKCE exchange work. */
export function createMagicLinkOtpClient(): Promise<MagicLinkOtpClient> {
  return createSupabaseServerClient().then((client) => client as unknown as MagicLinkOtpClient);
}
