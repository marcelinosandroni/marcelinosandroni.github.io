import type { Locale } from "@/domain/i18n";

/**
 * Blog contract.
 *
 * Articles are database-resident: the source of truth is the `blog_articles`
 * table, reached through the `ArticleRepository` port. Nothing in this module
 * knows about SQL, Supabase or Next.js — it only states what an article *is*,
 * so the same shape can come from Postgres, from a CMS, or from the versioned
 * fallback catalog used at build time.
 */

/** Publication state. Only `published` is ever served. */
export type ArticleStatus = "published" | "draft";

/**
 * Structured body. Articles are stored as typed blocks rather than Markdown so
 * the presentation layer can render each block with the correct typography from
 * the design system, and so a malformed body fails loudly at the edge instead
 * of being silently `dangerouslySetInnerHTML`-ed.
 */
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "code"; language: string; code: string }
  | { type: "callout"; tone: "primary" | "secondary"; title: string; text: string };

export type ArticleBlockType = ArticleBlock["type"];

export type ArticleCategory =
  | "distributed-systems"
  | "data-platforms"
  | "leadership"
  | "ai-ml"
  | "fintech";

export type BlogArticle = {
  id: string;
  locale: Locale;
  slug: string;
  category: ArticleCategory;
  status: ArticleStatus;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  /** ISO-8601 date, always `YYYY-MM-DD` for a date-only column. */
  publishedAt: string;
  updatedAt: string | null;
  featured: boolean;
  tags: string[];
  body: ArticleBlock[];
};

/** List projection: the body is never loaded for a list or a card. */
export type ArticleSummary = Omit<BlogArticle, "body">;

export class InvalidArticleSlugError extends Error {
  constructor(value: string, reason: string) {
    super(`Invalid article slug ${JSON.stringify(value)}: ${reason}`);
    this.name = "InvalidArticleSlugError";
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 96;

/**
 * URL segment value object for an article.
 *
 * The slug is part of a public, permanent URL, so its shape is an invariant
 * rather than a convention: lowercase kebab-case only, no leading, trailing or
 * doubled hyphens, and a bounded length so it survives a URL bar and a sitemap.
 * Validating here means a bad row in the database produces a 404 with a reason,
 * not a malformed link that spreads.
 */
export class ArticleSlug {
  private constructor(public readonly value: string) {}

  static create(value: string): ArticleSlug {
    if (value.length === 0) {
      throw new InvalidArticleSlugError(value, "must not be empty");
    }
    if (value.length > SLUG_MAX_LENGTH) {
      throw new InvalidArticleSlugError(value, `must be at most ${SLUG_MAX_LENGTH} characters`);
    }
    if (!SLUG_PATTERN.test(value)) {
      throw new InvalidArticleSlugError(
        value,
        "must be lowercase kebab-case: alphanumeric words joined by single hyphens",
      );
    }

    return new ArticleSlug(value);
  }

  /** Non-throwing probe, for filtering untrusted rows instead of failing on them. */
  static isValid(value: string): boolean {
    try {
      ArticleSlug.create(value);
      return true;
    } catch {
      return false;
    }
  }

  toString(): string;
  toString(localeSegment: string): string;
  toString(localeSegment?: string): string {
    return localeSegment ? `/${localeSegment}/blog/${this.value}` : `/blog/${this.value}`;
  }
}

/**
 * Projects an article onto its list shape.
 *
 * Written as an explicit whitelist rather than a rest-destructure: it makes the
 * projection a deliberate contract (the body can never leak into a list payload)
 * and it does not depend on a throwaway binding.
 */
export function toArticleSummary(article: BlogArticle): ArticleSummary {
  return {
    id: article.id,
    locale: article.locale,
    slug: article.slug,
    category: article.category,
    status: article.status,
    title: article.title,
    excerpt: article.excerpt,
    readingTimeMinutes: article.readingTimeMinutes,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    featured: article.featured,
    tags: article.tags,
  };
}

/**
 * Newest first, then by title so two articles sharing a date still have a
 * total order and the list is deterministic across builds.
 */
export function compareArticleSummaries(a: ArticleSummary, b: ArticleSummary): number {
  if (a.publishedAt !== b.publishedAt) {
    return a.publishedAt < b.publishedAt ? 1 : -1;
  }
  return a.title.localeCompare(b.title);
}
