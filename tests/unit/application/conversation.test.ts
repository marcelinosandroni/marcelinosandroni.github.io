import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Split out of `tests/unit/domain/chat-message.test.ts`, for the same reason as
 * `track-visitors.test.ts`: use-case tests in a domain file leave the application
 * directory under the coverage floor.
 */

import {
  ChatClosedError,
  ChatNotOfferedError,
  ChatRateLimitedError,
  CloseConversation,
  ListConversations,
  ReadConversation,
  SendOwnerReply,
  SendVisitorMessage,
  StartConversation,
  type ChatRepository,
} from "@/application/chat/conversation";
import {
  CONSOLE_TRANSCRIPT_LIMIT,
  InvalidChatMessageError,
  MAX_OPEN_CONVERSATIONS,
  OWNER_RATE_LIMIT,
  VISITOR_RATE_LIMIT,
  autoReplyDecision,
  type ChatMessage,
  type Conversation,
  type ConversationSummary,
} from "@/domain/chat/message";

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

describe("the conversation use cases", () => {
  /*
   * The use cases, tested from this file rather than from
   * `tests/unit/application/`.
   *
   * Two reasons, and the second is the one that matters. The first is that the
   * orchestration being asserted here — the order of the checks, the double rate
   * limit, who posts the automatic reply — is only meaningful next to the rules it
   * is choreography for. The second is coverage: the repository's gate counts
   * `src/application/**`, and use cases with no test are how a codebase quietly
   * loses a 90% floor. All of this belongs in
   * `tests/unit/application/conversation.test.ts`; move it when that file exists.
   */

  const NOTICE = "AUTOMATED REPLY — not a person";

  interface Recorder {
    readonly repository: ChatRepository;
    readonly appended: ChatMessage[];
    readonly marked: Conversation[];
    readonly opened: Conversation[];
    readonly closed: Conversation[];
    readonly counts: { count: number; oldestAt: number | null }[];
    readonly order: string[];
  }

  function stub(options: {
    conversation?: Conversation | null;
    messages?: ChatMessage[];
    count?: { count: number; oldestAt: number | null };
    failAgentAppend?: boolean;
  } = {}): Recorder {
    const appended: ChatMessage[] = [];
    const marked: Conversation[] = [];
    const opened: Conversation[] = [];
    const closed: Conversation[] = [];
    const counts = [options.count ?? { count: 0, oldestAt: null }];
    const order: string[] = [];
    let counter = 0;

    const repository: ChatRepository = {
      find: async () => {
        order.push("find");
        return options.conversation === undefined
          ? conversation({ lastVisitorAt: NOW - 5 * MINUTE })
          : options.conversation;
      },
      list: async () => [],
      appendVisitorMessage: async (input) => {
        order.push("appendVisitor");
        const message: ChatMessage = {
          id: `m${(counter += 1)}`,
          sessionId: input.sessionId,
          author: "visitor",
          body: input.body,
          sentAt: input.at,
          automatedNotice: null,
        };
        appended.push(message);

        return message;
      },
      appendOwnerMessage: async (message) => {
        order.push("appendOwner");
        appended.push(message);

        return message;
      },
      appendAgentMessage: async (message) => {
        order.push("appendAgent");

        if (options.failAgentAppend === true) {
          throw new Error("insert failed: constraint chat_messages_notice_matches_author");
        }

        appended.push(message);

        return message;
      },
      listMessages: async () => {
        order.push("listMessages");

        return options.messages ?? appended;
      },
      open: async (next) => {
        order.push("open");
        opened.push(next);

        return next;
      },
      close: async (next) => {
        order.push("close");
        closed.push(next);

        return next;
      },
      markConversation: async (next) => {
        order.push("mark");
        marked.push(next);

        return next;
      },
      countSince: async () => {
        order.push("countSince");

        return counts[0];
      },
    };

    return { repository, appended, marked, opened, closed, counts, order };
  }

  describe("ReadConversation", () => {
    const resolver = (locale: string) => ({ notice: `${NOTICE} (${locale})`, body: "ack" });

    it("tells a visitor nothing about a session that was never contacted", async () => {
      const recorder = stub({ conversation: conversation({ state: "unopened", openedAt: null }) });
      const read = await new ReadConversation(recorder.repository, resolver).execute(A_SESSION);

      expect(read).toEqual({ offered: false, state: "unopened", messages: [] });
      expect(recorder.appended).toEqual([]);
    });

    it("answers a missing conversation the same way as an unopened one", async () => {
      const missing = stub({ conversation: null });
      const unopened = stub({ conversation: conversation({ state: "unopened", openedAt: null }) });

      const forMissing = await new ReadConversation(missing.repository, resolver).execute(A_SESSION);
      const forUnopened = await new ReadConversation(unopened.repository, resolver).execute(
        A_SESSION,
      );

      expect(forMissing).toEqual(forUnopened);
    });

    it("answers a bad session id the same way too", async () => {
      const recorder = stub();

      for (const session of ["", "nope", 42, null, undefined, {}]) {
        expect(await new ReadConversation(recorder.repository, resolver).execute(session)).toEqual({
          offered: false,
          state: "unopened",
          messages: [],
        });
      }

      // Nothing was even read for a value that is not a session.
      expect(recorder.order).toEqual([]);
    });

    it("posts the automatic reply before it reads the transcript, so it is in the answer", async () => {
      const recorder = stub();
      const read = await new ReadConversation(recorder.repository, resolver, () => NOW).execute(
        A_SESSION,
      );

      expect(read.offered).toBe(true);
      expect(recorder.order.indexOf("appendAgent")).toBeLessThan(
        recorder.order.indexOf("listMessages"),
      );
      // And the transcript the visitor is handed already contains it.
      expect(read.messages.some((message) => message.author === "agent")).toBe(true);
    });

    it("answers in the visitor's language, not the reader's", async () => {
      const recorder = stub({
        conversation: conversation({ visitorLocale: "pt-BR", lastVisitorAt: NOW - 5 * MINUTE }),
      });
      const seen: string[] = [];

      await new ReadConversation(
        recorder.repository,
        (locale) => {
          seen.push(locale);

          return { notice: NOTICE, body: "ack" };
        },
        () => NOW,
      ).execute(A_SESSION);

      expect(seen).toEqual(["pt-BR"]);
    });

    it("falls back to the default locale for a conversation that has no visitor message", async () => {
      // Unreachable in practice — the debt only exists after a visitor wrote — and
      // the fallback is here so a hand-edited row cannot crash the read.
      const recorder = stub({
        conversation: conversation({ visitorLocale: null, lastVisitorAt: NOW - 5 * MINUTE }),
      });
      const seen: string[] = [];

      await new ReadConversation(
        recorder.repository,
        (locale) => {
          seen.push(locale);

          return { notice: NOTICE, body: "ack" };
        },
        () => NOW,
      ).execute(A_SESSION);

      expect(seen).toEqual(["en-US"]);
    });

    it("posts a labelled message, and records which message it answered", async () => {
      const recorder = stub({ conversation: conversation({ lastVisitorAt: NOW - 5 * MINUTE }) });

      await new ReadConversation(
        recorder.repository,
        () => ({ notice: NOTICE, body: "Your message arrived." }),
        () => NOW,
      ).execute(A_SESSION);

      const posted = recorder.appended[0];

      expect(posted).toMatchObject({
        author: "agent",
        body: "Your message arrived.",
        automatedNotice: NOTICE,
        sentAt: NOW,
      });
      expect(recorder.marked[0].autoRepliedToAt).toBe(NOW - 5 * MINUTE);
    });

    it("still answers the transcript when the automatic reply cannot be written", async () => {
      /*
       * A missed automatic reply is a small miss. A read that fails because of one
       * is a chat that looks broken, and the visitor waiting for a message is the
       * person who pays for it.
       */
      const recorder = stub({ failAgentAppend: true, conversation: conversation({ lastVisitorAt: NOW - 5 * MINUTE }) });

      const read = await new ReadConversation(
        recorder.repository,
        () => ({ notice: NOTICE, body: "ack" }),
        () => NOW,
      ).execute(A_SESSION);

      expect(read.offered).toBe(true);
      expect(read.messages).toEqual([]);
      expect(recorder.order).toContain("listMessages");
    });

    it("does not post a reply that is not due yet", async () => {
      const recorder = stub({ conversation: conversation({ lastVisitorAt: NOW }) });

      await new ReadConversation(
        recorder.repository,
        () => ({ notice: NOTICE, body: "ack" }),
        () => NOW,
      ).execute(A_SESSION);

      expect(recorder.appended).toEqual([]);
    });
  });

  describe("SendVisitorMessage", () => {
    it("refuses a conversation the owner has not opened, before touching the database", async () => {
      for (const state of ["unopened", "closed"] as const) {
        const recorder = stub({
          conversation: conversation({ state, openedAt: state === "closed" ? NOW : null }),
        });

        await expect(
          new SendVisitorMessage(recorder.repository, () => NOW).execute(A_SESSION, "hi", "pt-BR"),
        ).rejects.toBeInstanceOf(ChatNotOfferedError);

        // Not even a rate-limit query: the offer check is the first thing to run.
        expect(recorder.order).toEqual(["find"]);
      }
    });

    it("refuses a session id that is not a session", async () => {
      const recorder = stub();

      await expect(
        new SendVisitorMessage(recorder.repository, () => NOW).execute("nope", "hi", "pt-BR"),
      ).rejects.toBeInstanceOf(ChatNotOfferedError);

      expect(recorder.order).toEqual([]);
    });

    it("refuses over the limit and says how long to wait", async () => {
      const recorder = stub({
        conversation: conversation(),
        count: { count: VISITOR_RATE_LIMIT.limit, oldestAt: NOW - 40_000 },
      });

      const failure = await new SendVisitorMessage(recorder.repository, () => NOW)
        .execute(A_SESSION, "hi", "pt-BR")
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ChatRateLimitedError);
      expect((failure as ChatRateLimitedError).retryAfterSeconds).toBe(20);
      expect(recorder.appended).toEqual([]);
    });

    it("refuses a body it would not store, after the rate check rather than before", async () => {
      /*
       * The order is load-bearing and slightly counter-intuitive: the length is
       * checked *after* the rate-limit query rather than before it. Cheap either
       * way, and the visitor sees `400` rather than `429` for a message that was
       * never going to be sent.
       */
      const recorder = stub({ conversation: conversation() });

      await expect(
        new SendVisitorMessage(recorder.repository, () => NOW).execute(A_SESSION, "   ", "pt-BR"),
      ).rejects.toThrow(InvalidChatMessageError);

      expect(recorder.order).toEqual(["find", "countSince"]);
      expect(recorder.appended).toEqual([]);
    });

    it("sends a normalised message with the domain's own policy, and echoes a contract-valid row", async () => {
      const recorder = stub({ conversation: conversation() });

      const sent = await new SendVisitorMessage(recorder.repository, () => NOW).execute(
        A_SESSION,
        "  Hello\r\nthere  ",
        "pt-BR",
      );

      expect(sent).toMatchObject({
        sessionId: A_SESSION,
        author: "visitor",
        body: "Hello\nthere",
        automatedNotice: null,
        sentAt: NOW,
      });
      expect(recorder.appended[0].body).toBe("Hello\nthere");
    });

    it("cannot be made to write as somebody else, because the port takes no author", () => {
      /*
       * Read from the port rather than trusted: an `author` parameter here would be
       * the whole impersonation bug, and the type is the only thing standing between
       * a future commit and it.
       */
      const source = readFileSync(resolve(root, "src/application/chat/conversation.ts"), "utf8");

      const port = source.slice(
        source.indexOf("appendVisitorMessage(input: {"),
        source.indexOf("}): Promise<ChatMessage>;"),
      );

      expect(port).not.toMatch(/author/);
    });
  });

  describe("SendOwnerReply", () => {
    it("refuses a conversation that is not open, and a session that is not a session", async () => {
      for (const [session, state, reads] of [
        [A_SESSION, "unopened", 1],
        [A_SESSION, "closed", 1],
        // A value that is not a session is refused before the read, so the
        // conversation it might belong to is never looked at.
        ["nope", "open", 0],
      ] as const) {
        const recorder = stub({
          conversation: conversation({ state, openedAt: state === "unopened" ? null : NOW }),
        });

        await expect(
          new SendOwnerReply(recorder.repository, () => NOW).execute(session, "hi"),
        ).rejects.toBeInstanceOf(ChatClosedError);

        expect(recorder.order).toHaveLength(reads);
      }
    });

    it("applies the owner's own, larger policy", async () => {
      const ten = { count: 10, oldestAt: NOW - 30_000 };

      // Ten messages in a minute: refused for a visitor, allowed for the owner.
      // Two policies rather than one, so raising the visitor's limit cannot
      // accidentally raise the owner's, and so an owner with a stuck key is the
      // only case the owner's limit exists for.
      const forVisitor = stub({ conversation: conversation(), count: ten });
      const forOwner = stub({ conversation: conversation(), count: ten });

      await expect(
        new SendVisitorMessage(forVisitor.repository, () => NOW).execute(A_SESSION, "hi", "pt-BR"),
      ).rejects.toBeInstanceOf(ChatRateLimitedError);

      await new SendOwnerReply(forOwner.repository, () => NOW).execute(A_SESSION, "hi");

      expect(forOwner.appended[0].author).toBe("owner");
    });

    it("refuses the owner at their own limit, with the wait", async () => {
      const atLimit = stub({
        conversation: conversation(),
        count: { count: OWNER_RATE_LIMIT.limit, oldestAt: NOW - 59_000 },
      });

      await expect(
        new SendOwnerReply(atLimit.repository, () => NOW).execute(A_SESSION, "hi"),
      ).rejects.toBeInstanceOf(ChatRateLimitedError);
    });

    it("sends the message and records the reply, which is what cancels the queue's debt", async () => {
      const recorder = stub({ conversation: conversation({ lastVisitorAt: NOW - 5 * MINUTE }) });

      const sent = await new SendOwnerReply(recorder.repository, () => NOW).execute(A_SESSION, "  hi  ");

      expect(sent).toMatchObject({ author: "owner", body: "hi", automatedNotice: null });
      expect(recorder.marked[0].lastOwnerReplyAt).toBe(NOW);
      // And with that recorded, the automatic reply is no longer owed.
      expect(autoReplyDecision(recorder.marked[0], NOW + 60 * MINUTE).due).toBe(false);
    });
  });

  describe("StartConversation", () => {
    it("opens a conversation the owner asked for", async () => {
      const recorder = stub({ conversation: null });

      const opened = await new StartConversation(recorder.repository, () => NOW).execute(A_SESSION);

      expect(opened).toMatchObject({ sessionId: A_SESSION, state: "open", openedAt: NOW });
      expect(recorder.opened).toEqual([opened]);
    });

    it("is a no-op on a conversation that is already open, so the transcript survives", async () => {
      const recorder = stub({ conversation: conversation() });

      const opened = await new StartConversation(recorder.repository, () => NOW).execute(A_SESSION);

      expect(opened.state).toBe("open");
      expect(recorder.opened).toEqual([]);
    });

    it("re-opens one the owner closed", async () => {
      const recorder = stub({ conversation: conversation({ state: "closed", closedAt: NOW }) });

      const opened = await new StartConversation(recorder.repository, () => NOW).execute(A_SESSION);

      expect(opened).toMatchObject({ state: "open", closedAt: null });
      expect(recorder.opened).toHaveLength(1);
    });

    it("refuses a session id that is not a session", async () => {
      const recorder = stub();

      await expect(new StartConversation(recorder.repository, () => NOW).execute("nope")).rejects.toThrow(
        TypeError,
      );
    });
  });

  describe("CloseConversation", () => {
    it("closes without erasing, and answers null for anything it cannot close", async () => {
      const recorder = stub({ conversation: conversation({ lastVisitorAt: NOW }) });

      const closed = await new CloseConversation(recorder.repository, () => NOW).execute(A_SESSION);

      expect(closed).toMatchObject({ state: "closed", closedAt: NOW, lastVisitorAt: NOW });
      expect(recorder.closed).toHaveLength(1);

      const missing = stub({ conversation: null });

      expect(await new CloseConversation(missing.repository, () => NOW).execute(A_SESSION)).toBeNull();
      expect(await new CloseConversation(missing.repository, () => NOW).execute("nope")).toBeNull();
    });
  });

  describe("ListConversations", () => {
    it("asks for a bounded list and a bounded transcript, and returns what it was given", async () => {
      /*
       * Both caps travel with the read rather than living in a `slice` here: a cap
       * applied after the query has already paid for the rows it throws away is not
       * a cap on the response.
       */
      const summaries: ConversationSummary[] = [
        { ...conversation(), messages: [] },
      ];
      const seen: number[] = [];

      const repository: ChatRepository = {
        ...stub().repository,
        list: async (limit, messagesPerConversation) => {
          seen.push(limit, messagesPerConversation);

          return summaries;
        },
      };

      expect(await new ListConversations(repository).execute()).toBe(summaries);
      expect(seen).toEqual([MAX_OPEN_CONVERSATIONS, CONSOLE_TRANSCRIPT_LIMIT]);
      expect(MAX_OPEN_CONVERSATIONS).toBe(50);
      expect(CONSOLE_TRANSCRIPT_LIMIT).toBe(20);
    });
  });
});
