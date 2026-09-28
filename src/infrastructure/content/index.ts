import type { Locale } from "@/domain/i18n";
import type { ResumeContent } from "@/domain/resume/types";
import { resumeContent } from "@/infrastructure/content/resume-data";
import { resumeContentEnUs } from "@/infrastructure/content/resume-data-en-us";

/**
 * Locale to resume content registry.
 *
 * Keyed by canonical locale so a new language is a one-line addition that the
 * compiler enforces. Only ever called from Server Components, which keeps both
 * catalogs out of the browser bundle.
 */
const CONTENT_BY_LOCALE = {
  "pt-BR": resumeContent,
  "en-US": resumeContentEnUs,
} as const satisfies Record<Locale, ResumeContent>;

export function getResumeContent(locale: Locale): ResumeContent {
  return CONTENT_BY_LOCALE[locale];
}
