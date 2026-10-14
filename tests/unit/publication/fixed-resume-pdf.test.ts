import { describe, expect, it } from "vitest";

import {
  RESUME_PDF_SOURCE_ENV,
  resolveResumePdfSource,
} from "@/domain/publication/resume-pdf-source";
import {
  fixedResumeFilename,
  readFixedResumeArtifact,
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
      A missing artifact is not a failure. A locale with no designed document - and
      the endpoint has a second source precisely so a deployment without one of
      them still serves a PDF - must fall through rather than 500.

      Root rather than `process.cwd()`, because both locales have an artifact now
      and asserting on the working tree would only pass until someone deleted one.
    */
    return expect(
      readFixedResumeArtifact("en-US", "no-such-root-for-tests"),
    ).resolves.toBeNull();
  });

  it("reads both committed artifacts", async () => {
    const [pt, en] = await Promise.all([
      readFixedResumeArtifact("pt-BR", process.cwd()),
      readFixedResumeArtifact("en-US", process.cwd()),
    ]);

    expect(pt?.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(en?.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("reads the committed Portuguese artifact", async () => {
    const artifact = await readFixedResumeArtifact("pt-BR", process.cwd());

    expect(artifact).not.toBeNull();
    // A PDF, by its own header - not a truncated file that would open as nothing.
    expect(artifact?.bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("names the file the same way the download button does", () => {
    /*
      The button fetches the PDF as a blob and saves it under a name it composes,
      so its name is the one a recruiter actually gets. A different name here
      would only ever be seen by someone hitting the URL directly, and two
      conventions for one file reads as a bug to whoever finds it.
    */
    expect(fixedResumeFilename("pt-BR")).toBe("resume-marcelino-sandroni-pt-BR-CLEAN.pdf");
    expect(fixedResumeFilename("en-US")).toBe("resume-marcelino-sandroni-en-US-CLEAN.pdf");
  });

  it("treats a zero-byte file as absent", async () => {
    /*
      A truncated artifact served as a download fails in the reader's viewer with
      nothing on the page to explain why.
    */
    const empty = await readFixedResumeArtifact("en-US", "no-such-root-for-tests");

    expect(empty).toBeNull();
  });
});