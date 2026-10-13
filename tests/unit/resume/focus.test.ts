import { describe, expect, it } from "vitest";

import { applyFocus, expandFocus, type TechnologyEdge } from "@/domain/resume/focus";
import type { ResumeStackIndex } from "@/domain/resume/technology";

/**
 * The graph the owner asked for, written out as edges:
 * NestJS → Node.js → JavaScript, and NestJS uses TypeScript, React uses
 * TypeScript, Spring Boot → Java.
 */
const GRAPH: TechnologyEdge[] = [
  { from: "nestjs", to: "node-js", kind: "built_on" },
  { from: "node-js", to: "javascript", kind: "built_on" },
  { from: "nestjs", to: "typescript", kind: "uses" },
  { from: "react", to: "typescript", kind: "uses" },
  { from: "react", to: "javascript", kind: "uses" },
  { from: "spring-boot", to: "java", kind: "built_on" },
];

describe("expandFocus", () => {
  it("reaches what the selection rests on", () => {
    const focus = expandFocus(["nestjs"], GRAPH);

    expect([...focus.primary].sort()).toEqual(["javascript", "nestjs", "node-js"]);
  });

  it("reaches what the selection uses, as secondary rather than primary", () => {
    const focus = expandFocus(["nestjs"], GRAPH);

    expect(focus.secondary.has("typescript")).toBe(true);
    expect(focus.primary.has("typescript")).toBe(false);
    expect(focus.all.has("typescript")).toBe(true);
  });

  it("promotes the languages a framework is built on", () => {
    /* The exact case the request describes: selecting NestJS has to reach the
       JavaScript underneath Node.js, not only Node.js itself. */
    const focus = expandFocus(["react-node"], [
      { from: "react-node", to: "node-js", kind: "built_on" },
      { from: "node-js", to: "javascript", kind: "built_on" },
      { from: "react-node", to: "react", kind: "built_on" },
    ]);

    expect(focus.primary.has("node-js")).toBe(true);
    expect(focus.primary.has("javascript")).toBe(true);
  });

  it("keeps a Java selection away from the .NET one", () => {
    /* Selecting Spring Boot must not drag in anything from another ecosystem.
       Collapsing `uses` into `built_on` would, which is why they are separate. */
    const focus = expandFocus(["spring-boot"], GRAPH);

    expect([...focus.all].sort()).toEqual(["java", "spring-boot"]);
  });

  it("terminates on a cycle", () => {
    /* The relation table only forbids a self-edge. A two-node cycle is
       representable, and a recursive descent would recurse until the stack
       gave out. */
    const focus = expandFocus(
      ["a"],
      [
        { from: "a", to: "b", kind: "built_on" },
        { from: "b", to: "a", kind: "built_on" },
      ],
    );

    expect([...focus.all].sort()).toEqual(["a", "b"]);
  });

  it("is empty for an empty selection", () => {
    expect(expandFocus([], GRAPH).all.size).toBe(0);
  });

  it("does not demote something already promoted", () => {
    const focus = expandFocus(["nestjs"], [
      ...GRAPH,
      { from: "react", to: "typescript", kind: "uses" },
      { from: "typescript", to: "javascript", kind: "built_on" },
    ]);

    expect(focus.primary.has("javascript")).toBe(true);
  });

  it("never promotes along a `uses` edge, however close it is", () => {
    /* The bug the first implementation had: promoting on depth alone made
       `NestJS uses TypeScript` a promotion, so TypeScript ranked beside NestJS
       itself. The kind decides, not the distance. */
    const focus = expandFocus(
      ["react"],
      [
        { from: "react", to: "typescript", kind: "uses" },
        { from: "typescript", to: "javascript", kind: "built_on" },
      ],
    );

    expect(focus.primary.has("typescript")).toBe(false);
    expect(focus.secondary.has("typescript")).toBe(true);
    expect(focus.secondary.has("javascript")).toBe(true);
    expect(focus.primary.has("javascript")).toBe(false);
  });

  it("promotes a weak reach when a stronger edge reaches it too", () => {
    const focus = expandFocus(
      ["a"],
      [
        { from: "a", to: "shared", kind: "uses" },
        { from: "a", to: "shared", kind: "built_on" },
      ],
    );

    expect(focus.primary.has("shared")).toBe(true);
    expect(focus.secondary.has("shared")).toBe(false);
  });
});

/** A document with two roles, and a mix of tagged and untagged bullets. */
const DOCUMENT = {
  experiences: [
    { company: "Pollux", highlights: ["React work", "Node work", "Untagged"] },
    { company: "Antlia", highlights: [".NET work", "Also untagged"] },
  ],
  skillGroups: [{ label: "Backend", skills: ["Java", "TypeScript", "Python"] }],
};

const INDEX: ResumeStackIndex = {
  byTechnology: {
    react: {
      experiences: ["Pollux"],
      highlights: [{ company: "Pollux", index: 0 }],
      caseStudies: [],
      skills: [],
    },
    "node-js": {
      experiences: ["Pollux"],
      highlights: [{ company: "Pollux", index: 1 }],
      caseStudies: [],
      skills: [{ group: "Backend", index: 1 }],
    },
    "spring-boot": {
      experiences: ["Antlia"],
      highlights: [{ company: "Antlia", index: 0 }],
      caseStudies: [],
      skills: [{ group: "Backend", index: 0 }],
    },
  },
};

describe("applyFocus", () => {
  it("keeps only the tagged bullets of a role it matched", () => {
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["react"], []));

    const pollux = result.experiences.find((entry) => entry.company === "Pollux");

    expect(pollux?.highlights.map((h) => h.index)).toEqual([0]);
  });

  it("counts the bullets it dropped, so a page can say how many", () => {
    /*
      Tagging is manual, so an untagged bullet is either "this is about .NET" or
      "nobody has got to it yet". The count is the only thing that tells those
      apart, and hiding it would make an unfinished tagging pass look like a
      deliberately short résumé.
    */
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["react"], []));

    expect(result.untaggedDropped).toBe(2);
  });

  it("keeps a role the focus did not match, whole", () => {
    /*
      The rule that matters most. A résumé filtered to React that silently drops
      the .NET role reads as a shorter career — the recruiter sees a gap, not
      "that role used different technology".
    */
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["react"], []));

    const antlia = result.experiences.find((entry) => entry.company === "Antlia");

    expect(antlia?.matched).toBe(false);
    expect(antlia?.highlights).toHaveLength(2);
  });

  it("reports how many roles it narrowed, so the page can say so", () => {
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["react"], []));

    expect(result.narrowedRoles).toBe(1);
  });

  it("orders skills by focus instead of removing them", () => {
    /*
      Every skill survives. The owner listed TypeScript under Backend Core and
      also as a chip; a focused view that dropped the entry would be removing a
      skill, not prioritising one.
    */
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["node-js"], []));

    expect(result.skillPositions).toHaveLength(3);
    expect(result.skillPositions.filter((s) => s.primary).map((s) => s.index)).toEqual([1]);
  });

  it("promotes nothing when the selection has no skill of its own", () => {
    const result = applyFocus(INDEX, DOCUMENT, expandFocus(["react"], []));

    expect(result.skillPositions.filter((s) => s.primary)).toEqual([]);
  });

  it("keeps a case study on a role with no case-study tags", () => {
    const withCases = {
      experiences: [{ company: "Antlia", highlights: ["x"], caseStudies: [{ title: "Measured" }] }],
      skillGroups: [],
    };

    const result = applyFocus(INDEX, withCases, expandFocus(["react"], []));

    expect(result.experiences[0]?.caseStudies.map((c) => c.title)).toEqual(["Measured"]);
  });

  it("returns nothing for an empty selection rather than an empty résumé", () => {
    const result = applyFocus(INDEX, DOCUMENT, expandFocus([], []));

    expect(result.experiences).toEqual([]);
  });
});