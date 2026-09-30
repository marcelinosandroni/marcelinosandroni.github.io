import { isLocale, type Locale } from "@/domain/i18n";
import { isPresenceSessionId, type PresenceSessionId } from "@/domain/presence/presence";

/**
 * The conversation contract.
 *
 * ## The owner starts it
 *
 * A visitor is not offered a chat. The owner opens a conversation with a session
 * first, and only then does that visitor's widget exist. The rule is
 * {@link shouldOfferChat}, it is a function of the conversation's state and
 * nothing else, and there is no code path from a visitor to a state that passes
 * it — {@link startConversation} is the only constructor and it takes no author.
 *
 * This is a product decision with a privacy reason behind it. A chat box on
 * every page of a portfolio is an invitation to write to a stranger, and the
 * stranger's reply — "no thanks" — is content this site would then be holding on
 * to. Offering the channel only to somebody the owner has already decided to talk
 * to means the *existence* of a conversation is itself the owner's decision, and
 * the cost of saying nothing is that nobody has to be told they were ignored.
 *
 * ## Agent Smith
 *
 * A visitor who writes and then watches nothing happen for two minutes is
 * reading a site where the person they addressed is not there. The reply that
 * appears says so, says it is automatic, and is structurally incapable of being
 * mistaken for the owner:
 *
 * 1. It is a different author. `author: "agent"` is a value the owner's own send
 *    path cannot produce, so nothing in the UI keys off the *text* to decide who
 *    is speaking.
 * 2. {@link composeAgentMessage} refuses to build a message without a non-empty
 *    notice, so there is no code path that posts an unlabelled one. The notice is
 *    supplied by the message catalog, which is also what makes it translatable.
 * 3. The database has the same rule as a check constraint, so the guarantee
 *    survives a future implementation that skips the domain.
 *
 * What it will not do is answer as the owner, guess at an answer, or pretend to
 * be a person. It acknowledges the queue and says when to expect the real one.
 */

/* -------------------------------------------------------------------------
 * Messages
 * ---------------------------------------------------------------------- */

/**
 * Who is speaking.
 *
 * Three values, because "a person wrote this" is not a fact this system can make
 * for every message, and the honest answer has to be representable. `owner` and
 * `visitor` are the humans; `agent` is the queue speaking for itself.
 */
export const MESSAGE_AUTHORS = ["visitor", "owner", "agent"] as const;

export type MessageAuthor = (typeof MESSAGE_AUTHORS)[number];

export function isMessageAuthor(value: unknown): value is MessageAuthor {
  return typeof value === "string" && (MESSAGE_AUTHORS as readonly string[]).includes(value);
}

/** The two authors a person can be. `agent` is deliberately not one of them. */
export const HUMAN_AUTHORS = ["visitor", "owner"] as const;

export type HumanAuthor = (typeof HUMAN_AUTHORS)[number];

/** Whether a message was written by a person, as opposed to by the queue. */
export function isHumanMessage(message: Pick<ChatMessage, "author">): boolean {
  return (HUMAN_AUTHORS as readonly string[]).includes(message.author);
}

/**
 * How long a message may be, in characters.
 *
 * A thousand is about a paragraph. Long enough to say something real — a link to
 * a repository, a sentence about a role — and short enough that a transcript is
 * still readable on a phone and cannot be used as a free-text channel for
 * something that is not a message. Mirrored by a `check` constraint in the
 * migration so the bound is not only a client-side one; the test asserts the two
 * agree.
 */
export const MAX_MESSAGE_LENGTH = 1000;

/** How long the *notice* on an automated message may be. Short on purpose. */
export const MAX_AUTOMATED_NOTICE_LENGTH = 200;

/** How many messages one transcript read can return. */
export const MAX_TRANSCRIPT_MESSAGES = 100;

/** How many messages the owner's console shows per conversation. */
export const CONSOLE_TRANSCRIPT_LIMIT = 20;

/** How many conversations one console read can return. */
export const MAX_OPEN_CONVERSATIONS = 50;

/**
 * One message.
 *
 * `automatedNotice` is the anti-impersonation field: non-null exactly when the
 * author is `agent`, and never null when it is. The UI renders it as a visible
 * label above the body, and the domain will not construct an agent message
 * without one.
 */
export type ChatMessage = {
  readonly id: string;
  readonly sessionId: PresenceSessionId;
  readonly author: MessageAuthor;
  readonly body: string;
  /** Epoch milliseconds, as every other time in this codebase's domain. */
  readonly sentAt: number;
  /** Required on an `agent` message, `null` on every other. */
  readonly automatedNotice: string | null;
};

/* -------------------------------------------------------------------------
 * Body validation
 * ---------------------------------------------------------------------- */

export const MESSAGE_BODY_ISSUES = ["empty", "too_long", "not_a_string"] as const;

export type MessageBodyIssue = (typeof MESSAGE_BODY_ISSUES)[number];

export class InvalidChatMessageError extends Error {
  constructor(
    readonly issue: MessageBodyIssue,
    readonly receivedLength: number,
  ) {
    super(`Refusing a chat message (${issue}); received ${receivedLength} characters`);
    this.name = "InvalidChatMessageError";
  }
}

/**
 * The only path by which a message body becomes a message body.
 *
 * Trimmed, because leading whitespace in a transcript is noise, and normalised to
 * a single line break so a paragraph typed in a textarea cannot smuggle a form
 * feed or a bidirectional control into the log. The length check runs on the
 * *received* value, before trimming, so a body of a million spaces is refused
 * rather than quietly becoming an empty message.
 *
 * The return value is a `string` and not `string | null`: this either returns a
 * usable body or throws, so a caller cannot forget to check.
 */
export function normaliseMessageBody(value: unknown): string {
  if (typeof value !== "string") {
    throw new InvalidChatMessageError("not_a_string", 0);
  }

  if (value.length > MAX_MESSAGE_LENGTH) {
    throw new InvalidChatMessageError("too_long", value.length);
  }

  const normalised = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalised === "") {
    throw new InvalidChatMessageError("empty", value.length);
  }

  return normalised;
}

/* -------------------------------------------------------------------------
 * The automatic reply
 * ---------------------------------------------------------------------- */

/**
 * How long the owner has before the queue answers.
 *
 * Two minutes. Long enough that an owner who is present and simply slow does not
 * get talked over, short enough that a visitor has not given up and closed the
 * tab. Anything longer is a person reading a message from someone who left; the
 * honest reply is the one that says so.
 */
export const AUTO_REPLY_AFTER_MS = 2 * 60_000;

/**
 * The name the automated author is shown under.
 *
 * A proper noun, and deliberately *not* translatable: the same argument
 * `tests/unit/i18n/dictionaries.test.ts` makes for "blog" in pt-BR. A machine
 * that calls itself a different name in each language is harder to recognise as
 * one machine, and the whole job of this label is to be recognisable. The
 * sentence around it — the part that says what it is — is translated.
 */
export const AGENT_AUTHOR_LABEL = "Agent Smith";

export class MissingAutomatedNoticeError extends Error {
  constructor() {
    super(
      "Refusing to post an automated message without a notice: an automatic reply that cannot be identified as automatic is an impersonation.",
    );
    this.name = "MissingAutomatedNoticeError";
  }
}

/** The label and the text the automatic reply is composed from. */
export type AgentReply = {
  /** Shown as a badge above the body. Must not be blank. */
  readonly notice: string;
  readonly body: string;
};

/**
 * Builds the automatic message.
 *
 * The only constructor for an `agent` message, and the reason the guarantee holds
 * is the throw: a caller that has no translated notice — a missing catalog entry,
 * a bug, a future refactor that inlines the string — gets an exception rather than
 * a message indistinguishable from the owner's. That is the failure mode worth
 * designing for, because it is the one that is invisible in review.
 */
export function composeAgentMessage(input: {
  readonly id: string;
  readonly sessionId: PresenceSessionId;
  readonly body: string;
  readonly notice: string;
  readonly at: number;
}): ChatMessage {
  const notice = input.notice.trim();

  if (notice === "" || notice.length > MAX_AUTOMATED_NOTICE_LENGTH) {
    throw new MissingAutomatedNoticeError();
  }

  const body = normaliseMessageBody(input.body);

  return {
    id: input.id,
    sessionId: input.sessionId,
    author: "agent",
    body,
    sentAt: input.at,
    automatedNotice: notice,
  };
}

/** Builds a message a person wrote. Refuses to carry a label. */
export function composeHumanMessage(input: {
  readonly id: string;
  readonly sessionId: PresenceSessionId;
  readonly author: HumanAuthor;
  readonly body: string;
  readonly at: number;
}): ChatMessage {
  return {
    id: input.id,
    sessionId: input.sessionId,
    author: input.author,
    body: normaliseMessageBody(input.body),
    sentAt: input.at,
    automatedNotice: null,
  };
}

/**
 * Whether a message from the database is one this contract can render.
 *
 * Every field arrives as `unknown` from PostgREST, and this is the same distrust
 * the CMS adapter shows: a row that cannot be trusted into the shape is dropped
 * rather than rendered with holes in it.
 */
export function toChatMessage(row: unknown): ChatMessage | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }

  const record = row as Record<string, unknown>;
  const id = record.id;
  const sessionId = record.session_id;
  const author = record.author;
  const body = record.body;
  const sentAt = typeof record.sent_at === "string" ? Date.parse(record.sent_at) : Number.NaN;
  const notice = record.automated_notice;

  if (typeof id !== "string" || !isPresenceSessionId(sessionId) || !isMessageAuthor(author)) {
    return null;
  }

  if (typeof body !== "string" || body.trim() === "" || body.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  if (Number.isNaN(sentAt)) {
    return null;
  }

  /*
   * The agent rule, applied to a row rather than to a constructor: an automated
   * message with no notice is not rendered with the notice missing, it is not
   * rendered at all. A transcript that silently omits a message is confusing; a
   * transcript that shows an unlabelled one under the owner's name is the thing
   * this module exists to prevent.
   */
  if (author === "agent") {
    return typeof notice === "string" && notice.trim() !== ""
      ? {
          id,
          sessionId,
          author,
          body,
          sentAt,
          automatedNotice: notice.trim(),
        }
      : null;
  }

  return { id, sessionId, author, body, sentAt, automatedNotice: null };
}

/* -------------------------------------------------------------------------
 * The conversation
 * ---------------------------------------------------------------------- */

/**
 * `unopened` is the state every conversation is in until the owner opens it, and
 * it is the state a visitor can never move it out of.
 */
export const CONVERSATION_STATES = ["unopened", "open", "closed"] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export function isConversationState(value: unknown): value is ConversationState {
  return typeof value === "string" && (CONVERSATION_STATES as readonly string[]).includes(value);
}

/**
 * One conversation, as the domain holds it.
 *
 * Every timestamp is nullable because they are set by different events, and the
 * nullable ones are the ones with rules: no `lastVisitorAt` means nobody has
 * written, so nothing is owed an answer.
 *
 * `visitorLocale` is the locale of the *first* visitor message and it is what the
 * automatic reply is written in. That is not a detail: an automatic reply is
 * posted by whichever party reads the conversation next, and if the text followed
 * the reader, a Portuguese visitor whose owner opened the console in English
 * would be answered in English by a robot. Pinning it to the message that caused
 * the reply makes that impossible.
 */
export type Conversation = {
  readonly sessionId: PresenceSessionId;
  readonly state: ConversationState;
  readonly openedAt: number | null;
  readonly closedAt: number | null;
  readonly visitorLocale: Locale | null;
  readonly lastVisitorAt: number | null;
  readonly lastOwnerReplyAt: number | null;
  /** The visitor message the last automatic reply answered, or `null`. */
  readonly autoRepliedToAt: number | null;
  readonly updatedAt: number;
};

/** A conversation as the owner's console lists it. */
export type ConversationSummary = Conversation & {
  readonly messages: ReadonlyArray<ChatMessage>;
};

/**
 * **The owner-initiates rule.**
 *
 * A chat is offered to a visitor if and only if the owner has opened the
 * conversation and it has not been closed. Three inputs, no parameters, no flags:
 * the state is the only thing that can change it, and the only writer of `open`
 * is {@link startConversation}.
 *
 * A closed conversation reads as not offered. Re-opening is a deliberate act by
 * the owner, so a visitor cannot be walked back into a channel the owner has
 * ended.
 */
export function shouldOfferChat(conversation: Conversation): boolean {
  return conversation.state === "open";
}

/**
 * Opens a conversation. Owner-only by construction: it takes no author and no
 * capability, so a visitor-facing use case cannot call it and claim a chat.
 */
export function startConversation(sessionId: PresenceSessionId, at: number): Conversation {
  if (!isPresenceSessionId(sessionId)) {
    throw new TypeError(`Refusing to open a conversation for an invalid session: ${sessionId}`);
  }

  return {
    sessionId,
    state: "open",
    openedAt: at,
    closedAt: null,
    visitorLocale: null,
    lastVisitorAt: null,
    lastOwnerReplyAt: null,
    autoRepliedToAt: null,
    updatedAt: at,
  };
}

/**
 * Closes a conversation.
 *
 * A state change rather than a delete, and the distinction matters in the other
 * direction too: the transcript is not erased by the owner losing interest, so
 * "close" means "stop answering" and not "erase what was said". A visitor who
 * reloads afterwards is offered nothing and the words they already sent are still
 * theirs.
 */
export function closeConversation(conversation: Conversation, at: number): Conversation {
  return { ...conversation, state: "closed", closedAt: at, updatedAt: at };
}

/** Records that the visitor wrote, and the locale they were reading in. */
export function recordVisitorMessage(
  conversation: Conversation,
  at: number,
  locale: Locale,
): Conversation {
  return {
    ...conversation,
    lastVisitorAt: at,
    // First write wins: the automatic reply is owed in the language of the
    // message that triggered it, and that decision must not move afterwards.
    visitorLocale: conversation.visitorLocale ?? locale,
    updatedAt: at,
  };
}

/** Records that the owner answered. This is what cancels a pending reply. */
export function recordOwnerReply(conversation: Conversation, at: number): Conversation {
  return { ...conversation, lastOwnerReplyAt: at, updatedAt: at };
}

/** Records that the queue answered, and which message it answered. */
export function recordAutoReply(conversation: Conversation, at: number): Conversation {
  return {
    ...conversation,
    autoRepliedToAt: conversation.lastVisitorAt,
    updatedAt: at,
  };
}

/** Whether a row from the database is a conversation this contract can use. */
export function toConversation(row: unknown): Conversation | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }

  const record = row as Record<string, unknown>;
  const sessionId = record.session_id;
  const state = record.state;

  if (!isPresenceSessionId(sessionId) || !isConversationState(state)) {
    return null;
  }

  const locale = typeof record.visitor_locale === "string" ? record.visitor_locale : null;
  const updatedAt = readTimestamp(record.updated_at);

  if (updatedAt === null) {
    return null;
  }

  return {
    sessionId,
    state,
    openedAt: readTimestamp(record.opened_at),
    closedAt: readTimestamp(record.closed_at),
    visitorLocale: locale !== null && isLocale(locale) ? locale : null,
    lastVisitorAt: readTimestamp(record.last_visitor_at),
    lastOwnerReplyAt: readTimestamp(record.last_owner_reply_at),
    autoRepliedToAt: readTimestamp(record.auto_replied_to_at),
    updatedAt,
  };
}

function readTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? null : parsed;
}

/* -------------------------------------------------------------------------
 * When the queue answers
 * ---------------------------------------------------------------------- */

export const AUTO_REPLY_REASONS = [
  "no-visitor-message",
  "not-open",
  "owner-replied",
  "already-answered",
  "too-soon",
  "due",
] as const;

export type AutoReplyReason = (typeof AUTO_REPLY_REASONS)[number];

export type AutoReplyDecision = {
  readonly due: boolean;
  readonly reason: AutoReplyReason;
  /**
   * The visitor message being answered, when one is owed. `null` unless
   * `reason === "due"`, so a caller cannot compose a reply for a message that
   * does not exist.
   */
  readonly answeringVisitorMessageAt: number | null;
};

/**
 * Decides whether Agent Smith owes a reply.
 *
 * The rules, in the order they are decided:
 *
 * 1. Nothing to answer — no visitor has written.
 * 2. The conversation is not open — a closed thread gets no new messages, not
 *    even an honest one.
 * 3. **A person already answered.** This is the rule that matters most: the
 *    moment the owner replies, the queue owes nothing. A robot talking over a
 *    human is worse than silence.
 * 4. Already answered for this message — at most one automatic reply per visitor
 *    message, ever, including if the visitor sends three in a row.
 * 5. Too soon — under {@link AUTO_REPLY_AFTER_MS}.
 * 6. Due.
 *
 * Rule 3 is written as "the owner's last reply is at or after the visitor's last
 * message" rather than as a flag, so a clock that disagrees between two servers
 * cannot leave a stale "pending" marker claiming a reply is still owed.
 */
export function autoReplyDecision(conversation: Conversation, now: number): AutoReplyDecision {
  const lastVisitorAt = conversation.lastVisitorAt;

  if (lastVisitorAt === null) {
    return { due: false, reason: "no-visitor-message", answeringVisitorMessageAt: null };
  }

  if (!shouldOfferChat(conversation)) {
    return { due: false, reason: "not-open", answeringVisitorMessageAt: null };
  }

  if (conversation.lastOwnerReplyAt !== null && conversation.lastOwnerReplyAt >= lastVisitorAt) {
    return { due: false, reason: "owner-replied", answeringVisitorMessageAt: null };
  }

  if (conversation.autoRepliedToAt !== null && conversation.autoRepliedToAt >= lastVisitorAt) {
    return { due: false, reason: "already-answered", answeringVisitorMessageAt: null };
  }

  if (now - lastVisitorAt < AUTO_REPLY_AFTER_MS) {
    return { due: false, reason: "too-soon", answeringVisitorMessageAt: null };
  }

  return { due: true, reason: "due", answeringVisitorMessageAt: lastVisitorAt };
}

/* -------------------------------------------------------------------------
 * Rate limits
 * ---------------------------------------------------------------------- */

export type RateLimitPolicy = {
  /** How many messages are allowed inside one window. */
  readonly limit: number;
  readonly windowMs: number;
};

/**
 * The visitor's limit: five messages a minute.
 *
 * Generous for a conversation — nobody types five paragraphs a minute — and low
 * enough that a script cannot use the owner's console as a bulk sender. The
 * number is passed down to the database function rather than hardcoded there, so
 * there is one place where the policy exists and the two cannot disagree.
 */
export const VISITOR_RATE_LIMIT: RateLimitPolicy = { limit: 5, windowMs: 60_000 };

/**
 * The owner's limit: sixty a minute.
 *
 * Effectively a guard against a stuck key rather than a constraint on a person
 * typing. An owner who somehow exceeds it has a key stuck down, and refusing the
 * message is better than writing a thousand of them.
 */
export const OWNER_RATE_LIMIT: RateLimitPolicy = { limit: 60, windowMs: 60_000 };

export type RateLimitDecision =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

/**
 * What the repository observed for this session in the current window.
 *
 * `count` is **already scoped to the window** — the port asks for the messages
 * since `now - windowMs` and counts those — so the limit is a sliding window
 * rather than a bucket that refills on a boundary. `oldestAt` is the oldest of
 * those counted messages, because that is the one that leaves the window first
 * and therefore the one `Retry-After` has to be computed from.
 *
 * It is nullable because a count with no timestamps cannot produce a meaningful
 * wait, and guessing a short one would let a client hammer a rate limiter that is
 * working perfectly well.
 */
export type RateLimitObservation = {
  readonly count: number;
  readonly oldestAt: number | null;
};

/**
 * The limit itself, as a pure function.
 *
 * A window that slides, evaluated against the current time — not a fixed window
 * that resets on the minute, because a fixed window lets a client send twice the
 * limit across a boundary and is trivially timed by anyone who reads this file.
 *
 * The retry is clamped to a second. Through the real port the wait is always
 * positive, since a message old enough to have left the window is not counted at
 * all — so the clamp exists for the case the arithmetic cannot otherwise catch: a
 * writer and a reader whose clocks disagree, where the oldest "recent" message is
 * dated in the future. `Retry-After: 0` there would invite an immediate retry,
 * which is the opposite of what the caller needs told.
 */
export function evaluateRateLimit(
  policy: RateLimitPolicy,
  observation: RateLimitObservation,
  now: number,
): RateLimitDecision {
  if (observation.count < policy.limit) {
    return { allowed: true, remaining: policy.limit - observation.count };
  }

  const waitMs =
    observation.oldestAt === null
      ? policy.windowMs
      : observation.oldestAt + policy.windowMs - now;

  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
}

/* -------------------------------------------------------------------------
 * The request contract
 * ---------------------------------------------------------------------- */

/**
 * What an anonymous visitor is allowed to ask for.
 *
 * Two intents and nothing else. `read` fetches the visitor's own transcript;
 * `send` appends to it. There is no intent that opens a conversation, closes one,
 * writes as the owner or writes as the agent, and the absence is the point: the
 * entire set of things an unauthenticated caller can cause is four lines long
 * and does not grow without a deliberate change here.
 */
export const VISITOR_INTENTS = ["read", "send"] as const;

export type VisitorIntent = (typeof VISITOR_INTENTS)[number];

export function isVisitorIntent(value: unknown): value is VisitorIntent {
  return typeof value === "string" && (VISITOR_INTENTS as readonly string[]).includes(value);
}

/**
 * The exact body fields each intent accepts.
 *
 * The route refuses a body carrying anything else, rather than reading the fields
 * it knows and ignoring the rest — the same rule the theme-feedback and CMS
 * endpoints apply. Reading only `text` would accept `{session, intent, openedBy:
 * "owner"}`, drop it and answer `201`, so a crafted request would look stored
 * when the thing it asked for never happened.
 */
export const VISITOR_BODY_FIELDS: Readonly<Record<VisitorIntent, readonly string[]>> = {
  read: ["intent", "session"],
  send: ["intent", "session", "text"],
};

/** Whether a body is a plain object whose keys are exactly `allowed`. */
export function hasExactlyFields(body: unknown, allowed: readonly string[]): body is Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body).sort();
  const expected = [...allowed].sort();

  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}
