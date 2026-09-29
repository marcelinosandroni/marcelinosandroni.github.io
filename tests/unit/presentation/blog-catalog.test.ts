import { describe, expect, it } from "vitest";

import { ArticleSlug, type BlogArticle } from "@/domain/blog";
import { SUPPORTED_LOCALES } from "@/domain/i18n";
import {
  VersionedArticleRepository,
  articlesEnUS,
  articlesPtBR,
} from "@/infrastructure/content/blog";

/**
 * Guards the versioned article catalog, which is simultaneously the seed for the
 * `blog_articles` table and the build-time fallback.
 *
 * The migration and this file must describe the same documents, so the invariants
 * that make the two reconcilable are asserted here.
 *
 * Documents reconcile on `slug`, not on `id`: `slug` is the shared key across
 * locales, while `id` is the primary key of `blog_articles` and must be unique per
 * row. Sharing one id between the pt-BR and en-US translations would make the seed
 * INSERT fail on a duplicate key, so the two are deliberately different values and
 * only `slug` pairs a document with its translation.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIES = new Set([
  "distributed-systems",
  "data-platforms",
  "leadership",
  "ai-ml",
  "fintech",
]);

const ALL: BlogArticle[] = [...articlesPtBR, ...articlesEnUS];

describe("versioned article catalog", () => {
  it("has a non-empty catalog for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const articles = locale === "pt-BR" ? articlesPtBR : articlesEnUS;
      expect(articles.length).toBeGreaterThan(0);
    }
  });

  it("publishes every seeded article", () => {
    expect(ALL.every((article) => article.status === "published")).toBe(true);
  });

  it("uses valid, stable UUIDs", () => {
    for (const article of ALL) {
      expect(article.id, article.slug).toMatch(UUID_PATTERN);
    }
  });

  it("gives every row its own id, because id is the primary key", () => {
    const shared = articlesPtBR
      .map((pt) => {
        const en = articlesEnUS.find((candidate) => candidate.slug === pt.slug);
        return en && en.id === pt.id ? pt.slug : null;
      })
      .filter((slug) => slug !== null);

    expect(shared, "these slugs share an id across locales and would break the seed").toEqual([]);
    expect(new Set(ALL.map((article) => article.id)).size).toBe(ALL.length);
  });

  it("reuses one slug per document across locales", () => {
    const ptSlugs = articlesPtBR.map((article) => article.slug);
    const enSlugs = articlesEnUS.map((article) => article.slug);

    expect([...enSlugs].sort()).toEqual([...ptSlugs].sort());
  });

  it("never repeats an id or a slug within a locale", () => {
    for (const articles of [articlesPtBR, articlesEnUS]) {
      expect(new Set(articles.map((a) => a.id)).size).toBe(articles.length);
      expect(new Set(articles.map((a) => a.slug)).size).toBe(articles.length);
    }
  });

  it("uses slugs that survive the URL invariant", () => {
    for (const article of ALL) {
      expect(ArticleSlug.isValid(article.slug), article.slug).toBe(true);
    }
  });

  it("keeps the category, reading time and dates in range", () => {
    for (const article of ALL) {
      expect(CATEGORIES.has(article.category), article.slug).toBe(true);
      expect(article.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(article.readingTimeMinutes).toBeLessThanOrEqual(120);
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (article.updatedAt) {
        expect(article.updatedAt >= article.publishedAt, article.slug).toBe(true);
      }
    }
  });

  it("gives every article a real body with at least one heading and one paragraph", () => {
    for (const article of ALL) {
      expect(article.body.length, article.slug).toBeGreaterThan(3);
      const types = new Set(article.body.map((block) => block.type));

      expect(types.has("paragraph"), article.slug).toBe(true);
      expect(types.has("heading"), article.slug).toBe(true);
    }
  });

  it("never emits an empty block", () => {
    for (const article of ALL) {
      for (const block of article.body) {
        if (block.type === "list") {
          expect(block.items.length, article.slug).toBeGreaterThan(0);
          expect(block.items.every((item) => item.trim() !== "")).toBe(true);
          continue;
        }
        const text = "text" in block ? block.text : block.code;
        expect(text.trim(), article.slug).not.toBe("");
      }
    }
  });

  it("keeps a non-empty title, excerpt and tag list per article and locale", () => {
    for (const article of ALL) {
      expect(article.title.trim()).not.toBe("");
      expect(article.excerpt.trim()).not.toBe("");
      expect(article.tags.length).toBeGreaterThan(0);
      expect(article.tags.every((tag) => tag.trim() !== "")).toBe(true);
    }
  });

  it("keeps the same block structure in both languages", () => {
    for (const [pt, en] of documents()) {
      expect(en.body.map((block) => block.type), pt.slug).toEqual(
        pt.body.map((block) => block.type),
      );
      expect(en.body.length, pt.slug).toBe(pt.body.length);
    }
  });

  it("keeps the same numbers in both languages, so no metric drifts in translation", () => {
    for (const [pt, en] of documents()) {
      expect(digits(en.title), pt.slug).toEqual(digits(pt.title));
      expect(digits(en.excerpt), pt.slug).toEqual(digits(pt.excerpt));
      expect(digits(bodyText(en)), pt.slug).toEqual(digits(bodyText(pt)));
    }
  });

  it("keeps the same reading time in both languages", () => {
    for (const [pt, en] of documents()) {
      expect(en.readingTimeMinutes).toBe(pt.readingTimeMinutes);
    }
  });

  it("does not ship an untranslated English string into the Portuguese catalog", () => {
    for (const article of articlesPtBR) {
      expect(article.title).not.toBe(
        articlesEnUS.find((candidate) => candidate.slug === article.slug)?.title,
      );
    }
  });

  it("exposes the union of slugs for static generation, sorted and deduplicated", () => {
    const slugs = [...articlesPtBR, ...articlesEnUS].map((article) => article.slug);

    expect(new Set(slugs).size).toBe(articlesPtBR.length);
    expect(slugs).toContain("resilient-agent-swarms-on-kafka");
    expect(slugs).toContain("engineering-delivery-with-ai-agents");
  });
});

describe("VersionedArticleRepository", () => {
  const repository = new VersionedArticleRepository();

  it("lists the published articles of a locale", async () => {
    const listed = await repository.listPublished("pt-BR");

    expect(listed).toHaveLength(articlesPtBR.length);
    expect(listed.every((entry) => entry.status === "published")).toBe(true);
  });

  it("never returns a body in a list projection", async () => {
    const listed = await repository.listPublished("en-US");

    for (const entry of listed) {
      expect(entry).not.toHaveProperty("body");
    }
  });

  it("honours the limit", async () => {
    await expect(repository.listPublished("en-US", 2)).resolves.toHaveLength(2);
    await expect(repository.listPublished("en-US", 0)).resolves.toHaveLength(0);
  });

  it("finds an article by slug", async () => {
    const found = await repository.findPublishedBySlug(
      "en-US",
      ArticleSlug.create("rds-to-clickhouse-100m-messages-a-day"),
    );

    expect(found?.title).toContain("ClickHouse");
    expect(found?.body.length).toBeGreaterThan(3);
  });

  it("returns null for an unknown slug instead of throwing", async () => {
    await expect(
      repository.findPublishedBySlug("en-US", ArticleSlug.create("no-such-article")),
    ).resolves.toBeNull();
  });

  it("keeps the two locales separate", async () => {
    const pt = await repository.findPublishedBySlug(
      "pt-BR",
      ArticleSlug.create("dual-core-leader-accounting-rigor"),
    );

    expect(pt?.locale).toBe("pt-BR");
    expect(pt?.title).not.toContain("accounting rigor");
  });
});

function documents(): [BlogArticle, BlogArticle][] {
  return articlesPtBR.map((pt) => {
    const en = articlesEnUS.find((candidate) => candidate.slug === pt.slug);
    expect(en, `missing en-US translation for ${pt.slug}`).toBeDefined();
    return [pt, en as BlogArticle];
  });
}

/** Flattens a body into comparable prose, for cross-language digit comparison. */
function bodyText(article: BlogArticle): string {
  return article.body
    .map((block) =>
      block.type === "list"
        ? block.items.join(" ")
        : block.type === "code"
          ? block.code
          : "text" in block
            ? block.text
            : "",
    )
    .join(" ");
}

function digits(value: string): string {
  return (value.match(/\d+/g) ?? []).join(",");
}
