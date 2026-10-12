import { describe, expect, it } from "vitest";

import {
  isSameTechnology,
  normalizeForMatch,
  suspectedDuplicates,
  technologySlug,
} from "@/domain/resume/technology";

describe("technologySlug", () => {
  it("lowercases and hyphenates", () => {
    expect(technologySlug("Node.js")).toBe("node-js");
    expect(technologySlug("Java Spring Boot")).toBe("java-spring-boot");
  });

  it("strips accents so the same tool gets the same row", () => {
    expect(technologySlug("Observabilidade")).toBe("observabilidade");
    expect(technologySlug("Arquitetura Hexagonal")).toBe("arquitetura-hexagonal");
  });

  it("collapses punctuation into single hyphens", () => {
    expect(technologySlug("CI/CD")).toBe("ci-cd");
    expect(technologySlug("Next.js (RSC, SSR)")).toBe("next-js-rsc-ssr");
    expect(technologySlug("  spaced  out  ")).toBe("spaced-out");
  });

  it("keeps the plus sign, which is part of several names", () => {
    expect(technologySlug("C#")).toBe("c");
    expect(technologySlug("A+ B")).toBe("a-b");
  });

  it("strips the leading hyphen a dot would otherwise leave", () => {
    expect(technologySlug(".NET")).toBe("net");
  });
});

describe("normalizeForMatch", () => {
  it("drops the version a posting adds and the résumé does not", () => {
    expect(normalizeForMatch("PostgreSQL 15")).toBe(normalizeForMatch("PostgreSQL"));
    expect(normalizeForMatch("Node 18")).toBe(normalizeForMatch("Node"));
  });

  it("treats punctuation as a separator rather than a difference", () => {
    expect(normalizeForMatch("Node.js")).toBe("node js");
    expect(normalizeForMatch("nodejs")).toBe("nodejs");
  });
});

describe("isSameTechnology", () => {
  it("accepts a shared slug", () => {
    expect(isSameTechnology({ slug: "react", label: "React" }, { slug: "react", label: "React 18" }))
      .toBe(true);
  });

  it("accepts labels that normalise to the same thing", () => {
    expect(isSameTechnology({ slug: "a", label: "Node.js" }, { slug: "b", label: "Node.js " })).toBe(true);
    expect(isSameTechnology({ slug: "a", label: "C#/.NET" }, { slug: "b", label: "C# .net" })).toBe(true);
  });

  it("keeps a removed character as a difference", () => {
    /*
      "Node.js" and "NodeJS" normalise to "node js" and "nodejs". They are
      treated as different, which is the conservative direction: a false negative
      leaves two rows the owner can merge, while a false positive would have
      already merged two rows they meant to keep apart.
    */
    expect(isSameTechnology({ slug: "node-js", label: "Node.js" }, { slug: "nodejs", label: "NodeJS" }))
      .toBe(false);
  });

  it("keeps genuinely different tools apart", () => {
    expect(isSameTechnology({ slug: "react", label: "React" }, { slug: "react-native", label: "React Native" }))
      .toBe(false);
  });
});

describe("suspectedDuplicates", () => {
  it("finds a label written inside another", () => {
    const pairs = suspectedDuplicates([{ label: "Kafka" }, { label: "Apache Kafka" }]);

    expect(pairs).toHaveLength(1);
    expect([...pairs[0]].sort()).toEqual(["Apache Kafka", "Kafka"]);
  });

  it("finds the case the bootstrap actually produced", () => {
    const pairs = suspectedDuplicates([
      { label: "NestJS" },
      { label: "Node.js (NestJS)" },
      { label: "Kafka" },
      { label: "Apache Kafka" },
    ]);

    const normalised = pairs.map(([a, b]) => [a, b].sort().join(" ↔ ")).sort();

    expect(normalised).toEqual(
      ["Apache Kafka ↔ Kafka", "NestJS ↔ Node.js (NestJS)"].sort(),
    );
  });

  it("does not catch an abbreviation, and says so", () => {
    /*
      A deliberate miss. "arch" is not a token of "architecture", so catching this
      would mean letting the last aligned token match as a string prefix — fuzzy
      matching, which is the thing this function exists not to do. The owner can
      merge this pair by hand; a wrong merge cannot be undone from the UI.
    */
    expect(suspectedDuplicates([{ label: "Clean Arch" }, { label: "Clean Architecture" }]))
      .toEqual([]);
  });

  it("does not report a whole word that merely sits inside another word", () => {
    /*
      The false positive that matters: a plain substring test reports Go as a
      duplicate of MongoDB and of Hexagonal, because "go" is in both. A
      diagnostic that cries wolf is one the owner learns to ignore, and then it
      has caught nothing.
    */
    const pairs = suspectedDuplicates([
      { label: "Go" },
      { label: "MongoDB" },
      { label: "Hexagonal Architecture" },
    ]);

    expect(pairs).toEqual([]);
  });

  it("ignores exact repeats, which the unique index already prevents", () => {
    expect(suspectedDuplicates([{ label: "React" }, { label: "React" }])).toEqual([]);
  });

  it("is empty for a catalog with no overlap", () => {
    expect(suspectedDuplicates([{ label: "React" }, { label: "Kafka" }, { label: "Terraform" }]))
      .toEqual([]);
  });
});