import { NextResponse } from "next/server";

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
} from "@/application/chat/conversation";
import {
  ListOnlineVisitors,
  NoteOwnerActivity,
  NoteOwnerSignOut,
} from "@/application/presence/track-visitors";
import {
  InvalidChatMessageError,
  MAX_MESSAGE_LENGTH,
  VISITOR_BODY_FIELDS,
  hasExactlyFields,
  isVisitorIntent,
} from "@/domain/chat/message";
import { isPresenceSessionId } from "@/domain/presence/presence";
import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { negotiateLocale } from "@/infrastructure/i18n";
import {
  createAgentReplyResolver,
  createPresenceRealtime,
  type PresenceRealtime,
} from "@/infrastructure/supabase/presence-realtime";

/**
 * Visitor presence, and the visitor's own half of the conversation.
 *
 * ## The verb is the boundary
 *
 * This file is the whole of the chat feature's anonymous surface, and it is one
 * HTTP method wide:
 *
 * | Method | Who | What |
 * | --- | --- | --- |
 * | `POST` | anybody | read or append **your own** conversation |
 * | `GET` | owner | the console's snapshot |
 * | `PUT` | owner | reply |
 * | `PATCH` | owner | open a conversation — the call that offers a chat |
 * | `DELETE` | owner | close it |
 *
 * Two verbs are anonymous and three are not, and the three that are not resolve
 * the owner session *before* they read a byte of the body — the same guard, the
 * same `503`-then-`401` order, and the same reasoning as
 * `src/app/api/admin/posts`. A rule that can be stated in one sentence survives
 * review; a rule that depends on which field you send does not.
 *
 * ## What an anonymous caller can cause
 *
 * Exactly two things, both about its own session:
 *
 * 1. **Refresh a heartbeat** (`POST /api/presence`) — a session id it generated,
 *    and a time. Nothing about the caller is read from the request: not the
 *    address, not the user agent, not the referrer, not the viewport. The
 *    repository's `touch` has no parameter that could carry one.
 * 2. **Read or append its own transcript**, and only once the owner has opened
 *    the conversation.
 *
 * There is no intent that opens a conversation. That is the product rule, not a
 * missing feature: a visitor is never offered a chat.
 *
 * ## The response is the same either way
 *
 * A read for a session that does not exist and a read for a session the owner has
 * never contacted are byte-identical — `{offered: false, messages: []}`. A
 * response that distinguished them would be an oracle for whether a session id is
 * real, and the session id is the only value in this system a stranger might want
 * to guess.
 *
 * ## Codes
 *
 * | Status | Means |
 * | --- | --- |
 * | `400` | the request is not one of the two shapes below |
 * | `201` | your message was stored |
 * | `403` | the owner has not opened a conversation with you |
 * | `429` | too many messages; `retry-after` says when |
 * | `503` | this deployment has no chat storage at all |
 *
 * `403` and `503` stay apart because they ask for different reactions — one of
 * the visitor and one of the operator — and unlike the click counter, a message
 * is something a person typed and deserves an answer about.
 */

const NO_STORE = { "cache-control": "no-store" } as const;

/** Only this one field on every body. Anything else is refused. */
const SESSION_FIELD = "session";

/* -------------------------------------------------------------------------
 * The anonymous verb
 * ---------------------------------------------------------------------- */

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const intent = (body as { intent?: unknown } | null)?.intent;

  if (!isVisitorIntent(intent)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  /*
   * Refuse a body carrying anything beyond this intent's fields, rather than
   * reading the fields it knows.
   *
   * Reading only `session` and `text` would accept `{session, intent, state:
   * "open"}`, drop the state and answer `201` — so a crafted request would look
   * stored when the thing it asked for never happened, and "a visitor cannot open
   * a conversation" would be a property of the *UI* rather than of the endpoint.
   * The same rule the theme-feedback and CMS endpoints apply, for the same
   * reason.
   */
  if (!hasExactlyFields(body, VISITOR_BODY_FIELDS[intent])) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const record = body as Record<string, unknown>;
  const sessionId = record[SESSION_FIELD];

  if (!isPresenceSessionId(sessionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const realtime = createPresenceRealtime();

  if (realtime === null) {
    // A deployment with no database has no chat. Said plainly rather than
    // pretending the visitor's message went somewhere.
    return NextResponse.json({ error: "chat_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const locale = negotiateLocale(request.headers.get("accept-language"));

  if (intent === "read") {
    const conversation = await new ReadConversation(
      realtime.chat,
      createAgentReplyResolver(),
    ).execute(sessionId);

    return NextResponse.json(conversation, { headers: NO_STORE });
  }

  const text = record.text;

  // Length is checked here as well as in the domain so an oversized body is a
  // `400` before any database work; the domain remains the place the rule lives.
  if (typeof text !== "string" || text.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const message = await new SendVisitorMessage(realtime.chat).execute(sessionId, text, locale);

    return NextResponse.json({ message }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return refusal(error);
  }
}

/* -------------------------------------------------------------------------
 * The owner verbs
 * ---------------------------------------------------------------------- */

/**
 * The console's snapshot: who is here, what has been said, and whether the owner
 * can answer right now.
 *
 * Owner-only, and it is a `GET` on purpose — the console polls it, and a poll has
 * no body to carry a session id in. The visitor's own read is the `POST` above,
 * so the two readers of this table never share a verb and therefore never share
 * an authorisation path.
 */
export async function GET(): Promise<Response> {
  const repositories = await guard();

  if (repositories instanceof Response) {
    return repositories;
  }

  const [board, conversations] = await Promise.all([
    new ListOnlineVisitors(repositories.presence).execute(),
    new ListConversations(repositories.chat).execute(),
  ]);

  return NextResponse.json({ board, conversations }, { headers: NO_STORE });
}

/** The owner's reply. */
export async function PUT(request: Request): Promise<Response> {
  const repositories = await guard();

  if (repositories instanceof Response) {
    return repositories;
  }

  const body = await readJson(request);

  if (body === null || !hasExactlyFields(body, ["session", "text"])) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const record = body as Record<string, unknown>;
  const sessionId = record[SESSION_FIELD];

  if (!isPresenceSessionId(sessionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const message = await new SendOwnerReply(repositories.chat).execute(sessionId, record.text);

    return NextResponse.json({ message }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return refusal(error);
  }
}

/**
 * Opens a conversation with a visitor.
 *
 * This one call is the whole "the owner initiates" rule: the conversation becomes
 * `open`, and from that moment the visitor's own read starts answering
 * `offered: true`. There is no other path to that state — the domain has one
 * constructor for it and it takes no author.
 */
export async function PATCH(request: Request): Promise<Response> {
  const repositories = await guard();

  if (repositories instanceof Response) {
    return repositories;
  }

  const body = await readJson(request);

  if (body === null || !hasExactlyFields(body, [SESSION_FIELD])) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const sessionId = (body as Record<string, unknown>)[SESSION_FIELD];

  if (!isPresenceSessionId(sessionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const conversation = await new StartConversation(repositories.chat).execute(sessionId);

    return NextResponse.json({ conversation }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return refusal(error);
  }
}

/** Closes a conversation. The transcript is kept; the offer is withdrawn. */
export async function DELETE(request: Request): Promise<Response> {
  const repositories = await guard();

  if (repositories instanceof Response) {
    return repositories;
  }

  const sessionId = new URL(request.url).searchParams.get(SESSION_FIELD);

  if (!isPresenceSessionId(sessionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const conversation = await new CloseConversation(repositories.chat).execute(sessionId);

  if (conversation === null) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

/* -------------------------------------------------------------------------
 * Shared plumbing
 * ---------------------------------------------------------------------- */

/**
 * Owner-only resolution, or the `Response` to send.
 *
 * A repository or a `Response`, checked with one `instanceof` — the shape every
 * handler in this codebase already returns, and narrower than a discriminated
 * union would be for a two-outcome guard.
 *
 * The `401` also records the sign-out, and this is the only place in the codebase
 * that knows the session has ended. Without it the stored availability would keep
 * claiming the owner can answer for up to an hour after they left — and the
 * console that could have corrected it has just been unmounted.
 */
async function guard(): Promise<PresenceRealtime | Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503, headers: NO_STORE });
  }

  const realtime = createPresenceRealtime();

  if ((await getOwnerSession()) === null) {
    if (realtime !== null) {
      try {
        await new NoteOwnerSignOut(realtime.presence).execute();
      } catch {
        // A sign-out that cannot be recorded must not turn a 401 into a 500.
      }
    }

    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  if (realtime === null) {
    return NextResponse.json({ error: "chat_not_configured" }, { status: 503, headers: NO_STORE });
  }

  /*
   * A successful owner request *is* the activity that keeps the console
   * "answering". That is what makes the hour in `ownerActivityState` mean
   * something: an hour without anybody looking at this page, not an hour without
   * a message being written.
   */
  await new NoteOwnerActivity(realtime.presence).execute();

  return realtime;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

type Failure = {
  readonly code: string;
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
};

/**
 * Maps a use-case refusal to a status.
 *
 * Each refusal is a different fact and each tells the caller something they can
 * act on: the owner has not opened a conversation (`403`), the conversation is no
 * longer open (`409`), the window has not passed (`429`, with the wait), and the
 * storage is unreachable (`503`).
 */
function refusal(error: unknown): Response {
  const failure = describeFailure(error);

  return NextResponse.json(
    { error: failure.code },
    { status: failure.status, headers: { ...NO_STORE, ...failure.headers } },
  );
}

function describeFailure(error: unknown): Failure {
  if (error instanceof ChatNotOfferedError) {
    return { code: "not_offered", status: 403 };
  }

  if (error instanceof ChatClosedError) {
    return { code: "conversation_closed", status: 409 };
  }

  if (error instanceof ChatRateLimitedError) {
    return {
      code: "rate_limited",
      status: 429,
      headers: { "retry-after": String(error.retryAfterSeconds) },
    };
  }

  if (error instanceof InvalidChatMessageError) {
    return { code: "invalid_message", status: 400 };
  }

  // Logged, never returned: a database error's text is not the visitor's business,
  // and an unapplied migration has to be visible somewhere.
  console.error("[chat] request failed:", error instanceof Error ? error.message : error);

  return { code: "chat_unavailable", status: 503 };
}
