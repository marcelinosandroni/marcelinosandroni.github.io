/**
 * The cache policy for a résumé download.
 *
 * ## Why this is not a header typed inline
 *
 * The route used to answer `Cache-Control: public, s-maxage=86400`, which tells
 * a shared cache to keep the document for a day. The URL is stable - the filename
 * is the slug - and the bytes are not: the artifacts are regenerated and committed
 * on every release that touches the content. So a release that fixed the résumé
 * left every CDN copy serving the old document until the following day. A
 * recruiter downloaded a résumé that no longer matched the site and nothing said
 * so.
 *
 * That is the worst kind of stale. It is silent, it is authoritative-looking, and
 * the person who suffers from it is a stranger.
 *
 * ## The rule
 *
 * Content that changes under a stable URL is cached by content, not by time. An
 * ETag over the bytes means the edge revalidates and gets a 304, so a repeated
 * download costs a header round trip rather than four hundred kilobytes - and a
 * download the day after a release costs the new document.
 */
export type ResumePdfCacheDecision = {
  readonly status: 200 | 304;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array | null;
};

const CACHE_CONTROL = "public, max-age=0, must-revalidate";

/**
 * The identifier a cache compares against.
 *
 * SHA-1 rather than a version number, because the thing that has to change when
 * the document changes is the document. A release counter would have to be
 * maintained by hand and would go stale in the one case that matters.
 */
export function resumePdfEtag(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `"${hash(binary)}"`;
}

/**
 * A small, dependency-free digest.
 *
 * The artifacts are a few hundred kilobytes and this runs per request, so it is
 * written to be short and allocation-light rather than cryptographically strong.
 * Its only job is to change when the bytes change.
 */
function hash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);

    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h2 >>> 0).toString(36)}${(h1 >>> 0).toString(36)}`;
}

/** What the route should answer, given what the caller already has. */
export function decideResumePdfResponse(
  bytes: Uint8Array,
  options: { readonly filename: string; readonly ifNoneMatch: string | null },
): ResumePdfCacheDecision {
  const etag = resumePdfEtag(bytes);

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${options.filename}"`,
    "Content-Length": String(bytes.length),
    ETag: etag,
    "Cache-Control": CACHE_CONTROL,
  };

  if (options.ifNoneMatch === etag) {
    return { status: 304, headers: { ETag: etag, "Cache-Control": CACHE_CONTROL }, body: null };
  }

  return { status: 200, headers, body: bytes };
}