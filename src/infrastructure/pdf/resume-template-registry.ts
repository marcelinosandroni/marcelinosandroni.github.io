/**
 * PDF template registry.
 *
 * Intentionally free of user-facing text: template labels and descriptions
 * live in the message catalogs (`t.pdf.templates`) so no copy is duplicated
 * outside the i18n layer.
 */
export const RESUME_TEMPLATE_IDS = ["CLEAN", "REFERENCE"] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];

export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "CLEAN";

export const RESUME_TEMPLATES: ReadonlyArray<{ id: ResumeTemplateId }> = RESUME_TEMPLATE_IDS.map(
  (id) => ({ id }),
);

export function isResumeTemplateId(value: string | null): value is ResumeTemplateId {
  return RESUME_TEMPLATE_IDS.some((templateId) => templateId === value);
}
