import { compareArticleSummaries, type ArticleSummary } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";

import type { ArticleRepository } from "./article-repository";

/** Upper bound for the blog index so a runaway query cannot exhaust memory. */
export const MAX_ARTICLE_LIST = 60;

export interface ListArticlesRequest {
  locale: Locale;
  limit?: number;
}

/**
 * Lists published articles, newest first.
 *
 * Ordering is re-applied here rather than trusted from the adapter: a database
 * `order()` and a versioned catalog can disagree, and the rendered list must
 * have one deterministic order regardless of where the rows came from.
 */
export class ListArticles {
  constructor(private readonly repository: ArticleRepository) {}

  async execute({ locale, limit }: ListArticlesRequest): Promise<ArticleSummary[]> {
    const requested = Math.min(limit ?? MAX_ARTICLE_LIST, MAX_ARTICLE_LIST);
    const articles = await this.repository.listPublished(locale, requested);
    const ordered = [...articles].sort(compareArticleSummaries);

    return requested > 0 ? ordered.slice(0, requested) : [];
  }
}
