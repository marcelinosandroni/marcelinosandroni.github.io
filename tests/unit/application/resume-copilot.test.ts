import { describe, expect, it } from "vitest";

import { AskResumeCopilot, type CopilotLabels } from "@/application/ai/ask-resume-copilot";
import { buildCorpus } from "@/infrastructure/ai/resume-corpus";
import { MAX_QUESTION_LENGTH } from "@/domain/ai";
import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";
import type { Locale } from "@/domain/i18n";

const labels: CopilotLabels = {
  topMatch: enUS.copilot.topMatch,
  nothingFound: enUS.copilot.nothingFound,
  questionTooShort: enUS.copilot.questionTooShort,
  questionTooLong: enUS.copilot.questionTooLong,
  sourcesLabel: enUS.copilot.sourcesLabel,
};

async function copilotFor(locale: Locale) {
  return AskResumeCopilot.create(locale, locale === "en-US" ? labels : {
    topMatch: ptBR.copilot.topMatch,
    nothingFound: ptBR.copilot.nothingFound,
    questionTooShort: ptBR.copilot.questionTooShort,
    questionTooLong: ptBR.copilot.questionTooLong,
    sourcesLabel: ptBR.copilot.sourcesLabel,
  });
}

describe("Resume AI Copilot", () => {
  it("answers the flagship question from the real case study", async () => {
    const copilot = await copilotFor("en-US");
    const answer = copilot.ask("How did you save the 24M contract?");

    expect(answer.status).toBe("answered");
    if (answer.status !== "answered") return;

    // The figure has to come from the resume, not from a plausible guess.
    expect(answer.text).toContain("24M");
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations[0].label.length).toBeGreaterThan(0);
  });

  it("cites a passage that actually contains the answer", async () => {
    const copilot = await copilotFor("en-US");
    const answer = copilot.ask("What is your Kafka experience?");

    expect(answer.status).toBe("answered");
    if (answer.status !== "answered") return;

    const evidence = answer.citations.map((citation) => citation.excerpt).join(" ").toLowerCase();
    expect(evidence).toContain("kafka");
  });

  it("refuses rather than inventing when nothing matches", async () => {
    const copilot = await copilotFor("en-US");
    const answer = copilot.ask("What is your favourite pizza topping in Marseille?");

    expect(answer.status).toBe("not-found");
    if (answer.status !== "not-found") return;

    expect(answer.citations).toEqual([]);
    expect(answer.considered).toBe(0);
  });

  it("rejects questions that are not questions", async () => {
    const copilot = await copilotFor("en-US");

    expect(copilot.ask("hi").status).toBe("rejected");
    expect(copilot.ask("  ").status).toBe("rejected");
    expect(copilot.ask("a".repeat(MAX_QUESTION_LENGTH + 1)).status).toBe("rejected");
  });

  it("answers in the locale it was built for", async () => {
    const copilot = await copilotFor("pt-BR");
    const answer = copilot.ask("Como você salvou o contrato de 24 milhões?");

    expect(answer.status).toBe("answered");
    if (answer.status !== "answered") return;

    expect(answer.text).toContain(ptBR.copilot.topMatch.split("{label}")[0]);
  });

  it("builds a corpus with unique ids and non-empty text", async () => {
    for (const locale of ["en-US", "pt-BR"] as const) {
      const corpus = await buildCorpus(locale);
      const ids = new Set(corpus.map((chunk) => chunk.id));

      expect(corpus.length).toBeGreaterThan(50);
      expect(ids.size).toBe(corpus.length);
      for (const chunk of corpus) {
        expect(chunk.text.trim().length).toBeGreaterThan(0);
        expect(chunk.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("falls back to the resume alone when the article source is unavailable", async () => {
    const corpus = await buildCorpus("en-US", {
      listPublished: () => Promise.reject(new Error("database down")),
      findPublishedBySlug: () => Promise.reject(new Error("database down")),
    });

    expect(corpus.length).toBeGreaterThan(50);
  });
});
