import type { Locale } from "@/domain/i18n";
import {
  resolveResumeVariant,
  resumeVariantStack,
  type ResumeVariant,
} from "./resume-variant";

/**
 * The name the recruiter's file arrives under.
 *
 * ## The scheme
 *
 * ```
 * Marcelino Sandroni - Engenheiro de Software.pdf
 * Marcelino Sandroni - Software Engineer.pdf
 * Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf
 * Marcelino Sandroni - Software Engineer - Java and Angular.pdf
 * ```
 *
 * Name, then the role in the language the document is written in, then the stack
 * when the document is written for one. A dash before each part, so the pieces are
 * visibly separate rather than running together in a title case soup.
 *
 * ## Why the role is translated and the slug is not
 *
 * Because the reader knows which document they asked for and does not need the
 * `enterprise-` prefix repeated back to them, and because a filename is at its
 * most useful when it says what the file *is* in the language the file is in. An
 * English reader who downloads a file called `Engenheiro de Software` learns
 * nothing from it that the title bar did not already tell them.
 *
 * ## Why this lives in the domain
 *
 * Two places compose this string and only one of them is the one the recruiter
 * sees. The download button fetches the PDF as a blob and saves it under a name it
 * builds itself, so `Content-Disposition` is only consulted by someone hitting the
 * URL directly — which means a rule the server holds alone is a rule the client
 * silently does not follow.
 *
 * Both call this. A filename is also what a reader sees in their own downloads
 * folder for the rest of their life, which makes it part of the document rather
 * than part of the plumbing.
 */

/** The role, in the language the document is written in. */
const ROLE: Readonly<Record<Locale, string>> = {
  "pt-BR": "Engenheiro de Software",
  "en-US": "Software Engineer",
};

const NAME = "Marcelino Sandroni";
const SEPARATOR = " - ";

/**
 * Builds the download filename for one document.
 *
 * `variant` is the resolved variant rather than the raw slug, so this cannot be
 * called with something the route was about to reject — and a filename is not the
 * place to discover that.
 */
export function resumePdfFilename(locale: Locale, variant: ResumeVariant): string {
  const stack = resumeVariantStack(locale, variant);

  return `${NAME}${SEPARATOR}${ROLE[locale]}${stack === null ? "" : `${SEPARATOR}${stack}`}.pdf`;
}

/**
 * The name for a URL's `?stack=` value, refusing an unknown one.
 *
 * The browser's `download` attribute is not validated by anything, so a name built
 * from a raw query parameter is a name built from whatever a stranger typed. This
 * resolves it the same way the route does and falls back to the general document,
 * which is also what the route serves for a slug it cannot place.
 */
export function resumePdfFilenameForSlug(locale: Locale, raw: string | null): string {
  return resumePdfFilename(locale, resolveResumeVariant(raw) ?? "all");
}