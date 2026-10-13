/**
 * The technology catalog, as the domain sees it.
 *
 * ## The idea
 *
 * A tool is one thing that gets used in several places. React is not "a string
 * that happens to be written five times"; it is a single entity that a role, a
 * bullet, a skill and a case study each *reference*. The moment it is an
 * entity, three things become possible that were not possible when every
 * mention was an independent string:
 *
 *   - adding a tool once makes it available everywhere, instead of once per role
 *   - "where have I used NestJS" is a question with an answer
 *   - a résumé can be focused: promote React, keep only the bullets about it
 *
 * ## Why the résumé document still carries plain strings
 *
 * `ResumeExperience.highlights` and `.technologies` stay `string[]`. The LaTeX
 * renderer, the PDF pipeline, the typed fallback catalog and every component
 * read those, and they are correct there — a bullet is a sentence, and a chip is
 * a word.
 *
 * The relations travel beside the document in `ResumeStackIndex` rather than
 * *inside* it. Two reasons, and the second is the one that matters:
 *
 *   1. It keeps the fallback honest. The typed catalog has no relations, so its
 *      document still renders in full — degrading to the generic résumé rather
 *      than to a half-filtered one that silently omits the wrong bullets.
 *   2. It makes absence explicit. No index means "nothing is tagged", which the
 *      focused view can state. An index built from partial data would instead
 *      read as "these are all the technologies", which is a claim the data does
 *      not support.
 */

/** One tool, as the résumé refers to it. */
export type ResumeTechnology = {
  /** Locale-independent identity. "react", not "React". */
  readonly slug: string;
  /** How it is written in the résumé, in this locale. */
  readonly label: string;
  /** The category it is filed under, or `null` when uncategorised. */
  readonly categorySlug: string | null;
  readonly categoryLabel: string | null;
  /** Other names a job posting might use for the same thing. */
  readonly aliases: readonly string[];
};

/**
 * Where each technology appears, resolved to positions in the document.
 *
 * This is a lookup rather than a tree because the focused résumé asks exactly
 * one question — "for React, which roles and which bullets?" — and answering it
 * from a prebuilt index is a map read instead of a scan over every row on every
 * request.
 *
 * `highlights` and `caseStudies` carry `{ company, index }` rather than ids.
 * Ids would be tighter, but the index is built in the adapter and consumed by
 * the renderer, and passing positions means the consumer indexes the document it
 * already has and never has to carry a second parallel structure full of opaque
 * ids. `company` disambiguates because a résumé has one experience per company.
 */
export type ResumeStackIndex = {
  readonly byTechnology: Readonly<
    Record<
      string,
      {
        readonly experiences: readonly string[];
        readonly highlights: ReadonlyArray<{ company: string; index: number }>;
        readonly caseStudies: ReadonlyArray<{ company: string; index: number }>;
        readonly skills: ReadonlyArray<{ group: string; index: number }>;
      }
    >
  >;
};

/** An empty index: nothing is tagged. Distinct from "no technologies exist". */
export const EMPTY_STACK_INDEX: ResumeStackIndex = { byTechnology: {} };

/** Whether the index carries any tagging at all. */
export function hasStackIndex(index: ResumeStackIndex | undefined): index is ResumeStackIndex {
  return index !== undefined && Object.keys(index.byTechnology).length > 0;
}

/**
 * The slug a technology is filed under.
 *
 * Deliberately lossy and deliberately boring. "Java Spring Boot", "Java (Spring
 * Boot)" and "java-spring-boot" must land on the same row, so the rule is:
 * lowercase, anything that is not a letter or digit becomes a hyphen, and
 * repeated or trailing hyphens collapse.
 *
 * It cannot be a perfect identity function and that is fine — the owner can set
 * an explicit slug in the admin when two genuinely different tools would collide,
 * which is a judgement about the two tools and therefore theirs to make.
 */
export function technologySlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Normalises free text for comparison against a technology name.
 *
 * Used when matching a pasted job description, where "PostgreSQL", "Postgres 15"
 * and "postgresql" must compare equal enough to be recognised as the same
 * subject. It strips the version suffix and the punctuation a posting adds, and
 * stops there — it deliberately does **not** stem or fuzzy-match, because a
 * matcher that invents a similarity is a matcher that will eventually claim the
 * owner has used something he has not.
 */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bv?\d+(?:\.\d+)*\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Whether two technologies should be treated as the same thing.
 *
 * Exact on slug, and otherwise exact on normalised label. The second clause is
 * what collapses "Node.js" and "NodeJS" during seeding — two strings that mean
 * one tool and would otherwise become two catalog rows that no focused résumé
 * could ever group.
 */
export function isSameTechnology(
  a: { slug: string; label: string },
  b: { slug: string; label: string },
): boolean {
  return a.slug === b.slug || normalizeForMatch(a.label) === normalizeForMatch(b.label);
}

/**
 * Pairs that are probably the same tool written twice.
 *
 * ## Why this exists
 *
 * The catalog was bootstrapped from labels the owner had written by hand, across
 * two places at once: a per-role chip and a skill line. Those did not agree on
 * spelling, so the same tool entered twice — `Kafka` and `Apache Kafka`,
 * `NestJS` and `Node.js (NestJS)`, `Clean Arch` and `Clean Architecture`. Each
 * one is a separate row, and a focused résumé promoting "NestJS" would then show
 * only the roles whose chip happened to say `NestJS`, silently dropping the ones
 * that said `Node.js (NestJS)`.
 *
 * That is the failure this prevents, and it is invisible until someone looks for
 * it: both rows render, both are true, and the filter is simply wrong.
 *
 * ## Why it reports rather than merges
 *
 * Because the judgement is not mechanical. Is `Node.js (NestJS)` the same entry
 * as `NestJS`, or a skill line that means *both*? Merging repoints every link —
 * chips, skills, bullets — and guessing wrong silently reattributes work to the
 * wrong tool. This returns the pairs; the owner decides, in the admin, where the
 * consequence is visible.
 *
 * ## Why containment and not equality
 *
 * Equality is already handled by `isSameTechnology`, and containment is the
 * actual shape of the problem: one label *contains* the other. Word-boundary
 * matching is what keeps it useful — `Go` is a substring of `MongoDB` and of
 * `Hexagonal`, and a plain `includes` would report both as duplicates, which is
 * how a diagnostic that cries wolf gets ignored.
 *
 * ## What this does not catch
 *
 * An abbreviation whose final word is a prefix rather than a whole word:
 * `Clean Arch` / `Clean Architecture` is not reported, because "arch" is not a
 * token of "architecture". Catching it means letting the last aligned token be
 * a string prefix, which is fuzzy matching — and a fuzzy matcher eventually
 * claims two things are the same when they are not, which for this particular
 * function means reattributing a recruiter's read of a career.
 *
 * So the guarantee is one-directional on purpose: **every pair reported here is
 * very likely a duplicate**, and some duplicates are missed. A missed pair costs
 * the owner one merge they can see; a wrong pair costs them a link that quietly
 * points at the wrong tool.
 */
export function suspectedDuplicates(
  technologies: ReadonlyArray<{ label: string }>,
): Array<[string, string]> {
  /*
    Every token is space-delimited on **both** sides, not just the ends.

    Padding only the outside makes `" clean arch "` a non-substring of
    `" clean architecture "`, because what follows "arch" there is "i" rather
    than a space — so the one pair this exists to catch, a short name and its
    longer spelling, is the pair it misses. Delimiting each token means
    containment is only ever true across a real word boundary.
  */
  const delimited = (label: string): string =>
    normalizeForMatch(label)
      .split(" ")
      .filter((word) => word !== "")
      .map((word) => ` ${word} `)
      .join("");

  const normalized = technologies.map((entry) => ({
    label: entry.label,
    key: delimited(entry.label),
  }));

  const pairs: Array<[string, string]> = [];

  for (const [i, a] of normalized.entries()) {
    for (const b of normalized.slice(i + 1)) {
      if (a.label === b.label || a.key === b.key) {
        continue;
      }

      if (a.key.includes(b.key) || b.key.includes(a.key)) {
        pairs.push([a.label, b.label]);
      }
    }
  }

  return pairs.sort(([x], [y]) => x.localeCompare(y));
}