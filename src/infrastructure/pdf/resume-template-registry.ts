export const RESUME_TEMPLATE_IDS = ["CLEAN", "REFERENCE"] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];

export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "CLEAN";

export const RESUME_TEMPLATES: ReadonlyArray<{
  id: ResumeTemplateId;
  label: { "pt-BR": string; "en-US": string };
  description: { "pt-BR": string; "en-US": string };
}> = [
  {
    id: "CLEAN",
    label: { "pt-BR": "CLEAN", "en-US": "CLEAN" },
    description: {
      "pt-BR": "Modelo editorial padrão",
      "en-US": "Default editorial template",
    },
  },
  {
    id: "REFERENCE",
    label: { "pt-BR": "REFERENCE", "en-US": "REFERENCE" },
    description: {
      "pt-BR": "Modelo fiel ao PDF de referência",
      "en-US": "Template faithful to the reference PDF",
    },
  },
];

export function isResumeTemplateId(value: string | null): value is ResumeTemplateId {
  return RESUME_TEMPLATE_IDS.some((templateId) => templateId === value);
}