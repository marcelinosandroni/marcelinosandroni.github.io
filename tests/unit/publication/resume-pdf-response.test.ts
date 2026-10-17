import { describe, expect, it } from "vitest";

import {
  decideResumePdfResponse,
  resumePdfEtag,
} from "@/application/publication/resume-pdf-response";

/**
 * What a résumé download is allowed to tell a cache.
 *
 * The route used to answer `Cache-Control: public, s-maxage=86400`. The URL is
 * stable - the filename is the slug - and the bytes are not: the artifacts are
 * regenerated and committed, so a release that fixed the résumé left every CDN
 * copy serving the old document for a day. A recruiter downloads a document that
 * no longer matches the site and nothing says so.
 *
 * These assertions are about the headers rather than the pixels, because the
 * headers are what let the wrong document survive a deployment.
 */
const bytes = (seed: string): Uint8Array => new TextEncoder().encode(seed);

describe("the résumé PDF download response", () => {
  it("never lets a shared cache hold the document for a day", () => {
    const { headers } = decideResumePdfResponse(bytes("%PDF-1.7 one"), {
      filename: "resume-fixed-pt-BR-enterprise-java.pdf",
      ifNoneMatch: null,
    });

    const cacheControl = headers["Cache-Control"] ?? "";

    expect(cacheControl).toContain("must-revalidate");
    expect(cacheControl).not.toContain("s-maxage=86400");
    expect(headers.ETag).toBeTruthy();
  });

  it("answers a matching ETag with nothing rather than with the document again", () => {
    const first = decideResumePdfResponse(bytes("%PDF-1.7 one"), {
      filename: "a.pdf",
      ifNoneMatch: null,
    });

    const etag = first.headers.ETag ?? "";

    expect(etag).not.toBe("");

    const second = decideResumePdfResponse(bytes("%PDF-1.7 one"), {
      filename: "a.pdf",
      ifNoneMatch: etag,
    });

    expect(second.status).toBe(304);
    expect(second.body).toBeNull();
    expect(second.headers.ETag).toBe(etag);
  });

  it("changes its identifier when the document changes", () => {
    /*
      The whole point. Same URL, different bytes, different cache key - which is
      what lets a revalidation tell the edge to stop serving the old résumé.
    */
    const before = resumePdfEtag(bytes("%PDF-1.7 seven"));
    const after = resumePdfEtag(bytes("%PDF-1.7 seven, revised"));

    expect(after).not.toBe(before);
    expect(resumePdfEtag(bytes("%PDF-1.7 seven"))).toBe(before);
  });

  it("ignores a stale identifier and sends the document", () => {
    const current = decideResumePdfResponse(bytes("%PDF-1.7 two"), {
      filename: "b.pdf",
      ifNoneMatch: null,
    });

    const response = decideResumePdfResponse(bytes("%PDF-1.7 two revised"), {
      filename: "b.pdf",
      ifNoneMatch: current.headers.ETag ?? null,
    });

    expect(response.status).toBe(200);
    expect(response.body).not.toBeNull();
  });

  it("names the file it claims to be sending", () => {
    const { headers } = decideResumePdfResponse(bytes("%PDF-1.7 three"), {
      filename: "resume-fixed-pt-BR-enterprise-java.pdf",
      ifNoneMatch: null,
    });

    expect(headers["Content-Disposition"]).toBe(
      'attachment; filename="resume-fixed-pt-BR-enterprise-java.pdf"',
    );
    expect(headers["Content-Type"]).toBe("application/pdf");
  });
});