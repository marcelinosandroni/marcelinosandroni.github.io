import { toArticleSummary, type ArticleSummary, type BlogArticle } from "@/domain/blog";
import type { ArticleRepository } from "@/application/blog";
import type { ArticleSlug } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";

import { articlesEnUS } from "./articles-en-us";
import { articlesPtBR } from "./articles-pt-br";

/**
 * Versioned fallback catalog, exposed as an `ArticleRepository`.
 *
 * A repository rather than a plain lookup because the composition root wires it
 * behind `FallbackArticleRepository` through exactly the same port the Supabase
 * adapter implements. The pages cannot tell the difference, which is the point.
 *
 * Serves the same `published`-only contract as the database adapter so a
 * fallback can never surface a draft.
 */
const ARTICLES_BY_LOCALE = {
  "pt-BR": articlesPtBR,
  "en-US": articlesEnUS,
} as const satisfies Record<Locale, BlogArticle[]>;

export class VersionedArticleRepository implements ArticleRepository {
  async listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]> {
    const summaries = ARTICLES_BY_LOCALE[locale]
      .filter((article) => article.status === "published")
      .map(toArticleSummary);

    return typeof limit === "number" ? summaries.slice(0, Math.max(limit, 0)) : summaries;
  }

  async findPublishedBySlug(locale: Locale, slug: ArticleSlug): Promise<BlogArticle | null> {
    return (
      ARTICLES_BY_LOCALE[locale].find(
        (article) => article.slug === slug.value && article.status === "published",
      ) ?? null
    );
  }
}

/**
 * Shared instance. The composition root compares against this identity to decide
 * whether the database adapter is in play at all, so the object must be a
 * singleton rather than a fresh instance per call.
 */
export const versionedArticleRepository = new VersionedArticleRepository();

export { articlesEnUS, articlesPtBR };
