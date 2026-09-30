import { NextResponse } from "next/server";

import { ReadConversation } from "@/application/chat/conversation";
import { TrackVisitorHeartbeat } from "@/application/presence/track-visitors";
import { hasExactlyFields } from "@/domain/chat/message";
import { isPresenceSessionId } from "@/domain/presence/presence";
import {
  createAgentReplyResolver,
  createPresenceRealtime,
} from "@/infrastructure/supabase/presence-realtime";

/**
 * The heartbeat: "a browser is on this page".
 *
 * The most ordinary request on the site, and the one with the least in it. A
 * random id the browser generated, and nothing else. Not the address, not the user
 * agent, not the referrer, not the viewport, not a cookie, not a fingerprint: the
 * repository's `touch` has no parameter that could carry any of them, so this
 * endpoint has no way to record one even if a future caller started sending it.
 *
 * That is the same argument `click_aggregates` and `theme_feedback` make, and the
 * reason this one is defensible: the absence is a property of the *shape* rather
 * than a promise about behaviour.
 *
 * ## Why the answer is not empty
 *
 * `204` would be the click route's answer, and it would cost the owner. The
 * heartbeat is the only request every visitor makes, so it is also the only cheap
 * place to learn "has the owner contacted this browser yet" — and learning that in
 * a second request would mean two round trips a minute for every reader of the
 * site. The body is one boolean about the caller's own session, so it reveals
 * nothing to anyone else.
 *
 * ## Codes
 *
 * | Status | Means |
 * | --- | --- |
 * | `400` | no `session` field, or one that is not 32 lowercase hex characters |
 * | `200` | recorded; `offered` says whether the owner has opened a conversation |
 * | `204` | not configured on this deployment, or the write failed — silently |
 *
 * The last row is the important one. A presence heartbeat must never be able to
 * fail a page: the same reasoning as `POST /api/analytics/click`. A deployment
 * with no database, a failed sweep, an unapplied migration — all of them are the
 * server log's problem and not the visitor's, and the widget is invisible to a
 * visitor who has not been contacted anyway.
 */

const NO_STORE = { "cache-control": "no-store" } as const;

/** Only this one field. Anything else is refused, not ignored. */
const SESSION_FIELD = "session";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  /*
   * Reading only `session` would accept `{session, lastSeenAt, userAgent}` and
   * answer `200`, which would make "no device, no fingerprint" a property of this
   * function's body rather than of the endpoint. The field list is the contract,
   * and it is one field long.
   */
  if (!hasExactlyFields(body, [SESSION_FIELD])) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const sessionId = (body as Record<string, unknown>)[SESSION_FIELD];

  if (!isPresenceSessionId(sessionId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const realtime = createPresenceRealtime();

  if (realtime === null) {
    return new NextResponse(null, { status: 204, headers: NO_STORE });
  }

  const tracked = await new TrackVisitorHeartbeat(realtime.presence).execute(sessionId);

  if (!tracked) {
    return new NextResponse(null, { status: 204, headers: NO_STORE });
  }

  try {
    /*
     * The offer check rides along on the heartbeat.
     *
     * One extra read on a request that already happened, rather than a second
     * request per visitor per minute, and it is the read that decides whether a
     * widget exists at all. It cannot be answered differently for a session that
     * does not exist and one nobody has contacted, so it is not an oracle.
     */
    const conversation = await new ReadConversation(
      realtime.chat,
      createAgentReplyResolver(),
    ).execute(sessionId);

    return NextResponse.json({ offered: conversation.offered }, { headers: NO_STORE });
  } catch (error) {
    console.warn(
      "[presence] offer check failed:",
      error instanceof Error ? error.message : error,
    );

    return new NextResponse(null, { status: 204, headers: NO_STORE });
  }
}
