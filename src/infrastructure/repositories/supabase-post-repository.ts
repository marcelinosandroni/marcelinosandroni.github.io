import { createClient } from "@supabase/supabase-js";

import type {
  NewPostRecord,
  PostRepository,
} from "@/application/blog/manage-posts";
import {
  isArticleCategory,
  isPostStatus,
  toPostSummary,
  type PostDraft,
  type PostSummary,
} from "@/domain/blog/post-draft";
import type { ArticleBlock, ArticleCategory, BlogArticle } from "@/domain/blog";
import { isLocale, type Locale } from "@/domain/i18n";
import { supabaseConfigFromEnv } from "@/infrastructure/supabase/server";

/**
 * The narrow client surface this adapter needs.
 *
 * Declared structurally rather than importing the concrete `SupabaseClient`, so
 * a test can pass a stub with the four calls it needs instead of mocking a
 * module, and so a Supabase upgrade cannot change this file. `PromiseLike` rather
 * than `Promise` because PostgREST's builders are thenables, and declaring them
 * as promises would make every real call a type error at the cast instead of
 * here.
 */
export interface PostCmsResult {
  data: unknown;
  error: { message: string } | null;
}

export interface PostCmsFilter extends PromiseLike<PostCmsResult> {
  eq(column: string, value: unknown): PostCmsFilter;
  order(column: string, options: { ascending: boolean }): PostCmsFilter;
  limit(count: number): PostCmsFilter;
  maybeSingle(): PromiseLike<PostCmsResult>;
}

export interface PostCmsReturning {
  select(columns: string): PostCmsFilter;
}

/**
 * Every PostgREST builder, narrowed to what this adapter calls.
 *
 * `select` is on the filter as well as on the insert/upsert result because
 * PostgREST's mutating builders can be told to return the rows they touched at
 * any point in the chain (`update().eq().select()`), and that is what makes
 * read-after-write possible without a second round trip. The alternative is a
 * cast at each call site instead of one honest declaration here.
 */
export interface PostCmsFilter extends PromiseLike<PostCmsResult> {
  select(columns: string): PostCmsFilter;
  eq(column: string, value: unknown): PostCmsFilter;
  order(column: string, options: { ascending: boolean }): PostCmsFilter;
  limit(count: number): PostCmsFilter;
  maybeSingle(): PromiseLike<PostCmsResult>;
}

export interface PostCmsTable {
  select(columns: string): PostCmsFilter;
  insert(values: Record<string, unknown>): PostCmsReturning;
  upsert(values: Record<string, unknown>, options: { onConflict: string }): PostCmsReturning;
  update(values: Record<string, unknown>): PostCmsFilter;
  delete(): PostCmsFilter;
}

export interface PostCmsClient {
  from(table: string): PostCmsTable;
  rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

const DRAFTS = "blog_post_drafts";
const ARTICLES = "blog_articles";

/** Everything, for a single post. The Markdown is the point of loading one. */
const DRAFT_COLUMNS =
  "id, locale, slug, status, title, excerpt, category, featured, published_at, tags, markdown, created_at, updated_at";

/** Without the body: a list of posts never needs it, and it is the largest column. */
const DRAFT_SUMMARY_COLUMNS =
  "id, locale, slug, status, title, excerpt, category, featured, published_at, tags, created_at, updated_at";

/** Mirrors `COLUMNS` in the article repository, so a CMS post reads back identically. */
const ARTICLE_COLUMNS =
  "id, locale, slug, category, status, title, excerpt, reading_time_minutes, published_at, updated_at, featured, tags, body";

/**
 * Database adapter for the owner's CMS.
 *
 * ## Two tables, one adapter
 *
 * The first draft of this had a repository per table. That was wrong: publishing
 * is a write to *both*, and splitting it meant the use case had to know the
 * order of two independent repositories and could interleave them wrongly. The
 * port already separates the operations by meaning — `insert`/`update` are the
 * owner's copy, `publish`/`withdraw` are the blog — so one adapter is the honest
 * shape.
 *
 * ## Trust boundary
 *
 * Every column arrives as `unknown` from PostgREST, so nothing is cast straight
 * into a domain object. The two paths differ on purpose: a malformed row is
 * *dropped* from a list, because one bad row must not empty the CMS, and *throws*
 * on a single read, because "not found" for a row that exists would let the next
 * create silently overwrite it.
 */
export class SupabasePostRepository implements PostRepository {
  constructor(private readonly client: PostCmsClient) {}

  async list(): Promise<PostSummary[]> {
    const { data, error } = await this.client
      .from(DRAFTS)
      .select(DRAFT_SUMMARY_COLUMNS)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list posts: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    const summaries: PostSummary[] = [];

    for (const row of data) {
      const draft = toDraft(row, false);

      if (draft) {
        summaries.push(toPostSummary(draft));
      }
    }

    return summaries;
  }

  async findById(id: string): Promise<PostDraft | null> {
    const { data, error } = await this.client
      .from(DRAFTS)
      .select(DRAFT_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load post ${id}: ${error.message}`);
    }

    if (data === null || data === undefined) {
      return null;
    }

    const draft = toDraft(data, true);

    if (draft === null) {
      throw new Error(`Post ${id} exists but does not satisfy the domain contract`);
    }

    return draft;
  }

  async insert(record: NewPostRecord): Promise<PostDraft> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(DRAFTS)
      .insert({
        id: record.id,
        locale: record.locale,
        slug: record.slug,
        // A create cannot publish; `CreatePost` says so and the default says so.
        status: "draft",
        title: record.title,
        excerpt: record.excerpt,
        category: record.category,
        featured: record.featured,
        published_at: record.publishedAt,
        tags: record.tags,
        markdown: record.markdown,
        created_at: now,
        updated_at: now,
      })
      .select(DRAFT_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return this.require(data, record.id);
  }

  async update(draft: PostDraft): Promise<PostDraft> {
    const { data, error } = await this.client
      .from(DRAFTS)
      .update({
        locale: draft.frontMatter.locale,
        slug: draft.frontMatter.slug,
        status: draft.status,
        title: draft.frontMatter.title,
        excerpt: draft.frontMatter.excerpt,
        category: draft.frontMatter.category,
        featured: draft.frontMatter.featured,
        published_at: draft.frontMatter.publishedAt,
        tags: draft.frontMatter.tags,
        markdown: draft.markdown,
        updated_at: draft.updatedAt,
      })
      .eq("id", draft.id)
      .select(DRAFT_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update post ${draft.id}: ${error.message}`);
    }

    return this.require(data, draft.id);
  }

  async remove(id: string): Promise<void> {
    /*
     * A function rather than two deletes, so both rows go in one transaction.
     * `delete_post_with_article` is defined in the migration; the alternative was
     * two statements whose interruption leaves a live article the owner believes
     * they deleted, with no draft left to remove it.
     */
    const { error } = await this.client.rpc("delete_post_with_article", { post_id: id });

    if (error) {
      throw new Error(`Failed to delete post ${id}: ${error.message}`);
    }
  }

  async publish(article: BlogArticle): Promise<BlogArticle> {
    /*
     * Upsert on the primary key, not on `(locale, slug)`.
     *
     * The key is shared with the post, so a second publish is an update of the
     * same row rather than a second article. Conflicting on the slug instead
     * would match a *seeded* article that happened to hold it and rewrite
     * somebody else's post — which `isSlugTaken` is there to prevent before this
     * is ever reached, and which a slug-keyed upsert would make unrecoverable.
     */
    const { data, error } = await this.client
      .from(ARTICLES)
      .upsert(
        {
          id: article.id,
          locale: article.locale,
          slug: article.slug,
          category: article.category,
          status: article.status,
          title: article.title,
          excerpt: article.excerpt,
          reading_time_minutes: article.readingTimeMinutes,
          published_at: article.publishedAt,
          updated_at: article.updatedAt,
          featured: article.featured,
          tags: article.tags,
          body: article.body,
        },
        { onConflict: "id" },
      )
      .select(ARTICLE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to publish post ${article.id}: ${error.message}`);
    }

    if (!isRecord(data)) {
      throw new Error(`Failed to publish post ${article.id}: no row returned`);
    }

    const published = toArticle(data);

    if (published === null) {
      throw new Error(`Published article ${article.id} does not satisfy the domain contract`);
    }

    return published;
  }

  async withdraw(articleId: string): Promise<void> {
    /*
     * Demote rather than delete.
     *
     * `blog_articles` is a `date`-typed, FK-free content table whose only
     * consumer filters to `status = 'published'`, so `draft` is precisely "not
     * served". Deleting would throw away the row, and unarchiving would have
     * nothing to bring back.
     */
    const { error } = await this.client
      .from(ARTICLES)
      .update({ status: "draft" })
      .eq("id", articleId);

    if (error) {
      throw new Error(`Failed to withdraw article ${articleId}: ${error.message}`);
    }
  }

  async isSlugTaken(
    locale: Locale,
    slug: string,
    exceptId: string | null,
  ): Promise<boolean> {
    /*
     * Both tables, and the reason is not tidiness.
     *
     * `blog_post_drafts` and `blog_articles` each carry `unique (locale, slug)`.
     * A post therefore collides with another post *and* with a seeded article
     * that already owns the slug. Checking only the drafts table would let the
     * owner save happily and discover the collision as a constraint violation
     * from the publish, which reads as a database fault rather than a naming
     * choice.
     *
     * `exceptId` is applied to both queries, so re-saving a published post under
     * its own slug does not report a conflict with the article it published.
     */
    const draft = await this.client
      .from(DRAFTS)
      .select("id")
      .eq("locale", locale)
      .eq("slug", slug)
      .limit(1);

    if (draft.error) {
      throw new Error(`Failed to check slug ${slug}: ${draft.error.message}`);
    }

    const draftRows = Array.isArray(draft.data) ? draft.data : [];

    if (draftRows.some((row) => isRecord(row) && row.id !== exceptId)) {
      return true;
    }

    const article = await this.client
      .from(ARTICLES)
      .select("id")
      .eq("locale", locale)
      .eq("slug", slug)
      .limit(1);

    if (article.error) {
      throw new Error(`Failed to check slug ${slug}: ${article.error.message}`);
    }

    const articleRows = Array.isArray(article.data) ? article.data : [];

    return articleRows.some((row) => isRecord(row) && row.id !== exceptId);
  }

  private require(data: unknown, id: string): PostDraft {
    const draft = isRecord(data) ? toDraft(data, true) : null;

    if (draft === null) {
      throw new Error(`Post ${id} could not be read back after a write`);
    }

    return draft;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates one row.
 *
 * `requireBody` is what distinguishes the two call sites: a list query does not
 * select `markdown` — it is the largest column and a list of posts never renders
 * a body — so a summary row is legitimate without one, while a single read that
 * came back without a body is a row the owner cannot edit.
 */
function toDraft(row: unknown, requireBody: boolean): PostDraft | null {
  if (!isRecord(row)) {
    return null;
  }

  const id = row.id;
  const locale = row.locale;
  const slug = row.slug;
  const status = row.status;
  const title = row.title;
  const excerpt = row.excerpt;
  const category = row.category;
  const publishedAt = readDate(row.published_at);
  const createdAt = readTimestamp(row.created_at);
  const updatedAt = readTimestamp(row.updated_at);

  if (
    typeof id !== "string" ||
    !isLocale(String(locale)) ||
    typeof slug !== "string" ||
    !isPostStatus(status) ||
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof excerpt !== "string" ||
    excerpt.trim() === "" ||
    !isArticleCategory(category) ||
    publishedAt === null ||
    createdAt === null ||
    updatedAt === null
  ) {
    return null;
  }

  if (requireBody && (typeof row.markdown !== "string" || row.markdown.trim() === "")) {
    return null;
  }

  return {
    id,
    status,
    frontMatter: {
      title,
      slug,
      locale: locale as Locale,
      category: category as ArticleCategory,
      excerpt,
      tags: readTags(row.tags),
      featured: row.featured === true,
      publishedAt,
    },
    markdown: typeof row.markdown === "string" ? row.markdown : "",
    createdAt,
    updatedAt,
  };
}

function readDate(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value.slice(0, 10);
}

function readTimestamp(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "");
}

/**
 * Reads a published article back, with the same distrust the read repository
 * shows: only enough structure to prove it is an article, since the value came
 * from a write this adapter just made.
 */
function toArticle(row: Record<string, unknown>): BlogArticle | null {
  const { id, locale, slug, title, excerpt, body } = row;
  const publishedAt = readDate(row.published_at);
  const readingTime = row.reading_time_minutes;

  if (
    typeof id !== "string" ||
    !isLocale(String(locale)) ||
    typeof slug !== "string" ||
    typeof title !== "string" ||
    typeof excerpt !== "string" ||
    !isArticleCategory(row.category) ||
    !isPostStatus(row.status) ||
    typeof readingTime !== "number" ||
    publishedAt === null ||
    !Array.isArray(body)
  ) {
    return null;
  }

  return {
    id,
    locale: locale as Locale,
    slug,
    category: row.category as ArticleCategory,
    status: row.status as "published" | "draft",
    title,
    excerpt,
    readingTimeMinutes: readingTime,
    publishedAt,
    updatedAt: readDate(row.updated_at),
    featured: row.featured === true,
    tags: readTags(row.tags),
    body: body as ArticleBlock[],
  };
}

/**
 * Composition root for the CMS.
 *
 * **The secret key, on purpose.** The migration revokes every grant on
 * `blog_post_drafts` from `anon` and `authenticated` and creates no policy, so
 * there is no key a browser could hold that would read or write an unpublished
 * post. The publishable key that the public article repository uses is
 * therefore useless here by construction, and using it would mean loosening the
 * migration.
 *
 * Returns `null` rather than throwing when Supabase is absent, so the API can
 * answer `503` instead of a `500` from a missing environment variable. The pair
 * it reads is the same one `isAuthEnabled()` reads, which means "auth is
 * configured" and "the CMS can be written" are the same statement — there is no
 * deployment where the owner can sign in and then find the editor broken.
 *
 * Not cached, unlike the feedback root. `createClient` opens no connection, so
 * there is nothing to save, and a cached answer derived from `process.env`
 * cannot be re-derived by a test or a runtime secret reload.
 */
export function getPostRepository(): PostRepository | null {
  const config = supabaseConfigFromEnv();

  if (!config.configured) {
    return null;
  }

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as unknown as PostCmsClient;

  return new SupabasePostRepository(client);
}
