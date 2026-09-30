import type { BlogArticle } from "./article";
import type { PostDraft, PostFrontMatter, PostSummary } from "./post-draft";

/**
 * Storage contract for the owner's CMS.
 *
 * This module is the seam that makes the backing store swappable, and it is the
 * same seam `domain/email` already is for delivery. Everything that decides
 * *what* a post may become lives in `application/blog`; everything that knows
 * which service actually holds the bytes lives in `infrastructure/repositories`.
 * Neither direction imports the other, so moving the CMS off Supabase is a
 * configuration change rather than an edit to the use cases.
 *
 * Pure domain: no Next.js, no Supabase, no HTTP, no environment access. A post
 * is a value and an adapter is a name.
 *
 * ## Why the port is here and not in the application layer
 *
 * It used to be declared in `src/application/blog/manage-posts.ts`, which is a
 * defensible place for an interface and the wrong one for *this* interface.
 * `PostRepository` speaks a domain vocabulary — `PostDraft`, `PostSummary`,
 * `BlogArticle`, a locale, a status — and nothing about it is a use case. Leaving
 * it in the application layer meant the composition root had to reach *through*
 * that layer to find the contract the adapters implement, which is the direction
 * the dependency matrix forbids (`Application` may not depend on
 * `Infrastructure`, and it is not supposed to be the place Infrastructure looks
 * for its obligations). Moving it here puts it beside the vocabulary it names,
 * and puts it above both layers, which is the only place a shared contract can
 * sit and still be honoured by both.
 */

/** The adapters that exist today. */
export type PostAdapterId = "supabase" | "memory";

/**
 * Every known adapter, in declaration order.
 *
 * The list is the vocabulary: `isPostAdapterId` narrows against it, so adding an
 * adapter is a compile-time decision rather than a string that quietly matches
 * nothing.
 */
export const POST_ADAPTER_IDS = [
  "supabase",
  "memory",
] as const satisfies readonly PostAdapterId[];

/**
 * The adapter used when `CMS_STORAGE` is unset.
 *
 * Supabase, because that is where the posts have always lived and because
 * `blog_post_drafts` has no grants for any browser-reachable role: a post the
 * owner has not published is unreadable by construction. An unset variable
 * choosing the in-memory adapter would silently turn the CMS into a store that
 * forgets everything on restart, so the no-credential path has to be asked for by
 * name rather than inherited.
 */
export const DEFAULT_POST_ADAPTER_ID: PostAdapterId = "supabase";

/** Narrows a raw environment value to a known adapter. */
export function isPostAdapterId(value: string): value is PostAdapterId {
  return (POST_ADAPTER_IDS as readonly string[]).includes(value);
}

/** The record written to the drafts table. Every field is already validated. */
export type NewPostRecord = {
  id: string;
  locale: PostFrontMatter["locale"];
  slug: string;
  category: PostFrontMatter["category"];
  title: string;
  excerpt: string;
  tags: string[];
  featured: boolean;
  publishedAt: string;
  markdown: string;
};

/**
 * Port for owner-authored post storage.
 *
 * The split between `publish`/`withdraw` and `insert`/`update` is deliberate:
 * the first pair touches the *published* blog, the second the *owner's copy*. One
 * `save` that did both would make "I saved a draft" and "I published an article"
 * the same sentence — and, worse, would make an adapter that could only write
 * drafts have to fake the other half.
 *
 * Every method is async even where an in-memory adapter has nothing to await,
 * because a store that is local today is a store that is remote after the swap,
 * and a port whose shape changed at that point would have to change every use
 * case along with it.
 */
export interface PostRepository {
  /** Every post, any status. Ordered by the use case, not by the adapter. */
  list(): Promise<PostSummary[]>;

  findById(id: string): Promise<PostDraft | null>;

  /** Stores a new post as a `draft`; the adapter stamps the timestamps. */
  insert(record: NewPostRecord): Promise<PostDraft>;

  update(draft: PostDraft): Promise<PostDraft>;

  /** Removes the owner's copy *and* retracts any article it published. */
  remove(id: string): Promise<void>;

  /** Writes a compiled article into the blog. Idempotent on `id`. */
  publish(article: BlogArticle): Promise<BlogArticle>;

  /**
   * Retracts a published article without deleting it: the row's `status` drops
   * to `draft`, the one state the public repository filters out.
   */
  withdraw(articleId: string): Promise<void>;

  /**
   * Whether a slug is already used by a *different* post in the same locale.
   *
   * `exceptId` is the post being edited, so re-saving a post without touching
   * its slug does not report a conflict with itself.
   */
  isSlugTaken(
    locale: PostFrontMatter["locale"],
    slug: string,
    exceptId: string | null,
  ): Promise<boolean>;
}

/**
 * The CMS storage a deployment was asked for cannot be built.
 *
 * A statement about the *deployment*, never about the request — a missing key,
 * an unset variable, a selector that names no adapter. None of those says
 * anything about who is asking or what they wrote, so this is safe to log and
 * safe to answer with a `503`; the message names variables and adapters and has
 * nowhere to put a request.
 *
 * It exists as a type rather than a bare `null` because `null` is silent: a
 * repository that resolves to `null` looks the same as a repository that was
 * never asked for, and the second is how an unknown adapter quietly becomes the
 * default one.
 */
export class PostStorageNotConfiguredError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PostStorageNotConfiguredError";
  }
}