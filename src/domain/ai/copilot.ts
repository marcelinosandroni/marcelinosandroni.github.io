/**
 * Resume Copilot contract.
 *
 * The copilot answers recruiter questions **from the published resume and blog
 * content, and nothing else**. It is grounded by construction: every answer
 * carries the passages it was derived from, and when no passage is relevant the
 * contract says so instead of improvising.
 *
 * That constraint is the whole point. A portfolio that invents an answer is
 * worse than one that admits it does not know, so there is deliberately no
 * "generate something plausible" path in this module.
 */

/** Where a retrieved passage came from, for attribution. */
export type KnowledgeSource =
  | { kind: "summary"; experience: string }
  | { kind: "highlight"; experience: string; index: number }
  | { kind: "case-study"; experience: string; title: string }
  | { kind: "skill"; group: string; skill: string }
  | { kind: "education"; institution: string }
  | { kind: "language"; language: string }
  | { kind: "article"; slug: string; title: string; category: string };

/**
 * One retrievable unit of the corpus. Chunks are small and self-contained on
 * purpose: a chunk that mixes two facts cannot be cited precisely.
 */
export type KnowledgeChunk = {
  id: string;
  source: KnowledgeSource;
  /** Human-facing label used in citations. */
  label: string;
  /** Prose that is searchable and quotable. */
  text: string;
  /** Extra terms that should match this chunk even if absent from the prose. */
  keywords: string[];
};

/** A chunk that survived retrieval, with the score that selected it. */
export type ScoredChunk = {
  chunk: KnowledgeChunk;
  score: number;
};

export type Citation = {
  label: string;
  source: KnowledgeSource;
  /** Verbatim excerpt that supports the answer. */
  excerpt: string;
};

export type CopilotAnswer =
  | {
      status: "answered";
      /** Grounded prose, assembled only from retrieved passages. */
      text: string;
      citations: Citation[];
      /** Passages considered, after the relevance floor. */
      considered: number;
    }
  | {
      status: "not-found";
      /** Explained honestly instead of guessing. */
      text: string;
      citations: [];
      considered: 0;
    }
  | {
      status: "rejected";
      /** The question could not be accepted as a question at all. */
      text: string;
      citations: [];
      considered: 0;
    };

export const MAX_QUESTION_LENGTH = 280;
export const MIN_QUESTION_LENGTH = 3;
export const MAX_CITATIONS = 3;
export const MAX_ANSWER_PASSAGES = 4;
