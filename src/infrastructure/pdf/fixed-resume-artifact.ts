import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/domain/i18n";

/**
 * The pre-rendered recruiter PDF.
 *
 * ## Why a file on disk rather than a render
 *
 * Converting the designed HTML to a PDF means running a browser. A browser does
 * not fit in a serverless function, so the conversion happens on a machine that
 * has one - here, or in CI - and the result is served. The document is fixed, so
 * there is nothing per-request to recompute: this turns the endpoint into a file
 * read, which also removes the database round trip and the LaTeX container from
 * the path a recruiter's download takes.
 *
 * ## Why the locale is in the filename
 *
 * Because the artifact is content, not a template. `pt-BR` and `en-US` are
 * different documents, and serving the Portuguese one to an English reader is
 * worse than serving nothing: it looks correct and reads wrong.
 */
const ARTIFACT_DIRECTORY = join("public", "artifacts", "fixed");

const FILENAMES: Record<Locale, string> = {
  "pt-BR": "resume-fixed-pt-BR.pdf",
  "en-US": "resume-fixed-en-US.pdf",
};

export type FixedResumeArtifact = {
  readonly bytes: Buffer;
  readonly filename: string;
};

/**
 * The artifact for a locale, or `null` when there is none.
 *
 * `null` is a real answer rather than a failure: it means the fixed source has
 * no document in this language, and the caller's correct move is the other
 * source. A missing artifact must not produce a 500 - the endpoint has a second
 * source precisely so that a deployment missing one of them still serves a PDF.
 */
export async function readFixedResumeArtifact(
  locale: Locale,
  root: string = process.cwd(),
): Promise<FixedResumeArtifact | null> {
  const filename = FILENAMES[locale];
  const path = join(root, ARTIFACT_DIRECTORY, filename);

  try {
    const bytes = await fs.readFile(path);

    /*
      A zero-byte file is a truncated artifact, not a document. Serving it would
      produce a download that fails in the reader's PDF viewer with nothing on
      the page to explain why, so it is treated as absent.
    */
    if (bytes.length === 0) {
      return null;
    }

    return { bytes, filename };
  } catch {
    return null;
  }
}