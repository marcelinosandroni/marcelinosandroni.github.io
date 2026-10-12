import type { ResumeStackIndex } from "@/domain/resume/technology";

/**
 * What a technology rests on, and what it merely uses.
 *
 * The two are different and the difference is the feature. `built_on` is a
 * hierarchy: NestJS rests on Node.js, Node.js rests on JavaScript, and choosing
 * any of the three has to reach the other two — a job posting asking for
 * TypeScript is asking for the thing NestJS is made of. `uses` is lateral: React
 * uses JavaScript, and that does not make React a superset of JavaScript or
 * change what a search for it should return.
 *
 * Collapsing them into one "related" flag would make every relation expand
 * symmetrically, and a résumé focused on Python would then keep the .NET bullets
 * because some web framework used both.
 */
export type RelationKind = "built_on" | "uses";

export type TechnologyEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: RelationKind;
};

/**
 * What a selection reaches.
 *
 * `primary` is what the owner chose plus everything it rests on. `secondary` is
 * what those use. Kept apart because they are not equal claims: a profile
 * "React + Node" promotes react and node to the top of the skills list because
 * they are primary, and typescript and javascript appear because node rests on
 * them — which is a true statement about the stack and a different statement
 * about who the owner is strongest in.
 *
 * A collapsed `Set` would lose exactly that, and the ordering it drives is the
 * entire point of a focused résumé.
 */
export type FocusExpansion = {
  readonly primary: ReadonlySet<string>;
  readonly secondary: ReadonlySet<string>;
  /** Everything, in one set, for the checks that only care about membership. */
  readonly all: ReadonlySet<string>;
};

/** An empty expansion, for an empty selection. */
export const EMPTY_FOCUS: FocusExpansion = {
  primary: new Set(),
  secondary: new Set(),
  all: new Set(),
};

/**
 * Expands a selection through the relation graph.
 *
 * ## Why a breadth-first walk and not a recursive descent
 *
 * Because the graph is user-editable and therefore not guaranteed to be a
 * tree. The database forbids a self-edge and nothing else, so a cycle — React
 * rests on something that uses React — is representable and would make a
 * recursive descent run until the stack gave out. A visited set makes the walk
 * terminate on any graph, which is the property that has to hold for an editor
 * that can add an edge from a dropdown.
 *
 * ## Why `uses` expands but only into `secondary`
 *
 * So that "React" reaches TypeScript and JavaScript without claiming they are
 * as strong a signal as React itself. Reaching is not promoting.
 *
 * ## Why a cycle still yields the right answer
 *
 * If A rests on B and B uses A, both are primary-or-secondary and neither is
 * dropped: `all` is the union, and a consumer checking membership gets a true
 * answer either way. The walk cannot produce a wrong set, only a shallower one,
 * and the shallower one is a superset of everything actually reachable.
 */
export function expandFocus(roots: readonly string[], edges: readonly TechnologyEdge[]): FocusExpansion {
  const primary = new Set<string>(roots);
  const secondary = new Set<string>();

  if (roots.length === 0) {
    return EMPTY_FOCUS;
  }

  const outward = new Map<string, Array<{ to: string; kind: RelationKind }>>();

  for (const edge of edges) {
    const list = outward.get(edge.from) ?? [];

    list.push({ to: edge.to, kind: edge.kind });
    outward.set(edge.from, list);
  }

  const queue: Array<{ slug: string; depth: number; strong: boolean }> = roots.map((slug) => ({
    slug,
    depth: 0,
    strong: true,
  }));

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined) {
      break;
    }

    for (const edge of outward.get(current.slug) ?? []) {
      /*
        Promotion requires an **unbroken chain of `built_on` from a root**.

        Depth alone was the first bug the tests caught: promoting on distance
        made `NestJS uses TypeScript` a promotion, so TypeScript ranked beside
        NestJS itself. Requiring the kind fixed that and exposed the second one —
        React reaches TypeScript by `uses`, and TypeScript is genuinely built on
        JavaScript, so a path-length rule promoted JavaScript anyway and a view
        focused on React claimed JavaScript as a strength.

        So `strong` carries whether this node was reached on its own terms. A
        `uses` edge produces a weak node, and nothing downstream of a weak node
        is promoted however solid its own foundations are.
      */
      const promoted = edge.kind === "built_on" && current.strong && current.depth < MAX_PROMOTED_DEPTH;

      if (primary.has(edge.to)) {
        // Nothing reaches better than promoted, so this node is settled. Its own
        // edges were queued when it was first reached.
        continue;
      }

      if (secondary.has(edge.to) && !promoted) {
        continue;
      }

      if (promoted) {
        primary.add(edge.to);
        secondary.delete(edge.to);
      } else {
        secondary.add(edge.to);
      }

      queue.push({ slug: edge.to, depth: current.depth + 1, strong: promoted });
    }
  }

  return { primary, secondary, all: new Set([...primary, ...secondary]) };
}

/**
 * How far a `built_on` chain may be followed before the result stops being a
 * hierarchy and starts being a coincidence.
 *
 * Generous on purpose: the chain the owner described is three deep — NestJS,
 * Node.js, JavaScript — so a bound of two would have cut off the language the
 * whole expansion exists to reach. Four leaves room for platform inserted
 * between a framework and a language, and still terminates on a chain that a
 * mistyped edge made long.
 */
const MAX_PROMOTED_DEPTH = 4;

/**
 * What a focused résumé keeps.
 *
 * ## The rule that matters most
 *
 * **A role with no matching bullet is kept whole, not dropped.**
 *
 * A résumé filtered to React that silently removes the two years spent on .NET
 * reads as a shorter career. A recruiter does not see "this role used different
 * technology", they see a gap and a question they will not ask out loud. So the
 * filter narrows what it can and leaves the rest intact — and says so, through
 * `narrowedRoles`, rather than pretending the document is complete.
 *
 * That is the opposite of what "focus" usually means, and it is the difference
 * between a tailored résumé and a misleading one.
 */
export type FocusedExperience = {
  readonly experienceIndex: number;
  readonly company: string;
  readonly highlights: ReadonlyArray<{ index: number; body: string }>;
  readonly caseStudies: ReadonlyArray<{ index: number; title: string }>;
  /** True when the focus matched at least one bullet in this role. */
  readonly matched: boolean;
};

export type FocusResult = {
  readonly experiences: readonly FocusedExperience[];
  /** Roles kept only because they had nothing to narrow. See above. */
  readonly narrowedRoles: number;
  /**
   * Bullets dropped for carrying no tag in a role the focus did match.
   *
   * Counted rather than hidden. Tagging is manual, so this number is how a
   * reader of the page — and the owner — tells "this bullet is about .NET and
   * this view is about React" apart from "nobody has tagged this bullet yet".
   * The second is a gap in the data and showing it as if it were the first
   * would make an unfinished tagging pass look like a deliberate short résumé.
   */
  readonly untaggedDropped: number;
  /** Skill positions in original order, flagged for promotion. */
  readonly skillPositions: ReadonlyArray<{ group: string; index: number; primary: boolean }>;
};

/**
 * Applies a selection to the document.
 *
 * Reads positions out of `stackIndex`, so it only ever returns text the
 * document already holds. Nothing is rewritten, reordered into a new claim, or
 * generated — which is what makes "focused" a presentation choice rather than a
 * new document that might say something the owner never wrote.
 */
export function applyFocus(
  index: ResumeStackIndex,
  document: {
    readonly experiences: ReadonlyArray<{
      readonly company: string;
      readonly highlights: readonly string[];
      readonly caseStudies?: ReadonlyArray<{ title: string }>;
    }>;
    readonly skillGroups: ReadonlyArray<{ label: string; skills: readonly string[] }>;
  },
  focus: FocusExpansion,
): FocusResult {
  if (focus.all.size === 0) {
    return { experiences: [], narrowedRoles: 0, untaggedDropped: 0, skillPositions: [] };
  }

  /*
    Membership is checked per position rather than per technology, because the
    index stores one bucket per slug and a bullet is in several at once.
  */
  const highlightMatches = new Map<string, Set<number>>();
  const caseStudyMatches = new Map<string, Set<number>>();
  const skillPriority = new Map<string, "primary" | "secondary">();

  for (const [slug, entry] of Object.entries(index.byTechnology)) {
    if (!focus.all.has(slug)) {
      continue;
    }

    /*
      Promoted beats merely reached, and a position already primary is never
      demoted by a later, weaker edge. Without the first rule a skill linked to
      both a promoted and a reached technology would sort on whichever edge
      happened to be walked last, which is not a property anyone chose.
    */
    const rank = focus.primary.has(slug) ? "primary" : "secondary";

    for (const { group, index: at } of entry.skills) {
      const key = `${group} ${at}`;

      if (skillPriority.get(key) !== "primary") {
        skillPriority.set(key, rank);
      }
    }

    for (const { company, index: at } of entry.highlights) {
      const set = highlightMatches.get(company) ?? new Set<number>();

      set.add(at);
      highlightMatches.set(company, set);
    }

    for (const { company, index: at } of entry.caseStudies) {
      const set = caseStudyMatches.get(company) ?? new Set<number>();

      set.add(at);
      caseStudyMatches.set(company, set);
    }
  }

  const experiences: FocusedExperience[] = [];
  let narrowedRoles = 0;
  let untaggedDropped = 0;

  document.experiences.forEach((experience, experienceIndex) => {
    const matched = highlightMatches.has(experience.company);
    const positions = highlightMatches.get(experience.company);

    /*
      The rule the owner set: in a focused view, a role lists **only** the
      situations that use the selected stacks. So a role the focus matched keeps
      exactly its tagged bullets, and a role it did not match keeps all of them —
      because there is nothing to filter on, and a role that vanishes reads as a
      gap in the career rather than as a different technology.

      Untagged bullets inside a matched role are therefore dropped, and counted
      in `untaggedDropped` so the page can say how many. Silently is the one
      option not available: the count is what distinguishes "this bullet is about
      .NET" from "nobody has got to this bullet yet".
    */
    const keep = positions === undefined
      ? experience.highlights.map((_, at) => at)
      : [...positions].sort((a, b) => a - b);

    if (matched) {
      untaggedDropped += experience.highlights.length - keep.length;
    }

    if (matched && keep.length < experience.highlights.length) {
      narrowedRoles++;
    }

    /*
      Case studies follow the same rule as bullets, for the same reason: a role
      whose cases carry no tag is not a role with no cases. Filtering them to
      nothing would erase the measured outcomes — the part of the résumé that
      actually argues the work was worth doing.
    */
    const allCaseStudies = (experience.caseStudies ?? []).map((study, at) => at);
    const casePositions = caseStudyMatches.get(experience.company);

    experiences.push({
      experienceIndex,
      company: experience.company,
      highlights: keep.map((at) => ({ index: at, body: experience.highlights[at] ?? "" })),
      caseStudies: (casePositions === undefined ? allCaseStudies : [...casePositions].sort((a, b) => a - b))
        .map((at) => ({ index: at, title: experience.caseStudies?.[at]?.title ?? "" })),
      matched,
    });
  });

  /*
    Skills are **ordered**, not filtered.

    Every skill survives: the owner listed TypeScript under Backend Core and also
    as a chip, and a focused view that dropped the entry to make a point about
    type safety would be removing a skill, not prioritising one. The focused
    technologies are simply first, which is what "promote the ones this job asks
    about" means.
  */
  const skillPositions: Array<{ group: string; index: number; primary: boolean }> = [];

  document.skillGroups.forEach((group) => {
    group.skills.forEach((_, at) => {
      skillPositions.push({
        group: group.label,
        index: at,
        primary: skillPriority.get(`${group.label} ${at}`) === "primary",
      });
    });
  });

  return { experiences, narrowedRoles, untaggedDropped, skillPositions };
}