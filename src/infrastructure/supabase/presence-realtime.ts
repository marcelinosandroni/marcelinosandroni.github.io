import { createClient } from "@supabase/supabase-js";

import {
  ChatNotOfferedError,
  ChatRateLimitedError,
  type AgentReplyResolver,
  type ChatRepository,
} from "@/application/chat/conversation";
import type { PresenceRepository } from "@/application/presence/track-visitors";
import {
  MAX_MESSAGE_LENGTH,
  toChatMessage,
  toConversation,
  type ChatMessage,
  type Conversation,
  type ConversationSummary,
  type RateLimitPolicy,
} from "@/domain/chat/message";
import type { Locale } from "@/domain/i18n";
import {
  isPresenceSessionId,
  type PresenceSession,
  type PresenceSessionId,
} from "@/domain/presence/presence";
import { supabaseConfigFromEnv } from "@/infrastructure/supabase/server";
import { getDictionary } from "@/i18n";

/**
 * The server-side plumbing for presence and chat.
 *
 * ## One file, one client, two adapters
 *
 * The two features share a key, a table pair and a privacy argument, and a
 * visitor's session is the join between them. Splitting them across two files
 * would mean two clients and two chances to disagree about what a session id
 * looks like.
 *
 * ## Why the secret key, and why no browser ever sees it
 *
 * Both adapters are built from `supabaseConfigFromEnv`, which reads
 * `SUPABASE_URL` and `SUPABASE_SECRET_KEY` — the pair that **bypasses row level
 * security**. Neither is `NEXT_PUBLIC_`, so neither is inlined into the client
 * bundle, and there is no browser-side Supabase client anywhere in this codebase
 * (see `src/infrastructure/supabase/server.ts` for why that is deliberate). The
 * visitor's browser talks to a Route Handler; the handler talks to the database.
 *
 * That is the whole reason the RLS deny-all in the migration is safe to have: no
 * credential a browser could hold reaches these tables, so there is nothing for a
 * scraper to try. The two `security definer` functions the migration grants to
 * the anonymous role are the *floor* the database itself enforces, in case a
 * publishable key is ever added to a client; the route path is the primary one.
 *
 * ## Why "realtime" is a poll
 *
 * Supabase Realtime would need a key in the browser and a subscription per
 * visitor, which is a credential and a channel to authenticate for a list of two
 * numbers and a transcript that changes when somebody types. The heartbeat
 * already gives the site its liveness — the board is at most
 * `PRESENCE_ONLINE_WINDOW_MS` stale, and the transcript is at most one poll
 * interval stale — so the honest name for this is a short poll, and the file
 * keeps the name it was given.
 */

/* -------------------------------------------------------------------------
 * The narrow client surface
 * ---------------------------------------------------------------------- */

export interface RealtimeResult {
  data: unknown;
  error: { message: string } | null;
}

export interface RealtimeFilter extends PromiseLike<RealtimeResult> {
  eq(column: string, value: unknown): RealtimeFilter;
  lt(column: string, value: unknown): RealtimeFilter;
  gt(column: string, value: unknown): RealtimeFilter;
  gte(column: string, value: unknown): RealtimeFilter;
  order(column: string, options: { ascending: boolean }): RealtimeFilter;
  limit(count: number): RealtimeFilter;
  select(columns?: string): RealtimeFilter;
  maybeSingle(): PromiseLike<RealtimeResult>;
}

export interface RealtimeTable {
  select(columns: string): RealtimeFilter;
  insert(values: Record<string, unknown>): RealtimeFilter;
  update(values: Record<string, unknown>): RealtimeFilter;
  upsert(
    values: Record<string, unknown>,
    options: { onConflict: string },
  ): RealtimeFilter;
  delete(): RealtimeFilter;
}

export interface PresenceRealtimeClient {
  from(table: string): RealtimeTable;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<RealtimeResult>;
}

const PRESENCE = "visitor_presence";
const CONVERSATIONS = "chat_conversations";
const MESSAGES = "chat_messages";
const OWNER = "owner_presence";

/** Mirrors `visitor_presence`'s column list; there is nothing else on the row. */
const PRESENCE_COLUMNS = "session_id, first_seen_at, last_seen_at, heartbeat_count";
const CONVERSATION_COLUMNS =
  "session_id, state, opened_at, closed_at, visitor_locale, last_visitor_at, last_owner_reply_at, auto_replied_to_at, updated_at";
const MESSAGE_COLUMNS = "id, session_id, author, body, sent_at, automated_notice";
const OWNER_COLUMNS = "last_activity_at, signed_out_at";

/** How many timestamps one rate-limit read will look at. See `countSince`. */
const RATE_LIMIT_SCAN_LIMIT = 500;

/**
 * The heartbeat function name in the migration.
 *
 * A string rather than an import, because the function lives in SQL and the
 * migration is the only place its signature exists. `tests/unit/domain/presence.test.ts`
 * asserts the name here is the one the migration defines, so a rename on either
 * side fails a test rather than a production heartbeat.
 */
export const TOUCH_FUNCTION = "touch_visitor_session";

/** The visitor append function. Owns the open-state check and the rate limit. */
export const APPEND_VISITOR_FUNCTION = "append_visitor_message";

/* -------------------------------------------------------------------------
 * Presence
 * ---------------------------------------------------------------------- */

export class SupabasePresenceRepository implements PresenceRepository {
  constructor(private readonly client: PresenceRealtimeClient) {}

  /**
   * Refreshing a session.
   *
   * Delegated to the `touch_visitor_session` function rather than written here,
   * for two reasons. It is the one write an anonymous caller can cause, so the
   * rules about it — the id shape, and the refusal to rewrite a heartbeat that
   * arrived seconds ago — belong in the database where they cannot be skipped by
   * a second implementation. And the function is granted to the `anon` role, so
   * the same rules apply to a caller that never goes through this route.
   */
  async touch(heartbeat: { sessionId: PresenceSessionId; sentAt: number }): Promise<void> {
    if (!isPresenceSessionId(heartbeat.sessionId)) {
      throw new TypeError(`Refusing to track an invalid session: ${heartbeat.sessionId}`);
    }

    const { error } = await this.client.rpc(TOUCH_FUNCTION, { p_session_id: heartbeat.sessionId });

    if (error !== null && error !== undefined) {
      throw new Error(`Presence heartbeat failed: ${error.message}`);
    }
  }

  async list(limit: number): Promise<PresenceSession[]> {
    const { data, error } = await this.client
      .from(PRESENCE)
      .select(PRESENCE_COLUMNS)
      .order("last_seen_at", { ascending: false })
      .limit(limit);

    if (error !== null && error !== undefined) {
      throw new Error(`Presence read failed: ${error.message}`);
    }

    return toPresenceSessions(data);
  }

  async forget(before: number): Promise<number> {
    const { data, error } = await this.client
      .from(PRESENCE)
      .delete()
      .lt("last_seen_at", new Date(before).toISOString());

    if (error !== null && error !== undefined) {
      throw new Error(`Presence sweep failed: ${error.message}`);
    }

    return Array.isArray(data) ? data.length : 0;
  }

  async readOwner(): Promise<{
    lastActivityAt: number | null;
    signedOutAt: number | null;
  } | null> {
    const { data, error } = await this.client
      .from(OWNER)
      .select(OWNER_COLUMNS)
      .maybeSingle();

    if (error !== null && error !== undefined) {
      throw new Error(`Owner presence read failed: ${error.message}`);
    }

    return toOwnerPresence(data);
  }

  async recordOwnerActivity(at: number): Promise<void> {
    await this.writeOwner({ last_activity_at: new Date(at).toISOString(), signed_out_at: null });
  }

  async recordOwnerSignOut(at: number): Promise<void> {
    await this.writeOwner({ signed_out_at: new Date(at).toISOString() });
  }

  /**
   * Writes the singleton owner row.
   *
   * An upsert on the primary key rather than an update, because the row does not
   * exist until the owner has done something and "no row" is a legitimate state the
   * domain reads as `signed-out`.
   *
   * Only the columns named are written, which is what lets the two writes coexist:
   * `recordOwnerActivity` sends the activity and clears the sign-out, and
   * `recordOwnerSignOut` sends the sign-out alone, leaving the last activity where
   * it is. An `ignoreDuplicates` upsert would have been tidier and wrong — the
   * second of the two would silently do nothing for the rest of the day.
   */
  private async writeOwner(values: Record<string, unknown>): Promise<void> {
    const { error } = await this.client
      .from(OWNER)
      .upsert({ id: true, ...values }, { onConflict: "id" });

    if (error !== null && error !== undefined) {
      throw new Error(`Owner presence write failed: ${error.message}`);
    }
  }
}

/** Reads rows into the domain's shape, dropping anything that does not fit. */
function toPresenceSessions(data: unknown): PresenceSession[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const sessions: PresenceSession[] = [];

  for (const row of data) {
    if (typeof row !== "object" || row === null) {
      continue;
    }

    const record = row as Record<string, unknown>;
    const sessionId = record.session_id;
    const firstSeenAt = readTime(record.first_seen_at);
    const lastSeenAt = readTime(record.last_seen_at);
    const heartbeatCount = record.heartbeat_count;

    if (
      !isPresenceSessionId(sessionId) ||
      firstSeenAt === null ||
      lastSeenAt === null ||
      typeof heartbeatCount !== "number"
    ) {
      continue;
    }

    sessions.push({ sessionId, firstSeenAt, lastSeenAt, heartbeatCount });
  }

  return sessions;
}

function toOwnerPresence(data: unknown): {
  lastActivityAt: number | null;
  signedOutAt: number | null;
} | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;

  return {
    lastActivityAt: readTime(record.last_activity_at),
    signedOutAt: readTime(record.signed_out_at),
  };
}

function readTime(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? null : parsed;
}

/* -------------------------------------------------------------------------
 * Chat
 * ---------------------------------------------------------------------- */

export class SupabaseChatRepository implements ChatRepository {
  constructor(private readonly client: PresenceRealtimeClient) {}

  async find(sessionId: PresenceSessionId): Promise<Conversation | null> {
    if (!isPresenceSessionId(sessionId)) {
      return null;
    }

    const { data, error } = await this.client
      .from(CONVERSATIONS)
      .select(CONVERSATION_COLUMNS)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error !== null && error !== undefined) {
      throw new Error(`Conversation read failed: ${error.message}`);
    }

    return toConversation(data);
  }

  /**
   * The console's list.
   *
   * Two round trips rather than one joined read: the conversations, then the tail
   * of each transcript. A PostgREST embed would be tidier, but it would also
   * return every message of every conversation and then throw most of them away
   * in JavaScript — and the console shows twenty lines per thread, not a history.
   */
  async list(limit: number, messagesPerConversation: number): Promise<ConversationSummary[]> {
    const { data, error } = await this.client
      .from(CONVERSATIONS)
      .select(CONVERSATION_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error !== null && error !== undefined) {
      throw new Error(`Conversation list failed: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    const summaries: ConversationSummary[] = [];

    for (const row of rows) {
      const conversation = toConversation(row);

      if (conversation === null) {
        continue;
      }

      summaries.push({
        ...conversation,
        messages: await this.listMessages(conversation.sessionId, messagesPerConversation),
      });
    }

    return summaries;
  }

  async appendVisitorMessage(input: {
    sessionId: PresenceSessionId;
    body: string;
    locale: string;
    policy: RateLimitPolicy;
    at: number;
  }): Promise<ChatMessage> {
    /*
     * The function, not an insert.
     *
     * The open-state check and the rate limit have to be in the same transaction
     * as the insert, or two concurrent requests both read "4 sent" and both
     * write a fifth. Doing it here would mean read-then-write across two round
     * trips with a window in between — so the database does it, and the policy
     * numbers travel as arguments so there is one definition of them.
     */
    const { data, error } = await this.client.rpc(APPEND_VISITOR_FUNCTION, {
      p_session_id: input.sessionId,
      p_body: input.body,
      p_locale: input.locale,
      p_limit: input.policy.limit,
      p_window_seconds: Math.round(input.policy.windowMs / 1000),
    });

    if (error !== null && error !== undefined) {
      throw translateAppendFailure(error.message, input.sessionId);
    }

    const messageId = typeof data === "string" ? data : readId(data);

    return this.requireMessage(messageId, input.sessionId);
  }

  async appendOwnerMessage(message: ChatMessage): Promise<ChatMessage> {
    return this.insert(message);
  }

  async appendAgentMessage(message: ChatMessage): Promise<ChatMessage> {
    return this.insert(message);
  }

  /**
   * One insert for both human and automatic messages.
   *
   * The owner's and the queue's rows are written the same way on purpose: same
   * columns, same normalisation, same read-back check. The difference between
   * them is the `author` value and the notice that goes with it, and both are
   * decided by the domain before this point — which is why a direct insert here
   * is safe for an `agent` message and would not be if the caller could choose
   * the author freely.
   */
  private async insert(message: ChatMessage): Promise<ChatMessage> {
    if (!isPresenceSessionId(message.sessionId)) {
      throw new TypeError(`Refusing to append a message for an invalid session`);
    }

    if (message.body.length > MAX_MESSAGE_LENGTH) {
      throw new TypeError(`Refusing to append a message longer than ${MAX_MESSAGE_LENGTH} characters`);
    }

    if (message.author === "agent" && (message.automatedNotice ?? "").trim() === "") {
      throw new TypeError("Refusing to append an automated message without its notice");
    }

    const { error } = await this.client.from(MESSAGES).insert({
      id: message.id,
      session_id: message.sessionId,
      author: message.author,
      body: message.body,
      sent_at: new Date(message.sentAt).toISOString(),
      automated_notice: message.automatedNotice,
    });

    if (error !== null && error !== undefined) {
      throw new Error(`Message write failed: ${error.message}`);
    }

    return message;
  }

  async listMessages(sessionId: PresenceSessionId, limit: number): Promise<ChatMessage[]> {
    if (!isPresenceSessionId(sessionId)) {
      return [];
    }

    const { data, error } = await this.client
      .from(MESSAGES)
      .select(MESSAGE_COLUMNS)
      .eq("session_id", sessionId)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error !== null && error !== undefined) {
      throw new Error(`Transcript read failed: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];

    // Read newest-first, rendered oldest-first: the transcript is a conversation,
    // and the limit has to drop the *oldest* messages rather than the newest.
    return rows
      .map((row) => toChatMessage(row))
      .filter((message): message is ChatMessage => message !== null)
      .reverse();
  }

  async open(conversation: Conversation): Promise<Conversation> {
    return this.writeConversation(conversation, {
      state: conversation.state,
      opened_at: toIso(conversation.openedAt),
      closed_at: null,
      visitor_locale: conversation.visitorLocale,
      last_visitor_at: toIso(conversation.lastVisitorAt),
      last_owner_reply_at: toIso(conversation.lastOwnerReplyAt),
      auto_replied_to_at: toIso(conversation.autoRepliedToAt),
      updated_at: toIso(conversation.updatedAt),
    });
  }

  async close(conversation: Conversation): Promise<Conversation> {
    return this.writeConversation(conversation, {
      state: conversation.state,
      closed_at: toIso(conversation.closedAt),
      updated_at: toIso(conversation.updatedAt),
    });
  }

  async markConversation(conversation: Conversation): Promise<Conversation | null> {
    return this.writeConversation(conversation, {
      last_visitor_at: toIso(conversation.lastVisitorAt),
      last_owner_reply_at: toIso(conversation.lastOwnerReplyAt),
      auto_replied_to_at: toIso(conversation.autoRepliedToAt),
      updated_at: toIso(conversation.updatedAt),
    });
  }

  private async writeConversation(
    conversation: Conversation,
    values: Record<string, unknown>,
  ): Promise<Conversation> {
    const { data, error } = await this.client
      .from(CONVERSATIONS)
      .upsert(
        { session_id: conversation.sessionId, ...values },
        { onConflict: "session_id" },
      )
      .select(CONVERSATION_COLUMNS)
      .maybeSingle();

    if (error !== null && error !== undefined) {
      throw new Error(`Conversation write failed: ${error.message}`);
    }

    const written = toConversation(data);

    if (written === null) {
      throw new Error(
        `Conversation ${conversation.sessionId} could not be read back after a write`,
      );
    }

    return written;
  }

  async countSince(input: {
    sessionId: PresenceSessionId;
    author: "visitor" | "owner";
    since: number;
  }): Promise<{ count: number; oldestAt: number | null }> {
    if (!isPresenceSessionId(input.sessionId)) {
      return { count: 0, oldestAt: null };
    }

    const { data, error } = await this.client
      .from(MESSAGES)
      .select("sent_at")
      .eq("session_id", input.sessionId)
      .eq("author", input.author)
      .gt("sent_at", new Date(input.since).toISOString())
      .limit(RATE_LIMIT_SCAN_LIMIT);

    if (error !== null && error !== undefined) {
      throw new Error(`Rate limit count failed: ${error.message}`);
    }

    /*
     * Counted in JavaScript from the timestamps rather than with a `count(*)`
     * aggregate, because the rate limiter also needs the *oldest* of the counted
     * messages to compute `Retry-After`, and two queries would be worse than one
     * small one. The cap is far above both policies (`VISITOR_RATE_LIMIT` is five
     * a minute), so a session that reaches it is already refused — a limit that
     * can be outrun by hitting the cap is not a limit, and this one only refuses
     * earlier.
     */
    const times = (Array.isArray(data) ? data : [])
      .map((row) =>
        typeof row === "object" && row !== null ? readTime((row as Record<string, unknown>).sent_at) : null,
      )
      .filter((time): time is number => time !== null);

    if (times.length === 0) {
      return { count: 0, oldestAt: null };
    }

    return { count: times.length, oldestAt: Math.min(...times) };
  }

  private async requireMessage(id: string, sessionId: PresenceSessionId): Promise<ChatMessage> {
    const { data, error } = await this.client
      .from(MESSAGES)
      .select(MESSAGE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error !== null && error !== undefined) {
      throw new Error(`Message read-back failed: ${error.message}`);
    }

    const message = toChatMessage(data);

    if (message === null || message.sessionId !== sessionId) {
      throw new Error(`Message ${id} could not be read back after a write`);
    }

    return message;
  }
}

function toIso(at: number | null): string | null {
  return at === null ? null : new Date(at).toISOString();
}

function readId(data: unknown): string {
  if (typeof data === "object" && data !== null) {
    const id = (data as Record<string, unknown>).id;

    if (typeof id === "string") {
      return id;
    }
  }

  return "";
}

/**
 * Turns the function's error into the refusal it means.
 *
 * The function raises a plain exception rather than returning a status, so the
 * message is the only signal — and the mapping is by exact text, which is why
 * every string here appears verbatim in the migration and is asserted by the
 * unit test. A message that matches none of them becomes a generic failure, not
 * a guessed verdict: reporting "rate limited" for an unknown error would tell a
 * visitor their message was dropped when the truth is that the database is
 * unwell.
 *
 * The application's own error classes are thrown rather than local copies, so
 * the route's `instanceof` works no matter which of the two checks refused. The
 * adapters already import their port from `@/application`, so this is the same
 * direction of dependency the rest of the infrastructure layer uses.
 */
function translateAppendFailure(message: string, sessionId: string): Error {
  if (message.includes(ERR_CHAT_NOT_OPEN)) {
    return new ChatNotOfferedError(sessionId);
  }

  if (message.includes(ERR_CHAT_RATE_LIMITED)) {
    return new ChatRateLimitedError(1);
  }

  return new Error(`Visitor message refused: ${message}`);
}

/**
 * The two refusal codes, as text.
 *
 * They are the only thing this adapter parses out of a database error, so they
 * are constants rather than inline strings, and the migration raises exactly
 * these. Using a machine-readable code would mean a custom Postgres error type
 * for two cases; matching an exact phrase inside a `raise exception` is enough
 * when the phrase appears once, in one function, in one migration.
 */
export const ERR_CHAT_NOT_OPEN = "chat_not_open";
export const ERR_CHAT_RATE_LIMITED = "chat_rate_limited";


/* -------------------------------------------------------------------------
 * Composition root
 * ---------------------------------------------------------------------- */

/**
 * The translated automatic reply, as the application asks for it.
 *
 * It lives here rather than in either route because two handlers need it: the
 * chat read posts a due reply, and the heartbeat — which every visitor makes once
 * a minute, and which is therefore the only request that reliably happens while a
 * conversation is unattended — checks the offer and pays the same debt. A third
 * option, a copy in each route, is a copy that will be edited in one place.
 *
 * The locale is the conversation's, not the reader's, and that is the point: the
 * text is loaded for the language of the message that caused the reply, so a
 * visitor is answered in their own language even when the owner is the person who
 * happened to look first.
 */
export function createAgentReplyResolver(): AgentReplyResolver {
  return async (locale: Locale) => {
    const t = await getDictionary(locale);

    return { notice: t.chat.agentNotice, body: t.chat.agentReply };
  };
}


/**
 * The repositories, or `null` when this deployment has no Supabase.
 *
 * `null` rather than an in-memory stand-in, and the difference from the theme
 * feedback root is deliberate. A counter degrades honestly to zero; a transcript
 * does not. A process-local store would answer a visitor's message for the
 * lifetime of one serverless instance and then lose it, which is a feature that
 * appears to work and silently drops what somebody wrote — so the deployment with
 * no database says so instead, and the routes turn that into a `503`.
 *
 * Not cached, for the same reason the CMS root is not: `createClient` opens no
 * connection, and a cached answer derived from `process.env` cannot be re-derived
 * by a test or by a runtime secret reload.
 */
export interface PresenceRealtime {
  readonly presence: PresenceRepository;
  readonly chat: ChatRepository;
}

export function createPresenceRealtime(): PresenceRealtime | null {
  const config = supabaseConfigFromEnv();

  if (!config.configured) {
    return null;
  }

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as unknown as PresenceRealtimeClient;

  return {
    presence: new SupabasePresenceRepository(client),
    chat: new SupabaseChatRepository(client),
  };
}

