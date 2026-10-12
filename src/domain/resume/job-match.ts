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

  const catalogue = new Set(
    technologies.flatMap((technology) =>
      [technology.label, ...technology.aliases].map((term) => normalizeForMatch(term)),
    ),
  );

  for (const token of postingTerms(description, catalogue)) {
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

    /*
      Already answered above — a token the posting and the résumé share is
      covered, not a gap. Without this the catalogue check below is redundant
      and, worse, would silently re-report every covered technology.
    */
    if (catalogue.has(slug)) {
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
 * The connective tissue of a job posting.
 *
 * Common words that are neither a technology nor furniture, in the languages this
 * site is written in. Without this, the gaps rule — "not common, not catalogue"
 * — would flag "software", "como", "para" and "com" as requirements the owner
 * does not meet, because they are absent from the technology catalogue by
 * definition.
 *
 * An exhaustive English word list is not the goal; only the words a posting is
 * actually built from. A miss costs one line in a short list the owner scans.
 */
const COMMON: ReadonlySet<string> = new Set([
  "a", "ao", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "em", "entre",
  "ou", "para", "por", "que", "se", "sem", "the", "and", "or", "of", "for", "with",
  "to", "from", "in", "on", "at", "by", "an", "is", "are", "be", "was", "as", "that",
  "this", "these", "those", "it", "its", "we", "our", "you", "your", "will", "can",
  "mais", "menos", "muito", "tambem", "também", "sobre", "entre", "ate", "até",
  "apos", "após", "onde", "quando", "qual", "quais", "cada", "todo", "toda", "todos",
  "todas", "um", "uma", "uns", "umas", "seu", "sua", "seus", "suas", "nos", "nas",
  "pela", "pelas", "pelo", "pelos", "dentro", "fora", "against", "across", "between",
  "any", "all", "some", "other", "such", "very", "more", "most", "no", "not", "only",
  "same", "than", "then", "them", "they", "he", "she", "his", "her", "their", "them",
]);

/**
 * Requirement-shaped tokens from a posting.
 *
 * A capitalised word is *not* enough on its own. A posting capitalises its
 * headings and its first words — "Desenvolvedor", "Empresa", "Requisitos" — and
 * reporting those as gaps produces a gaps column that is half the posting's own
 * furniture, which is worse than no gaps column because it looks like a finding.
 *
 * The rule is inverted from the obvious one: a token is a **gap** when it is
 * *name-shaped* — shout-cased, dotted, camel-cased, or carrying a digit — **and**
 * it is not furniture. "Jest" is a single capitalised word and neither shout nor
 * camel, but it is a tool the owner does not have, and hiding it would be the
 * one kind of gap that costs an interview.
 *
 * So the fallback for a leading-capital word is: is it a known technology? If
 * the catalogue has it, it is covered (handled above). If the catalogue does not
 * have it *and* it is not furniture, it is offered as a possible gap. That is the
 * honest uncertainty — "Jest" might be a real requirement, or it might be a
 * product name — and the owner, who reads the posting, is the one who knows.
 */
function postingTerms(description: string, catalogue: ReadonlySet<string>): string[] {
  const terms: string[] = [];

  for (const match of description.matchAll(/[\p{L}][\p{L}\p{N}.+#-]{1,24}/gu)) {
    const word = match[0].replace(/[.,;]+$/, "");
    const slug = normalizeForMatch(word);

    if (slug === "" || NOISE.has(slug) || HEADINGS.has(slug)) {
      continue;
    }

    const shouty = word === word.toUpperCase() && word.length > 2;
    const dotted = word.startsWith(".") || word.includes(".");
    const camel = /^[A-Z][a-z]+[A-Z]/.test(word);
    const versioned = /\d/.test(word);

    /*
      A single capitalised word like "Jest" is neither shout, nor dotted, nor
      camel — but it is a real requirement the owner does not have, and hiding it
      costs an interview. So the fallback is whether the word is an ordinary
      English or Portuguese word: `COMMON` holds the connective tissue of a job
      posting. If it is not common, not furniture, and not in the catalogue, it is
      offered as a candidate gap — the owner, who reads the posting, decides.
    */
    const ordinary = COMMON.has(slug);

    if (shouty || dotted || camel || versioned || (!ordinary && !catalogue.has(slug))) {
      terms.push(word);
    }
  }

  return terms;
}

/**
 * The furniture of a job posting.
 *
 * Short and explicit on purpose. An exhaustive list is not possible — these are
 * written in two languages and a dozen house styles — but the words that appear
 * are few and recurring, and a miss costs one line in a list the owner is
 * already scanning.
 */
const HEADINGS: ReadonlySet<string> = new Set([
  "desenvolvedor",
  "desenvolvedora",
  "desenvolvimento",
  "vaga",
  "vagas",
  "empresa",
  "requisitos",
  "requisito",
  "diferenciais",
  "diferencial",
  "responsabilidades",
  "atividades",
  "qualificacoes",
  "qualificacoes",
  "beneficios",
  "local",
  "localizacao",
  "remoto",
  "presencial",
  "hibrido",
  "salario",
  "remuneracao",
  "contratacao",
  "candidate",
  "candidato",
  "candidata",
  "inscribase",
  "candidate-se",
  "about",
  "requirements",
  "responsibilities",
  "qualifications",
  "benefits",
  "salary",
  "location",
  "remote",
  "hybrid",
  "onsite",
  "apply",
  "please",
  "strong",
  "forte",
  "strong",
  "solid",
  "solida",
  "experiencia",
  "experience",
  "experienced",
  "vivencia",
  "vivendo",
  "conhecimento",
  "knowledge",
  "habilidade",
  "habilidades",
  "skill",
  "skills",
  "competencia",
  "competencias",
  "formacao",
  "formacao",
  "graduacao",
  "graduacao",
  "ensino",
  "superior",
  "completo",
  "completa",
  "integral",
  "excellent",
  "excelente",
  "avancado",
  "advanced",
  "intermediario",
  "plus",
  "bonus",
  "obrigatorio",
  "obrigatoria",
  "obrigatorios",
  "obrigatorias",
  "desejavel",
  "desejavel",
  "desejaveis",
  "senior",
  "pleno",
  "junior",
  "trainee",
  "estagio",
  "aprendiz",
  "software",
  "hardware",
  "sistema",
  "sistemas",
  "required",
  "must",
  "have",
  "ter",
  "work",
  "trabalhar",
  "trabalha",
  "atuacao",
  "atuacoes",
  "projeto",
  "projetos",
  "sistema",
  "sistemas",
  "solucao",
  "solucoes",
  "produto",
  "cliente",
  "clientes",
  "negocio",
  "processo",
  "processos",
  "otimizacao",
  "melhoria",
  "melhorias",
  "evolucao",
  "ingles",
  "english",
]);

export { expandFocus };
export type { ResumeStackIndex };