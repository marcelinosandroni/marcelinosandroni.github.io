import type { ArticleBlock } from "@/domain/blog";
import type { PostRepository } from "@/domain/blog/post-repository";
import {
  comparePostSummaries,
  estimateReadingTimeMinutes,
  readPostInput,
  type PostDraft,
  type PostSummary,
} from "@/domain/blog/post-draft";
import { compileMarkdown } from "@/application/blog/markdown";

/**
 * The owner's CMS.
 *
 * ## What a "post" is here
 *
 * A post is a Markdown document with front matter, held in its own table. It is
 * *not* a blog article: an article is a compiled, published projection of a
 * post, and the two have different lifetimes. `archived` exists only on a post;
 * `blog_articles` has no equivalent state and does not need one.
 *
 * That split is what makes the CMS safe to expose. `CreatePost` and
 * `UpdatePost` write Markdown the owner wrote and nothing else. Publication is a
 * separate, explicit act that runs the Markdown through `compileMarkdown` and
 * writes the result into `blog_articles`. So a draft cannot be reached through
 * the public blog no matter what this table says — the public blog does not read
 * this table at all.
 *
 * ## Why the article id is the post id
 *
 * A published post becomes a `blog_articles` row keyed by its own `id`.
 * Sharing the key is what makes publication idempotent (a second publish is an
 * update, not a second article), makes withdrawal a single-row `update` rather
 * than a slug lookup that could match the wrong row, and lets `remove` retract
 * the article without a join. A generated article id held in a second column
 * would buy nothing and add a column that can disagree with it.
 *
 * ## The port is not here
 *
 * `PostRepository` and `NewPostRecord` moved to `src/domain/blog/post-repository.ts`,
 * beside the post vocabulary they name. Nothing in this file changed when they
 * did: every use case below takes a `PostRepository` and is satisfied by a fake,
 * an in-memory adapter or the Supabase adapter without knowing which.
 */

/** The slug is already used by another post in the same locale. */
export class PostSlugConflictError extends Error {
  constructor(
    readonly locale: string,
    readonly slug: string,
  ) {
    super(`Post slug ${JSON.stringify(slug)} is already used in ${locale}`);
    this.name = "PostSlugConflictError";
  }
}

export class PostNotFoundError extends Error {
  constructor(readonly id: string) {
    super(`Post not found: ${id}`);
    this.name = "PostNotFoundError";
  }
}

/** Upper bound on the CMS list, so a long-lived database cannot exhaust memory. */
export const MAX_POST_LIST = 200;

export type PostIdFactory = () => string;

/**
 * Ids come from the platform, not from a dependency.
 *
 * `crypto.randomUUID` is a global on every runtime this project targets — Node,
 * the Edge runtime and a browser — so a uuid package would be a dependency for
 * a function that already exists. It is injected rather than called directly so
 * a test can assert on a fixed id instead of matching one with a regex.
 */
const defaultIdFactory: PostIdFactory = () => crypto.randomUUID();

/** Lists every post the owner has, most recently touched first. */
export class ListPosts {
  constructor(private readonly repository: PostRepository) {}

  async execute(): Promise<PostSummary[]> {
    const posts = await this.repository.list();

    // Re-applied rather than trusted, for the same reason `ListArticles` does it:
    // the adapter's `order()` and this sort are not required to agree, and the
    // list the owner reads must have exactly one order.
    return [...posts].sort(comparePostSummaries).slice(0, MAX_POST_LIST);
  }
}

/**
 * Creates a post from a document.
 *
 * Always a `draft`. A create that could publish would make the owner's first
 * save the moment the post becomes public, with no review step between the two.
 * Publishing is `PublishPost`, deliberately a second action.
 */
export class CreatePost {
  constructor(
    private readonly repository: PostRepository,
    private readonly newId: PostIdFactory = defaultIdFactory,
  ) {}

  async execute(document: unknown): Promise<PostDraft> {
    const { frontMatter, markdown } = readPostInput(document);

    if (await this.repository.isSlugTaken(frontMatter.locale, frontMatter.slug, null)) {
      throw new PostSlugConflictError(frontMatter.locale, frontMatter.slug);
    }

    return this.repository.insert({
      id: this.newId(),
      locale: frontMatter.locale,
      slug: frontMatter.slug,
      category: frontMatter.category,
      title: frontMatter.title,
      excerpt: frontMatter.excerpt,
      tags: frontMatter.tags,
      featured: frontMatter.featured,
      publishedAt: frontMatter.publishedAt,
      markdown,
    });
  }
}

/**
 * Replaces a post's document.
 *
 * A published post is recompiled and republished as part of the same call. The
 * alternative — save the Markdown and leave the article stale — is the failure
 * this method exists to prevent: the owner edits a paragraph, presses save, sees
 * the editor confirm, and the public page still shows the old text. Nothing
 * anywhere would say so.
 */
export class UpdatePost {
  constructor(private readonly repository: PostRepository) {}

  async execute(id: string, document: unknown): Promise<PostDraft> {
    const { frontMatter, markdown } = readPostInput(document);
    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw new PostNotFoundError(id);
    }

    if (await this.repository.isSlugTaken(frontMatter.locale, frontMatter.slug, id)) {
      throw new PostSlugConflictError(frontMatter.locale, frontMatter.slug);
    }

    const saved = await this.repository.update({
      ...existing,
      frontMatter,
      markdown,
      updatedAt: nowIso(),
    });

    if (saved.status === "published") {
      await publishCompiled(this.repository, saved);
    }

    return saved;
  }
}

/**
 * Compiles a post and publishes it.
 *
 * The article is built from the post's own front matter, so the title, excerpt,
 * tags, date and category on the blog page are by construction the ones the
 * owner typed. The id is shared with the post, so a second publish is an update
 * rather than a second article.
 */
export class PublishPost {
  constructor(private readonly repository: PostRepository) {}

  async execute(id: string): Promise<PostDraft> {
    return publishCompiled(this.repository, await this.require(id));
  }

  private async require(id: string): Promise<PostDraft> {
    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw new PostNotFoundError(id);
    }

    return existing;
  }
}

/**
 * Archives or restores a post.
 *
 * - **Archive** retracts the article — `blog_articles.status = 'draft'` — and
 *   keeps the Markdown. The post leaves the blog; the work is not deleted.
 * - **Unarchive** republishes it. Restoring the *source* without restoring the
 *   article would leave the owner looking at a restored post that does not
 *   appear on the blog, which is the opposite of what "unarchive" means.
 *
 * Archiving a draft is allowed and is a plain status change: there is no article
 * to retract, and refusing it would invent a rule nobody asked for.
 */
export class SetPostArchived {
  constructor(private readonly repository: PostRepository) {}

  async execute(id: string, archived: boolean): Promise<PostDraft> {
    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw new PostNotFoundError(id);
    }

    if (archived) {
      if (existing.status === "published") {
        await this.repository.withdraw(existing.id);
      }

      return this.repository.update({ ...existing, status: "archived", updatedAt: nowIso() });
    }

    return publishCompiled(this.repository, existing);
  }
}

/**
 * Deletes a post, and with it any article it published.
 *
 * The `findById` is not a formality. `remove` is the only destructive call in
 * this module, and a `404` for an id that was never there is a materially
 * different answer from a `204` for one that was.
 */
export class DeletePost {
  constructor(private readonly repository: PostRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);

    if (existing === null) {
      throw new PostNotFoundError(id);
    }

    await this.repository.remove(id);
  }
}

/* -------------------------------------------------------------------------
 * Internals
 * ---------------------------------------------------------------------- */

/**
 * Compiles and writes, then marks the owner's copy as published.
 *
 * Shared by publish, unarchive and the republish inside `UpdatePost`, so the
 * three cannot drift: they are the same operation with a different reason, and
 * three copies of "compile, upsert, flip the status" is three chances to publish
 * an article that is not the one the owner wrote.
 */
async function publishCompiled(
  repository: PostRepository,
  post: PostDraft,
): Promise<PostDraft> {
  const { frontMatter } = post;
  const body = compileMarkdown(post.markdown);
  const wasPublished = post.status === "published";

  await repository.publish({
    id: post.id,
    locale: frontMatter.locale,
    slug: frontMatter.slug,
    category: frontMatter.category,
    status: "published",
    title: frontMatter.title,
    excerpt: frontMatter.excerpt,
    readingTimeMinutes: estimateReadingTimeMinutes(blockText(body)),
    publishedAt: frontMatter.publishedAt,
    /*
     * `null` on a first publication, today on a revision.
     *
     * `ArticlePage` renders `updatedAt` beside `publishedAt`, and the column's
     * comment says it is null when the article has never been revised. A post
     * published for the first time has not been revised, so stamping today
     * would claim an edit that never happened.
     */
    updatedAt: wasPublished ? today() : null,
    featured: frontMatter.featured,
    tags: frontMatter.tags,
    body,
  });

  /*
   * Always, including on a republish: `updated_at` on the draft is what
   * `comparePostSummaries` orders the CMS list by, so a post that was just
   * touched belongs at the top whatever else changed.
   */
  return repository.update({ ...post, status: "published", updatedAt: nowIso() });
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Today's date, which is what `updated_at` means on an article revision. */
function today(): string {
  return nowIso().slice(0, 10);
}

/**
 * The text of a compiled body, for the reading-time estimate.
 *
 * Counts what a reader actually reads, so a fenced block contributes its words
 * but not the fence markers or the language label. A "8 min read" derived from
 * counting markup is a number nobody can trust.
 */
function blockText(blocks: ArticleBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
      case "callout":
        parts.push(block.text);
        break;
      case "list":
        parts.push(...block.items);
        break;
      case "code":
        parts.push(block.code);
        break;
    }
  }

  return parts.join(" ");
}
