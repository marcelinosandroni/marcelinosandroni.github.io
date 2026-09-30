import { isSyntacticallyValidEmail, type AdminGate } from "@/domain/admin";
import { EmailDeliveryError, type EmailSender } from "@/domain/email";

/**
 * Owner sign-in by email, with the provider left out.
 *
 * The use case knows the allowlist, the rate limit and the copy. It does not
 * know that Resend exists, that Supabase has an admin API, or that either of
 * them is the thing that puts bytes on the wire — that is the port's business,
 * which is what makes this file testable with a fake sender and a fake clock.
 *
 * ## The gate is on the send, not after it
 *
 * The allowlist is consulted *before* the port is called, so a non-allowlisted
 * address never causes a token to be created and never causes an email to be
 * sent. A check afterwards would be worthless: the message would already be out.
 */

/** Requests allowed to reach the provider per window, per instance. */
export const MAGIC_LINK_RATE_LIMIT = 5;

/**
 * How long a rate-limit window lasts.
 *
 * Long enough that a second sign-in attempt is normal rather than a failure,
 * short enough that a mistyped lock-out is forgotten. Five is roughly what one
 * owner needs while an expired link and a stale session are being sorted out.
 */
export const MAGIC_LINK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * A fixed-window counter over the whole endpoint.
 *
 * ## Why there is no key
 *
 * The obvious key is the address, and it is the wrong one. A store keyed by
 * address is a store that holds addresses, and this endpoint is the one place
 * where a list of addresses is exactly what must not exist. It is also the key
 * that protects nothing: only an allowlisted address ever reaches this counter,
 * so a per-address limit would cap the owner and nobody else.
 *
 * A single global window has neither problem. It holds two numbers, so it cannot
 * leak an address even in principle, and it is consulted only after the gate, so
 * a stranger cannot burn the owner's slots by hammering the endpoint.
 *
 * What it reproduces is the property the removed limit actually had: Supabase's
 * SMTP cap was a per-project budget, not a per-address one, and this is a
 * per-instance budget of the same kind.
 *
 * ## What it is not
 *
 * A counter in one server instance's memory. On a deployment that runs several
 * instances the ceiling is per instance and a cold start clears it. That is a
 * weaker guarantee than a shared store would give, and it is acceptable here
 * because the allowlist — not this counter — is what stops a stranger from
 * causing a send.
 */
export class MagicLinkRateLimiter {
  private windowStart: number | null = null;
  private used = 0;

  constructor(
    private readonly limit: number = MAGIC_LINK_RATE_LIMIT,
    private readonly windowMs: number = MAGIC_LINK_RATE_LIMIT_WINDOW_MS,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Claims one slot in the current window.
   *
   * Takes no argument, deliberately: a counter that cannot be given a subject
   * cannot be given an address.
   */
  tryConsume(): boolean {
    const now = this.now();

    if (this.windowStart === null || now - this.windowStart >= this.windowMs) {
      this.windowStart = now;
      this.used = 0;
    }

    if (this.used >= this.limit) {
      return false;
    }

    this.used += 1;

    return true;
  }
}

let sharedLimiter: MagicLinkRateLimiter | undefined;

/**
 * The process-wide limiter.
 *
 * Module scope on purpose: a limiter constructed per request would allow every
 * request. Lazy so a test that wants its own instance is not fighting a counter
 * that already ran.
 */
export function ownerMagicLinkRateLimiter(): MagicLinkRateLimiter {
  sharedLimiter ??= new MagicLinkRateLimiter();

  return sharedLimiter;
}

/** The translated copy for the magic-link message. */
export type MagicLinkCopy = {
  readonly subject: string;
  /** Body template carrying the `{link}` placeholder. */
  readonly body: string;
};

/**
 * The four answers.
 *
 * Every one of them except a delivery failure is a normal outcome of a request
 * that must look identical to the caller. `refused` and `rate-limited` are
 * distinct so the two can be told apart in a test, not so a client can.
 */
export type SendOwnerMagicLinkOutcome =
  | "sent"
  | "refused"
  | "rate-limited"
  | "delivery-failed";

export class SendOwnerMagicLink {
  constructor(
    private readonly sender: EmailSender,
    private readonly gate: AdminGate,
    private readonly copy: MagicLinkCopy,
    private readonly limiter: MagicLinkRateLimiter = new MagicLinkRateLimiter(),
  ) {}

  async execute(email: unknown): Promise<SendOwnerMagicLinkOutcome> {
    if (typeof email !== "string" || !isSyntacticallyValidEmail(email)) {
      return "refused";
    }

    if (!this.gate.isAllowed(email)) {
      return "refused";
    }

    if (!this.limiter.tryConsume()) {
      return "rate-limited";
    }

    try {
      await this.sender.sendMagicLink({
        to: email,
        subject: this.copy.subject,
        body: this.copy.body,
      });
    } catch (error) {
      // A provider failure is a statement about the deployment, so it is worth
      // reporting. Anything else is a bug in an adapter and keeps its own shape
      // rather than being laundered into a 502.
      if (error instanceof EmailDeliveryError) {
        return "delivery-failed";
      }

      throw error;
    }

    return "sent";
  }
}
