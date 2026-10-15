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

/** Every stack the fixed documents cover. `all` is the default. */
export const RESUME_VARIANTS = [
  "all",
  "enterprise-java",
  "enterprise-dotnet",
  "modern-web",
] as const;

export type ResumeVariant = (typeof RESUME_VARIANTS)[number];

/**
 * What the selector calls each document.
 *
 * Named after the stack rather than the seniority, because that is what a
 * recruiter is choosing between: the same person, argued for a different stack.
 */
export const RESUME_VARIANT_LABELS: Record<ResumeVariant, string> = {
  all: "Completo",
  "enterprise-java": "Enterprise Java + Angular",
  "enterprise-dotnet": "Enterprise C# + Angular",
  "modern-web": "Modern Node + Go + React",
};

/**
 * The variant a slug names, or `null` when it names none.
 *
 * `null` rather than a default: an unrecognised slug must not quietly become the
 * general résumé, because the reader asked for a specialised one and would get a
 * document that never mentions their stack. The route turns `null` into a 400
 * with the list of what there is.
 */
export function resolveResumeVariant(raw: string | null): ResumeVariant | null {
  if (raw === null || raw.trim() === "") {
    return "all";
  }

  const slug = raw.trim().toLowerCase();

  return (RESUME_VARIANTS as ReadonlyArray<string>).includes(slug)
    ? (slug as ResumeVariant)
    : null;
}

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
 * The name the recruiter's file arrives under.
 *
 * Deliberately the same shape the download button builds client-side, and the
 * reason is that the button's name is the one that survives: it fetches the PDF
 * as a blob and saves it under a name it composes, so a `Content-Disposition`
 * here is only used by someone hitting the URL directly. Two different
 * conventions for the same file is the kind of thing that looks like a bug to
 * whoever finds it next, so they are the same string.
 */
export function fixedResumeFilename(locale: Locale, variant: ResumeVariant): string {
  const stack = variant === "all" ? "" : `-${variant}`;

  return `resume-marcelino-sandroni-${locale}${stack}-CLEAN.pdf`;
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