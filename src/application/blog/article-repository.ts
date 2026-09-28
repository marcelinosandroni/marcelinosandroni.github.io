import type { ArticleSummary, ArticleSlug, BlogArticle } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";

/**
 * Port for reading database-stored articles.
 *
 * Declared here, in the application layer, so the domain stays free of any
 * storage concern and the Supabase adapter can be swapped for a fake, a CMS
 * client or a file-backed catalog without touching a use case.
 *
 * Both methods are `published`-only by contract: drafts are not a concept the
 * presentation layer should ever have to remember to filter.
 */
export interface ArticleRepository {
  /** Newest first. `limit` is advisory; an adapter may return fewer. */
  listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]>;

  findPublishedBySlug(locale: Locale, slug: ArticleSlug): Promise<BlogArticle | null>;
}
