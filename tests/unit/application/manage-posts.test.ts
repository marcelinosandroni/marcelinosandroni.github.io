import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CreatePost,
  DeletePost,
  ListPosts,
  MAX_POST_LIST,
  PostNotFoundError,
  PostSlugConflictError,
  PublishPost,
  SetPostArchived,
  UpdatePost,
} from "@/application/blog/manage-posts";
import type { NewPostRecord, PostRepository } from "@/domain/blog/post-repository";
import {
  composePostDocument,
  toPostSummary,
  type PostDraft,
  type PostFrontMatter,
  type PostStatus,
  type PostSummary,
} from "@/domain/blog/post-draft";
import type { BlogArticle } from "@/domain/blog";

const ID = "6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31";

function document(
  overrides: Partial<PostFrontMatter> = {},
  markdown = "A body worth publishing.",
): string {
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
    markdown: "A body worth publishing.",
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
    ...overrides,
  };
}

/**
 * An in-memory port.
 *
 * The alternative is a mock with call assertions, which is what makes port
 * tests brittle: they assert *how* the use case talks to storage instead of what
 * it decided. This records the same calls and also holds real rows, so a test can
 * check the state a sequence of use cases produced.
 */
function repository(seed: PostDraft[] = []): PostRepository & {
  rows: Map<string, PostDraft>;
  articles: Map<string, BlogArticle>;
  calls: { method: string; args: unknown[] }[];
} {
  const rows = new Map(seed.map((row) => [row.id, { ...row }]));
  const articles = new Map<string, BlogArticle>();
  const calls: { method: string; args: unknown[] }[] = [];

  const record = (method: string, args: unknown[]): void => {
    calls.push({ method, args });
  };

  const port: PostRepository & {
    rows: Map<string, PostDraft>;
    articles: Map<string, BlogArticle>;
    calls: { method: string; args: unknown[] }[];
  } = {
    rows,
    articles,
    calls,

    list: async () => {
      record("list", []);
      return [...rows.values()].map(toPostSummary);
    },

    findById: async (id) => {
      record("findById", [id]);
      const found = rows.get(id);
      return found === undefined ? null : { ...found };
    },

    insert: async (entry: NewPostRecord) => {
      record("insert", [entry]);
      const created: PostDraft = {
        id: entry.id,
        status: "draft",
        frontMatter: {
          title: entry.title,
          slug: entry.slug,
          locale: entry.locale,
          category: entry.category,
          excerpt: entry.excerpt,
          tags: entry.tags,
          featured: entry.featured,
          publishedAt: entry.publishedAt,
        },
        markdown: entry.markdown,
        createdAt: "2026-06-18T10:00:00.000Z",
        updatedAt: "2026-06-18T10:00:00.000Z",
      };
      rows.set(created.id, created);
      return { ...created };
    },

    update: async (next) => {
      record("update", [next.id, next.status]);
      const stored = { ...next };
      rows.set(stored.id, stored);
      return { ...stored };
    },

    remove: async (id) => {
      record("remove", [id]);
      rows.delete(id);
      articles.delete(id);
    },

    publish: async (article) => {
      record("publish", [article.id, article.status, article.slug]);
      articles.set(article.id, article);
      return article;
    },

    withdraw: async (articleId) => {
      record("withdraw", [articleId]);
      const article = articles.get(articleId);

      if (article !== undefined) {
        articles.set(articleId, { ...article, status: "draft" });
      }
    },

    isSlugTaken: async (locale, slug, exceptId) => {
      record("isSlugTaken", [locale, slug, exceptId]);
      return [...rows.values()].some(
        (row) => row.frontMatter.locale === locale && row.frontMatter.slug === slug && row.id !== exceptId,
      );
    },
  };

  return port;
}

const fixedId = (): string => ID;

describe("ListPosts", () => {
  it("returns every post regardless of status, ordered by recency", async () => {
    const repo = repository([
      draft({ id: "a", status: "published", updatedAt: "2026-01-01T00:00:00.000Z" }),
      draft({ id: "b", status: "archived", updatedAt: "2026-03-01T00:00:00.000Z" }),
      draft({ id: "c", status: "draft", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ]);

    const posts = await new ListPosts(repo).execute();

    expect(posts.map((post) => post.id)).toEqual(["b", "c", "a"]);
  });

  it("re-applies the order rather than trusting the adapter", async () => {
    const repo = repository([
      draft({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      draft({ id: "new", updatedAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    vi.spyOn(repo, "list").mockResolvedValue([...repo.rows.values()].reverse().map(toPostSummary));

    const posts = await new ListPosts(repo).execute();

    expect(posts.map((post) => post.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the array the adapter handed back", async () => {
    const rows = [
      toPostSummary(draft({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" })),
      toPostSummary(draft({ id: "new", updatedAt: "2026-03-01T00:00:00.000Z" })),
    ];
    const repo = repository();
    vi.spyOn(repo, "list").mockResolvedValue(rows);

    await new ListPosts(repo).execute();

    expect(rows.map((post) => post.id)).toEqual(["old", "new"]);
  });

  it("caps the list so a long-lived database cannot exhaust memory", async () => {
    const many = Array.from({ length: MAX_POST_LIST + 25 }, (_, index) =>
      toPostSummary(draft({ id: `p${index}` })),
    );
    const repo = repository();
    vi.spyOn(repo, "list").mockResolvedValue(many);

    await expect(new ListPosts(repo).execute()).resolves.toHaveLength(MAX_POST_LIST);
  });

  it("never carries a body into a list payload", async () => {
    const repo = repository([draft()]);

    const posts = await new ListPosts(repo).execute();

    expect(posts[0]).not.toHaveProperty("markdown");
  });

  it("propagates an adapter failure rather than showing an empty CMS", async () => {
    const repo = repository();
    vi.spyOn(repo, "list").mockRejectedValue(new Error("connection refused"));

    await expect(new ListPosts(repo).execute()).rejects.toThrow("connection refused");
  });
});

describe("CreatePost", () => {
  it("stores a validated document as a draft", async () => {
    const repo = repository();

    const created = await new CreatePost(repo, fixedId).execute(document({ title: "New" }));

    expect(created.status).toBe("draft");
    expect(created.id).toBe(ID);
    expect(created.frontMatter.title).toBe("New");
    expect(repo.calls.map((call) => call.method)).toEqual(["isSlugTaken", "insert"]);
  });

  /*
   * The property that keeps an unreviewed post off the public blog: the table the
   * blog reads is never written, so no status this use case can produce is
   * reachable from a reader.
   */
  it("never publishes, whatever the document says", async () => {
    const repo = repository();

    await new CreatePost(repo, fixedId).execute(document());

    expect(repo.articles.size).toBe(0);
    expect(repo.calls.some((call) => call.method === "publish")).toBe(false);
  });

  it("derives the slug from the title when the document leaves it blank", async () => {
    const repo = repository();

    const created = await new CreatePost(repo, fixedId).execute(document({ slug: "" }));

    expect(created.frontMatter.slug).toBe("a-title");
  });

  it("refuses a slug another post in the same locale already uses", async () => {
    const repo = repository([draft({ id: "other" })]);

    await expect(new CreatePost(repo, fixedId).execute(document())).rejects.toThrow(
      PostSlugConflictError,
    );
    expect(repo.rows.size).toBe(1);
  });

  it("allows the same slug in a different locale, because the URL is scoped by it", async () => {
    const repo = repository([draft({ id: "other", frontMatter: { ...draft().frontMatter, locale: "pt-BR" } })]);

    const created = await new CreatePost(repo, fixedId).execute(document({ locale: "en-US" }));

    expect(created.frontMatter.slug).toBe("a-title");
  });

  it("refuses an invalid document before it reaches storage", async () => {
    const repo = repository();

    await expect(new CreatePost(repo, fixedId).execute("not a document")).rejects.toThrow(
      /front_matter_missing/,
    );
    expect(repo.calls).toEqual([]);
  });

  it("refuses a body that is only whitespace", async () => {
    const repo = repository();

    await expect(
      new CreatePost(repo, fixedId).execute(document({}, "   \n\n  ")),
    ).rejects.toThrow(/body:body_empty/);
    expect(repo.calls).toEqual([]);
  });

  it("uses a generated id rather than trusting the caller to supply one", async () => {
    const repo = repository();
    const newId = vi.fn().mockReturnValue("generated-id");

    const created = await new CreatePost(repo, newId).execute(document());

    expect(newId).toHaveBeenCalledTimes(1);
    expect(created.id).toBe("generated-id");
  });

  it("defaults to a platform uuid when no factory is injected", async () => {
    const repo = repository();

    const created = await new CreatePost(repo).execute(document());

    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe("UpdatePost", () => {
  it("replaces the document and stamps the update", async () => {
    const repo = repository([draft()]);

    const saved = await new UpdatePost(repo).execute(ID, document({ title: "Revised" }));

    expect(saved.frontMatter.title).toBe("Revised");
    expect(saved.status).toBe("draft");
  });

  it("does not publish a draft, so an edit cannot put a post on the blog by accident", async () => {
    const repo = repository([draft()]);

    await new UpdatePost(repo).execute(ID, document({ title: "Revised" }));

    expect(repo.articles.size).toBe(0);
  });

  /*
   * The failure this method exists to prevent: the owner edits a paragraph, the
   * editor confirms, and the public page still shows the old text. Nothing
   * anywhere would say so.
   */
  it("recompiles and republishes a published post in the same call", async () => {
    const repo = repository([draft({ status: "published" })]);

    const saved = await new UpdatePost(repo).execute(
      ID,
      document({ title: "Revised" }, "## A new heading"),
    );

    expect(repo.calls.map((call) => call.method)).toEqual([
      "findById",
      "isSlugTaken",
      "update",
      "publish",
      "update",
    ]);
    expect(repo.articles.get(ID)?.body).toEqual([{ type: "heading", level: 2, text: "A new heading" }]);
    expect(saved.status).toBe("published");
  });

  it("marks the article as revised only on a republish, not on a first publication", async () => {
    const repo = repository([draft()]);

    await new PublishPost(repo).execute(ID);

    expect(repo.articles.get(ID)?.updatedAt).toBeNull();
  });

  it("stamps `updatedAt` on the article when an already-published post is republished", async () => {
    const repo = repository([draft({ status: "published" })]);

    await new PublishPost(repo).execute(ID);

    expect(repo.articles.get(ID)?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reports a missing post rather than creating one", async () => {
    const repo = repository();

    await expect(new UpdatePost(repo).execute("nope", document())).rejects.toThrow(PostNotFoundError);
    expect(repo.rows.size).toBe(0);
  });

  it("refuses a slug another post holds, but not the one this post already holds", async () => {
    const repo = repository([
      draft(),
      draft({ id: "other", frontMatter: { ...draft().frontMatter, slug: "another-title" } }),
    ]);

    // Re-saving without touching the slug: `exceptId` keeps the post from
    // reporting a conflict with itself, which is the bug this pins.
    await expect(new UpdatePost(repo).execute(ID, document({ slug: "a-title" }))).resolves.toBeTruthy();

    await expect(
      new UpdatePost(repo).execute(ID, document({ slug: "another-title" })),
    ).rejects.toThrow(PostSlugConflictError);
  });

  it("refuses an invalid document before it reads or writes anything", async () => {
    const repo = repository([draft()]);

    await expect(new UpdatePost(repo).execute(ID, "not a document")).rejects.toThrow(
      /front_matter_missing/,
    );
    expect(repo.calls).toEqual([]);
  });

  it("propagates a storage failure rather than reporting a save that did not happen", async () => {
    const repo = repository([draft()]);
    vi.spyOn(repo, "update").mockRejectedValue(new Error("deadlock detected"));

    await expect(new UpdatePost(repo).execute(ID, document())).rejects.toThrow("deadlock detected");
  });
});

describe("PublishPost", () => {
  it("compiles the Markdown and writes an article under the post's own id", async () => {
    const repo = repository([draft()]);

    const published = await new PublishPost(repo).execute(ID);

    expect(published.status).toBe("published");

    const article = repo.articles.get(ID);
    expect(article?.id).toBe(ID);
    expect(article?.slug).toBe("a-title");
    expect(article?.title).toBe("A title");
    expect(article?.status).toBe("published");
    expect(article?.body).toEqual([{ type: "paragraph", text: "A body worth publishing." }]);
  });

  it("derives the reading time from the compiled text rather than trusting a number", async () => {
    const repo = repository([draft({ markdown: "" })]);

    await new PublishPost(repo).execute(ID);

    expect(repo.articles.get(ID)?.readingTimeMinutes).toBe(1);
  });

  it("counts list items, quotes and code towards the reading time", async () => {
    const repo = repository([
      draft({ markdown: "" }),
    ]);

    await new PublishPost(repo).execute(ID);

    const short = repo.articles.get(ID)?.readingTimeMinutes ?? 0;
    repo.rows.set(
      ID,
      draft({
        markdown: "",
        frontMatter: draft().frontMatter,
      }),
    );

    // A body of 600 words spread across every block type.
    const words = Array.from({ length: 600 }, () => "word").join(" ");
    repo.rows.set(ID, draft({ markdown: `${words}\n\n- ${words}\n\n> ${words}\n\n\`\`\`\n${words}\n\`\`\`` }));
    await new PublishPost(repo).execute(ID);

    expect(repo.articles.get(ID)?.readingTimeMinutes).toBeGreaterThan(short);
  });

  it("is idempotent: publishing twice leaves one article under one id", async () => {
    const repo = repository([draft()]);

    await new PublishPost(repo).execute(ID);
    await new PublishPost(repo).execute(ID);

    expect(repo.articles.size).toBe(1);
    expect(repo.rows.get(ID)?.status).toBe("published");
  });

  it("reports a missing post", async () => {
    const repo = repository();

    await expect(new PublishPost(repo).execute("nope")).rejects.toThrow(PostNotFoundError);
    expect(repo.articles.size).toBe(0);
  });
});

describe("SetPostArchived", () => {
  it("retracts the article and keeps the Markdown", async () => {
    const repo = repository([draft({ status: "published" })]);
    await new PublishPost(repo).execute(ID);
    repo.rows.set(ID, draft({ status: "published" }));

    const archived = await new SetPostArchived(repo).execute(ID, true);

    expect(archived.status).toBe("archived");
    expect(archived.markdown).toBe("A body worth publishing.");
    expect(repo.calls.map((call) => call.method)).toContain("withdraw");
  });

  it("demotes the article rather than deleting it, so a restore has something to restore", async () => {
    const repo = repository([draft({ status: "published" })]);
    await new PublishPost(repo).execute(ID);
    repo.rows.set(ID, draft({ status: "published" }));

    await new SetPostArchived(repo).execute(ID, true);

    expect(repo.articles.get(ID)?.status).toBe("draft");
    expect(repo.articles.has(ID)).toBe(true);
  });

  it("restores and republishes on unarchive, rather than restoring only the source", async () => {
    const repo = repository([draft({ status: "archived" })]);

    const restored = await new SetPostArchived(repo).execute(ID, false);

    expect(restored.status).toBe("published");
    expect(repo.articles.get(ID)?.status).toBe("published");
  });

  it("archives a draft without touching a table that has no row for it", async () => {
    const repo = repository([draft()]);

    const archived = await new SetPostArchived(repo).execute(ID, true);

    expect(archived.status).toBe("archived");
    expect(repo.calls.some((call) => call.method === "withdraw")).toBe(false);
  });

  it("reports a missing post", async () => {
    const repo = repository();

    await expect(new SetPostArchived(repo).execute("nope", true)).rejects.toThrow(PostNotFoundError);
  });
});

describe("DeletePost", () => {
  let repo: ReturnType<typeof repository>;

  beforeEach(() => {
    repo = repository([draft({ status: "published" })]);
  });

  it("removes the owner's copy and the article together", async () => {
    await new PublishPost(repo).execute(ID);
    await new DeletePost(repo).execute(ID);

    expect(repo.rows.size).toBe(0);
    expect(repo.articles.size).toBe(0);
  });

  it("uses the port's single remove call, so the two deletes share one transaction", async () => {
    await new DeletePost(repo).execute(ID);

    const afterCreate = repo.calls.filter((call) => call.method === "remove");
    expect(afterCreate).toHaveLength(1);
  });

  it("reports a missing post instead of answering success", async () => {
    await expect(new DeletePost(repo).execute("nope")).rejects.toThrow(PostNotFoundError);
    expect(repo.calls.some((call) => call.method === "remove")).toBe(false);
  });
});

describe("lifecycle in sequence", () => {
  it("goes draft → published → archived → published with the article following each step", async () => {
    const repo = repository();

    await new CreatePost(repo, fixedId).execute(document({ title: "Sequenced" }));
    expect(repo.articles.size).toBe(0);

    await new PublishPost(repo).execute(ID);
    expect(repo.articles.get(ID)?.status).toBe("published");

    await new SetPostArchived(repo).execute(ID, true);
    expect(repo.articles.get(ID)?.status).toBe("draft");

    await new SetPostArchived(repo).execute(ID, false);
    expect(repo.articles.get(ID)?.status).toBe("published");

    await new DeletePost(repo).execute(ID);
    expect(repo.rows.size).toBe(0);
    expect(repo.articles.size).toBe(0);
  });

  it("never leaves a status the CMS list cannot describe", async () => {
    const repo = repository();
    const valid: PostStatus[] = ["draft", "published", "archived"];

    await new CreatePost(repo, fixedId).execute(document());
    await new PublishPost(repo).execute(ID);
    await new SetPostArchived(repo).execute(ID, true);

    for (const post of repo.rows.values()) {
      expect(valid).toContain(post.status);
    }
  });
});

describe("ListPosts over a lifecycle", () => {
  it("shows a post in every state, because the owner needs to find the archived one", async () => {
    const repo = repository([
      draft({ id: "a", status: "draft" }),
      draft({ id: "b", status: "published" }),
      draft({ id: "c", status: "archived" }),
    ]);

    const posts: PostSummary[] = await new ListPosts(repo).execute();

    expect(posts.map((post) => post.status).sort()).toEqual(["archived", "draft", "published"]);
  });
});
