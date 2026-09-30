import type { CaseStudy, ResumeExperience } from "@/domain/resume/types";

/**
 * The two PDF audiences.
 *
 * ## Why one document was wrong for both
 *
 * A recruiter spends thirty seconds and needs to know what was delivered and
 * what it was worth. A technical evaluator spends twenty minutes and needs the
 * reasoning: the challenge, the decision, the result, and the number that
 * proves it.
 *
 * A single PDF cannot serve both. Too dense and the recruiter stops; too thin and
 * the evaluator sees claims with no evidence. So there are two, and this file is
 * the only place that knows which fields each one reads.
 *
 * ## The domain already holds the evidence
 *
 * `caseStudies`, `metrics`, `technologies`, `teamSize` and `scope` are all in
 * `ResumeContent` and all rendered on the web. They were reaching the PDF as
 * *nothing*: `renderExperiences` typed its parameter as a structural subset that
 * did not include them, so the compiler discarded them. The record of 24 case
 * studies and 96 metrics was written, rendered, and then dropped on the floor for
 * the one artifact an evaluator actually downloads.
 *
 * The split below is what makes `REFERENCE` deserve its name.
 */

/** Fields the compact template reads. Everything else is depth it does not need. */
export type CleanExperience = Pick<
  ResumeExperience,
  "company" | "role" | "period" | "location" | "summary" | "highlights"
>;

/** Everything, for the template whose job is to be evidence. */
export type ReferenceExperience = ResumeExperience;

/** Narrows to what the compact template reads, dropping the depth it ignores. */
export function toCleanExperience(experience: ResumeExperience): CleanExperience {
  return {
    company: experience.company,
    role: experience.role,
    period: experience.period,
    location: experience.location,
    summary: experience.summary,
    highlights: experience.highlights,
  };
}

/**
 * How many case studies the reference template prints per employer.
 *
 * Not a quality judgement about the ones left out — the web page carries all of
 * them, and it is the better place to read a full narrative. A PDF is a
 * different medium with a different cost per paragraph, and a reference document
 * that runs to twenty pages stops being read at all.
 *
 * The cut is even rather than "the first few", so the selection cannot depend on
 * the order content happens to be in: taking every third one means a role with
 * five studies shows two and a role with four shows two, which keeps the document
 * proportional to the shape of the career rather than to its chronology.
 */
export const REFERENCE_CASES_PER_EXPERIENCE = 2;

/** Picks the case studies a reference document will print. */
export function selectReferenceCases(cases: readonly CaseStudy[]): CaseStudy[] {
  if (cases.length <= REFERENCE_CASES_PER_EXPERIENCE) {
    return [...cases];
  }

  const step = cases.length / REFERENCE_CASES_PER_EXPERIENCE;
  const picked: CaseStudy[] = [];

  for (let index = 0; index < REFERENCE_CASES_PER_EXPERIENCE; index += 1) {
    // `Math.floor` rather than `Math.round` so the last pick is always inside the
    // array — a rounding artefact on a 5-case role would index past the end.
    picked.push(cases[Math.floor(index * step)] as CaseStudy);
  }

  return picked;
}

/** True when the reference template would print more than the compact one. */
export function hasReferenceDepth(experience: ResumeExperience): boolean {
  return (
    (experience.caseStudies?.length ?? 0) > 0 ||
    (experience.technologies?.length ?? 0) > 0 ||
    experience.teamSize !== undefined ||
    (experience.scope ?? "") !== ""
  );
}
