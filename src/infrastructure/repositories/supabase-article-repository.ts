import type { ArticleRepository } from "@/application/blog";
import {
  ArticleSlug,
  toArticleSummary,
  type ArticleBlock,
  type ArticleCategory,
  type ArticleStatus,
  type ArticleSummary,
  type BlogArticle,
} from "@/domain/blog";
import type { Locale } from "@/domain/i18n";
import { getSupabaseClient } from "@/infrastructure/supabase/supabase-client";

/** Column list shared by the list and the single-row queries. */
const COLUMNS =
  "id, locale, slug, category, status, title, excerpt, reading_time_minutes, published_at, updated_at, featured, tags, body";

/**
 * Per-request budget.
 *
 * A blog is never worth stalling a page for: the composition root has a
 * versioned catalog to fall back to, but it can only reach it once this call
 * settles. Bounding the wait keeps a half-open connection from adding its
 * full timeout to every visitor's page view.
 */
const REQUEST_TIMEOUT_MS = 2_000;

type BlogRow = {
  id: unknown;
  locale: unknown;
  slug: unknown;
  category: unknown;
  status: unknown;
  title: unknown;
  excerpt: unknown;
  reading_time_minutes: unknown;
  published_at: unknown;
  updated_at: unknown;
  featured: unknown;
  tags: unknown;
  body: unknown;
};

const CATEGORIES: ReadonlySet<string> = new Set<ArticleCategory>([
  "distributed-systems",
  "data-platforms",
  "leadership",
  "ai-ml",
  "fintech",
]);

const STATUSES: ReadonlySet<string> = new Set<ArticleStatus>(["published", "draft"]);

/**
 * Database adapter for the blog.
 *
 * Trust boundary: every column arrives as `unknown` from PostgREST, so nothing
 * is cast straight into a domain object. A row that fails validation is dropped
 * rather than rendered — one malformed row must not take down a page, and a
 * partially-rendered article is worse than an absent one.
 */
export class SupabaseArticleRepository implements ArticleRepository {
  async listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]> {
    const scoped = getSupabaseClient()
      .from("blog_articles")
      .select(COLUMNS)
      .eq("locale", locale)
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (typeof limit === "number" && limit > 0) {
      scoped.limit(limit);
    }

    const { data, error } = await this.withDeadline(
      scoped,
      `Failed to list articles for ${locale}`,
    );

    if (error) {
      // Surfaced as a rejection so `FallbackArticleRepository` can open the
      // circuit breaker and serve the versioned catalog instead of pretending the
      // blog is empty.
      throw error;
    }

    return this.toRows(data).map(toArticleSummary);
  }

  async findPublishedBySlug(locale: Locale, slug: ArticleSlug): Promise<BlogArticle | null> {
    const { data, error } = await this.withDeadline(
      getSupabaseClient()
        .from("blog_articles")
        .select(COLUMNS)
        .eq("locale", locale)
        .eq("slug", slug.value)
        .eq("status", "published")
        .maybeSingle(),
      `Failed to load article ${slug.value}`,
    );

    if (error) {
      throw error;
    }

    return this.toRows(data)[0] ?? null;
  }

  /**
   * Normalises the PostgREST result and bounds the wait. A blog is never worth
   * stalling a page for: the composition root has a versioned catalog to fall
   * back to, but it can only reach it once this call settles.
   */
  private async withDeadline(
    operation: PromiseLike<{ data: unknown; error: { message: string } | null }>,
    label: string,
  ): Promise<{ data: unknown; error: Error | null }> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.resolve(operation).then(({ data, error }) => ({
          data: data as unknown,
          error: error ? new Error(`${label}: ${error.message}`) : null,
        })),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label}: timed out after ${REQUEST_TIMEOUT_MS}ms`)),
            REQUEST_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private toRows(data: unknown): BlogArticle[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const articles: BlogArticle[] = [];
    for (const candidate of data as BlogRow[]) {
      const article = toArticle(candidate);
      if (article) {
        articles.push(article);
      }
    }
    return articles;
  }
}

/** Returns `null` for any row that does not satisfy the domain contract. */
function toArticle(row: BlogRow): BlogArticle | null {
  const { id, locale, slug, category, status, title, excerpt } = row;
  const publishedAt = readDate(row.published_at);
  const updatedAt = readDate(row.updated_at);
  const readingTimeMinutes = row.reading_time_minutes;
  const body = readBlocks(row.body);
  const tags = readTags(row.tags);

  if (
    typeof id !== "string" ||
    (locale !== "pt-BR" && locale !== "en-US") ||
    typeof slug !== "string" ||
    !ArticleSlug.isValid(slug) ||
    typeof category !== "string" ||
    !CATEGORIES.has(category) ||
    typeof status !== "string" ||
    !STATUSES.has(status) ||
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof excerpt !== "string" ||
    excerpt.trim() === "" ||
    typeof readingTimeMinutes !== "number" ||
    !Number.isInteger(readingTimeMinutes) ||
    readingTimeMinutes < 1 ||
    !publishedAt ||
    !body
  ) {
    return null;
  }

  return {
    id,
    locale,
    slug,
    category: category as ArticleCategory,
    status: status as ArticleStatus,
    title,
    excerpt,
    readingTimeMinutes,
    publishedAt,
    updatedAt,
    featured: row.featured === true,
    tags,
    body,
  };
}

/**
 * Postgres `date` columns come back as `YYYY-MM-DD`; `timestamptz` values arrive
 * as an ISO string with a time component. Only the date part is meaningful
 * here, so both are normalised to a date string.
 */
function readDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value.slice(0, 10);
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "");
}

/**
 * Structural check on the JSONB block array. The block *shape* is the
 * repository's job only to the extent of discarding rows that are certainly
 * wrong; deeper validation belongs to the domain and is exercised by tests
 * against the versioned catalog.
 */
function readBlocks(value: unknown): ArticleBlock[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const blocks: ArticleBlock[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return null;
    }
    const { type, text } = entry as { type?: unknown; text?: unknown };
    if (typeof type !== "string") {
      return null;
    }
    switch (type) {
      case "paragraph":
      case "quote":
      case "callout":
        if (typeof text !== "string") return null;
        blocks.push({ type, text } as ArticleBlock);
        break;
      case "heading":
        if (typeof text !== "string") return null;
        if (entry.level !== 2 && entry.level !== 3) return null;
        blocks.push({ type, level: entry.level, text } as ArticleBlock);
        break;
      case "list":
        if (!Array.isArray(entry.items)) return null;
        if (!entry.items.every((item: unknown) => typeof item === "string")) return null;
        blocks.push({
          type,
          ordered: entry.ordered === true,
          items: entry.items as string[],
        });
        break;
      case "code":
        if (typeof entry.code !== "string") return null;
        blocks.push({
          type,
          language: typeof entry.language === "string" ? entry.language : "text",
          code: entry.code,
        });
        break;
      default:
        return null;
    }
  }

  return blocks;
}
