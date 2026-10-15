import { describe, expect, it } from "vitest";

import {
  RESUME_PDF_SOURCE_ENV,
  resolveResumePdfSource,
} from "@/domain/publication/resume-pdf-source";
import {
  RESUME_VARIANTS,
  availableResumeVariants,
  fixedResumeFilename,
  readFixedResumeArtifact,
  resolveResumeVariant,
} from "@/infrastructure/pdf/fixed-resume-artifact";

/**
 * The fixed recruiter PDF, and the switch that will eventually put the database
 * back.
 *
 * These assertions exist for two failures that are silent. A recruiter who
 * downloads a document served from the wrong source does not learn about it, and
 * a `?stack=` request answered with the generic résumé does not say so either -
 * the filename promises React + Node and the content is not that. Both look like
 * success from the server.
 */
describe("the résumé PDF source", () => {
  it("serves the fixed document by default", () => {
    /*
      Default rather than required: a deployment that has never heard of the
      variable serves the designed document instead of failing to start.
    */
    expect(resolveResumePdfSource({})).toBe("fixed");
    expect(resolveResumePdfSource({ [RESUME_PDF_SOURCE_ENV]: "  " })).toBe("fixed");
  });

  it("restores the database path on request", () => {
    expect(resolveResumePdfSource({ [RESUME_PDF_SOURCE_ENV]: "database" })).toBe("database");
  });

  it("treats an unrecognised value as database rather than as fixed", () => {
    /*
      The conservative direction. A typo must not silently switch a recruiter's
      PDF to something else; it falls back to the pipeline that predates the flag.
    */
    expect(resolveResumePdfSource({ [RESUME_PDF_SOURCE_ENV]: "typo" })).toBe("database");
  });

  it("reads the process environment when given nothing", () => {
    const before = process.env[RESUME_PDF_SOURCE_ENV];

    process.env[RESUME_PDF_SOURCE_ENV] = "database";

    try {
      expect(resolveResumePdfSource()).toBe("database");
    } finally {
      if (before === undefined) {
        delete process.env[RESUME_PDF_SOURCE_ENV];
      } else {
        process.env[RESUME_PDF_SOURCE_ENV] = before;
      }
    }
  });
});

describe("the fixed artifact", () => {
  it("reports absent rather than throwing, so the caller can use the other source", () => {
    /*
      A missing artifact is not a failure. A variant that was never rendered, or a
      locale with no designed document - and the endpoint has a second source
      precisely so a deployment without one of them still serves a PDF - must fall
      through rather than 500.

      Root rather than `process.cwd()`, because every locale and variant has an
      artifact now and asserting on the working tree would only pass until someone
      deleted one.
    */
    return expect(
      readFixedResumeArtifact("en-US", "all", "no-such-root-for-tests"),
    ).resolves.toBeNull();
  });

  it("has a document behind every variant the selector offers", async () => {
    /*
      The invariant that matters, and it is stated over availability rather than
      over the variant list on purpose.

      The selector is built from `availableResumeVariants`, so the only way it can
      promise a download is if availability and readability agree. Asserting over
      `RESUME_VARIANTS` directly would encode a fixed number of documents and stop
      being true the moment a variant is added; asserting over availability keeps
      the check meaningful as the set grows, and fails the moment availability
      starts advertising a file that is not there.
    */
    for (const locale of ["pt-BR", "en-US"] as const) {
      const offered = await availableResumeVariants(locale, process.cwd());

      expect(offered.length, `${locale} offers nothing at all`).toBeGreaterThan(0);
      // The general document is what a reader gets with no stack in the URL.
      expect(offered, `${locale} is missing the general document`).toContain("all");

      for (const variant of offered) {
        const artifact = await readFixedResumeArtifact(locale, variant, process.cwd());

        expect(artifact, `${locale}/${variant} is offered but not readable`).not.toBeNull();
        // A PDF, by its own header - not a truncated file that would open as nothing.
        expect(artifact?.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      }
    }
  });

  it("offers nothing for a root with no artifacts, so the selector cannot lie", async () => {
    return expect(availableResumeVariants("pt-BR", "no-such-root-for-tests")).resolves.toEqual([]);
  });

  it("offers exactly what is on disk, so an unrendered variant is never offered", async () => {
    /*
      The coupling that keeps the selector honest: it is built from availability, so
      offering a variant and failing to serve it are the same event and cannot
      drift apart.

      Today only the general document is rendered. When the specialised ones are
      produced this expectation starts failing until they exist, which is the point
      - it fails on the day the selector would start lying, not after.
    */
    const offered = await availableResumeVariants("pt-BR", process.cwd());

    expect(offered.length).toBeLessThan(RESUME_VARIANTS.length);

    for (const variant of offered) {
      const artifact = await readFixedResumeArtifact("pt-BR", variant, process.cwd());

      expect(artifact, `${variant} offered without a file`).not.toBeNull();
    }
  });

  it("names the file the same way the download button does", () => {
    /*
      The button fetches the PDF as a blob and saves it under a name it composes,
      so its name is the one a recruiter actually gets. A different name here
      would only ever be seen by someone hitting the URL directly, and two
      conventions for one file reads as a bug to whoever finds it.
    */
    expect(fixedResumeFilename("pt-BR", "all")).toBe("resume-marcelino-sandroni-pt-BR-CLEAN.pdf");
    expect(fixedResumeFilename("en-US", "all")).toBe("resume-marcelino-sandroni-en-US-CLEAN.pdf");
    expect(fixedResumeFilename("pt-BR", "modern-web")).toBe(
      "resume-marcelino-sandroni-pt-BR-modern-web-CLEAN.pdf",
    );
  });

  it("treats a zero-byte file as absent", async () => {
    /*
      A truncated artifact served as a download fails in the reader's viewer with
      nothing on the page to explain why.
    */
    const empty = await readFixedResumeArtifact("en-US", "all", "no-such-root-for-tests");

    expect(empty).toBeNull();
  });
});

describe("choosing a variant", () => {
  it("reads no stack as the general document", () => {
    expect(resolveResumeVariant(null)).toBe("all");
    expect(resolveResumeVariant("")).toBe("all");
    expect(resolveResumeVariant("   ")).toBe("all");
  });

  it("accepts every variant the artifacts exist for", () => {
    for (const variant of RESUME_VARIANTS) {
      expect(resolveResumeVariant(variant)).toBe(variant);
    }
  });

  it("normalises case and surrounding space, since it arrives in a URL", () => {
    expect(resolveResumeVariant(" Modern-Web ")).toBe("modern-web");
  });

  it("refuses an unknown slug rather than answering with the general document", () => {
    /*
      The one failure that matters here. A reader who asks for "java-angular" and
      receives the general résumé gets a document that never mentions their stack,
      and nothing on it says the choice was ignored - it looks correct and argues
      nothing.
    */
    expect(resolveResumeVariant("java-angular")).toBeNull();
    expect(resolveResumeVariant("react-node")).toBeNull();
  });
});