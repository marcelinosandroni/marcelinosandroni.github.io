import { NextResponse } from "next/server";

import { GetClickHeatmap } from "@/application/analytics/click-analytics";
import { getClickRepository } from "@/infrastructure/analytics/repository";

/**
 * Public aggregate view of click counters.
 *
 * Returns counts keyed by element id. The shape contains nothing a visitor could
 * be identified from, which is why it is safe to expose without a session.
 */
export async function GET() {
  try {
    const aggregates = await new GetClickHeatmap(await getClickRepository()).execute();

    return NextResponse.json({ aggregates }, { headers: { "cache-control": "no-store" } });
  } catch {
    // A dashboard that cannot read its counters shows an empty state; it does
    // not take a page down.
    return NextResponse.json({ aggregates: [] }, { status: 200, headers: { "cache-control": "no-store" } });
  }
}
