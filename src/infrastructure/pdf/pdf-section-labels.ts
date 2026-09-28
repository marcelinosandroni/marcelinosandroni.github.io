import type { Dictionary } from "@/i18n/dictionaries";
import type { ResumeSectionLabels } from "@/application/publication/build-resume-document";
import type { ResumeTemplateId } from "@/infrastructure/pdf/resume-template-registry";

/**
 * Picks the section headings for the template being rendered.
 *
 * The REFERENCE template reproduces the headings of the original reference PDF,
 * so each template carries its own set. Kept next to the PDF infrastructure
 * because choosing the headings is a presentation decision, not a rendering one.
 */
export function getPdfSectionLabels(
  t: Dictionary,
  templateId: ResumeTemplateId,
): ResumeSectionLabels {
  return templateId === "REFERENCE" ? t.pdf.referenceSections : t.pdf.sections;
}
