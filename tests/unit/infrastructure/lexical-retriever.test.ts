import { describe, expect, it } from "vitest";

import { LexicalRetriever, isStopWord, queryTerms, stem, tokenize } from "@/infrastructure/ai/lexical-retriever";
import type { KnowledgeChunk } from "@/domain/ai";

const chunks: KnowledgeChunk[] = [
  {
    id: "case-1",
    source: { kind: "case-study", experience: "Acme", title: "Contract rescue" },
    label: "Contract rescue",
    text: "Rescued a 24M contract in Florianópolis by lifting plate recognition accuracy from 60% to 100%.",
    keywords: ["Acme", "ClickHouse", "ETL"],
  },
  {
    id: "case-2",
    source: { kind: "case-study", experience: "Acme", title: "Kafka migration" },
    label: "Kafka migration",
    text: "Migrated the broker to Kafka with idempotent consumers and dead letter queues.",
    keywords: ["Acme", "Kafka", "resiliency"],
  },
  {
    id: "case-3",
    source: { kind: "highlight", experience: "Beta", index: 0 },
    label: "Beta",
    text: "Led a team of 10 engineers and raised code quality eight times.",
    keywords: ["Beta"],
  },
  {
    id: "noise",
    source: { kind: "summary", experience: "Gamma" },
    label: "Gamma",
    text: "Nothing relevant lives here.",
    keywords: [],
  },
];

describe("tokenize", () => {
  it("lowercases and strips accents", () => {
    expect(tokenize("Arquitetura Hexagonal e Microsserviços")).toContain("arquitetura");
    expect(tokenize("Microsserviços")).toContain("microsservico");
  });

  it("keeps digits because facts are made of them", () => {
    expect(tokenize("24M contract, 45% growth")).toEqual(expect.arrayContaining(["24m", "45"]));
  });

  it("drops single characters", () => {
    expect(tokenize("a b go")).toEqual(["go"]);
  });
});

describe("stem", () => {
  it("collapses a question verb onto the passage wording", () => {
    expect(stem("teams")).toBe("team");
    expect(stem("leading")).toBe("lead");
  });

  it("does not over-stem domain terms into each other", () => {
    // "resilience" and "resilient" must stay apart: a recruiter asking about
    // one usually means that one, and full Porter stemming would merge them.
    expect(stem("resilience")).toBe("resilience");
    expect(stem("clickhouse")).toBe("clickhouse");
    expect(stem("kafka")).toBe("kafka");
  });
});

describe("stop words", () => {
  it("treats two-letter function words as noise", () => {
    // "in" leaking into the index made every question containing it match.
    for (const word of ["in", "on", "at", "to", "of", "or"]) {
      expect(isStopWord(word)).toBe(true);
    }
  });

  it("never treats a domain term as a stop word", () => {
    for (const term of ["kafka", "clickhouse", "k8s", "tdd", "aws"]) {
      expect(isStopWord(term)).toBe(false);
    }
  });
});

describe("queryTerms", () => {
  it("deduplicates and drops stop words", () => {
    expect(queryTerms("How did the team in Go lead?")).toEqual(
      expect.arrayContaining(["team", "go", "lead"]),
    );
    expect(queryTerms("How did the team in Go lead?")).not.toContain("the");
    expect(queryTerms("the of and")).toEqual([]);
  });
});

describe("LexicalRetriever", () => {
  it("ranks the passage that mentions the distinctive fact first", () => {
    const results = new LexicalRetriever(chunks).search("How did you save the 24M contract?", 5);

    expect(results[0].chunk.id).toBe("case-1");
  });

  it("finds a single-term question about a keyword", () => {
    const results = new LexicalRetriever(chunks).search("ClickHouse", 5);

    expect(results[0].chunk.id).toBe("case-1");
  });

  it("refuses a question whose terms appear nowhere in the corpus", () => {
    // The honest-refusal path: a portfolio that guesses is worse than one that
    // admits it does not know.
    const results = new LexicalRetriever(chunks).search("favourite pizza in Marseille", 5);

    expect(results).toEqual([]);
  });

  it("returns nothing for a question made only of stop words", () => {
    expect(new LexicalRetriever(chunks).search("the of and", 5)).toEqual([]);
  });

  it("matches a verb inflection the passage spells differently", () => {
    const results = new LexicalRetriever(chunks).search("lead engineers", 5);

    expect(results.map((result) => result.chunk.id)).toContain("case-3");
  });

  it("orders results by descending score", () => {
    const results = new LexicalRetriever(chunks).search("Acme Kafka contract", 5);

    const scores = results.map((result) => result.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("breaks score ties deterministically by id", () => {
    // A third passage keeps the term discriminative enough to clear the IDF
    // floor, so the tie is between "a" and "b" and id is the only tiebreaker.
    const tied: KnowledgeChunk[] = [
      { id: "b", source: { kind: "summary", experience: "X" }, label: "b", text: "kafka", keywords: [] },
      { id: "a", source: { kind: "summary", experience: "X" }, label: "a", text: "kafka", keywords: [] },
      { id: "c", source: { kind: "summary", experience: "X" }, label: "c", text: "unrelated", keywords: [] },
    ];

    const results = new LexicalRetriever(tied).search("kafka", 5);
    expect(results.map((result) => result.chunk.id)).toEqual(["a", "b"]);
  });

  it("refuses a term that appears in every passage", () => {
    // Correct BM25 behaviour, and a safety property: a term carried by the whole
    // corpus has no discriminating power, so it must not be able to answer.
    const universal: KnowledgeChunk[] = [
      { id: "a", source: { kind: "summary", experience: "X" }, label: "a", text: "kafka", keywords: [] },
      { id: "b", source: { kind: "summary", experience: "X" }, label: "b", text: "kafka", keywords: [] },
    ];

    expect(new LexicalRetriever(universal).search("kafka", 5)).toEqual([]);
  });

  it("respects the result limit", () => {
    expect(new LexicalRetriever(chunks).search("Acme", 2)).toHaveLength(2);
  });

  it("survives an empty corpus", () => {
    expect(new LexicalRetriever([]).search("anything", 5)).toEqual([]);
  });
});
