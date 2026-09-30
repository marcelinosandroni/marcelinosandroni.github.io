/**
 * Click aggregate contract.
 *
 * **What is deliberately not collected**, because this is a portfolio visited by
 * strangers, not a product with a consent banner:
 *
 *  * No coordinates. A click at x=412, y=233 on a known layout maps back to a
 *    specific person's name or email, and a sequence of them reconstructs a
 *    session.
 *  * No viewport size, for the same reason.
 *  * No IP, user agent, referrer, session id or cookie.
 *  * No per-visitor rows of any kind.
 *
 * What is collected is a **counter per element id**, on an allowlist. That
 * answers the only question this data can honestly answer — "do people click the
 * download button?" — while making re-identification impossible rather than
 * merely unlikely.
 *
 * The chat and the console are on the list for the same reason the copilot is: an
 * element id is a fact about a *control*, and a control either gets used or does
 * not. Counting "the conversation panel was opened" is legitimate; counting
 * anything about the person who opened it is not, and nothing on this list
 * carries that.
 */
export const TRACKABLE_ELEMENTS = [
  "download-pdf",
  "download-pdf-template-menu",
  "contact-email",
  "contact-phone",
  "contact-whatsapp",
  "copilot-open",
  "copilot-close",
  "copilot-send",
  "copilot-example",
  "chat-open",
  "chat-close",
  "chat-send",
  "console-start-chat",
  "console-send-reply",
  "console-close-chat",
  "soundtrack-on",
  "soundtrack-off",
  "blog-article",
  "locale-switch",
] as const;

export type TrackableElement = (typeof TRACKABLE_ELEMENTS)[number];

/** Elements are a closed allowlist, so a typo can never invent a new signal. */
export function isTrackableElement(value: unknown): value is TrackableElement {
  return typeof value === "string" && (TRACKABLE_ELEMENTS as readonly string[]).includes(value);
}

export type ClickAggregate = {
  element: TrackableElement;
  count: number;
};

export type ClickAggregates = ReadonlyArray<ClickAggregate>;

/** Hard cap so a traffic spike cannot grow the response without bound. */
export const MAX_AGGREGATE_ROWS = TRACKABLE_ELEMENTS.length;

export class InvalidClickElementError extends Error {
  constructor(value: unknown) {
    super(`Refusing to record a click for an element outside the allowlist: ${String(value)}`);
    this.name = "InvalidClickElementError";
  }
}
