import { NextResponse, type NextRequest } from "next/server";

import {
  canonicalizeSegment,
  resolveLocale,
  toLocale,
  toLocaleSegment,
  type Locale,
} from "@/domain/i18n";
import { negotiateLocale } from "@/infrastructure/i18n";

/**
 * Locale-aware edge proxy.
 *
 * Responsibilities, in order of importance:
 * 1. Send the bare URL to a canonical localized path so every visitor lands on a
 *    shareable, indexable URL.
 * 2. Honour legacy `?locale=` / `?lang=` links from the previous query-string
 *    based implementation, rewriting them to a permanent path.
 * 3. Normalize non-canonical locale casing (`/PT-BR` -> `/pt-br`) to avoid
 *    duplicate-content variants.
 * 4. Leave everything else alone, so localized routes stay statically
 *    cacheable and unknown paths fall through to the global 404 instead of
 *    bouncing through a pointless redirect.
 *
 * Runs before rendering on the edge: no Node.js APIs, no shared state.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  const canonicalSegment = canonicalizeSegment(firstSegment);

  if (canonicalSegment) {
    if (firstSegment === canonicalSegment) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${canonicalSegment}${pathname.slice(firstSegment.length + 1)}`;
    return NextResponse.redirect(url, 308);
  }

  if (pathname !== "/") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${toLocaleSegment(resolveRequestedLocale(request))}`;
  url.search = "";

  return NextResponse.redirect(url, 307);
}

/**
 * An explicit `?locale=`/`?lang=` wins over `Accept-Language` so legacy shared
 * links keep working; otherwise the browser preference decides. `resolveLocale`
 * already normalizes casing and matches language-only tags (`pt` -> `pt-BR`).
 */
function resolveRequestedLocale(request: NextRequest): Locale {
  const requested = request.nextUrl.searchParams.get("locale") ?? request.nextUrl.searchParams.get("lang");

  if (requested) {
    const resolved = resolveLocale(requested) ?? toLocale(requested);
    if (resolved) {
      return resolved;
    }
  }

  return negotiateLocale(request.headers.get("accept-language"));
}

export const config = {
  matcher: [
    /*
     * Every request except API routes, Next.js internals and files that carry an
     * extension. The negative lookahead keeps the proxy off the hot path for
     * assets, so it never delays static file delivery.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};
