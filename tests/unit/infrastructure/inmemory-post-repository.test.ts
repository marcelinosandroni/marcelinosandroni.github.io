import { describe, expect, it, vi } from "vitest";

import { InvalidArticleSlugError, type BlogArticle, type PostDraft } from "@/domain/blog";
import { InMemoryPostRepository } from "@/infrastructure/repositories/inmemory-post-repository";
import {
  getPostRepository,
  resolvePostRepository,
} from "@/infrastructure/repositories";

/**
 * The in-memory CMS adapter.
 *
 * These tests exist because the adapter is on the production code path whenever
 * `CMS_STORAGE=memory`, and because a fake that agrees with the database is only
 * worth having if somebody checks that it does. Each refusal asserted here is a
 * `check` in `20260930000200_blog_post_cms.sql` and a row shape
 * `SupabasePostRepository.toDraft` already rejects.
 */

const STAMP = "2026-06-18T10:00:00.000Z";

const ID = "6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31";

function repository(seed: readonly PostDraft[] = []): InMemoryPostRepository {
  return new InMemoryPostRepository({ now: () => STAMP, seed });
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
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

function record(overrides: Partial<Parameters<InMemoryPostRepository["insert"]>[0]> = {}) {
  return {
    id: ID,
    locale: "en-US" as const,
    slug: "a-title",
    category: "leadership" as const,
    title: "A title",
    excerpt: "An excerpt.",
    tags: ["leadership"],
    featured: false,
    publishedAt: "2026-06-18",
    markdown: "A body worth publishing.",
    ...overrides,
  };
}

function article(overrides: Partial<BlogArticle> = {}): BlogArticle {
  return {
    id: ID,
    locale: "en-US",
    slug: "a-title",
    category: "leadership",
    status: "published",
    title: "A title",
    excerpt: "An excerpt.",
    readingTimeMinutes: 1,
    publishedAt: "2026-06-18",
    updatedAt: null,
    featured: false,
    tags: ["leadership"],
    body: [{ type: "paragraph", text: "A body worth publishing." }],
    ...overrides,
  };
}

describe("insert", () => {
  it("stores the record as a draft and stamps both timestamps", async () => {
    const repo = repository();

    const created = await repo.insert(record());

    expect(created.status).toBe("draft");
    expect(created.createdAt).toBe(STAMP);
    expect(created.updatedAt).toBe(STAMP);
    expect(await repo.findById(ID)).toEqual(created);
  });

  it("refuses a second post with the same id, which is the primary key", async () => {
    const repo = repository();

    await repo.insert(record());

    await expect(repo.insert(record())).rejects.toThrow(`Post ${ID} already exists`);
  });

  it("refuses an empty id", async () => {
    const repo = repository();

    await expect(repo.insert(record({ id: "  " }))).rejects.toThrow(/id must not be empty/);
  });

  it("refuses a slug the public repository would refuse", async () => {
    const repo = repository();

    await expect(repo.insert(record({ slug: "Not A Slug" }))).rejects.toThrow(
      InvalidArticleSlugError,
    );
  });

  it("refuses an unknown locale", async () => {
    const repo = repository();

    await expect(repo.insert(record({ locale: "fr-FR" as never }))).rejects.toThrow(/Unknown locale/);
  });

  it("refuses an unknown category", async () => {
    const repo = repository();

    await expect(
      repo.insert(record({ category: "blockchain" as never })),
    ).rejects.toThrow(/Unknown category/);
  });

  it("refuses a blank title or excerpt, the two non-empty checks", async () => {
    const repo = repository();

    await expect(repo.insert(record({ title: "   " }))).rejects.toThrow(/title must not be empty/);
    await expect(repo.insert(record({ excerpt: "" }))).rejects.toThrow(/excerpt must not be empty/);
  });

  it("refuses an empty body, because a draft with no body is not editable", async () => {
    const repo = repository();

    await expect(repo.insert(record({ markdown: "\n\n" }))).rejects.toThrow(
      /markdown must not be empty/,
    );
  });

  /*
   * `Date.parse` accepts `2026-02-30` and rolls it into March, which is exactly
   * the kind of value the Postgres `date` column would store as something else.
   */
  it("refuses a publication date that is not a real calendar day", async () => {
    const repo = repository();

    await expect(repo.insert(record({ publishedAt: "2026-02-30" }))).rejects.toThrow(
      /invalid publication date/,
    );
    await expect(repo.insert(record({ publishedAt: "2026-13-01" }))).rejects.toThrow(
      /invalid publication date/,
    );
    await expect(repo.insert(record({ publishedAt: "18/06/2026" }))).rejects.toThrow(
      /invalid publication date/,
    );
  });

  it("accepts a leap day that the year actually has", async () => {
    const repo = repository();

    await expect(repo.insert(record({ publishedAt: "2028-02-29" }))).resolves.toMatchObject({
      frontMatter: { publishedAt: "2028-02-29" },
    });
  });

  it("keeps a rejected record out of the store", async () => {
    const repo = repository();

    await expect(repo.insert(record({ title: "" }))).rejects.toThrow();

    expect(repo.entries()).toHaveLength(0);
  });
});

describe("update", () => {
  it("replaces every field of the owner's copy", async () => {
    const repo = repository([draft()]);

    const saved = await repo.update(
      draft({
        status: "archived",
        markdown: "Revised body.",
        updatedAt: "2026-07-01T00:00:00.000Z",
        frontMatter: { ...draft().frontMatter, title: "Revised", tags: ["ai-ml"] },
      }),
    );

    expect(saved.frontMatter.title).toBe("Revised");
    expect(saved.frontMatter.tags).toEqual(["ai-ml"]);
    expect(saved.markdown).toBe("Revised body.");
    expect(saved.status).toBe("archived");
    expect(saved.updatedAt).toBe("2026-07-01T00:00:00.000Z");
    expect(saved.createdAt).toBe(STAMP);
  });

  it("refuses to write a post that does not exist", async () => {
    const repo = repository();

    await expect(repo.update(draft())).rejects.toThrow(`Post ${ID} not found`);
  });

  it("refuses a status outside the post_status enum", async () => {
    const repo = repository([draft()]);

    await expect(repo.update(draft({ status: "hidden" as never }))).rejects.toThrow(
      /Unknown post status/,
    );
  });

  it("applies the same front-matter checks as a create", async () => {
    const repo = repository([draft()]);

    await expect(
      repo.update(draft({ frontMatter: { ...draft().frontMatter, slug: "Bad Slug" } })),
    ).rejects.toThrow(InvalidArticleSlugError);

    expect((await repo.findById(ID))?.frontMatter.slug).toBe("a-title");
  });

  it("leaves the stored row untouched when it refuses", async () => {
    const repo = repository([draft()]);

    await expect(repo.update(draft({ markdown: "  " }))).rejects.toThrow();

    expect((await repo.findById(ID))?.markdown).toBe("A body worth publishing.");
  });
});

describe("findById", () => {
  it("returns null for an id that was never there", async () => {
    await expect(repository().findById("nope")).resolves.toBeNull();
  });

  /*
   * The Supabase adapter serialises through JSONB and hands back a fresh object
   * every read. A shared reference would let a caller mutate stored state through
   * the value it was given, which the real store cannot do.
   */
  it("hands back a copy, so a caller cannot mutate stored state", async () => {
    const repo = repository([draft()]);

    const first = await repo.findById(ID);
    const second = await repo.findById(ID);

    expect(first).not.toBe(second);
    expect(first).not.toBe(second && (await repo.findById(ID)));

    if (first === null) {
      throw new Error("unreachable: the seeded post is findable");
    }

    first.frontMatter.title = "Mutated";
    first.frontMatter.tags.push("mutated");

    const reread = await repo.findById(ID);

    expect(reread?.frontMatter.title).toBe("A title");
    expect(reread?.frontMatter.tags).toEqual(["leadership"]);
  });
});

describe("list", () => {
  it("returns every post in any status, without the body", async () => {
    const repo = repository([
      draft({ id: "a", status: "draft" }),
      draft({ id: "b", status: "published" }),
      draft({ id: "c", status: "archived" }),
    ]);

    const posts = await repo.list();

    expect(posts.map((post) => post.status).sort()).toEqual(["archived", "draft", "published"]);
    expect(posts[0]).not.toHaveProperty("markdown");
  });
});

describe("publish", () => {
  it("is idempotent on the post's own id", async () => {
    const repo = repository([draft()]);

    await repo.publish(article());
    await repo.publish(article({ title: "Revised" }));

    expect(repo.publishedArticles()).toHaveLength(1);
    expect(repo.publishedArticles()[0].title).toBe("Revised");
  });

  it("refuses an article with no compiled body", async () => {
    const repo = repository();

    await expect(repo.publish(article({ body: [] }))).rejects.toThrow(/no compiled body/);
  });

  it("refuses a reading time the column's check constraint would refuse", async () => {
    const repo = repository();

    await expect(repo.publish(article({ readingTimeMinutes: 0 }))).rejects.toThrow(
      /reading time/,
    );
    await expect(repo.publish(article({ readingTimeMinutes: 1.5 }))).rejects.toThrow(
      /reading time/,
    );
  });

  it("refuses an article status outside the article_status enum", async () => {
    const repo = repository();

    // `archived` is a *post* state. An article's row is demoted to `draft`
    // instead, so accepting it here would store a status the public repository
    // cannot even name.
    await expect(repo.publish(article({ status: "archived" as never }))).rejects.toThrow(
      /Unknown article status/,
    );
  });

  it("applies the front-matter checks a draft row would face", async () => {
    const repo = repository();

    await expect(repo.publish(article({ slug: "Not A Slug" }))).rejects.toThrow(
      InvalidArticleSlugError,
    );
    await expect(repo.publish(article({ locale: "de-DE" as never }))).rejects.toThrow(
      /Unknown locale/,
    );
  });
});

describe("withdraw", () => {
  it("demotes the article rather than deleting it, so a restore has something to restore", async () => {
    const repo = repository();
    await repo.publish(article());

    await repo.withdraw(ID);

    expect(repo.publishedArticles()).toHaveLength(1);
    expect(repo.publishedArticles()[0].status).toBe("draft");
  });

  /*
   * The Supabase adapter issues the same `update` against a row that may not
   * exist and gets no error back, so a withdraw of something never published is
   * a no-op on both adapters.
   */
  it("is a no-op for an article that was never published", async () => {
    await expect(repository().withdraw(ID)).resolves.toBeUndefined();
  });

  it("leaves the owner's copy alone", async () => {
    const repo = repository([draft({ status: "published" })]);
    await repo.publish(article());

    await repo.withdraw(ID);

    expect((await repo.findById(ID))?.status).toBe("published");
  });
});

describe("remove", () => {
  it("removes the owner's copy and the article it published", async () => {
    const repo = repository([draft({ status: "published" })]);
    await repo.publish(article());

    await repo.remove(ID);

    expect(repo.entries()).toHaveLength(0);
    expect(repo.publishedArticles()).toHaveLength(0);
  });

  it("is a no-op for an id that was never there", async () => {
    await expect(repository().remove("nope")).resolves.toBeUndefined();
  });
});

describe("isSlugTaken", () => {
  it("sees a slug another post in the same locale holds", async () => {
    const repo = repository([draft({ id: "other" })]);

    await expect(repo.isSlugTaken("en-US", "a-title", null)).resolves.toBe(true);
  });

  it("allows the same slug in a different locale, because the URL is scoped by it", async () => {
    const repo = repository([draft({ id: "other" })]);

    await expect(repo.isSlugTaken("pt-BR", "a-title", null)).resolves.toBe(false);
  });

  /*
   * Both tables carry `unique (locale, slug)`. Checking only the posts would let
   * the owner save happily and meet the collision as a constraint violation from
   * the publish, which reads as a database fault rather than a naming choice.
   */
  it("sees a slug a published article owns, with no post behind it", async () => {
    const repo = repository();
    await repo.publish(article({ id: "seeded" }));

    await expect(repo.isSlugTaken("en-US", "a-title", null)).resolves.toBe(true);
  });

  it("does not report a post as conflicting with itself", async () => {
    const repo = repository([draft()]);

    await expect(repo.isSlugTaken("en-US", "a-title", ID)).resolves.toBe(false);
  });

  it("does not report an article as conflicting with the post that published it", async () => {
    const repo = repository([draft()]);
    await repo.publish(article());

    await expect(repo.isSlugTaken("en-US", "a-title", ID)).resolves.toBe(false);
  });

  it("reports nothing for a slug nobody holds", async () => {
    await expect(repository().isSlugTaken("en-US", "free", null)).resolves.toBe(false);
  });
});

describe("seed", () => {
  it("starts with the rows it was given", async () => {
    const repo = repository([draft({ id: "a" }), draft({ id: "b" })]);

    await expect(repo.list()).resolves.toHaveLength(2);
  });

  /*
   * A seed the real store would refuse would make this adapter agree with a
   * database it does not resemble, which is the failure mode that makes a fake
   * dangerous.
   */
  it("refuses a seed row that the database's constraints would refuse", () => {
    expect(() => repository([draft({ frontMatter: { ...draft().frontMatter, slug: "Bad" } })])).toThrow(
      InvalidArticleSlugError,
    );
  });

  it("does not alias the seeded objects", async () => {
    const seeded = draft();
    const repo = repository([seeded]);

    seeded.frontMatter.title = "Mutated after construction";

    await expect(repo.findById(ID)).resolves.toMatchObject({
      frontMatter: { title: "A title" },
    });
  });
});

describe("entries", () => {
  it("is a live view rather than the internal map", async () => {
    const repo = repository([draft()]);

    repo.entries()[0].frontMatter.title = "Mutated";

    await expect(repo.findById(ID)).resolves.toMatchObject({
      frontMatter: { title: "A title" },
    });
  });
});

describe("the clock", () => {
  it("stamps the caller's clock rather than the wall clock", async () => {
    let tick = 0;
    const repo = new InMemoryPostRepository({
      now: () => `2026-06-18T10:00:0${tick++}.000Z`,
    });

    const created = await repo.insert(record());

    expect(created.createdAt).toBe("2026-06-18T10:00:00.000Z");
    expect(created.updatedAt).toBe("2026-06-18T10:00:00.000Z");
  });

  it("defaults to the wall clock, which is a real ISO timestamp", async () => {
    const created = await new InMemoryPostRepository().insert(record());

    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

/*
 * `CMS_STORAGE` selection.
 *
 * Asserted here because this adapter is the thing being selected, and because the
 * rule that matters is not "the memory adapter works" but "no other value can
 * quietly become it". The Supabase branch needs credentials this repository does
 * not have, so only the parts that do not are covered: an unset selector, a known
 * selector, and a selector that names nothing.
 */
describe("CMS_STORAGE", () => {
  it("wires this adapter when it is asked for by name, with no credentials at all", () => {
    const resolution = resolvePostRepository({ CMS_STORAGE: "memory" });

    expect(resolution.configured).toBe(true);
    expect(resolution.adapterId).toBe("memory");
    expect(resolution.configured === true && resolution.repository).toBeInstanceOf(
      InMemoryPostRepository,
    );
  });

  it("tolerates case and padding, because an operator types it", () => {
    const resolution = resolvePostRepository({ CMS_STORAGE: "  Memory  " });

    expect(resolution.adapterId).toBe("memory");
    expect(resolution.configured).toBe(true);
  });

  /*
   * A deployment that believes it is on one store and is writing to another is
   * worse than a deployment that says it is misconfigured — which is the same
   * argument ADR-006 makes for `EMAIL_SENDER`.
   */
  it("refuses a selector that names no adapter, and never falls back", () => {
    const resolution = resolvePostRepository({ CMS_STORAGE: "postgres" });

    expect(resolution.configured).toBe(false);
    expect(resolution.adapterId).toBe("supabase");
    expect(resolution.configured === false && resolution.reason).toContain('CMS_STORAGE="postgres"');
  });

  it("refuses the default adapter when Supabase is absent, and says what to do", () => {
    const resolution = resolvePostRepository({});

    expect(resolution.configured).toBe(false);
    expect(resolution.adapterId).toBe("supabase");
    expect(resolution.configured === false && resolution.reason).toContain("CMS_STORAGE=memory");
  });

  it("gives the endpoint a null rather than throwing, and logs the reason", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      expect(getPostRepository({ CMS_STORAGE: "nope" })).toBeNull();
      expect(error).toHaveBeenCalledWith(expect.stringContaining("CMS_STORAGE"));
    } finally {
      error.mockRestore();
    }
  });

  it("keeps one store per process, so a dev server does not forget between requests", async () => {
    const first = resolvePostRepository({ CMS_STORAGE: "memory" });
    const second = resolvePostRepository({ CMS_STORAGE: "memory" });

    if (!first.configured || !second.configured) {
      throw new Error("unreachable: the memory adapter needs no credentials");
    }

    const repository = first.repository as InMemoryPostRepository;
    await repository.insert(record());

    expect(second.repository).toBe(repository);
    expect(await second.repository.list()).toHaveLength(1);
  });
});