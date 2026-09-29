/**
 * Contact channel helpers.
 *
 * The site offers email and WhatsApp everywhere, so the two links must be derived
 * from one phone number and one address rather than hand-written twice. A
 * mistyped `wa.me` link is the kind of defect that survives review, ships, and
 * costs a real conversation.
 */

/**
 * Digits-only form required by `wa.me`: country code, no `+`, no spaces and no
 * punctuation. A local number without a country code silently routes the message
 * to nobody, so a missing `+` is treated as an error rather than tolerated.
 */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10) {
    throw new Error(`Phone number cannot form a WhatsApp link: ${phone}`);
  }

  return digits;
}

/** Click-to-chat link, with an optional prefilled message. */
export function toWhatsAppHref(phone: string, message?: string): string {
  const base = `https://wa.me/${toWhatsAppNumber(phone)}`;

  if (!message) {
    return base;
  }

  return `${base}?text=${encodeURIComponent(message)}`;
}
