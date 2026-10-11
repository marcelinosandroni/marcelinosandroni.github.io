export type { Locale } from "@/domain/i18n";

import type { Locale } from "@/domain/i18n";

/**
 * Where a piece of résumé content is allowed to appear.
 *
 * ## Why this is a value and not two copies
 *
 * The home page and the résumé render the same career at different depths: the
 * résumé is the document of record and shows every role in full, the home page
 * is a summary an employer reads in seconds. Those were two independent typed
 * datasets, which is exactly the arrangement that let the two drift apart into
 * contradicting each other.
 *
 * One dataset with a declared surface keeps a single source of the facts, and
 * still lets the owner decide that a role is résumé-only — a decision a global
 * boolean cannot express and a duplicated dataset cannot represent.
 *
 * Absent means "both". That is the right default: a new row added by the
 * database is visible by default, and hiding something is a deliberate act.
 */
export type Surface = "home" | "resume";

/** Every surface, for validation and for the admin's checkboxes. */
export const SURFACES: readonly Surface[] = ["home", "resume"] as const;

/** Whether a value names a real surface. */
export function isSurface(value: string): value is Surface {
  return (SURFACES as readonly string[]).includes(value);
}

/** Narrow an arbitrary list to the surfaces, dropping anything unknown. */
export function toSurfaces(values: readonly string[] | null | undefined): Surface[] {
  if (!Array.isArray(values)) {
    return [...SURFACES];
  }

  const known = values.filter(isSurface);

  // An empty or wholly unrecognised set means "nowhere", not "everywhere".
  // Collapsing it to every surface would make a typo hide nothing and show
  // everything, which is the opposite of what the database recorded.
  return known.length > 0 ? known : [];
}

/** Whether an item carrying these surfaces belongs on `surface`. */
export function appearsOn(surfaces: readonly Surface[] | undefined, surface: Surface): boolean {
  return surfaces === undefined || surfaces.includes(surface);
}

export type CaseStudy = {
  title: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: {
    label: string;
    value: string;
    icon?: "time" | "money" | "people" | "performance";
  }[];
};

export type ResumeExperience = {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  highlights: string[];
  caseStudies?: CaseStudy[];
  technologies?: string[];
  teamSize?: number;
  scope?: string;
  /**
   * Where this role is shown. Absent means both — see `Surface`.
   *
   * A role can be résumé-only when the home page is better for not leading with
   * it: a short early stint reads as a gap on a summary and as context on the
   * document. That is a judgement about the page, not about the truth.
   */
  surfaces?: readonly Surface[];
};

export type ResumeSkillGroup = {
  label: string;
  skills: string[];
};

export type ResumeEducation = {
  title: string;
  institution: string;
  period: string;
  description: string;
};

export type ResumeContent = {
  locale: Locale;
  name: string;
  title: string;
  location: string;
  contact: {
    phone: string;
    email: string;
    linkedin: string;
  };
  summary: string;
  experiences: ResumeExperience[];
  skillGroups: ResumeSkillGroup[];
  education: ResumeEducation[];
  languages: string[];
};
