import { NextResponse } from "next/server";

import { GetThemeFeedback, RecordThemeFeedback } from "@/application/feedback/theme-feedback";
import { getThemeFeedbackRepository } from "@/infrastructure/feedback/repository";
import {
  isFeedbackTheme,
  isFeedbackVerdict,
} from "@/domain/feedback/theme-feedback";

/**
 * Reads every theme verdict, for the admin panel.
 *
 * `no-store` because the answer is a live count and a cached one would be a
 * number that is quietly wrong. A failure returns an empty list rather than an
 * error, so an unapplied migration shows as "no feedback yet" — which is what it
 * is — instead of a panel that refuses to render.
 */
export async function GET(): Promise<Response> {
  const headers = { "cache-control": "no-store" };

  try {
    const counts = await new GetThemeFeedback(await getThemeFeedbackRepository()).execute();

    return NextResponse.json({ counts }, { headers });
  } catch {
    return NextResponse.json({ counts: [] }, { status: 200, headers });
  }
}

/**
 * Records a reader's verdict on a theme.
 *
 * Mirrors the click route's contract: `204` on any outcome a reader caused, and
 * never a body that could say whether a particular value was accepted. A `400`
 * for a malformed body is the exception, and it leaks nothing — it says the
 * request was malformed, not that a value was wrong.
 *
 * A write failure is swallowed with a server-side warning rather than reported
 * to the client. Telling a visitor their feedback was not saved is worse than
 * not asking, and the server log is where an unapplied migration shows up.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const { theme, verdict } = (body ?? {}) as { theme?: unknown; verdict?: unknown };

  if (!isFeedbackTheme(theme) || !isFeedbackVerdict(verdict)) {
    return new NextResponse(null, { status: 400 });
  }

  /*
   * Reject a body carrying anything beyond the two fields.
   *
   * Reading only `theme` and `verdict` would accept `{theme, verdict, comment}`,
   * silently drop the comment, and answer 204 — so a crafted request would look
   * stored when nothing was. More importantly it would make "no comment column"
   * a property of the *UI* rather than of the endpoint, which is the same
   * promise-about-behaviour that the schema exists to replace.
   *
   * Unknown fields are refused rather than ignored, so a future column cannot
   * be added by accident on the client side either.
   */
  const keys = Object.keys(body as Record<string, unknown>).sort();
  const expected = ["theme", "verdict"];

  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await new RecordThemeFeedback(await getThemeFeedbackRepository()).execute(theme, verdict);
  } catch (error) {
    console.warn(
      "[feedback] theme write failed:",
      error instanceof Error ? error.message : error,
    );
  }

  return new NextResponse(null, { status: 204 });
}
