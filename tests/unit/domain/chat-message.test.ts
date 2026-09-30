import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AGENT_AUTHOR_LABEL,
  AUTO_REPLY_AFTER_MS,
  CONVERSATION_STATES,
  HUMAN_AUTHORS,
  InvalidChatMessageError,
  MAX_MESSAGE_LENGTH,
  MESSAGE_AUTHORS,
  MissingAutomatedNoticeError,
  OWNER_RATE_LIMIT,
  VISITOR_BODY_FIELDS,
  VISITOR_INTENTS,
  VISITOR_RATE_LIMIT,
  autoReplyDecision,
  closeConversation,
  composeAgentMessage,
  composeHumanMessage,
  evaluateRateLimit,
  hasExactlyFields,
  isConversationState,
  isHumanMessage,
  isMessageAuthor,
  isVisitorIntent,
  normaliseMessageBody,
  recordAutoReply,
  recordVisitorMessage,
  shouldOfferChat,
  startConversation,
  toChatMessage,
  toConversation,
  type Conversation,
} from "@/domain/chat/message";
import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

/**
 * The conversation contract.
 *
 * Three properties are worth a test more than the rest, and each block below is
 * one of them:
 *
 * 1. **The owner starts it.** A visitor cannot move a conversation into a state
 *    that offers a chat, and that is asserted against the *transitions* rather
 *    than against a component, because a UI check would pass until somebody moved
 *    the check.
 * 2. **Agent Smith cannot be mistaken for the owner.** Three independent places
 *    say so — the author, the required notice, and the database constraint — and
 *    the interesting test is the one that fails when any *one* of them is removed.
 * 3. **The limits are arithmetic.** The delay and the rate limit are the two
 *    numbers a reader of this code is most likely to get wrong, and both are
 *    exact rather than approximate.
 */

const root = resolve(__dirname, "../../..");

const A_SESSION = "0f9a3c1b7e2d48a6b0c5e9f1a3d7c2b4";
const NOW = 1_800_000_000_000;
const MINUTE = 60_000;

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    sessionId: A_SESSION,
    state: "open",
    openedAt: NOW - 10 * MINUTE,
    closedAt: null,
    visitorLocale: "pt-BR",
    lastVisitorAt: null,
    lastOwnerReplyAt: null,
    autoRepliedToAt: null,
    updatedAt: NOW - 10 * MINUTE,
    ...overrides,
  };
}

describe("the owner starts it", () => {
  it("offers a chat to nobody, by default", () => {
    /*
     * The whole product rule, in one assertion. A visitor that has not been
     * contacted is not offered a conversation, and the widget renders nothing.
     */
    expect(shouldOfferChat(conversation({ state: "unopened", openedAt: null }))).toBe(false);
  });

  it("offers one the owner has opened, and withdraws it when they close it", () => {
    const opened = startConversation(A_SESSION, NOW);

    expect(opened.state).toBe("open");
    expect(shouldOfferChat(opened)).toBe(true);

    const closed = closeConversation(opened, NOW + MINUTE);

    expect(closed.state).toBe("closed");
    expect(shouldOfferChat(closed)).toBe(false);
    // The transcript survives: closing is not erasing.
    expect(closed.sessionId).toBe(A_SESSION);
  });

  it("can only be opened by a caller that has a session to open", () => {
    expect(() => startConversation("not-a-session", NOW)).toThrow(TypeError);
  });

  it("offers a chat in exactly one state, out of three", () => {
    expect(CONVERSATION_STATES).toEqual(["unopened", "open", "closed"]);

    const offered = CONVERSATION_STATES.filter(
      (state) => shouldOfferChat(conversation({ state, openedAt: NOW, closedAt: null })),
    );

    expect(offered).toEqual(["open"]);
  });

  it("has no visitor-facing transition into an open conversation", () => {
    /*
     * Read from the source rather than trusted. `recordVisitorMessage` is the only
     * function a visitor's write reaches, and it must not touch the state — if a
     * future commit made a visitor's first message open its own conversation, the
     * rule above would still pass and the product decision would be gone.
     */
    const source = readFileSync(resolve(root, "src/domain/chat/message.ts"), "utf8");

    const visitorTransition = source.slice(
      source.indexOf("export function recordVisitorMessage"),
      source.indexOf("export function recordOwnerReply"),
    );

    expect(visitorTransition).not.toMatch(/state:\s*"open"/);
    expect(visitorTransition).toContain("...conversation,");
  });

  it("answers a read for a session nobody opened exactly as it answers one that does not exist", () => {
    /*
     * A response that distinguished them would be an oracle for whether a session
     * id is real, and the id is the only value in this system a stranger might
     * want to guess. Asserted on the shape the route sends: `offered: false` and an
     * empty transcript in both cases.
     */
    const unopened = { offered: shouldOfferChat(conversation({ state: "unopened" })), messages: [] };

    expect(unopened).toEqual({ offered: false, messages: [] });
  });

  it("refuses a visitor body carrying anything its intent does not declare", () => {
    /*
     * The endpoint half of the same rule: reading only `session` and `text` would
     * accept `{session, intent, state: "open"}` and answer `201`, so a crafted
     * request would look stored when the thing it asked for never happened.
     */
    expect(VISITOR_INTENTS).toEqual(["read", "send"]);
    expect(VISITOR_BODY_FIELDS.read).toEqual(["intent", "session"]);
    expect(VISITOR_BODY_FIELDS.send).toEqual(["intent", "session", "text"]);

    expect(hasExactlyFields({ session: A_SESSION, intent: "read" }, VISITOR_BODY_FIELDS.read)).toBe(
      true,
    );
    expect(
      hasExactlyFields(
        { session: A_SESSION, intent: "send", text: "hi" },
        VISITOR_BODY_FIELDS.send,
      ),
    ).toBe(true);

    for (const smuggle of [
      { session: A_SESSION, intent: "read", state: "open" },
      { session: A_SESSION, intent: "send", text: "hi", author: "owner" },
      { session: A_SESSION, intent: "send", text: "hi", automated_notice: "not a machine" },
      { session: A_SESSION },
      { session: A_SESSION, intent: "read", extra: 1 },
    ]) {
      const intent = (smuggle as { intent?: unknown }).intent;

      expect(
        hasExactlyFields(smuggle, VISITOR_BODY_FIELDS[isVisitorIntent(intent) ? intent : "read"]),
      ).toBe(false);
    }
  });

  it("refuses a body that is not a plain object of fields", () => {
    for (const body of [null, undefined, "session", 42, [A_SESSION], [{ session: A_SESSION }]]) {
      expect(hasExactlyFields(body, VISITOR_BODY_FIELDS.read)).toBe(false);
    }
  });

  it("recognises exactly two intents", () => {
    for (const intent of VISITOR_INTENTS) {
      expect(isVisitorIntent(intent)).toBe(true);
    }

    for (const intent of ["open", "close", "delete", "", "READ", null, 3, {}]) {
      expect(isVisitorIntent(intent)).toBe(false);
    }
  });
});

describe("message bodies", () => {
  it("keeps the words and drops the padding", () => {
    expect(normaliseMessageBody("  hello  ")).toBe("hello");
    expect(normaliseMessageBody("two\r\nlines")).toBe("two\nlines");
    expect(normaliseMessageBody("a  b")).toBe("a b");
    expect(normaliseMessageBody("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("refuses nothing at all, rather than storing a message with no words", () => {
    for (const body of ["", "   ", "\n\n", "\t"]) {
      expect(() => normaliseMessageBody(body)).toThrow(InvalidChatMessageError);
    }
  });

  it("caps the length, and checks before trimming so a wall of spaces is refused", () => {
    const atLimit = "a".repeat(MAX_MESSAGE_LENGTH);

    expect(normaliseMessageBody(atLimit)).toHaveLength(MAX_MESSAGE_LENGTH);
    expect(() => normaliseMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1))).toThrow(
      InvalidChatMessageError,
    );
    // A million spaces is not an empty message, it is an attempt at one.
    expect(() => normaliseMessageBody(" ".repeat(10_000))).toThrow(InvalidChatMessageError);
  });

  it("refuses anything that is not a string", () => {
    for (const body of [null, undefined, 42, {}, [], true]) {
      expect(() => normaliseMessageBody(body)).toThrow(InvalidChatMessageError);
    }
  });

  it("names the issue and the received length, for a log rather than a visitor", () => {
    try {
      normaliseMessageBody("a".repeat(MAX_MESSAGE_LENGTH + 1));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidChatMessageError);
      expect((error as InvalidChatMessageError).issue).toBe("too_long");
      expect((error as InvalidChatMessageError).receivedLength).toBe(MAX_MESSAGE_LENGTH + 1);
    }
  });

  it("strips control characters out of a paste", () => {
    // A form feed or a bidi override in a transcript is invisible and can reorder
    // what a reader believes they were told.
    expect(normaliseMessageBody("a bc")).toBe("a b c");
  });
});

describe("Agent Smith", () => {
  const notice = "AUTOMATED REPLY — not a person";

  it("is a separate author from the two people", () => {
    expect(MESSAGE_AUTHORS).toEqual(["visitor", "owner", "agent"]);
    expect(HUMAN_AUTHORS).toEqual(["visitor", "owner"]);
    expect(isMessageAuthor("agent")).toBe(true);
    expect(isHumanMessage({ author: "agent" })).toBe(false);
    expect(isHumanMessage({ author: "owner" })).toBe(true);
    expect(isHumanMessage({ author: "visitor" })).toBe(true);
  });

  it("carries the same name in every language, because a machine that renames itself is harder to spot", () => {
    expect(AGENT_AUTHOR_LABEL).toBe("Agent Smith");
    // The sentence around it is translated; the name is not.
    expect(enUS.chat.agentNotice).toContain("AUTOMATED");
    expect(ptBR.chat.agentNotice).toContain("AUTOMÁTICA");
  });

  it("cannot be composed without a label, which is the whole guarantee", () => {
    /*
     * The failure this prevents is not hypothetical: a missing catalog entry, a
     * refactor that inlines the string, a locale that falls back to `""`. All of
     * them produce an exception rather than a message indistinguishable from the
     * owner's, because an exception is visible and an impersonation is not.
     */
    for (const blank of ["", "   ", "\n"]) {
      expect(() =>
        composeAgentMessage({
          id: "m1",
          sessionId: A_SESSION,
          body: "Your message arrived.",
          notice: blank,
          at: NOW,
        }),
      ).toThrow(MissingAutomatedNoticeError);
    }

    const message = composeAgentMessage({
      id: "m1",
      sessionId: A_SESSION,
      body: "Your message arrived.",
      notice,
      at: NOW,
    });

    expect(message.author).toBe("agent");
    expect(message.automatedNotice).toBe(notice);
  });

  it("refuses a label long enough to be a paragraph, because a label is a label", () => {
    expect(() =>
      composeAgentMessage({
        id: "m1",
        sessionId: A_SESSION,
        body: "hi",
        notice: "n".repeat(500),
        at: NOW,
      }),
    ).toThrow(MissingAutomatedNoticeError);
  });

  it("refuses to let a person wear the machine's label", () => {
    const message = composeHumanMessage({
      id: "m1",
      sessionId: A_SESSION,
      author: "owner",
      body: "It was the printer.",
      at: NOW,
    });

    expect(message.automatedNotice).toBeNull();
  });

  it("drops a stored automated message that has no label, rather than rendering it", () => {
    /*
     * The read-side half. A transcript that silently omits a message is confusing;
     * one that shows an unlabelled message under the owner's name is the thing
     * this module exists to prevent. Refusing to render is the third of the three
     * defences.
     */
    const row = {
      id: "m1",
      session_id: A_SESSION,
      author: "agent",
      body: "Your message arrived.",
      sent_at: new Date(NOW).toISOString(),
      automated_notice: null,
    };

    expect(toChatMessage(row)).toBeNull();
    expect(toChatMessage({ ...row, automated_notice: "  " })).toBeNull();
    expect(toChatMessage({ ...row, automated_notice: notice })?.automatedNotice).toBe(notice);
  });

  it("does not let a stored person message carry a label either", () => {
    const row = {
      id: "m1",
      session_id: A_SESSION,
      author: "visitor",
      body: "hello",
      sent_at: new Date(NOW).toISOString(),
      automated_notice: "AUTOMATED",
    };

    // Normalised to null: the field is not part of a human message, so a row that
    // has one is a row the writer did not mean.
    expect(toChatMessage(row)?.automatedNotice).toBeNull();
  });

  it("drops a stored message that does not satisfy the contract", () => {
    const valid = {
      id: "m1",
      session_id: A_SESSION,
      author: "visitor",
      body: "hello",
      sent_at: new Date(NOW).toISOString(),
      automated_notice: null,
    };

    for (const broken of [
      null,
      "m1",
      { ...valid, id: 42 },
      { ...valid, session_id: "not-a-session" },
      { ...valid, author: "robot" },
      { ...valid, body: "  " },
      { ...valid, body: "a".repeat(MAX_MESSAGE_LENGTH + 1) },
      { ...valid, sent_at: "not a date" },
      { ...valid, sent_at: null },
    ]) {
      expect(toChatMessage(broken)).toBeNull();
    }

    expect(toChatMessage(valid)?.body).toBe("hello");
  });
});

describe("when the queue answers", () => {
  it("owes nothing until a visitor has written", () => {
    expect(autoReplyDecision(conversation(), NOW)).toEqual({
      due: false,
      reason: "no-visitor-message",
      answeringVisitorMessageAt: null,
    });
  });

  it("waits two minutes, and not a second less", () => {
    const pending = conversation({ lastVisitorAt: NOW });

    expect(AUTO_REPLY_AFTER_MS).toBe(2 * MINUTE);

    expect(autoReplyDecision(pending, NOW)).toMatchObject({ due: false, reason: "too-soon" });
    expect(autoReplyDecision(pending, NOW + AUTO_REPLY_AFTER_MS - 1)).toMatchObject({
      due: false,
      reason: "too-soon",
    });

    const due = autoReplyDecision(pending, NOW + AUTO_REPLY_AFTER_MS);

    expect(due).toEqual({ due: true, reason: "due", answeringVisitorMessageAt: NOW });
  });

  it("stays silent the moment a person has answered", () => {
    /*
     * The rule that matters most. A robot talking over a human is worse than
     * silence, and "the owner replied" is checked before the clock so it wins
     * however the two timestamps are ordered.
     */
    const answered = conversation({
      lastVisitorAt: NOW - 10 * MINUTE,
      lastOwnerReplyAt: NOW - 9 * MINUTE,
    });

    expect(autoReplyDecision(answered, NOW)).toMatchObject({ due: false, reason: "owner-replied" });

    // Even an hour later, and even with the same second as the visitor's message.
    expect(autoReplyDecision(answered, NOW + 60 * MINUTE).due).toBe(false);
    expect(
      autoReplyDecision(
        conversation({ lastVisitorAt: NOW, lastOwnerReplyAt: NOW }),
        NOW + AUTO_REPLY_AFTER_MS,
      ),
    ).toMatchObject({ due: false, reason: "owner-replied" });
  });

  it("answers one visitor message once, however many follow it", () => {
    const threeInARow = conversation({ lastVisitorAt: NOW });

    const answered = recordAutoReply(threeInARow, NOW + AUTO_REPLY_AFTER_MS);

    expect(answered.autoRepliedToAt).toBe(NOW);
    expect(autoReplyDecision(answered, NOW + AUTO_REPLY_AFTER_MS + 1)).toMatchObject({
      due: false,
      reason: "already-answered",
    });

    // A fourth message is a new debt.
    const later = recordVisitorMessage(answered, NOW + MINUTE, "pt-BR");

    expect(autoReplyDecision(later, NOW + MINUTE + AUTO_REPLY_AFTER_MS)).toMatchObject({ due: true });
  });

  it("owes nothing to a conversation the owner closed", () => {
    const closed = closeConversation(
      conversation({ lastVisitorAt: NOW - 10 * MINUTE }),
      NOW - 5 * MINUTE,
    );

    expect(autoReplyDecision(closed, NOW)).toMatchObject({ due: false, reason: "not-open" });
  });

  it("settles the language on the message that caused the reply, and never moves it", () => {
    /*
     * A reply is posted by whichever party reads the thread next, and that party
     * is not always the visitor. Pinning the locale to the first message is what
     * makes "answered in the visitor's language" true rather than aspirational.
     */
    const first = recordVisitorMessage(conversation({ visitorLocale: null }), NOW, "pt-BR");
    const second = recordVisitorMessage(first, NOW + MINUTE, "en-US");

    expect(first.visitorLocale).toBe("pt-BR");
    expect(second.visitorLocale).toBe("pt-BR");
  });
});

describe("rate limits", () => {
  it("allows everything below the limit and refuses at it", () => {
    const policy = VISITOR_RATE_LIMIT;

    expect(policy).toEqual({ limit: 5, windowMs: MINUTE });
    expect(evaluateRateLimit(policy, { count: 0, oldestAt: null }, NOW)).toEqual({
      allowed: true,
      remaining: 5,
    });
    expect(evaluateRateLimit(policy, { count: 4, oldestAt: NOW - 1000 }, NOW)).toEqual({
      allowed: true,
      remaining: 1,
    });
    expect(evaluateRateLimit(policy, { count: 5, oldestAt: NOW - 1000 }, NOW).allowed).toBe(false);
    expect(evaluateRateLimit(policy, { count: 500, oldestAt: NOW - 1000 }, NOW).allowed).toBe(false);
  });

  it("counts down as the window slides, so the limit is a rate and not a bucket", () => {
    /*
     * `count` arrives already scoped to the window — the port asks for the messages
     * since `now - windowMs` — so the sliding happens there and this function only
     * compares. A fixed window that refilled on the minute would let a caller send
     * ten across a boundary; the assertion below is that a message which has left
     * the window is simply not counted, so there is no boundary to time.
     */
    const policy = VISITOR_RATE_LIMIT;

    expect(evaluateRateLimit(policy, { count: 0, oldestAt: null }, NOW)).toMatchObject({
      allowed: true,
    });

    // The fifth message of the window, 59 seconds old: still inside it, so still
    // refused, and the wait is the second it needs to leave.
    expect(
      evaluateRateLimit(policy, { count: 5, oldestAt: NOW - 59_000 }, NOW),
    ).toMatchObject({ allowed: false, retryAfterSeconds: 1 });

    // The same message 61 seconds old has left the window, so the port would
    // report a count of four and the caller is allowed.
    expect(
      evaluateRateLimit(policy, { count: 4, oldestAt: NOW - 61_000 }, NOW),
    ).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("never says retry in zero seconds, which would invite an immediate retry", () => {
    /*
     * Not reachable through a port and a clock that agree: a message old enough to
     * have left the window is not counted, and one dated in the future only makes
     * the wait longer. So this is the skew case — a writer whose clock runs slow
     * stamps a message two minutes in the past, the reader counts it because the
     * port's `since` was computed from the *reader's* clock, and the arithmetic
     * comes out negative. `Retry-After: -60` or `0` there would invite an
     * immediate retry, which is the opposite of what the caller needs told.
     */
    const decision = evaluateRateLimit(
      VISITOR_RATE_LIMIT,
      { count: 5, oldestAt: NOW - 2 * MINUTE },
      NOW,
    );

    expect(decision.allowed).toBe(false);
    expect(decision).toMatchObject({ retryAfterSeconds: 1 });
  });

  it("waits a whole window when the count has no timestamps to slide", () => {
    expect(
      evaluateRateLimit(VISITOR_RATE_LIMIT, { count: 5, oldestAt: null }, NOW),
    ).toMatchObject({ retryAfterSeconds: 60 });
  });

  it("leaves the owner a far larger window than the visitor", () => {
    /*
     * Effectively a guard against a stuck key rather than a constraint on a person
     * typing — and it is a separate policy rather than a shared one, so raising
     * the visitor's limit cannot accidentally raise the owner's.
     */
    expect(OWNER_RATE_LIMIT).toEqual({ limit: 60, windowMs: MINUTE });
    expect(OWNER_RATE_LIMIT.limit).toBeGreaterThan(VISITOR_RATE_LIMIT.limit);
  });
});

describe("reading rows back", () => {
  const row = {
    session_id: A_SESSION,
    state: "open",
    opened_at: new Date(NOW).toISOString(),
    closed_at: null,
    visitor_locale: "pt-BR",
    last_visitor_at: new Date(NOW).toISOString(),
    last_owner_reply_at: null,
    auto_replied_to_at: null,
    updated_at: new Date(NOW).toISOString(),
  };

  it("accepts a row that satisfies the contract", () => {
    const conversationRow = toConversation(row);

    expect(conversationRow).toMatchObject({
      sessionId: A_SESSION,
      state: "open",
      visitorLocale: "pt-BR",
      lastVisitorAt: NOW,
      lastOwnerReplyAt: null,
    });
  });

  it("drops a row that does not, rather than rendering a half a conversation", () => {
    for (const broken of [
      null,
      "row",
      { ...row, session_id: "nope" },
      { ...row, state: "pending" },
      { ...row, updated_at: null },
      { ...row, updated_at: "not a date" },
    ]) {
      expect(toConversation(broken)).toBeNull();
    }
  });

  it("nulls a locale the site does not publish, rather than dropping the whole row", () => {
    /*
     * A different failure from the one above, and it is not a row the domain should
     * throw away. The column has a check constraint, so this is only reachable by
     * hand; and a conversation with an unreadable language is still a conversation
     * with words in it. Nulling the field makes the automatic reply fall back to
     * the default instead of the owner losing the thread.
     */
    expect(toConversation({ ...row, visitor_locale: "fr-FR" })?.visitorLocale).toBeNull();
    expect(toConversation({ ...row, visitor_locale: 42 })?.visitorLocale).toBeNull();
  });

  it("recognises exactly the three states", () => {
    for (const state of CONVERSATION_STATES) {
      expect(isConversationState(state)).toBe(true);
    }

    for (const state of ["open ", "OPEN", "", null, 1, {}]) {
      expect(isConversationState(state)).toBe(false);
    }
  });
});

describe("i18n", () => {
  it("translates both halves of the automated reply, in both catalogs", () => {
    for (const catalog of [enUS.chat, ptBR.chat]) {
      expect(catalog.agentNotice.trim().length).toBeGreaterThan(0);
      expect(catalog.agentReply.trim().length).toBeGreaterThan(0);
    }

    // The English and the Portuguese notices must both say what it is. A label
    // that only reads "AUTOMATED" in one language is not a label.
    expect(enUS.chat.agentNotice).toMatch(/not a person/i);
    expect(ptBR.chat.agentNotice).toMatch(/não é uma pessoa/i);
  });

  it("has the automatic reply speak in the first person, so it cannot be read as the owner", () => {
    expect(enUS.chat.agentReply).toMatch(/I am/i);
    expect(ptBR.chat.agentReply).toMatch(/^Sou /i);
  });
});
