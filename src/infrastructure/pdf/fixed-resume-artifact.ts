import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/domain/i18n";
import {
  RESUME_VARIANTS,
  type ResumeVariant,
} from "@/domain/publication/resume-variant";

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
 *
 * ## Why these filenames are not the download name
 *
 * Because these name a build artifact and the other names the deliverable.
 * `resume-fixed-pt-BR-enterprise-java.pdf` is what the build writes and what the
 * tests assert on; `Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf`
 * is what the recruiter sees. They are deliberately different, and
 * `resumePdfFilename` in the domain is the only thing that builds the second one.
 */

/** Re-exported so callers of this module keep one import for the variant set. */
export { RESUME_VARIANTS };
export type { ResumeVariant };
export { resolveResumeVariant } from "@/domain/publication/resume-variant";

const ARTIFACT_DIRECTORY = join("public", "artifacts", "fixed");

/**
 * The fixed documents, by locale and stack.
 *
 * `all` is the general one. The others are the same structure with the content
 * rewritten for one stack, so a recruiter opening "Java + Angular" gets a
 * document that argues for that stack rather than one that mentions it.
 *
 * The key is the slug the URL carries, and it is also the filename - so a
 * request names exactly one file and there is no lookup table that can disagree
 * with what is on disk.
 */
const FILENAMES: Record<Locale, Record<ResumeVariant, string>> = {
  "pt-BR": {
    all: "resume-fixed-pt-BR.pdf",
    "enterprise-java": "resume-fixed-pt-BR-enterprise-java.pdf",
    "enterprise-dotnet": "resume-fixed-pt-BR-enterprise-dotnet.pdf",
    "modern-web": "resume-fixed-pt-BR-modern-web.pdf",
  },
  "en-US": {
    all: "resume-fixed-en-US.pdf",
    "enterprise-java": "resume-fixed-en-US-enterprise-java.pdf",
    "enterprise-dotnet": "resume-fixed-en-US-enterprise-dotnet.pdf",
    "modern-web": "resume-fixed-en-US-modern-web.pdf",
  },
};

/**
 * The variants that actually have a rendered document in a locale.
 *
 * The selector is built from this rather than from `RESUME_VARIANTS`, because a
 * control that offers a choice the endpoint cannot honour is worse than no
 * control: the reader picks "Java + Angular", gets the general résumé back, and
 * nothing on it says the choice was ignored. Availability is therefore measured,
 * not assumed - a variant that has not been rendered yet is not offered.
 */
export async function availableResumeVariants(
  locale: Locale,
  root: string = process.cwd(),
): Promise<ReadonlyArray<ResumeVariant>> {
  const found: ResumeVariant[] = [];

  for (const variant of RESUME_VARIANTS) {
    try {
      await fs.access(join(root, ARTIFACT_DIRECTORY, FILENAMES[locale][variant]));
      found.push(variant);
    } catch {
      /* not rendered for this locale */
    }
  }

  return found;
}

/**
 * The artifact for a locale, or `null` when there is none.
 *
 * `null` is a real answer rather than a failure: it means the fixed source has
 * no document in this language, and the caller's correct move is the other
 * source. A missing artifact must not produce a 500 - the endpoint has a second
 * source precisely so that a deployment missing one of them still serves a PDF.
 */
export type FixedResumeArtifact = {
  readonly bytes: Buffer;
};

export async function readFixedResumeArtifact(
  locale: Locale,
  variant: ResumeVariant,
  root: string = process.cwd(),
): Promise<FixedResumeArtifact | null> {
  const filename = FILENAMES[locale][variant];
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

    return { bytes };
  } catch {
    return null;
  }
}