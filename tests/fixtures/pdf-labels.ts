import type { Locale } from "@/domain/i18n";
import type { ResumeSectionLabels } from "@/application/publication/build-resume-document";
import { loadDictionary } from "@/i18n/dictionaries/loader";
import { getPdfSectionLabels } from "@/infrastructure/pdf/pdf-section-labels";
import {
  DEFAULT_RESUME_TEMPLATE,
  type ResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";

/**
 * Resolves the real PDF section headings for a locale, going through the same
 * catalog path the application uses. Tests that build a document must therefore
 * exercise the production wiring rather than a duplicated copy of the strings.
 */
export async function labelsFor(
  locale: Locale,
  templateId: ResumeTemplateId = DEFAULT_RESUME_TEMPLATE,
): Promise<ResumeSectionLabels> {
  return getPdfSectionLabels(await loadDictionary(locale), templateId);
}
