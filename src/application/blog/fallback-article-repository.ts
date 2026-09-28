import type { ArticleSummary, ArticleSlug as ArticleSlugValue, BlogArticle } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";

import type { ArticleRepository } from "./article-repository";

/**
 * Read-through fallback for the article repository.
 *
 * The blog is database-first, but the site must still build and render when the
 * database is unreachable — a build machine without credentials, a preview
 * deploy, a cold Supabase project, or an outage. Rather than duplicating the
 * "is the blog available?" decision into every page, the fallback is modelled as
 * a decorator: the pages depend on the `ArticleRepository` port and are
 * indifferent to which adapter is composed in.
 *
 * Policy, in order:
 *  1. Serve from `primary` when it answers with rows.
 *  2. Serve from `fallback` when `primary` is empty.
 *  3. Serve from `fallback` when `primary` throws, and report the failure through
 *     `onFallback` instead of swallowing it, so an outage is observable.
 */
export class FallbackArticleRepository implements ArticleRepository {
  constructor(
    private readonly primary: ArticleRepository,
    private readonly fallback: ArticleRepository,
    private readonly onFallback?: (error: unknown) => void,
  ) {}

  async listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]> {
    const primary = await this.read(() => this.primary.listPublished(locale, limit));
    if (primary && primary.length > 0) {
      return primary;
    }

    return (await this.fallback.listPublished(locale, limit)) ?? [];
  }

  async findPublishedBySlug(locale: Locale, slug: ArticleSlugValue): Promise<BlogArticle | null> {
    const primary = await this.read(() => this.primary.findPublishedBySlug(locale, slug));
    if (primary) {
      return primary;
    }

    return this.fallback.findPublishedBySlug(locale, slug);
  }

  /**
   * `null` means "the primary adapter could not answer"; `[]` or `null` results
   * are legitimate answers and fall through to the empty-result branch instead.
   */
  private async read<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.onFallback?.(error);
      return null;
    }
  }
}
