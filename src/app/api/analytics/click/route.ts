import { NextResponse } from "next/server";

import { isTrackableElement } from "@/domain/analytics";
import { RecordClick } from "@/application/analytics/click-analytics";
import { getClickRepository } from "@/infrastructure/analytics/repository";

/**
 * Records one click.
 *
 * The body is read defensively and the element is validated against the
 * allowlist, so this endpoint cannot become a general-purpose write API. The
 * response is always empty and the write never blocks the visitor: click
 * tracking must not be able to fail or slow down a real interaction.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const element = (body as { element?: unknown } | null)?.element;

  if (!isTrackableElement(element)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    await new RecordClick(await getClickRepository()).execute(element);
  } catch (error) {
    // A counter that cannot be written must never surface as a broken site and
    // must never leak a database error to the client. It is still logged
    // server-side: silently swallowing write failures is how a missing migration
    // goes unnoticed for months.
    console.warn("[analytics] click increment failed:", error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
