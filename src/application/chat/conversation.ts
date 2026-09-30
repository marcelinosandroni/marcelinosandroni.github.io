import { DEFAULT_LOCALE, type Locale } from "@/domain/i18n";
import { isPresenceSessionId, type PresenceSessionId } from "@/domain/presence/presence";
import {
  CONSOLE_TRANSCRIPT_LIMIT,
  MAX_OPEN_CONVERSATIONS,
  MAX_TRANSCRIPT_MESSAGES,
  OWNER_RATE_LIMIT,
  VISITOR_RATE_LIMIT,
  autoReplyDecision,
  closeConversation,
  composeAgentMessage,
  composeHumanMessage,
  evaluateRateLimit,
  normaliseMessageBody,
  recordAutoReply,
  recordOwnerReply,
  shouldOfferChat,
  startConversation,
  type AgentReply,
  type ChatMessage,
  type Conversation,
  type ConversationSummary,
  type RateLimitPolicy,
} from "@/domain/chat/message";

/**
 * Conversations, as an application service.
 *
 * The rules live in `@/domain/chat/message`; this module is the choreography —
 * which repository call happens in which order, and what each refusal is called.
 * Three things are worth reading closely:
 *
 * 1. **A read is what posts the automatic reply.** There is no cron on this
 *    deployment and no queue to drain, so the due reply is posted by whichever
 *    party reads the conversation next. Both readers care about it — the visitor
 *    is waiting for a reply, and the owner needs to know the queue already
 *    answered — and both arrive by poll, so the delay is bounded by the poll
 *    interval rather than by a job that may never run.
 * 2. **The rate limit is checked twice, on purpose.** Here, cheaply, so the
 *    common refusal never reaches the database; and again inside the append
 *    function, atomically, so a caller that skips this one cannot outrun it. The
 *    numbers come from the domain in both places, so the two checks cannot
 *    disagree about what the policy is.
 * 3. **The domain composes, the repository persists.** Every transition is
 *    computed by a function in `@/domain/chat/message` and handed to the port as
 *    a whole object, so the SQL and the TypeScript cannot end up with two
 *    different ideas of what an open conversation looks like.
 */

/** Thrown when a visitor writes to a conversation the owner never opened. */
export class ChatNotOfferedError extends Error {
  constructor(readonly sessionId: string) {
    super("Refusing a visitor message for a conversation the owner has not opened");
    this.name = "ChatNotOfferedError";
  }
}

/** Thrown when the owner writes to a conversation that is not open. */
export class ChatClosedError extends Error {
  constructor(readonly sessionId: string) {
    super("Refusing a message in a conversation that is not open");
    this.name = "ChatClosedError";
  }
}

/** Thrown when a session is over its limit, carrying the wait in seconds. */
export class ChatRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super(`Rate limited; retry in ${retryAfterSeconds}s`);
    this.name = "ChatRateLimitedError";
  }
}

/**
 * The conversation port.
 *
 * Note `appendVisitorMessage`: it takes a body, a locale, a policy and a time,
 * and there is no author argument. A visitor appending a message is the only
 * thing this method can do — the author's identity is the method's own, and the
 * database function it calls hard-codes `visitor` as well. Two independent
 * places refuse to let this become a way to write as somebody else, which is the
 * failure that would actually matter.
 *
 * The three `*Conversation(conversation: Conversation)` methods take the whole
 * object the domain built, so a repository cannot quietly write a different
 * transition than the one the rules describe.
 */
export interface ChatRepository {
  /** The conversation row, or `null` when the owner has never opened one. */
  find(sessionId: PresenceSessionId): Promise<Conversation | null>;
  /** Conversations, newest first, each with the tail of its transcript. */
  list(limit: number, messagesPerConversation: number): Promise<ConversationSummary[]>;
  /**
   * Appends a visitor message, enforcing the open state and the rate limit inside
   * the database. Throws {@link ChatNotOfferedError} or
   * {@link ChatRateLimitedError}.
   */
  appendVisitorMessage(input: {
    readonly sessionId: PresenceSessionId;
    readonly body: string;
    readonly locale: Locale;
    readonly policy: RateLimitPolicy;
    readonly at: number;
  }): Promise<ChatMessage>;
  /** Appends the owner's own message, and returns the stored row. */
  appendOwnerMessage(message: ChatMessage): Promise<ChatMessage>;
  /** Appends the automatic reply, and returns the stored row. */
  appendAgentMessage(message: ChatMessage): Promise<ChatMessage>;
  /** The transcript, oldest first, capped. */
  listMessages(sessionId: PresenceSessionId, limit: number): Promise<ChatMessage[]>;
  /** Writes an `open` transition. Only an owner-authenticated caller reaches this. */
  open(conversation: Conversation): Promise<Conversation>;
  /** Writes a `closed` transition. The transcript is kept. */
  close(conversation: Conversation): Promise<Conversation>;
  /** Writes a bookkeeping transition, or `null` when the row has gone. */
  markConversation(conversation: Conversation): Promise<Conversation | null>;
  /** How many messages of `author` this session has sent inside the window. */
  countSince(input: {
    readonly sessionId: PresenceSessionId;
    readonly author: "visitor" | "owner";
    readonly since: number;
  }): Promise<{ count: number; oldestAt: number | null }>;
}

/**
 * The automatic reply's translated text, resolved for the conversation's locale.
 *
 * A seam rather than an import: the catalog is a Next.js module and this service
 * is not, so the route hands the text in instead of the application reaching for
 * a dictionary it cannot load. Async because loading a catalog is async, and the
 * alternative — a resolver that has to have been warmed up first — is a failure
 * waiting for the first conversation of a cold instance.
 */
export type AgentReplyResolver = (locale: Locale) => AgentReply | Promise<AgentReply>;

/**
 * The conversation as a visitor is allowed to know about it.
 *
 * `offered` is the only field allowed to differ, and it is `false` for both "the
 * owner has not contacted this visitor" and "there is no such visitor". Those
 * two answers are identical on purpose: a response that distinguished them would
 * be an oracle for whether a session id exists, and a session id is the one value
 * in this system a stranger might want to guess.
 */
export type VisitorConversation = {
  readonly offered: boolean;
  readonly state: Conversation["state"];
  readonly messages: ReadonlyArray<ChatMessage>;
};

/**
 * Reads a conversation, and pays the debt a read finds.
 *
 * The order is the contract. The automatic reply is posted *before* the
 * transcript is read, so a reply that lands in the same instant as the poll is in
 * the response the visitor is looking at; otherwise it would only appear on the
 * next one, which is exactly the lag that makes a conversation feel broken.
 */
export class ReadConversation {
  constructor(
    private readonly repository: ChatRepository,
    private readonly resolveAgentReply: AgentReplyResolver,
    private readonly now: () => number = Date.now,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async execute(sessionId: unknown): Promise<VisitorConversation> {
    if (!isPresenceSessionId(sessionId)) {
      return { offered: false, state: "unopened", messages: [] };
    }

    const conversation = await this.repository.find(sessionId);

    if (conversation === null || !shouldOfferChat(conversation)) {
      return { offered: false, state: conversation?.state ?? "unopened", messages: [] };
    }

    await this.postAutomaticReplyIfDue(conversation);

    const messages = await this.repository.listMessages(sessionId, MAX_TRANSCRIPT_MESSAGES);

    return { offered: true, state: conversation.state, messages };
  }

  /**
   * Posts the automatic reply when one is owed, and swallows every failure.
   *
   * Swallowed on purpose: this runs on the read path, and a visitor waiting for
   * a message must get their transcript even when the queue's own post failed. A
   * missed automatic reply is a small miss; a read that fails because of one is a
   * chat that looks broken.
   */
  private async postAutomaticReplyIfDue(conversation: Conversation): Promise<void> {
    const at = this.now();
    const decision = autoReplyDecision(conversation, at);

    if (!decision.due) {
      return;
    }

    // The locale was settled by the visitor message that caused this, so the
    // visitor is answered in their own language even when the owner is the party
    // who happened to look first.
    const reply = await this.resolveAgentReply(conversation.visitorLocale ?? DEFAULT_LOCALE);

    try {
      const message = composeAgentMessage({
        id: this.newId(),
        sessionId: conversation.sessionId,
        body: reply.body,
        notice: reply.notice,
        at,
      });

      await this.repository.appendAgentMessage(message);
      await this.repository.markConversation(recordAutoReply(conversation, at));
    } catch {
      // See above: the read still answers.
    }
  }
}

/**
 * Sends the visitor's message.
 *
 * The order is load-bearing. Read, offer-check, rate-check, normalise, append —
 * so a body that is too long is refused before a rate-limit query is spent, and a
 * conversation that is not open never reaches the database at all. The database
 * repeats the last two checks anyway; this ordering is what makes the common case
 * cheap, not what makes it safe.
 */
export class SendVisitorMessage {
  constructor(
    private readonly repository: ChatRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(sessionId: unknown, text: unknown, locale: Locale): Promise<ChatMessage> {
    if (!isPresenceSessionId(sessionId)) {
      throw new ChatNotOfferedError(String(sessionId));
    }

    const conversation = await this.repository.find(sessionId);

    if (conversation === null || !shouldOfferChat(conversation)) {
      throw new ChatNotOfferedError(sessionId);
    }

    const at = this.now();
    await this.assertWithinRateLimit(sessionId, at);

    const body = normaliseMessageBody(text);

    const stored = await this.repository.appendVisitorMessage({
      sessionId,
      body,
      locale,
      policy: VISITOR_RATE_LIMIT,
      at,
    });

    /*
     * Recomposed rather than echoed. The row came back from PostgREST as
     * `unknown`, and re-running the constructor is what proves the response this
     * visitor is shown is a message the contract would accept.
     */
    return composeHumanMessage({
      id: stored.id,
      sessionId,
      author: "visitor",
      body,
      at: stored.sentAt,
    });
  }

  private async assertWithinRateLimit(sessionId: PresenceSessionId, at: number): Promise<void> {
    const observed = await this.repository.countSince({
      sessionId,
      author: "visitor",
      since: at - VISITOR_RATE_LIMIT.windowMs,
    });

    const decision = evaluateRateLimit(VISITOR_RATE_LIMIT, observed, at);

    if (!decision.allowed) {
      throw new ChatRateLimitedError(decision.retryAfterSeconds);
    }
  }
}

/**
 * Sends the owner's reply.
 *
 * The same shape as the visitor's path with a higher limit, and the same
 * `normaliseMessageBody` call, so an owner cannot write a message the visitor
 * would have been refused. The transcript is one list rendered by one component;
 * two authors with two different sets of rules would be a bug waiting for a paste.
 */
export class SendOwnerReply {
  constructor(
    private readonly repository: ChatRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(sessionId: unknown, text: unknown): Promise<ChatMessage> {
    if (!isPresenceSessionId(sessionId)) {
      throw new ChatClosedError(String(sessionId));
    }

    const conversation = await this.repository.find(sessionId);

    if (conversation === null || !shouldOfferChat(conversation)) {
      throw new ChatClosedError(sessionId);
    }

    const at = this.now();
    const observed = await this.repository.countSince({
      sessionId,
      author: "owner",
      since: at - OWNER_RATE_LIMIT.windowMs,
    });

    const decision = evaluateRateLimit(OWNER_RATE_LIMIT, observed, at);

    if (!decision.allowed) {
      throw new ChatRateLimitedError(decision.retryAfterSeconds);
    }

    const body = normaliseMessageBody(text);

    const message = composeHumanMessage({
      id: crypto.randomUUID(),
      sessionId,
      author: "owner",
      body,
      at,
    });

    const stored = await this.repository.appendOwnerMessage(message);

    await this.repository.markConversation(recordOwnerReply(conversation, at));

    return stored;
  }
}

/**
 * Opens a conversation with a visitor: the owner's first word, and the only thing
 * that ever offers a chat to a visitor.
 *
 * Re-opening a closed conversation starts a *new* one: the bookkeeping the domain
 * carries — the visitor's last message, the message the queue already answered —
 * is reset, because those debts belong to the conversation the owner ended. The
 * transcript rows stay, so the words are still readable; what is cleared is the
 * queue's memory of owing an answer.
 */
export class StartConversation {
  constructor(
    private readonly repository: ChatRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(sessionId: unknown): Promise<Conversation> {
    if (!isPresenceSessionId(sessionId)) {
      throw new TypeError(
        `Refusing to open a conversation for an invalid session: ${String(sessionId)}`,
      );
    }

    const existing = await this.repository.find(sessionId);

    // Re-opening an open conversation is a no-op rather than a reset: the
    // transcript is the reason the button is worth pressing twice.
    if (existing !== null && shouldOfferChat(existing)) {
      return existing;
    }

    const at = this.now();
    const conversation = startConversation(sessionId, at);

    return this.repository.open(conversation);
  }
}

/**
 * Closes a conversation.
 *
 * A state change rather than a delete. "Close" means the owner stops answering;
 * the words stay, because a transcript the owner has seen is not theirs to erase
 * on the way out, and because a visitor who reloads must find the conversation
 * gone rather than half-remembered.
 */
export class CloseConversation {
  constructor(
    private readonly repository: ChatRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(sessionId: unknown): Promise<Conversation | null> {
    if (!isPresenceSessionId(sessionId)) {
      return null;
    }

    const conversation = await this.repository.find(sessionId);

    if (conversation === null) {
      return null;
    }

    const at = this.now();

    return this.repository.close(closeConversation(conversation, at));
  }
}

/** The owner's console: every conversation, each with the tail of its transcript. */
export class ListConversations {
  constructor(private readonly repository: ChatRepository) {}

  async execute(): Promise<ReadonlyArray<ConversationSummary>> {
    return this.repository.list(MAX_OPEN_CONVERSATIONS, CONSOLE_TRANSCRIPT_LIMIT);
  }
}
