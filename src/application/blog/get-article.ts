import { ArticleSlug, type BlogArticle } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";

import type { ArticleRepository } from "./article-repository";

export class ArticleNotFoundError extends Error {
  constructor(locale: Locale, slug: string) {
    super(`Published article not found for locale ${locale}: ${slug}`);
    this.name = "ArticleNotFoundError";
  }
}

export interface GetArticleRequest {
  locale: Locale;
  slug: string;
}

/**
 * Fetches a single published article.
 *
 * The slug is validated before it reaches the repository: a malformed slug is a
 * client mistake and must become a 404, never a database round trip. The
 * presentation layer maps the thrown error to `notFound()`.
 */
export class GetArticle {
  constructor(private readonly repository: ArticleRepository) {}

  async execute({ locale, slug }: GetArticleRequest): Promise<BlogArticle> {
    const articleSlug = ArticleSlug.create(slug);
    const article = await this.repository.findPublishedBySlug(locale, articleSlug);

    if (!article) {
      throw new ArticleNotFoundError(locale, slug);
    }

    return article;
  }
}
