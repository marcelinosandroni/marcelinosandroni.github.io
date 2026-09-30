/**
 * Email delivery contract.
 *
 * This module is the seam that makes the provider swappable. Everything that
 * knows which service actually sends a message lives in `infrastructure/email`;
 * everything that decides *whether* a message should be sent lives in
 * `application/email`. Neither direction is allowed to import the other, so
 * swapping Resend for anything else is an implementation detail rather than a
 * change to the owner sign-in flow.
 *
 * Pure domain: no Next.js, no Supabase, no HTTP, no environment access. A
 * translation key is a value, not a lookup, and an adapter is a name rather
 * than a class.
 */

/** The adapters that exist today. */
export type EmailAdapterId = "resend" | "supabase";

/**
 * Every known adapter, in declaration order.
 *
 * The list is the vocabulary: `isEmailAdapterId` narrows against it, so adding
 * an adapter is a compile-time decision rather than a string that quietly
 * matches nothing.
 */
export const EMAIL_ADAPTER_IDS = [
  "resend",
  "supabase",
] as const satisfies readonly EmailAdapterId[];

/**
 * The adapter used when `EMAIL_SENDER` is unset.
 *
 * Resend, because the owner's decision was to leave Supabase's default SMTP
 * behind, and that service caps the project at roughly two messages an hour.
 * A single-owner site that cannot sign in twice in an afternoon is not signed
 * in. The alternative is still selectable — an unset variable choosing the
 * old behaviour would make a fresh deployment silently un-signable instead.
 */
export const DEFAULT_EMAIL_ADAPTER_ID: EmailAdapterId = "resend";

/** Narrows a raw environment value to a known adapter. */
export function isEmailAdapterId(value: string): value is EmailAdapterId {
  return (EMAIL_ADAPTER_IDS as readonly string[]).includes(value);
}

/**
 * The placeholder the one-time link goes into.
 *
 * A string in the message body rather than a separate field, because the body
 * is translated copy and the link has to sit where the copy puts it. Declared
 * here so the message contract and the substitution live in the same place,
 * and so a test can assert the catalogs still carry it.
 */
export const MAGIC_LINK_PLACEHOLDER = "{link}";

/**
 * One passwordless sign-in message, ready to send.
 *
 * `body` is a template that must contain {@link MAGIC_LINK_PLACEHOLDER}: the
 * link is produced by the adapter, at send time, and cannot be known when the
 * message is described.
 */
export type MagicLinkMessage = {
  /** Recipient. Normalised by the allowlist gate before it reaches here. */
  readonly to: string;
  readonly subject: string;
  /** Plain text, containing {@link MAGIC_LINK_PLACEHOLDER}. */
  readonly body: string;
};

/**
 * The port.
 *
 * One method, not two, and that is a deliberate consequence of supporting both
 * adapters. An adapter that generates the link itself has to be asked to deliver
 * the message, because the link only exists inside the send. The Supabase
 * adapter cannot return a link at all — the link is inside an email that
 * Supabase delivers with its own template. Splitting "make a link" from "send a
 * message" would therefore describe one adapter and force the other to lie
 * about which half it implements.
 *
 * `subject` and `body` are ignored by an adapter whose provider owns the copy.
 * That is stated rather than hidden: the port carries the copy so the adapter
 * that can use it does, and the one that cannot is documented as not using it.
 */
export type EmailSender = {
  readonly adapterId: EmailAdapterId;
  sendMagicLink(message: MagicLinkMessage): Promise<void>;
};

/**
 * Substitutes the one-time link into a translated body.
 *
 * Every occurrence is replaced, because a translated body is free to mention
 * the link twice (once in prose, once as the button's text). Placeholders that
 * are not the link are left alone for the same reason `formatMessage` leaves
 * them: a missing value should be visible rather than silently blank.
 */
export function renderMagicLinkBody(template: string, link: string): string {
  return template.split(MAGIC_LINK_PLACEHOLDER).join(link);
}

/**
 * A message that was not delivered.
 *
 * The message is about the *deployment*, never about the recipient: a provider
 * failure is a missing key, a rejected domain or an outage, and none of those
 * says anything about who the owner is. So the address is never a constructor
 * argument, which is what makes it impossible to interpolate one into a log
 * line or a response body by accident — the error has nowhere to put it.
 */
export class EmailDeliveryError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmailDeliveryError";
  }
}
