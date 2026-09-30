import { describe, expect, it } from "vitest";

import {
  CreatePost,
  DeletePost,
  ListPosts,
  PostNotFoundError,
  PostSlugConflictError,
  PublishPost,
  SetPostArchived,
  UpdatePost,
} from "@/application/blog/manage-posts";
import {
  DEFAULT_POST_ADAPTER_ID,
  isPostAdapterId,
  POST_ADAPTER_IDS,
  PostStorageNotConfiguredError,
  composePostDocument,
  type NewPostRecord,
  type PostDraft,
  type PostFrontMatter,
  type PostRepository,
} from "@/domain/blog";
import { InMemoryPostRepository } from "@/infrastructure/repositories/inmemory-post-repository";

/**
 * The port, exercised.
 *
 * A port that is only ever implemented by the thing it was extracted from is a
 * comment. So these tests do two things: they pin the vocabulary the composition
 * root chooses from, and they run every CMS use case end to end against an
 * adapter that is not Supabase and not a hand-written fake — which is the claim
 * that makes "the use cases are testable with no infrastructure at all"
 * verifiable rather than aspirational.
 *
 * The adapter under test is `InMemoryPostRepository`, chosen because it enforces
 * the same invariants the migration's constraints do. A permissive fake would
 * make everything here pass and prove nothing.
 */

const ID = "6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31";
const OTHER = "0f9b1c74-2d55-4e8a-a1f3-7c6d5e4b3a20";

function document(overrides: Partial<PostFrontMatter> = {}, markdown = "A body."): string {
  return composePostDocument({
    frontMatter: {
      title: "A title",
      slug: "a-title",
      locale: "en-US",
      category: "leadership",
      excerpt: "An excerpt.",
      tags: ["leadership"],
      featured: false,
      publishedAt: "2026-06-18",
      ...overrides,
    },
    markdown,
  });
}

function draft(overrides: Partial<PostDraft> = {}): PostDraft {
  return {
    id: ID,
    status: "draft",
    frontMatter: {
      title: "A title",
      slug: "a-title",
      locale: "en-US",
      category: "leadership",
      excerpt: "An excerpt.",
      tags: ["leadership"],
      featured: false,
      publishedAt: "2026-06-18",
    },
    markdown: "A body.",
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
    ...overrides,
  };
}

function repository(seed: readonly PostDraft[] = []): PostRepository {
  return new InMemoryPostRepository({ now: () => "2026-06-18T10:00:00.000Z", seed });
}

const fixedId = (): string => ID;

describe("the adapter vocabulary", () => {
  it("lists the adapters that exist today, in declaration order", () => {
    expect(POST_ADAPTER_IDS).toEqual(["supabase", "memory"]);
  });

  /*
   * The default is the store the posts have always lived in. An unset variable
   * choosing the in-memory adapter would silently turn the CMS into one that
   * forgets everything on restart, so the no-database path has to be asked for.
   */
  it("defaults to the adapter the project has always run", () => {
    expect(DEFAULT_POST_ADAPTER_ID).toBe("supabase");
  });

  it("narrows a known adapter", () => {
    for (const adapterId of POST_ADAPTER_IDS) {
      expect(isPostAdapterId(adapterId)).toBe(true);
    }
  });

  it("refuses a selector that matches nothing", () => {
    expect(isPostAdapterId("")).toBe(false);
    expect(isPostAdapterId("Supabase")).toBe(false);
    expect(isPostAdapterId("postgres")).toBe(false);
  });

  it("keeps the default inside the vocabulary", () => {
    expect(isPostAdapterId(DEFAULT_POST_ADAPTER_ID)).toBe(true);
  });
});

describe("PostStorageNotConfiguredError", () => {
  it("is a typed deployment error rather than a silent null", () => {
    const error = new PostStorageNotConfiguredError('CMS_STORAGE="nope" is not a known adapter');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PostStorageNotConfiguredError");
    expect(error.message).toContain("CMS_STORAGE");
  });

  it("carries a cause when one was given, so the original is not lost", () => {
    const cause = new Error("missing SUPABASE_SECRET_KEY");

    const error = new PostStorageNotConfiguredError("no storage adapter", { cause });

    expect(error.cause).toBe(cause);
  });

  /*
   * The email port makes the same argument about `EmailDeliveryError`: the reason
   * is about the deployment, so there is nowhere to put a request. A field for
   * the caller would be an accident waiting to interpolate one into a log line.
   */
  it("has nowhere to put request data", () => {
    const error = new PostStorageNotConfiguredError("no storage adapter");

    // `name` is the only own property: no `reason`, no `requestId`, no `subject`.
    expect(Object.keys(error)).toEqual(["name"]);
    expect(error).not.toHaveProperty("email");
    expect(error).not.toHaveProperty("document");
  });
});

describe("NewPostRecord", () => {
  /*
   * The record is already validated front matter plus a body: the adapter is
   * handed something it can store without re-deriving it, and the id is the
   * platform's uuid rather than a database sequence, so the caller can address
   * the row before it exists.
   */
  it("is the post's front matter, its body, and an id the caller chose", async () => {
    const record: NewPostRecord = {
      id: ID,
      locale: "en-US",
      slug: "a-title",
      category: "leadership",
      title: "A title",
      excerpt: "An excerpt.",
      tags: ["leadership"],
      featured: false,
      publishedAt: "2026-06-18",
      markdown: "A body.",
    };

    await expect(repository().insert(record)).resolves.toMatchObject({ id: ID, status: "draft" });
  });
});

describe("the CMS with no infrastructure", () => {
  it("creates, lists, publishes, archives and deletes a post", async () => {
    const repo = repository();
    const adapter = repo as InMemoryPostRepository;

    const created = await new CreatePost(repo, fixedId).execute(document({ title: "Sequenced" }));

    expect(created.status).toBe("draft");
    expect(await repo.findById(ID)).not.toBeNull();

    // Nothing is on the public blog until the owner says so.
    expect(adapter.publishedArticles()).toHaveLength(0);

    const published = await new PublishPost(repo).execute(ID);
    expect(published.status).toBe("published");

    expect(adapter.publishedArticles()).toHaveLength(1);
    expect(adapter.publishedArticles()[0].id).toBe(ID);
    expect(adapter.publishedArticles()[0].body).toEqual([{ type: "paragraph", text: "A body." }]);

    const archived = await new SetPostArchived(repo).execute(ID, true);
    expect(archived.status).toBe("archived");
    expect(archived.markdown).toBe("A body.");
    expect(adapter.publishedArticles()[0].status).toBe("draft");

    const restored = await new SetPostArchived(repo).execute(ID, false);
    expect(restored.status).toBe("published");
    expect(adapter.publishedArticles()[0].status).toBe("published");

    await new DeletePost(repo).execute(ID);
    expect(await repo.findById(ID)).toBeNull();
    expect(adapter.publishedArticles()).toHaveLength(0);
  });

  it("serves the CMS list from the same adapter, capped and ordered by the use case", async () => {
    const repo = repository([
      draft({ id: "a", status: "draft", updatedAt: "2026-01-01T00:00:00.000Z" }),
      draft({ id: "b", status: "published", updatedAt: "2026-03-01T00:00:00.000Z" }),
      draft({ id: "c", status: "archived", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ]);

    const posts = await new ListPosts(repo).execute();

    expect(posts.map((post) => post.id)).toEqual(["b", "c", "a"]);
    expect(posts[0]).not.toHaveProperty("markdown");
  });

  it("recompiles and republishes an edited post, so the blog cannot show stale text", async () => {
    const repo = repository([draft({ status: "published" })]);

    await new UpdatePost(repo).execute(ID, document({ title: "Revised" }, "## A new heading"));

    const article = (repo as InMemoryPostRepository).publishedArticles()[0];

    expect(article.title).toBe("Revised");
    expect(article.body).toEqual([{ type: "heading", level: 2, text: "A new heading" }]);
  });

  it("refuses a slug another post or article already owns, in the same locale only", async () => {
    const repo = repository([draft({ id: OTHER })]);

    await expect(new CreatePost(repo, fixedId).execute(document())).rejects.toThrow(
      PostSlugConflictError,
    );
    await expect(
      new CreatePost(repo, fixedId).execute(document({ locale: "pt-BR" })),
    ).resolves.toMatchObject({ frontMatter: { locale: "pt-BR" } });
  });

  it("reports a missing post rather than creating one", async () => {
    const repo = repository();

    await expect(new PublishPost(repo).execute("nope")).rejects.toThrow(PostNotFoundError);
    await expect(new DeletePost(repo).execute("nope")).rejects.toThrow(PostNotFoundError);
    expect((repo as InMemoryPostRepository).entries()).toHaveLength(0);
  });

  it("never reaches the public blog without an explicit publish", async () => {
    const repo = repository();

    await new CreatePost(repo, fixedId).execute(document());

    expect((repo as InMemoryPostRepository).publishedArticles()).toHaveLength(0);
  });
});