import { describe, expect, it } from "vitest";

import {
  ArticleSlug,
  InvalidArticleSlugError,
  compareArticleSummaries,
  toArticleSummary,
  type ArticleSummary,
  type BlogArticle,
} from "@/domain/blog";

const article: BlogArticle = {
  id: "1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
  locale: "en-US",
  slug: "resilient-agent-swarms-on-kafka",
  category: "distributed-systems",
  status: "published",
  title: "Architecting resilient swarms with Kafka event streams",
  excerpt: "Designing zero-loss event brokers and idempotent consumers.",
  readingTimeMinutes: 8,
  publishedAt: "2026-06-18",
  updatedAt: "2026-07-02",
  featured: true,
  tags: ["Kafka", "idempotency"],
  body: [{ type: "paragraph", text: "Body copy that must never leak into a list payload." }],
};

describe("ArticleSlug", () => {
  it("accepts lowercase kebab-case and preserves the value", () => {
    expect(ArticleSlug.create("rds-to-clickhouse").value).toBe("rds-to-clickhouse");
  });

  it("accepts digits and single-letter words", () => {
    expect(ArticleSlug.create("go-10-ways").value).toBe("go-10-ways");
  });

  it("rejects an empty value", () => {
    expect(() => ArticleSlug.create("")).toThrow(InvalidArticleSlugError);
  });

  it("rejects uppercase, because slugs are part of a canonical URL", () => {
    expect(() => ArticleSlug.create("RDS-to-ClickHouse")).toThrow(/lowercase kebab-case/);
  });

  it("rejects spaces and other separators", () => {
    expect(() => ArticleSlug.create("rds to clickhouse")).toThrow(InvalidArticleSlugError);
    expect(() => ArticleSlug.create("rds_to_clickhouse")).toThrow(InvalidArticleSlugError);
  });

  it("rejects leading, trailing and doubled hyphens", () => {
    expect(() => ArticleSlug.create("-rds")).toThrow(InvalidArticleSlugError);
    expect(() => ArticleSlug.create("rds-")).toThrow(InvalidArticleSlugError);
    expect(() => ArticleSlug.create("rds--to")).toThrow(InvalidArticleSlugError);
  });

  it("rejects slugs beyond the URL-safe length bound", () => {
    expect(() => ArticleSlug.create("a".repeat(97))).toThrow(/at most 96 characters/);
    expect(ArticleSlug.create("a".repeat(96)).value).toHaveLength(96);
  });

  it("names the offending value and the reason in the error", () => {
    expect(() => ArticleSlug.create("Bad Slug")).toThrow(/"Bad Slug"/);
  });

  it("probes without throwing, so a bad row can be filtered instead of fatal", () => {
    expect(ArticleSlug.isValid("resilient-agent-swarms-on-kafka")).toBe(true);
    expect(ArticleSlug.isValid("Resilient Agent Swarms")).toBe(false);
  });

  it("builds a bare and a locale-prefixed path", () => {
    const slug = ArticleSlug.create("resilient-agent-swarms-on-kafka");

    expect(slug.toString()).toBe("/blog/resilient-agent-swarms-on-kafka");
    expect(slug.toString("pt-br")).toBe("/pt-br/blog/resilient-agent-swarms-on-kafka");
  });
});

describe("toArticleSummary", () => {
  it("drops the body while preserving every list field", () => {
    const summary = toArticleSummary(article);

    expect(summary).not.toHaveProperty("body");
    expect(Object.keys(summary).sort()).toEqual(
      [
        "category",
        "excerpt",
        "featured",
        "id",
        "locale",
        "publishedAt",
        "readingTimeMinutes",
        "slug",
        "status",
        "tags",
        "title",
        "updatedAt",
      ].sort(),
    );
  });

  it("shares the array reference for tags, so no needless copy is made", () => {
    expect(toArticleSummary(article).tags).toBe(article.tags);
  });
});

describe("compareArticleSummaries", () => {
  const base: ArticleSummary = toArticleSummary(article);

  it("sorts newest first", () => {
    const older = { ...base, publishedAt: "2026-01-27" };

    expect([base, older].sort(compareArticleSummaries)).toEqual([base, older]);
    expect([older, base].sort(compareArticleSummaries)).toEqual([base, older]);
  });

  it("breaks ties by title, so the order is total and build-stable", () => {
    const alpha = { ...base, title: "Alpha" };
    const beta = { ...base, title: "Beta" };

    expect([beta, alpha].sort(compareArticleSummaries)).toEqual([alpha, beta]);
  });

  it("returns zero for two identical summaries", () => {
    expect(compareArticleSummaries(base, { ...base })).toBe(0);
  });
});
