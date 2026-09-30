import {
  ArticleSlug,
  isArticleCategory,
  isPostStatus,
  toPostSummary,
  type BlogArticle,
  type NewPostRecord,
  type PostDraft,
  type PostFrontMatter,
  type PostRepository,
  type PostSummary,
} from "@/domain/blog";
import { isLocale } from "@/domain/i18n";

/**
 * The CMS with no database.
 *
 * ## Why this is not a stub
 *
 * A stub answers calls and holds nothing, which makes it useless for the one
 * thing it exists for: running the CMS with no `SUPABASE_URL` and no
 * `SUPABASE_SECRET_KEY`, so `next dev` works on a fresh clone and the use cases
 * can be exercised end to end without a project. That requires real rows, real
 * reads and the *same* refusals, so this keeps posts and published articles in
 * two maps and validates every write the way the migration's constraints do.
 *
 * The invariants are not decoration. Each one below is a `check` in
 * `20260930000200_blog_post_cms.sql`, and each exists because the Supabase
 * adapter's `toDraft` treats a row that breaks it as a row that cannot be read
 * back. An adapter that accepted them would let a use case save something the
 * real store would refuse, which is a failure that only appears in production.
 *
 * ## What it is not
 *
 * - **Not durable.** Process memory. A restart empties it, and every instance
 *   of a multi-instance deployment has its own copy. It is a development and test
 *   adapter; a published article written here is not reachable from the public
 *   blog, which reads `blog_articles` through a *different* repository.
 * - **Not transactional.** `remove` deletes the post and its article in the same
 *   synchronous block, which is atomic with respect to the single-threaded event
 *   loop a caller observes — but there is no rollback if the second write fails.
 *   The Supabase adapter gets the real guarantee from
 *   `delete_post_with_article`, which is one database transaction.
 * - **Not an identity provider.** It stores posts; it does not know who the owner
 *   is. With no Supabase configured the CMS endpoint still answers
 *   `503 auth_not_configured` before it reaches storage, so this adapter makes the
 *   editor usable in development without weakening anything in production.
 *
 * ## Copies, deliberately
 *
 * Every read and every write copies in and out. The Supabase adapter serialises
 * through JSONB and so hands back a fresh object every time; a shared mutable
 * `PostDraft` would let a caller mutate stored state through the value it was
 * given, which the real store cannot do and no test would catch.
 */

export type InMemoryPostRepositoryOptions = {
  /**
   * Clock for the timestamps this adapter stamps.
   *
   * Injected so a test can assert on a fixed value instead of matching one with a
   * regex — the same reason `CreatePost` takes a `PostIdFactory`.
   */
  readonly now?: () => string;
  /** Rows to start with. Validated exactly as `insert` would validate them. */
  readonly seed?: readonly PostDraft[];
};

const defaultNow = (): string => new Date().toISOString();

/**
 * The `article_status` enum, which is a different vocabulary from `post_status`.
 *
 * `archived` is a post state and never an article state: an archived post's
 * article is *demoted* to `draft`, not given a third status.
 */
const ARTICLE_STATUSES: ReadonlySet<string> = new Set<BlogArticle["status"]>([
  "published",
  "draft",
]);

export class InMemoryPostRepository implements PostRepository {
  private readonly posts = new Map<string, PostDraft>();
  private readonly articles = new Map<string, BlogArticle>();
  private readonly now: () => string;

  constructor(options: InMemoryPostRepositoryOptions = {}) {
    this.now = options.now ?? defaultNow;

    for (const draft of options.seed ?? []) {
      /*
       * Seeded rows go through the same validation as a written one. A seed that
       * the real store would refuse would make this adapter agree with a
       * database it does not resemble, which is the failure mode that makes a
       * fake dangerous.
       */
      requireStorableDraft(draft);
      this.posts.set(draft.id, copyDraft(draft));
    }
  }

  /**
   * Live view of the stored rows, for assertions.
   *
   * A method rather than a public map so a test cannot accidentally hold the
   * internal map and mutate the store behind the adapter's validation.
   */
  entries(): PostDraft[] {
    return [...this.posts.values()].map(copyDraft);
  }

  /** The published articles this adapter holds, for assertions. */
  publishedArticles(): BlogArticle[] {
    return [...this.articles.values()].map(copyArticle);
  }

  async list(): Promise<PostSummary[]> {
    return [...this.posts.values()].map((draft) => toPostSummary(copyDraft(draft)));
  }

  async findById(id: string): Promise<PostDraft | null> {
    const found = this.posts.get(id);

    return found === undefined ? null : copyDraft(found);
  }

  async insert(record: NewPostRecord): Promise<PostDraft> {
    if (this.posts.has(record.id)) {
      /*
       * The primary key. The Supabase adapter reports this as a PostgREST error;
       * here it is a thrown message with the same subject, so the use case fails
       * identically in a test and in production.
       */
      throw new Error(`Post ${record.id} already exists`);
    }

    const stamp = this.now();

    const created: PostDraft = {
      id: record.id,
      // A create cannot publish; `CreatePost` says so and the column default says
      // so. Stated here too because the port promises it and this is the adapter
      // that decides.
      status: "draft",
      frontMatter: {
        locale: record.locale,
        slug: record.slug,
        category: record.category,
        title: record.title,
        excerpt: record.excerpt,
        tags: [...record.tags],
        featured: record.featured,
        publishedAt: record.publishedAt,
      },
      markdown: record.markdown,
      createdAt: stamp,
      updatedAt: stamp,
    };

    requireStorableDraft(created);

    this.posts.set(created.id, created);

    return copyDraft(created);
  }

  async update(draft: PostDraft): Promise<PostDraft> {
    if (!this.posts.has(draft.id)) {
      throw new Error(`Post ${draft.id} not found`);
    }

    const stored = copyDraft(draft);
    requireStorableDraft(stored);

    this.posts.set(stored.id, stored);

    return copyDraft(stored);
  }

  async remove(id: string): Promise<void> {
    this.posts.delete(id);
    this.articles.delete(id);
  }

  async publish(article: BlogArticle): Promise<BlogArticle> {
    /*
     * Keyed on `id`, not on `(locale, slug)`, for the same reason the Supabase
     * adapter upserts on `id`: the id is shared with the post, so a second
     * publish is an update of the same row rather than a second article.
     * `isSlugTaken` is what catches a slug a *seeded* article already owns —
     * before this is ever reached.
     */
    const stored = copyArticle(article);
    requireStorableArticle(stored);

    this.articles.set(stored.id, stored);

    return copyArticle(stored);
  }

  async withdraw(articleId: string): Promise<void> {
    const article = this.articles.get(articleId);

    /*
     * Absent is not an error. The Supabase adapter issues the same `update`
     * against a row that may not exist and gets no error back either, so a
     * withdraw of something never published stays a no-op rather than becoming
     * the failure this class must not invent.
     */
    if (article !== undefined) {
      this.articles.set(articleId, { ...copyArticle(article), status: "draft" });
    }
  }

  async isSlugTaken(
    locale: PostFrontMatter["locale"],
    slug: string,
    exceptId: string | null,
  ): Promise<boolean> {
    /*
     * Posts *and* articles. Both tables carry `unique (locale, slug)`, so
     * checking only the drafts map would let the owner save happily and discover
     * the collision as a constraint violation from the publish — which reads as
     * a database fault rather than a naming choice.
     */
    const heldByPost = [...this.posts.values()].some(
      (post) =>
        post.frontMatter.locale === locale && post.frontMatter.slug === slug && post.id !== exceptId,
    );

    if (heldByPost) {
      return true;
    }

    return [...this.articles.values()].some(
      (article) => article.locale === locale && article.slug === slug && article.id !== exceptId,
    );
  }
}

/* -------------------------------------------------------------------------
 * Invariants
 *
 * One per `check` in the migration, phrased as the refusal the Supabase adapter
 * already refuses with. `requireStorableDraft` is what makes this an honest
 * adapter rather than a permissive one: the use cases never produce a draft that
 * fails these, so a green test here means the store agrees with the real one.
 * ---------------------------------------------------------------------- */

function requireStorableStatus(status: string): void {
  if (!isPostStatus(status)) {
    throw new Error(`Unknown post status: ${String(status)}`);
  }
}

function requireStorableDraft(draft: PostDraft): void {
  if (draft.id.trim() === "") {
    throw new Error("Post id must not be empty");
  }

  requireStorableStatus(draft.status);
  requireWritable(draft.frontMatter, draft.markdown);
}

function requireStorableArticle(article: BlogArticle): void {
  if (article.id.trim() === "") {
    throw new Error("Article id must not be empty");
  }

  /*
   * An article's body is the compiled block array, so an empty one is a row the
   * public repository would reject. The domain guarantees a non-empty array by
   * the time `publish` is called, so this only fires when an adapter is handed
   * something the compiler never produced.
   */
  if (!Array.isArray(article.body) || article.body.length === 0) {
    throw new Error(`Article ${article.id} has no compiled body`);
  }

  if (!Number.isInteger(article.readingTimeMinutes) || article.readingTimeMinutes < 1) {
    throw new Error(`Article ${article.id} has an out-of-range reading time`);
  }

  if (!ARTICLE_STATUSES.has(article.status)) {
    /*
     * `isPostStatus` would accept "archived" here, and it must not: a post may be
     * archived, an article may not. The column is the `article_status` enum, whose
     * two values are the only two an article can hold.
     */
    throw new Error(`Unknown article status: ${String(article.status)}`);
  }

  requireWritable(
    {
      locale: article.locale,
      slug: article.slug,
      category: article.category,
      title: article.title,
      excerpt: article.excerpt,
      tags: article.tags,
      featured: article.featured,
      publishedAt: article.publishedAt,
    },
    null,
  );
}

/**
 * The front-matter rules shared by a draft and an article.
 *
 * `markdown` is the draft's `not null check (length(btrim(markdown)) > 0)` and is
 * `null` for an article, whose body was checked above instead.
 */
function requireWritable(frontMatter: PostFrontMatter, markdown: string | null): void {
  if (!isLocale(frontMatter.locale)) {
    throw new Error(`Unknown locale: ${String(frontMatter.locale)}`);
  }

  if (!ArticleSlug.isValid(frontMatter.slug)) {
    // The same value object, and therefore the same reason, the public
    // repository would give for the same value — so an invalid slug is refused
    // identically here and in `ArticleSlug.create`.
    ArticleSlug.create(frontMatter.slug);
  }

  if (!isArticleCategory(frontMatter.category)) {
    throw new Error(`Unknown category: ${String(frontMatter.category)}`);
  }

  if (frontMatter.title.trim() === "") {
    throw new Error("Post title must not be empty");
  }

  if (frontMatter.excerpt.trim() === "") {
    throw new Error("Post excerpt must not be empty");
  }

  if (!isCalendarDate(frontMatter.publishedAt)) {
    throw new Error(`Post ${frontMatter.slug} has an invalid publication date`);
  }

  if (markdown !== null && markdown.trim() === "") {
    throw new Error("Post markdown must not be empty");
  }
}

/**
 * `YYYY-MM-DD`, verified by round trip.
 *
 * The column is a Postgres `date`, and `Date.parse` will happily roll
 * `2026-02-30` into March — so the check the domain performs in `readDate` is
 * repeated here rather than trusted from the caller.
 */
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function copyDraft(draft: PostDraft): PostDraft {
  return {
    ...draft,
    frontMatter: { ...draft.frontMatter, tags: [...draft.frontMatter.tags] },
  };
}

function copyArticle(article: BlogArticle): BlogArticle {
  return { ...article, tags: [...article.tags], body: [...article.body] };
}