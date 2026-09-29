import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ArticleNotFoundError,
  FallbackArticleRepository,
  GetArticle,
  ListArticles,
  MAX_ARTICLE_LIST,
  type ArticleRepository,
} from "@/application/blog";
import {
  ArticleSlug,
  InvalidArticleSlugError,
  toArticleSummary,
  type ArticleSummary,
  type BlogArticle,
} from "@/domain/blog";

const article = (overrides: Partial<BlogArticle> = {}): BlogArticle => ({
  id: "1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
  locale: "en-US",
  slug: "resilient-agent-swarms-on-kafka",
  category: "distributed-systems",
  status: "published",
  title: "Architecting resilient swarms with Kafka event streams",
  excerpt: "Zero-loss brokers and idempotent consumers.",
  readingTimeMinutes: 8,
  publishedAt: "2026-06-18",
  updatedAt: null,
  featured: true,
  tags: ["Kafka"],
  body: [{ type: "paragraph", text: "Body." }],
  ...overrides,
});

const summary = (overrides: Partial<BlogArticle> = {}): ArticleSummary =>
  toArticleSummary(article(overrides));

function repository(overrides: Partial<ArticleRepository> = {}): ArticleRepository {
  return {
    listPublished: vi.fn().mockResolvedValue([]),
    findPublishedBySlug: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("ListArticles", () => {
  it("returns the adapter rows in newest-first order", async () => {
    const repo = repository({
      listPublished: vi
        .fn()
        .mockResolvedValue([summary({ publishedAt: "2026-01-27" }), summary({ publishedAt: "2026-06-18" })]),
    });

    const result = await new ListArticles(repo).execute({ locale: "en-US" });

    expect(result.map((entry) => entry.publishedAt)).toEqual(["2026-06-18", "2026-01-27"]);
  });

  it("re-applies ordering rather than trusting the adapter", async () => {
    const repo = repository({
      listPublished: vi.fn().mockResolvedValue([summary({ publishedAt: "2026-01-27" })]),
    });

    const result = await new ListArticles(repo).execute({ locale: "pt-BR" });

    expect(result).toHaveLength(1);
    expect(repo.listPublished).toHaveBeenCalledWith("pt-BR", MAX_ARTICLE_LIST);
  });

  it("caps the result at the requested limit", async () => {
    const repo = repository({
      listPublished: vi
        .fn()
        .mockResolvedValue([summary({ publishedAt: "2026-06-18" }), summary({ publishedAt: "2026-04-02" })]),
    });

    const result = await new ListArticles(repo).execute({ locale: "en-US", limit: 1 });

    expect(result).toHaveLength(1);
    expect(repo.listPublished).toHaveBeenCalledWith("en-US", 1);
  });

  it("clamps a limit above the hard maximum instead of trusting the caller", async () => {
    const repo = repository();

    await new ListArticles(repo).execute({ locale: "en-US", limit: 10_000 });

    expect(repo.listPublished).toHaveBeenCalledWith("en-US", MAX_ARTICLE_LIST);
  });

  it("returns nothing for a non-positive limit", async () => {
    const repo = repository({
      listPublished: vi.fn().mockResolvedValue([summary()]),
    });

    await expect(new ListArticles(repo).execute({ locale: "en-US", limit: 0 })).resolves.toEqual(
      [],
    );
  });

  it("does not mutate the array the adapter handed back", async () => {
    const rows = [summary({ publishedAt: "2026-01-27" }), summary({ publishedAt: "2026-06-18" })];
    const repo = repository({ listPublished: vi.fn().mockResolvedValue(rows) });

    await new ListArticles(repo).execute({ locale: "en-US" });

    expect(rows[0].publishedAt).toBe("2026-01-27");
  });

  it("propagates an adapter failure rather than rendering an empty blog", async () => {
    const repo = repository({
      listPublished: vi.fn().mockRejectedValue(new Error("connection refused")),
    });

    await expect(new ListArticles(repo).execute({ locale: "en-US" })).rejects.toThrow(
      "connection refused",
    );
  });
});

describe("GetArticle", () => {
  it("returns the article for a valid slug", async () => {
    const repo = repository({ findPublishedBySlug: vi.fn().mockResolvedValue(article()) });

    const result = await new GetArticle(repo).execute({
      locale: "en-US",
      slug: "resilient-agent-swarms-on-kafka",
    });

    expect(result.title).toContain("Kafka");
    expect(repo.findPublishedBySlug).toHaveBeenCalledWith(
      "en-US",
      ArticleSlug.create("resilient-agent-swarms-on-kafka"),
    );
  });

  it("throws a not-found error carrying the locale and the slug", async () => {
    const repo = repository();

    await expect(
      new GetArticle(repo).execute({ locale: "pt-BR", slug: "missing-article" }),
    ).rejects.toThrow(ArticleNotFoundError);

    await expect(
      new GetArticle(repo).execute({ locale: "pt-BR", slug: "missing-article" }),
    ).rejects.toThrow(/pt-BR.*missing-article/);
  });

  it("rejects a malformed slug before reaching the repository", async () => {
    const repo = repository();

    await expect(
      new GetArticle(repo).execute({ locale: "en-US", slug: "Not A Slug" }),
    ).rejects.toThrow(InvalidArticleSlugError);
    expect(repo.findPublishedBySlug).not.toHaveBeenCalled();
  });
});

describe("FallbackArticleRepository", () => {
  let onFallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onFallback = vi.fn();
  });

  it("serves the primary when it has rows", async () => {
    const primary = repository({
      listPublished: vi.fn().mockResolvedValue([summary()]),
    });
    const fallback = repository({
      listPublished: vi.fn().mockResolvedValue([summary({ slug: "from-fallback" })]),
    });

    const result = await new FallbackArticleRepository(primary, fallback).listPublished("en-US");

    expect(result[0].slug).toBe("resilient-agent-swarms-on-kafka");
    expect(fallback.listPublished).not.toHaveBeenCalled();
  });

  it("serves the fallback when the primary is empty", async () => {
    const primary = repository({ listPublished: vi.fn().mockResolvedValue([]) });
    const fallback = repository({
      listPublished: vi.fn().mockResolvedValue([summary({ slug: "from-fallback" })]),
    });

    const result = await new FallbackArticleRepository(primary, fallback).listPublished("en-US");

    expect(result[0].slug).toBe("from-fallback");
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("serves the fallback and reports the failure when the primary throws", async () => {
    const primary = repository({
      listPublished: vi.fn().mockRejectedValue(new Error("connection refused")),
    });
    const fallback = repository({
      listPublished: vi.fn().mockResolvedValue([summary({ slug: "from-fallback" })]),
    });

    const result = await new FallbackArticleRepository(primary, fallback, onFallback).listPublished(
      "en-US",
    );

    expect(result[0].slug).toBe("from-fallback");
    expect(onFallback).toHaveBeenCalledWith(expect.any(Error));
  });

  it("forwards the limit to both adapters", async () => {
    const primary = repository({ listPublished: vi.fn().mockResolvedValue([]) });
    const fallback = repository({ listPublished: vi.fn().mockResolvedValue([]) });

    await new FallbackArticleRepository(primary, fallback).listPublished("en-US", 3);

    expect(primary.listPublished).toHaveBeenCalledWith("en-US", 3);
    expect(fallback.listPublished).toHaveBeenCalledWith("en-US", 3);
  });

  it("yields an empty list when both sources are empty", async () => {
    const empty = repository();

    await expect(new FallbackArticleRepository(empty, empty).listPublished("en-US")).resolves.toEqual(
      [],
    );
  });

  it("prefers the primary article and only falls back for a miss", async () => {
    const slug = ArticleSlug.create("dual-core-leader-accounting-rigor");
    const primary = repository({ findPublishedBySlug: vi.fn().mockResolvedValue(article()) });
    const fallback = repository({ findPublishedBySlug: vi.fn().mockResolvedValue(null) });

    const repositoryUnderTest = new FallbackArticleRepository(primary, fallback);

    await expect(repositoryUnderTest.findPublishedBySlug("en-US", slug)).resolves.not.toBeNull();
    expect(fallback.findPublishedBySlug).not.toHaveBeenCalled();

    const miss = repository({ findPublishedBySlug: vi.fn().mockResolvedValue(null) });
    const hit = repository({
      findPublishedBySlug: vi.fn().mockResolvedValue(article({ slug: slug.value })),
    });

    await expect(
      new FallbackArticleRepository(miss, hit).findPublishedBySlug("en-US", slug),
    ).resolves.not.toBeNull();
  });

  it("returns null when neither source has the article", async () => {
    const empty = repository();
    const slug = ArticleSlug.create("missing-article");

    await expect(
      new FallbackArticleRepository(empty, empty).findPublishedBySlug("en-US", slug),
    ).resolves.toBeNull();
  });

  it("reports a primary failure during a single-article lookup", async () => {
    const primary = repository({
      findPublishedBySlug: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    const fallback = repository({ findPublishedBySlug: vi.fn().mockResolvedValue(article()) });
    const slug = ArticleSlug.create("resilient-agent-swarms-on-kafka");

    const result = await new FallbackArticleRepository(primary, fallback, onFallback).findPublishedBySlug(
      "en-US",
      slug,
    );

    expect(result).not.toBeNull();
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});
