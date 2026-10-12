import { describe, expect, it } from "vitest";

import { matchJobDescription } from "@/domain/resume/job-match";
import type { ResumeContent } from "@/domain/resume/types";

const DOCUMENT: ResumeContent = {
  locale: "en-US",
  name: "Marcelino",
  title: "Engineer",
  location: "",
  contact: { phone: "", email: "", linkedin: "" },
  summary: "",
  experiences: [
    {
      company: "Pollux",
      role: "Engineer",
      period: "",
      location: "",
      summary: "",
      highlights: ["Migrated MySQL to ClickHouse"],
    },
  ],
  skillGroups: [],
  education: [],
  languages: [],
  stackIndex: {
    byTechnology: {
      react: {
        experiences: ["Pollux"],
        highlights: [{ company: "Pollux", index: 0 }],
        caseStudies: [],
        skills: [],
      },
      nodejs: {
        experiences: ["Pollux"],
        // No highlights: the chip exists, but no bullet names it. That is the
        // difference between "covered" and "evidenced", and the reason a chip
        // alone cannot be reported as a story.
        highlights: [],
        caseStudies: [],
        skills: [],
      },
    },
  },
};

const TECHNOLOGIES = [
  { slug: "react", label: "React", categoryLabel: "Frontend & UI", aliases: [] },
  { slug: "nodejs", label: "Node.js", categoryLabel: "Backend Core", aliases: ["nodejs"] },
  { slug: "typescript", label: "TypeScript", categoryLabel: "Frontend & UI", aliases: [] },
  { slug: "kubernetes", label: "Kubernetes", categoryLabel: "DevOps & Cloud", aliases: ["k8s"] },
];

function run(posting: string) {
  return matchJobDescription(
    posting,
    DOCUMENT,
    TECHNOLOGIES,
    [],
    [
      { slug: "react-node", label: "React + Node", primary: ["react", "nodejs"], listed: ["typescript"] },
      { slug: "dotnet", label: ".NET", primary: ["cobol"], listed: [] },
    ],
  );
}

describe("matchJobDescription", () => {
  it("finds a technology named in the posting", () => {
    expect(run("We use React daily.").covered.map((entry) => entry.slug)).toContain("react");
  });

  it("matches an alias the posting uses instead of the label", () => {
    const result = run("Running on k8s in production.");
    const kubernetes = result.covered.find((entry) => entry.slug === "kubernetes");

    expect(kubernetes?.viaAlias).toBe(true);
    expect(kubernetes?.matchedOn).toBe("k8s");
  });

  it("marks a technology evidenced only when a bullet names it", () => {
    const result = run("React and Node.js");

    /*
      The distinction this whole report exists to make: React has a tagged
      bullet, Node.js has a chip and nothing else. Reporting both as "covered"
      would let a requirement met only by a list item read as met with a story.
    */
    expect(result.covered.find((entry) => entry.slug === "react")?.evidenced).toBe(true);
    expect(result.covered.find((entry) => entry.slug === "nodejs")?.evidenced).toBe(false);
  });

  it("orders evidenced technologies first", () => {
    const result = run("Node.js and React");
    const labels = result.covered.map((entry) => entry.label);

    expect(labels.indexOf("React")).toBeLessThan(labels.indexOf("Node.js"));
  });

  it("offers an unmatched name as a candidate gap", () => {
    /*
      "Jest" is a single capitalised word — neither shout, nor dotted, nor
      camel-cased — but it is a tool the owner does not have, and hiding it
      costs an interview. The panel says so and lets the owner judge.
    */
    expect(run("Testes com Jest e Cypress.").gaps).toContain("Jest");
  });

  it("does not offer a posting's own furniture as a gap", () => {
    const result = run("Vaga: Desenvolvedor Sênior. Requisitos obrigatórios: inglês.");

    expect(result.gaps).not.toContain("Vaga");
    expect(result.gaps).not.toContain("Desenvolvedor");
    expect(result.gaps).not.toContain("Requisitos");
  });

  it("does not offer ordinary words as gaps", () => {
    const gaps = run("Desenvolvimento de software com foco em produtos.").gaps;

    expect(gaps).not.toContain("software");
    expect(gaps).not.toContain("com");
  });

  it("keeps accented words whole rather than splitting them", () => {
    /*
      A Latin-only character class split "Tecnologia" + an accented word into
      fragments ("Experi" + "ncia"), each of which then looked like a separate
      unknown requirement. Here the word is not furniture and not a technology,
      so it must survive as one token.
    */
    expect(run("Proficiency with Wörld and Güte").gaps.join(" ")).toContain("Wörld");
  });

  it("suggests the profile with the most overlap", () => {
    const result = run("React, Node.js and TypeScript everywhere.");

    expect(result.suggestedProfile?.slug).toBe("react-node");
  });

  it("suggests nothing when no profile leads", () => {
    const result = run("A COBOL mainframe role.");

    expect(result.suggestedProfile).toBeNull();
  });

  it("reports every profile's overlap so the owner can choose", () => {
    const result = run("React and Node.js");

    expect(result.profiles.map((profile) => profile.slug)).toEqual(["react-node", "dotnet"]);
    expect(result.profiles[0]?.overlap).toBe(2);
  });

  it("returns nothing covered for an empty posting", () => {
    expect(run("").covered).toEqual([]);
  });

  it("does not count a merely-listed technology towards a profile's overlap", () => {
    /*
      A profile that *lists* a technology has said it is worth mentioning, not
      that it leads. React is primary here, TypeScript is listed, so the overlap
      is one — which is below the threshold for a suggestion, because a profile
      that covers a single requirement is not the reason to pick a stack profile.
    */
    const result = run("React and TypeScript");

    expect(result.profiles[0]?.overlap).toBe(1);
    expect(result.suggestedProfile).toBeNull();
  });
});