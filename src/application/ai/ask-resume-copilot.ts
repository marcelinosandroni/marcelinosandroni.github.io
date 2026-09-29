import type { Locale } from "@/domain/i18n";
import {
  MAX_ANSWER_PASSAGES,
  MAX_CITATIONS,
  MAX_QUESTION_LENGTH,
  MIN_QUESTION_LENGTH,
  type Citation,
  type CopilotAnswer,
  type KnowledgeChunk,
  type ScoredChunk,
} from "@/domain/ai";
import { LexicalRetriever } from "@/infrastructure/ai/lexical-retriever";
import { buildCorpus } from "@/infrastructure/ai/resume-corpus";
import type { ArticleRepository } from "@/application/blog/article-repository";

/**
 * Answers a recruiter question strictly from published content.
 *
 * Retrieval decides the answer; nothing here invents a fact. When the corpus has
 * nothing relevant the contract is to say so, because a portfolio that admits
 * ignorance is credible and one that guesses is not.
 *
 * Every visible string comes from the message catalogs, so the copilot is
 * translatable and cannot reintroduce hardcoded text.
 */
export type CopilotLabels = {
  topMatch: string;
  nothingFound: string;
  questionTooShort: string;
  questionTooLong: string;
  sourcesLabel: string;
};

export type CopilotOptions = {
  labels: CopilotLabels;
  /** How many candidates to rank before applying the relevance floor. */
  candidates?: number;
  /** Minimum score for a passage to be considered relevant at all. */
  relevanceFloor?: number;
};

export class AskResumeCopilot {
  private readonly retriever: LexicalRetriever;
  private readonly labels: CopilotLabels;
  private readonly candidates: number;
  private readonly relevanceFloor: number;

  constructor(chunks: readonly KnowledgeChunk[], options: CopilotOptions) {
    this.retriever = new LexicalRetriever(chunks);
    this.labels = options.labels;
    this.candidates = options.candidates ?? 12;
    this.relevanceFloor = options.relevanceFloor ?? 0.6;
  }

  /**
   * Builds a copilot scoped to one locale.
   *
   * The instance is locale-bound on purpose: the corpus is a snapshot, so
   * building it per request would also keep the retriever from drifting away
   * from the language the visitor is actually reading.
   */
  static async create(
    locale: Locale,
    labels: CopilotLabels,
    articles?: ArticleRepository,
  ): Promise<AskResumeCopilot> {
    const corpus = await buildCorpus(locale, articles);
    return new AskResumeCopilot(corpus, { labels });
  }

  ask(question: string): CopilotAnswer {
    const trimmed = question.trim();

    if (trimmed.length < MIN_QUESTION_LENGTH) {
      return this.rejected(this.labels.questionTooShort);
    }

    if (trimmed.length > MAX_QUESTION_LENGTH) {
      return this.rejected(this.labels.questionTooLong);
    }

    const ranked = this.retriever
      .search(trimmed, this.candidates)
      .filter((candidate) => candidate.score >= this.relevanceFloor);

    const best = ranked[0];

    if (!best) {
      return { status: "not-found", text: this.labels.nothingFound, citations: [], considered: 0 };
    }

    return {
      status: "answered",
      text: [
        this.labels.topMatch.replace("{label}", best.chunk.label),
        ...ranked.slice(0, MAX_ANSWER_PASSAGES).map((entry) => entry.chunk.text),
      ].join("\n\n"),
      citations: this.toCitations(ranked),
      considered: ranked.length,
    };
  }

  private rejected(text: string): CopilotAnswer {
    return { status: "rejected", text, citations: [], considered: 0 };
  }

  private toCitations(ranked: ScoredChunk[]): Citation[] {
    return ranked.slice(0, MAX_CITATIONS).map((entry) => ({
      label: entry.chunk.label,
      source: entry.chunk.source,
      excerpt: entry.chunk.text.length > 220 ? `${entry.chunk.text.slice(0, 217)}…` : entry.chunk.text,
    }));
  }
}
