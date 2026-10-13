/**
 * PDF template registry.
 *
 * Intentionally free of user-facing text: template labels and descriptions
 * live in the message catalogs (`t.pdf.templates`) so no copy is duplicated
 * outside the i18n layer.
 *
 * ## The two templates, and why they are named this
 *
 * `CLEAN` is the default and stays compact: role, dates, and the outcomes that
 * carry a number. Someone in a hurry spends thirty seconds on it.
 *
 * `DETAILED` is the same résumé with the evidence — case studies, their metrics,
 * the stack behind each role, the team size, the scope. A technical evaluator
 * spends twenty minutes and needs the reasoning, not the headline.
 *
 * It was called `REFERENCE` until this was corrected, which read as "the
 * canonical document" and made the *shorter* template look like the fallback.
 * The name was wrong about what the reader would get.
 */
export const RESUME_TEMPLATE_IDS = ["CLEAN", "DETAILED"] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATE_IDS)[number];

export const DEFAULT_RESUME_TEMPLATE: ResumeTemplateId = "CLEAN";

export const RESUME_TEMPLATES: ReadonlyArray<{ id: ResumeTemplateId }> = RESUME_TEMPLATE_IDS.map(
  (id) => ({ id }),
);

/**
 * Names that were correct when written and are now wrong.
 *
 * Kept for one version, because `?template=REFERENCE` is in bookmarked links and
 * in a recruiter's sent message. Renaming the constant without accepting the old
 * value turns a shared link into a `400 invalid_template` — and the reader who
 * clicks it concludes the document is gone rather than renamed.
 *
 * Returning the *new* id rather than accepting both means there is one canonical
 * value downstream: the cache signature, the filename and the label cannot
 * disagree about which document was rendered.
 */
const RENAMED: Readonly<Record<string, ResumeTemplateId>> = {
  REFERENCE: "DETAILED",
};

export function isResumeTemplateId(value: string | null): value is ResumeTemplateId {
  return RESUME_TEMPLATE_IDS.some((templateId) => templateId === value);
}

/**
 * Resolves a requested template, including the names it used to have.
 *
 * `null` for an unrecognised value rather than falling back to the default: the
 * route turns `null` into `invalid_template`, and silently serving the default
 * would answer a request for a document that does not exist with a different
 * document, which is a wrong answer that looks like a success.
 */
export function resolveResumeTemplateId(value: string | null): ResumeTemplateId | null {
  if (value === null) {
    return DEFAULT_RESUME_TEMPLATE;
  }

  if (isResumeTemplateId(value)) {
    return value;
  }

  return RENAMED[value] ?? null;
}
