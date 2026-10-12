import { normalizeForMatch, type ResumeStackIndex } from "@/domain/resume/technology";
import type { ResumeContent } from "@/domain/resume/types";
import { expandFocus, type TechnologyEdge } from "@/domain/resume/focus";

/**
 * Matches a pasted job description against the résumé, deterministically.
 *
 * ## What it does and does not do
 *
 * It **reads** the posting and reports what the owner already covers, what he
 * does not, and which profile to read the résumé with. It does not write a
 * sentence. Nothing here generates prose about a job the owner has not done,
 * which is the one thing this site must never do — a tailored résumé that
 * claims an achievement the posting asked for is not a tailored résumé, it is a
 * fabricated reference, and it is discovered in an interview.
 *
 * So the output is: a ranked coverage report, a suggested profile, and gaps the
 * owner should either close or expect to be asked about. The document itself is
 * still the owner's own words.
 */

/** One thing the posting asked for, and whether the résumé evidences it. */
export type RequirementMatch = {
  /** The technology's label, as the résumé writes it. */
  readonly label: string;
  readonly slug: string;
  readonly categoryLabel: string | null;
  /** How the posting named it — what the owner will recognise in the text. */
  readonly matchedOn: string;
  /** True when the résumé shows the technology doing something, not merely listed. */
  readonly evidenced: boolean;
  /** The role, when the résumé links one. */
  readonly evidencedIn: readonly string[];
  /** Whether an alias matched rather than the label itself. */
  readonly viaAlias: boolean;
};

export type JobMatchResult = {
  /** What the résumé covers, strongest first. */
  readonly covered: readonly RequirementMatch[];
  /**
   * Named in the posting, not in the résumé.
   *
   * The most valuable output. A gap the owner can close before applying is worth
   * more than a tailored document that quietly omits a requirement the employer
   * listed — and a matcher that reported only coverage would let that omission
   * read as "he covered everything".
   */
  readonly gaps: readonly string[];
  /** The profile that best matches, when one is close enough to suggest. */
  readonly suggestedProfile: { slug: string; label: string; overlap: number } | null;
  /** Every profile's overlap, so the owner can choose rather than accept. */
  readonly profiles: ReadonlyArray<{ slug: string; label: string; overlap: number }>;
  /** Words in the posting that matched nothing and are not technologies. */
  readonly unrecognised: readonly string[];
};

/** Terms that are job-description boilerplate, not requirements. */
const NOISE: ReadonlySet<string> = new Set([
  "experience",
  "experiencia",
  "years",
  "ano",
  "anos",
  "year",
  "idade",
  "age",
  "team",
  "equipe",
  "time",
  "tempo",
  "full",
  "stack",
  "conhecimento",
  "conhecimento",
  "knowledge",
  "skills",
  "skill",
  "habilidade",
  "competencias",
  "formacao",
  "graduacao",
  "superior",
  "completo",
  "completa",
  "integral",
  "remoto",
  "remote",
  "onsite",
  "presencial",
  "modelo",
  "salario",
  "salary",
  "benefits",
  "beneficios",
  "local",
  "location",
  "cidade",
  "vaga",
  "position",
  "role",
  "pessoa",
  "candidate",
  "candidato",
  "desejavel",
  "desejável",
  "plus",
  "bonus",
  "obrigatorio",
  "obrigatório",
  "required",
  "must",
  "have",
  "ter",
  "have",
  "work",
  "trabalhar",
  "trabalha",
  "atuacao",
  "atuação",
  "desenvolvimento",
  "development",
  "responsabilidades",
  "atividades",
  "projetos",
  "projects",
  "sistemas",
  "systems",
  "solucoes",
  "soluções",
  "produto",
  "product",
  "cliente",
  "clients",
  "negocio",
  "business",
  "processos",
  "process",
  "otimizacao",
  "otimização",
  "optimization",
  "melhoria",
  "melhorias",
  "improve",
  "evolution",
  "evolucao",
  "evolução",
]);

export type MatchableTechnology = {
  readonly slug: string;
  readonly label: string;
  readonly categoryLabel: string | null;
  readonly aliases: readonly string[];
};

/**
 * Matches a posting against the résumé.
 *
 * ## The matching is a whole-word containment test, not a tokeniser
 *
 * Because the posting does not use the résumé's vocabulary. It says "Postgres 15"
 * and "k8s" and "Amazon EKS" where the résumé says "PostgreSQL", "Kubernetes"
 * and "AWS" — and the only reason any of those match is `aliases`, which the
 * owner curates. Everything else is normalised text compared on word
 * boundaries.
 *
 * ## Why stemming is deliberately absent
 *
 * Because a matcher that guesses will eventually match something the owner has
 * not used. "Go" inside "Mongo", "R" inside "React" — these are the exact
 * failures `normalizeForMatch` plus a boundary rule exists to prevent, and a
 * stemmer makes the boundary rule harder to hold rather than easier.
 *
 * ## Why coverage requires more than a chip
 *
 * A chip says the owner has touched a tool. `evidenced` says a **bullet names
 * it**, which is a different and stronger claim. The two are reported
 * separately so the owner can see which requirements are backed by a story and
 * which are backed only by a list — because a recruiter reads the first and
 * skips the second.
 */
export function matchJobDescription(
  description: string,
  content: ResumeContent,
  technologies: readonly MatchableTechnology[],
  edges: readonly TechnologyEdge[],
  profiles: ReadonlyArray<{ slug: string; label: string; primary: readonly string[]; listed: readonly string[] }>,
): JobMatchResult {
  const haystack = ` ${normalizeForMatch(description)} `;
  const covered: RequirementMatch[] = [];
  const gaps: string[] = [];
  const unrecognised: string[] = [];

  const index = content.stackIndex;

  for (const technology of technologies) {
    const terms = [technology.label, ...technology.aliases];

    let matchedOn: string | null = null;
    let viaAlias = false;

    for (const [at, term] of terms.entries()) {
      const needle = ` ${normalizeForMatch(term)} `;

      if (needle === "  " || haystack.includes(needle)) {
        matchedOn = term;
        viaAlias = at > 0;
        break;
      }
    }

    if (matchedOn === null) {
      continue;
    }

    const entry = index?.byTechnology[technology.slug];

    /*
      Evidenced means a **bullet** names it, not merely that a chip does.

      The chip list says the owner has touched a tool; a tagged bullet says he
      used it to do something. Reporting those together would let a requirement
      met only by a list item read as a requirement met with a story, which is
      the difference a recruiter notices.
    */
    const bullets = entry?.highlights ?? [];
    const roles = entry?.experiences ?? [];

    covered.push({
      label: technology.label,
      slug: technology.slug,
      categoryLabel: technology.categoryLabel,
      matchedOn,
      evidenced: bullets.length > 0,
      evidencedIn: roles,
      viaAlias,
    });
  }

  /*
    Strongest first: evidenced technologies with the most roles behind them, then
    the rest by how much they match.

    The order is the whole value of the list — a report that says "you cover 40
    technologies" is unusable, and one that leads with the four the posting
    actually asked about is a two-minute read.
  */
  covered.sort((a, b) => {
    if (a.evidenced !== b.evidenced) {
      return a.evidenced ? -1 : 1;
    }

    return b.evidencedIn.length - a.evidencedIn.length;
  });

  /*
    Gaps: a shortlist of the posting's own words that no technology answered.

    Not "every unmatched word" — a posting names duties, not only tools, and
    reporting "responsibilities" as a gap would be noise. What survives here is a
    capitalised or technical-looking token, which is what a requirement looks
    like in the text.
  */
  const named = new Set(covered.map((entry) => entry.matchedOn));

  for (const token of postingTerms(description)) {
    if (named.has(token)) {
      continue;
    }

    const slug = normalizeForMatch(token);

    if (slug === "" || NOISE.has(slug)) {
      continue;
    }

    if (technologies.some((technology) =>
      [technology.label, ...technology.aliases].some(
        (term) => normalizeForMatch(term) === slug,
      ),
    )) {
      continue;
    }

    gaps.push(token);
  }

  const profilesWithOverlap = profiles
    .map((profile) => ({
      slug: profile.slug,
      label: profile.label,
      overlap: overlapFor(profile, covered),
    }))
    .sort((a, b) => b.overlap - a.overlap);

  const best = profilesWithOverlap[0];

  /*
    Suggested only when it is clearly the best, and never below a coverage the
    owner should be warned about rather than shown a "use this" for.

    Suggesting a profile that covers a third of the posting would be advice that
    reads as confidence and is not.
  */
  const suggested =
    best !== undefined && best.overlap >= 2 && best.overlap >= (profilesWithOverlap[1]?.overlap ?? 0)
      ? { slug: best.slug, label: best.label, overlap: best.overlap }
      : null;

  void edges;

  return {
    covered,
    gaps: [...new Set(gaps)].slice(0, 20),
    suggestedProfile: suggested,
    profiles: profilesWithOverlap,
    unrecognised: [...new Set(unrecognised)].slice(0, 20),
  };
}

/**
 * How many of the posting's technologies a profile promotes.
 *
 * Only `primary` counts. A profile that merely *lists* a technology has said it
 * is worth mentioning, not that it leads — and counting both would let a broad
 * profile win on breadth alone, which is the profile the owner does not want.
 */
function overlapFor(
  profile: { primary: readonly string[] },
  covered: readonly RequirementMatch[],
): number {
  const primary = new Set(profile.primary);

  return covered.filter((entry) => primary.has(entry.slug)).length;
}

/**
 * Requirement-shaped tokens from a posting.
 *
 * Capitalised or camel-cased words, plus any token the catalogue might plausibly
 * carry. Deliberately narrow: this feeds a *gaps* list, and a term list that is
 * too generous turns the gaps column into a transcript of the posting.
 */
function postingTerms(description: string): string[] {
  const terms: string[] = [];

  for (const match of description.matchAll(/[A-Za-z][A-Za-z0-9.+#-]{1,24}/g)) {
    const word = match[0];
    const capitalised = /^[A-Z]/.test(word) || /[a-z][A-Z]/.test(word);

    // A lowercase word only counts when it looks like a proper noun's cousin:
    // all-caps, or dotted like ".NET".
    const shouty = word === word.toUpperCase() && word.length > 2;

    if (capitalised || shouty || word.startsWith(".")) {
      terms.push(word.replace(/[.,;]+$/, ""));
    }
  }

  return terms;
}

export { expandFocus };
export type { ResumeStackIndex };