import { NextResponse } from "next/server";

import { isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { getOwnerSession } from "@/infrastructure/auth/owner-session";

/**
 * Lightweight status check for the inline admin edit indicator.
 *
 * ## Why this exists
 *
 * The indicator is a client component that needs to know whether the visitor is
 * the owner. It cannot read the session cookie directly (httpOnly), so it asks
 * this endpoint. The answer is a single boolean — no session details, no email,
 * nothing a stranger could use.
 *
 * ## Why 200 rather than 401 on "no"
 *
 * A 401 would tell a scanner that the endpoint exists and that the visitor is
 * not authenticated, which is more information than the indicator needs. A 200
 * with `{ admin: false }` is indistinguishable from a 200 with `{ admin: true }`
 * to anyone who cannot already sign in.
 */
export async function GET(): Promise<Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ admin: false }, { status: 200 });
  }

  const session = await getOwnerSession();

  return NextResponse.json({ admin: session !== null }, { status: 200 });
}
