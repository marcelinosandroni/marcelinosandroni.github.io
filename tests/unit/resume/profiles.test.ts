import { describe, expect, it } from "vitest";

import { expandFocus, resolveProfiles, type StackProfile, type TechnologyEdge } from "@/domain/resume/focus";

/**
 * The graph the profiles resolve against: the JavaScript ecosystem, the JVM, and
 * .NET, which is exactly what the three profiles the owner named need.
 */
const EDGES: TechnologyEdge[] = [
  { from: "react", to: "typescript", kind: "uses" },
  { from: "nestjs", to: "node-js", kind: "built_on" },
  { from: "nestjs", to: "typescript", kind: "uses" },
  { from: "node-js", to: "javascript", kind: "built_on" },
  { from: "typescript", to: "javascript", kind: "built_on" },
  { from: "next-js", to: "react", kind: "built_on" },
  { from: "angular", to: "typescript", kind: "uses" },
  { from: "java-spring-boot", to: "java-spring", kind: "built_on" },
  { from: "java-spring", to: "java", kind: "built_on" },
  { from: "net-core", to: "net", kind: "built_on" },
];

function profile(overrides: Partial<StackProfile> & Pick<StackProfile, "slug">): StackProfile {
  return {
    label: overrides.slug,
    description: "",
    surfaces: new Set(["resume"]),
    primary: new Set<string>(),
    listed: new Set<string>(),
    ...overrides,
  };
}

describe("resolveProfiles", () => {
  it("promotes the whole chain a primary rests on", () => {
    /* "Focus more on React, Node, TypeScript, JavaScript, Next.js, NestJS and
       Express" - the owner lists React and Node; the languages underneath them
       have to be promoted too, not merely reached. */
    const resolved = resolveProfiles(
      [profile({ slug: "react-node", primary: new Set(["react", "node-js"]) })],
      EDGES,
    );

    const focus = resolved.get("react-node");

    expect([...focus!.primary].sort()).toEqual(["javascript", "node-js", "react"]);
  });

  it("does not promote what a primary only uses", () => {
    /* React reaches TypeScript by `uses`, so TypeScript is reached rather than
       promoted. Saying otherwise would claim a fluency the profile did not
       assert. */
    const resolved = resolveProfiles(
      [profile({ slug: "react", primary: new Set(["react"]) })],
      EDGES,
    );

    const focus = resolved.get("react");

    expect(focus!.primary.has("typescript")).toBe(false);
    expect(focus!.secondary.has("typescript")).toBe(true);
  });

  it("does not let a listed entry demote what the primary reached", () => {
    /*
      The failure this guards is a name collision in the wrong direction. React
      in `primary` reaches TypeScript by `uses`; TypeScript also listed
      explicitly. If the `listed` pass were allowed to overwrite, TypeScript
      would drop to secondary and the skills order would depend on which list
      happened to be walked last.

      The reverse — TypeScript in `primary` — promotes it, because the owner
      said so. Which is the asymmetry: a listed entry is a floor, never a cap.
    */
    const forward = resolveProfiles(
      [profile({ slug: "a", primary: new Set(["react"]), listed: new Set(["typescript"]) })],
      EDGES,
    ).get("a");

    const asserted = resolveProfiles(
      [profile({ slug: "a", primary: new Set(["typescript"]), listed: new Set(["react"]) })],
      EDGES,
    ).get("a");

    expect(forward!.secondary.has("typescript")).toBe(true);
    expect(asserted!.primary.has("typescript")).toBe(true);
  });

  it("does not expand a listed technology at all", () => {
    /* A listed tool is shown. Promoting what it uses would promote tools nobody
       chose, and the profile would grow every time the graph did. */
    const resolved = resolveProfiles(
      [profile({ slug: "vue", listed: new Set(["angular"]) })],
      EDGES,
    ).get("vue");

    expect([...resolved!.primary]).toEqual([]);
    expect([...resolved!.secondary]).toEqual([]);
  });

  it("keeps the JVM profile away from the .NET one", () => {
    const resolved = resolveProfiles(
      [
        profile({ slug: "java", primary: new Set(["java-spring-boot"]) }),
        profile({ slug: "dotnet", primary: new Set(["net-core"]) }),
      ],
      EDGES,
    );

    expect([...resolved.get("java")!.all].sort()).toEqual(["java", "java-spring", "java-spring-boot"]);
    expect([...resolved.get("dotnet")!.all].sort()).toEqual(["net", "net-core"]);
  });

  it("resolves a profile with nothing in it to an empty selection", () => {
    const resolved = resolveProfiles([profile({ slug: "empty" })], EDGES).get("empty");

    expect(resolved!.all.size).toBe(0);
  });

  it("matches what a direct expansion of the same roots produces", () => {
    /* The profile must be a shortcut, not a different answer. If these ever
       diverge, the PDF (which expands directly) and the page (which resolves
       through a profile) would disagree about the same selection. */
    const resolved = resolveProfiles(
      [profile({ slug: "react-node", primary: new Set(["react", "node-js"]) })],
      EDGES,
    ).get("react-node");

    const direct = expandFocus(["react", "node-js"], EDGES);

    expect([...resolved!.primary].sort()).toEqual([...direct.primary].sort());
  });
});