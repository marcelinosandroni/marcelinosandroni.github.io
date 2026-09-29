import type { KnowledgeChunk, ScoredChunk } from "@/domain/ai";

/**
 * Lexical retrieval over the resume corpus.
 *
 * Deliberately a transparent scoring function rather than an embedding service:
 *
 *  * The corpus is a few hundred short passages, which is far below the size
 *    where vector search starts to pay for its operational cost.
 *  * A recruiter asking "how did he save 24M" must be able to see *why* a
 *    passage was selected. An opaque similarity score cannot explain itself.
 *  * It needs no API key, no network, and no per-request cost, so the copilot
 *    cannot silently stop answering because a provider is down.
 *
 * Scoring is BM25-style term weighting with a field boost on `keywords`, which
 * is what lets "Kafka" match a passage that never spells the word out in prose.
 */

const K1 = 1.5;
const B = 0.75;

/** Lower-cased, accent-stripped tokens. Keeps digits because facts contain them. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1)
    .map(stem);
}

/**
 * Very light suffix stripping.
 *
 * Not a real stemmer: it exists so a question like "lead engineering teams"
 * reaches a passage that says "Led a team of engineers". Full Porter stemming
 * is deliberately avoided because it over-collides domain terms — "resilience"
 * and "resilient" *should* stay distinguishable in a portfolio, and a recruiter
 * asking about one usually means that one.
 */
export function stem(token: string): string {
  if (token.length <= 4) {
    return token;
  }

  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return token.slice(0, token.length - suffix.length);
    }
  }

  return token;
}

/** Terms too common in a resume to discriminate between passages. */
const STOP_WORDS = new Set([
  // English function words, including the two-letter ones that survive
  // tokenization. Leaving these in was a real bug: "in" appears in "built in
  // Go" often enough to make any question containing it match everything.
  "the", "and", "for", "with", "that", "this", "from", "was", "were", "has", "have",
  "had", "not", "but", "you", "your", "are", "his", "her", "their", "they", "them",
  "who", "what", "when", "where", "how", "why", "did", "does", "do", "can", "could",
  "would", "should", "will", "been", "being", "into", "over", "under", "about",
  "in", "on", "at", "to", "of", "or", "if", "is", "it", "as", "be", "by", "an",
  "any", "all", "one", "two", "get", "got", "its", "our", "out", "so", "no", "we",
  "me", "my", "up", "am", "us", "he", "she",
  // Portuguese
  "como", "que", "com", "para", "por", "uma", "dos", "das", "seu", "sua", "ele",
  "ela", "mais", "muito", "sobre", "entre", "onde", "quando", "porque", "nao",
  "sim", "sao", "foi", "ser", "ter", "fazer", "voce", "ele", "isso", "esta",
  "este", "sao", "das", "pelo", "pela", "ate", "depois", "sem", "cada", "qual",
]);

export function isStopWord(token: string): boolean {
  return STOP_WORDS.has(token);
}

/** Query tokens with stop words and single characters removed. */
export function queryTerms(question: string): string[] {
  const seen = new Set<string>();

  for (const token of tokenize(question)) {
    if (!isStopWord(token)) {
      seen.add(token);
    }
  }

  return [...seen];
}

type IndexedChunk = {
  chunk: KnowledgeChunk;
  termFrequency: Map<string, number>;
  length: number;
  keywordSet: Set<string>;
};

export class LexicalRetriever {
  private readonly index: IndexedChunk[];
  private readonly documentFrequency: Map<string, number>;
  private readonly averageLength: number;

  constructor(chunks: readonly KnowledgeChunk[]) {
    this.index = chunks.map((chunk) => {
      const prose = tokenize(chunk.text);
      const keywords = tokenize(chunk.keywords.join(" "));
      const termFrequency = new Map<string, number>();

      for (const token of [...prose, ...keywords]) {
        termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      }

      return {
        chunk,
        termFrequency,
        length: prose.length + 1,
        keywordSet: new Set(keywords),
      };
    });

    this.documentFrequency = new Map();
    for (const entry of this.index) {
      for (const term of entry.termFrequency.keys()) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
      }
    }

    this.averageLength =
      this.index.reduce((sum, entry) => sum + entry.length, 0) / Math.max(1, this.index.length);
  }

  /**
   * Returns passages that genuinely address the question, best first.
   *
   * The gate is discriminativeness, not raw frequency. A passage qualifies when
   * it matches at least one query term **and** the most discriminative term it
   * matched has an inverse document frequency above the floor.
   *
   * Using IDF rather than document frequency matters: "ClickHouse" appears in
   * dozens of passages and is still the right answer to a question about it,
   * because it is concentrated in a handful of them. An earlier gate based on
   * absolute document frequency rejected that question and accepted an unrelated
   * one, which is the exact opposite of what it was meant to prevent.
   */
  search(question: string, limit: number, options: { minTermIdf?: number } = {}): ScoredChunk[] {
    const minTermIdf = options.minTermIdf ?? 0.35;
    const terms = queryTerms(question);
    if (terms.length === 0) {
      return [];
    }

    const total = this.index.length;
    const scored: ScoredChunk[] = [];

    for (const entry of this.index) {
      let score = 0;
      let distinctMatches = 0;
      let bestTermIdf = 0;

      for (const term of terms) {
        const frequency = entry.termFrequency.get(term);
        if (frequency === undefined) {
          continue;
        }

        const documentFrequency = this.documentFrequency.get(term) ?? 1;
        const inverseDocumentFrequency = Math.max(
          0.05,
          Math.log(1 + (total - documentFrequency + 0.5) / (documentFrequency + 0.5)),
        );

        distinctMatches += 1;
        bestTermIdf = Math.max(bestTermIdf, inverseDocumentFrequency);

        const saturation =
          (frequency * (K1 + 1)) /
          (frequency + K1 * (1 - B + B * (entry.length / this.averageLength)));
        score += inverseDocumentFrequency * saturation;

        // A term the author listed as a keyword is a stronger signal than an
        // incidental mention in prose.
        if (entry.keywordSet.has(term)) {
          score *= 1.4;
        }
      }

      if (distinctMatches > 0 && bestTermIdf >= minTermIdf) {
        scored.push({ chunk: entry.chunk, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
      .slice(0, limit);
  }
}
