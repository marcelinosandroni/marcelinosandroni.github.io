import type { ResumeContent } from "@/domain/resume/types";
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
export function expandFocus(
  roots: readonly string[],
  edges: readonly TechnologyEdge[],
  /**
   * Slugs the caller asserts are primary regardless of how the graph reaches
   * them. See `resolveProfiles`.
   */
  alsoPrimary: readonly string[] = [],
): FocusExpansion {
  const primary = new Set<string>(roots);
  const secondary = new Set<string>();

  for (const slug of alsoPrimary) {
    primary.add(slug);
  }

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
 * Rebuilds the document narrowed to a selection.
 *
 * ## Why this is here and not in the two callers
 *
 * The page and the PDF each narrow, and both must narrow *identically*. Two
 * copies of this function would agree today and drift the first time one gained
 * a field — and the drift would be a PDF that is not the page the reader was
 * looking at, with nothing in either to say so.
 *
 * That is the same argument the graph walk gets, for the same reason: one
 * answer, computed once, shared by every consumer.
 */
export function narrowDocument(
  resume: ResumeContent,
  result: FocusResult,
): ResumeContent {
  const byIndex = new Map(result.experiences.map((entry) => [entry.experienceIndex, entry]));

  return {
    ...resume,
    experiences: resume.experiences.map((experience, experienceIndex) => {
      const entry = byIndex.get(experienceIndex);

      if (entry === undefined) {
        return experience;
      }

      /*
        Filtered rather than mapped through `title`: a case study is an object
        with its challenge, solution and metrics, and rebuilding it from the
        title would throw away the measured result — the part that argues the
        work was worth doing.
      */
      const caseStudies = entry.caseStudies
        .map((caseStudy) => experience.caseStudies?.[caseStudy.index])
        .filter((study): study is NonNullable<typeof study> => study !== undefined);

      return {
        ...experience,
        highlights: entry.highlights.map((highlight) => highlight.body),
        caseStudies,
      };
    }),
    skillGroups: promoteSkills(resume, result),
  };
}

/**
 * Moves the focused skills to the top of their group, keeping every one.
 *
 * A stable partition rather than a sort: the résumé's order is the owner's
 * arrangement, and a focused view that reshuffled the section would be
 * reordering the document rather than prioritising it.
 */
function promoteSkills(resume: ResumeContent, narrowed: FocusResult): ResumeContent["skillGroups"] {
  return resume.skillGroups.map((group) => {
    const promoted = new Set(
      narrowed.skillPositions
        .filter((entry) => entry.group === group.label && entry.primary)
        .map((entry) => entry.index),
    );

    if (promoted.size === 0) {
      return group;
    }

    const primary = group.skills.filter((_, index) => promoted.has(index));
    const rest = group.skills.filter((_, index) => !promoted.has(index));

    return { ...group, skills: [...primary, ...rest] };
  });
}

/**
 * A named selection the résumé can be narrowed to: "React + Node".
 *
 * A profile is **not** a template and **not** a second résumé. It is the same
 * document with the skills reordered and the bullets filtered, which is why it
 * stores slugs rather than technology ids: a profile is about the tool, not
 * about this locale's row for it, so one profile serves both locales instead of
 * two lists that drift apart.
 */
export type StackProfile = {
  readonly slug: string;
  readonly label: string;
  readonly description: string;
  readonly surfaces: ReadonlySet<string>;
  /**
   * Promoted: these lead the skills section, and their bullets survive.
   *
   * Not ordered. The résumé's own order wins, so adding a profile cannot reorder
   * anything the owner has already arranged — the profile is a selection, not a
   * layout.
   */
  readonly primary: ReadonlySet<string>;
  /** Shown, but not promoted and not a filter. Everything else worth a line. */
  readonly listed: ReadonlySet<string>;
};

/**
 * Resolves profiles into a selection, expanding each one through the graph.
 *
 * ## Why expansion happens here and not at write time
 *
 * Because the graph changes. A profile saved as "React + Node" today expands to
 * TypeScript and JavaScript because node-js rests on JavaScript — and if the
 * owner later files `Next.js` as resting on React, that profile should start
 * reaching it without being re-saved. Baking the expansion into the stored rows
 * would make every graph edit require re-saving every profile, and the first one
 * that was missed would be silently wrong.
 *
 * ## Why `primary` and `listed` expand differently
 *
 * `primary` expands through everything, because the point of "focus more on
 * React and Node" is that React reaches TypeScript and Node reaches JavaScript —
 * the whole chain is what should be promoted. `listed` expands through nothing:
 * a listed technology is shown, and promoting what it happens to use would
 * promote tools nobody chose. That asymmetry is the difference between a profile
 * that says what it means and one that quietly grows.
 */
export function resolveProfiles(
  profiles: readonly StackProfile[],
  edges: readonly TechnologyEdge[],
): Map<string, FocusExpansion> {
  const resolved = new Map<string, FocusExpansion>();

  for (const profile of profiles) {
    /*
      `primary` is seeded into the expansion's own root set alongside the
      graph-derived primaries, so a technology the owner listed as primary stays
      primary even when the graph says it is merely reached.

      Without this, a profile naming React as primary — which reaches TypeScript
      by `uses` — would come out with TypeScript secondary, and writing the same
      profile with TypeScript in `primary` would rank the identical stack
      differently. A profile is the owner's assertion about their own emphasis;
      the graph can add to it, not overrule it.
    */
    const fromPrimary = expandFocus([...profile.primary], edges);

    /*
      A listed technology that a primary already reached is dropped from
      `secondary`, so the ordering is not decided by which list happened to be
      walked first. React in `primary` and TypeScript in `listed` must promote
      TypeScript, not leave it as secondary because the second list overwrote the
      first.
    */
    /*
      The owner named these primary, so they are primary.

      This is the assertion that makes a profile a profile. React listed as
      primary reaches TypeScript by `uses`, and the graph ranks TypeScript
      secondary — which would mean a profile written "React, TypeScript as
      primary" ranks differently from the same profile written "React as primary,
      TypeScript as listed". The owner's statement about their own emphasis is
      not something the graph gets to overrule; the graph adds to it.

      The seed roots are exactly `profile.primary`, so the expansion's `primary`
      set already contains them. This is spelled out rather than assumed, because
      the alternative is a silent dependence on that invariant in another
      function — and the invariant is the whole point of the two lists.
    */
    const primary = new Set(profile.primary);

    for (const slug of fromPrimary.primary) {
      primary.add(slug);
    }

    /*
      A listed technology is shown but expands to nothing.

      Expanding it would promote every tool it happens to use, which is exactly
      the failure the two lists exist to prevent: writing "React" under `listed`
      in a profile called "Java" would drag TypeScript and JavaScript into a
      Java profile, and the page would claim a stack the owner never chose.
    */
    const secondary = new Set<string>(profile.listed);

    for (const slug of profile.listed) {
      secondary.delete(slug);
    }

    for (const slug of profile.primary) {
      secondary.delete(slug);
    }

    for (const slug of fromPrimary.secondary) {
      if (!primary.has(slug)) {
        secondary.add(slug);
      }
    }

    resolved.set(profile.slug, {
      primary,
      secondary,
      all: new Set([...primary, ...secondary]),
    });
  }

  return resolved;
}

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