import { describe, expect, it } from "vitest";

import type { ArticleCategory } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";
import {
  OG_CATEGORY_ACCENTS,
  OG_DEFAULT_ACCENT,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_SIZE,
  OG_IMAGE_WIDTH,
  OG_SUBTITLE_MAX_LENGTH,
  OG_TITLE_MAX_LENGTH,
  deriveArticleOgImage,
  deriveMissingArticleOgImage,
  deriveSiteOgImage,
  formatCardDate,
  formatCardReadingTime,
  ogImageCopyFrom,
  resolveCategoryAccent,
  resolveCategoryLabel,
  siteHost,
  truncateForCard,
} from "@/domain/og/image";
import { SITE_URL } from "@/domain/site/site-info";
import { articlesEnUS } from "@/infrastructure/content/blog";
import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

/**
 * The OG card derivation is the only part of the social preview that can be
 * tested without a browser and without rasterising a PNG, so it is also the only
 * part that can be tested against a *row the database has not produced yet* — a
 * title of 400 characters, a null date, a category this build has never seen.
 * Those are the cases that would otherwise be discovered by a broken LinkedIn
 * preview.
 */

const LOCALES: readonly Locale[] = ["en-US", "pt-BR"];

const catalogs = { "en-US": enUS, "pt-BR": ptBR } as const;

const copy = ogImageCopyFrom(enUS);
const copyPtBR = ogImageCopyFrom(ptBR);

const firstArticle = articlesEnUS.find((article) => article.status === "published")!;

function articleCard(overrides: Partial<Parameters<typeof deriveArticleOgImage>[0]["article"]> = {}) {
  return deriveArticleOgImage({
    locale: "en-US",
    copy,
    article: { ...firstArticle, ...overrides },
  });
}

describe("card geometry", () => {
  /**
   * Both generators take their size from here, so a card can never be 1200x630
   * on one route and something else on another. The exact numbers are not
   * arbitrary: 1200x630 is the `1.91:1` every social platform crops for, and a
   * card at any other ratio is letterboxed in at least one of them.
   */
  it("is the one size every social platform crops for", () => {
    expect(OG_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
    expect(OG_IMAGE_WIDTH / OG_IMAGE_HEIGHT).toBeCloseTo(1.91, 1);
  });

  it("gives the same size to the site card and the article card", () => {
    const site = deriveSiteOgImage({
      locale: "en-US",
      copy,
      jobTitle: enUS.metadata.jobTitle,
      tagline: enUS.metadata.openGraphDescription,
    });

    expect(site.size).toEqual(OG_IMAGE_SIZE);
    expect(articleCard().size).toEqual(OG_IMAGE_SIZE);
  });
});

describe("truncateForCard", () => {
  it("leaves a title that fits untouched", () => {
    expect(truncateForCard("Kafka event streams", 40)).toEqual({
      text: "Kafka event streams",
      truncated: false,
    });
  });

  it("collapses the whitespace a database title can carry", () => {
    // A newline in the middle of a card headline collapses the layout rather
    // than wrapping it, so the derivation owns the whitespace.
    expect(truncateForCard("  From RDS\nto\tClickHouse  ", 60)).toEqual({
      text: "From RDS to ClickHouse",
      truncated: false,
    });
  });

  it("treats an absent value as empty rather than as the word undefined", () => {
    for (const value of [null, undefined, "", "   \n "]) {
      expect(truncateForCard(value, 20)).toEqual({ text: "", truncated: false });
    }
  });

  it("cuts at a word boundary and marks the cut with an ellipsis", () => {
    const result = truncateForCard("one two three four five six seven eight nine ten", 24);

    expect(result.truncated).toBe(true);
    expect(result.text.endsWith("…")).toBe(true);
    expect(result.text).toBe("one two three four five…");
    expect(result.text).not.toMatch(/\s…$/u);
  });

  it("drops a separator left dangling by the cut", () => {
    const result = truncateForCard("alpha beta — gamma delta epsilon zeta", 20);

    expect(result.text).not.toMatch(/[—–\-,;:.\s]…$/u);
  });

  /**
   * A title that is one very long token has no usable word boundary. Cutting
   * back to the first space would leave three characters, which reads as a
   * rendering failure rather than as a truncation, so the cut stays mid-word.
   */
  it("cuts mid-word when there is no boundary worth honouring", () => {
    const result = truncateForCard(`supercalifragilistic${"x".repeat(60)}`, 20);

    expect(result.truncated).toBe(true);
    expect(result.text).toBe("supercalifragilistic…");
  });

  /**
   * The cut is taken on code points, so a title containing an emoji or a
   * combining accent ends in a whole glyph. Slicing UTF-16 units instead leaves
   * a lone surrogate, which renders as a replacement box.
   */
  it("never leaves half a code point at the cut", () => {
    const result = truncateForCard(`${"a".repeat(OG_TITLE_MAX_LENGTH - 1)}🚀tail`, OG_TITLE_MAX_LENGTH);

    expect(result.truncated).toBe(true);
    expect(result.text).not.toMatch(/[\uD800-\uDFFF]$/u);
    expect(result.text).not.toContain("�");
  });

  it("keeps a card title inside the line budget", () => {
    const result = truncateForCard("word ".repeat(200), OG_TITLE_MAX_LENGTH);

    expect([...result.text].length).toBeLessThanOrEqual(OG_TITLE_MAX_LENGTH + 1);
  });
});

describe("formatCardDate", () => {
  it("renders a date-only column in each locale", () => {
    expect(formatCardDate("en-US", "2026-06-18")).toBe("Jun 18, 2026");
    expect(formatCardDate("pt-BR", "2026-06-18")).toBe("18 de jun. de 2026");
  });

  /**
   * Pinned to UTC for the same reason the blog's `<time>` is. A card is generated
   * once and cached by the platform, so a timezone bug here does not fix itself
   * for a reader — it is wrong for everyone, permanently.
   */
  it("ignores any time component and reads the UTC day", () => {
    expect(formatCardDate("en-US", "2026-06-18T23:30:00Z")).toBe("Jun 18, 2026");
    expect(formatCardDate("en-US", "2026-06-18")).toBe(formatCardDate("en-US", "2026-06-18T00:00:00Z"));
  });

  it("returns null for anything that is not a date", () => {
    for (const value of [null, undefined, "", "not-a-date", "2026-13-45", "18/06/2026", 20260618 as never]) {
      expect(`${String(value)}:${formatCardDate("en-US", value as never)}`).toBe(`${String(value)}:null`);
    }
  });
});

describe("formatCardReadingTime", () => {
  it("fills the {minutes} placeholder from the article", () => {
    expect(formatCardReadingTime(enUS.blog.readingTime, 8)).toBe("8 min read");
    expect(formatCardReadingTime(ptBR.blog.readingTime, 8)).toBe("leitura de 8 min");
  });

  it("rounds rather than printing a fraction", () => {
    expect(formatCardReadingTime("{minutes} min", 7.6)).toBe("8 min");
  });

  it("leaves a placeholder it does not know visible", () => {
    expect(formatCardReadingTime("{count} of {minutes}", 3)).toBe("{count} of 3");
  });

  /**
   * A card that contradicts the page it previews is a bug in the sharing
   * preview, so a duration that is not a real duration is dropped rather than
   * rendered as "0 min read".
   */
  it("drops a duration that is not a real duration", () => {
    for (const value of [null, undefined, 0, -4, Number.NaN, Number.POSITIVE_INFINITY, "8" as never]) {
      expect(`${String(value)}:${formatCardReadingTime("{minutes}", value as never)}`).toBe(
        `${String(value)}:null`,
      );
    }
  });
});

describe("category labels and accents", () => {
  const categories: ArticleCategory[] = [
    "distributed-systems",
    "data-platforms",
    "leadership",
    "ai-ml",
    "fintech",
  ];

  it("translates every category in the article contract, in every locale", () => {
    for (const category of categories) {
      for (const source of [copy, copyPtBR]) {
        const label = resolveCategoryLabel(category, source);

        expect(`${category}:${label}`).toBe(`${category}:${source.categories[category]}`);
        expect(label).not.toBe(category);
        expect(label?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("gives every category a distinct accent from the design tokens", () => {
    const accents = categories.map(resolveCategoryAccent);

    expect(accents).toEqual(categories.map((category) => OG_CATEGORY_ACCENTS[category]));
    expect(new Set(accents).size).toBe(categories.length);
    for (const accent of accents) {
      expect(accent).toMatch(/^#[0-9a-f]{6}$/u);
    }
  });

  /**
   * A category added to `blog_articles.category` reaches the card before anyone
   * has translated it. Degrading to the slug with hyphens turned into spaces
   * keeps the kicker honest; going blank would read as a rendering failure.
   */
  it("degrades an unknown category to its slug instead of going blank", () => {
    expect(resolveCategoryLabel("edge-computing", copy)).toBe("edge computing");
    expect(resolveCategoryLabel("  edge-computing  ", copy)).toBe("edge computing");
  });

  it("reports no category at all rather than an empty one", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(resolveCategoryLabel(value, copy)).toBeNull();
    }
  });

  it("falls back to the brand accent for an unknown or absent category", () => {
    expect(resolveCategoryAccent("edge-computing")).toBe(OG_DEFAULT_ACCENT);
    expect(resolveCategoryAccent(null)).toBe(OG_DEFAULT_ACCENT);
    expect(resolveCategoryAccent(undefined)).toBe(OG_DEFAULT_ACCENT);
    expect(resolveCategoryAccent("ai-ml")).toBe(OG_CATEGORY_ACCENTS["ai-ml"]);
  });
});

describe("siteHost", () => {
  it("is the host of the canonical origin, so the card cannot name another one", () => {
    expect(siteHost()).toBe(new URL(SITE_URL).host);
    expect(siteHost()).toBe("marcelinosandroni.com");
  });
});

describe("ogImageCopyFrom", () => {
  it("projects every locale catalog onto the strings a card may print", () => {
    for (const locale of LOCALES) {
      const source = catalogs[locale];
      const projected = ogImageCopyFrom(source);

      expect(`${locale}:${projected.monogram}`).toBe(`${locale}:${source.og.monogram}`);
      expect(`${locale}:${projected.siteName}`).toBe(`${locale}:${source.metadata.siteName}`);
      expect(`${locale}:${projected.siteKicker}`).toBe(`${locale}:${source.og.siteKicker}`);
      expect(`${locale}:${projected.alt}`).toBe(`${locale}:${source.og.alt}`);
      expect(`${locale}:${projected.articleAlt}`).toBe(`${locale}:${source.og.articleAlt}`);
      // Reused rather than duplicated: the card states the reading time the same
      // way the article page does.
      expect(`${locale}:${projected.readingTime}`).toBe(`${locale}:${source.blog.readingTime}`);
    }
  });

  it("gives every card an alt in the language of the card", () => {
    expect(copy.alt.length).toBeGreaterThan(0);
    expect(copy.articleAlt.length).toBeGreaterThan(0);
    expect(ogImageCopyFrom(ptBR).alt).not.toBe(ogImageCopyFrom(enUS).alt);
    expect(ogImageCopyFrom(ptBR).articleAlt).not.toBe(ogImageCopyFrom(enUS).articleAlt);
  });

  it("keeps the wordmark identical across locales", () => {
    // A wordmark is not a translatable string: translating it is a rebranding.
    expect(ogImageCopyFrom(ptBR).monogram).toBe(ogImageCopyFrom(enUS).monogram);
  });
});

describe("deriveSiteOgImage", () => {
  it("states the role as the headline and the pitch as the subtitle", () => {
    for (const locale of LOCALES) {
      const source = catalogs[locale];
      const model = deriveSiteOgImage({
        locale,
        copy: ogImageCopyFrom(source),
        jobTitle: source.metadata.jobTitle,
        tagline: source.metadata.openGraphDescription,
      });

      expect(`${locale}:${model.kicker}`).toBe(`${locale}:${source.og.siteKicker}`);
      expect(`${locale}:${model.title}`).toBe(`${locale}:${source.metadata.jobTitle}`);
      expect(`${locale}:${model.subtitle}`).toBe(`${locale}:${source.metadata.openGraphDescription}`);
      expect(`${locale}:${model.alt}`).toBe(`${locale}:${source.og.alt}`);
      expect(`${locale}:${model.host}`).toBe(`${locale}:${siteHost()}`);
      expect(`${locale}:${model.titleTruncated}`).toBe(`${locale}:false`);
    }
  });

  it("carries no fact row and no category accent", () => {
    const model = deriveSiteOgImage({
      locale: "en-US",
      copy,
      jobTitle: enUS.metadata.jobTitle,
      tagline: enUS.metadata.openGraphDescription,
    });

    expect(model.facts).toEqual([]);
    expect(model.accent).toBe(OG_DEFAULT_ACCENT);
  });

  it("cuts a job title that would overflow the card", () => {
    const model = deriveSiteOgImage({
      locale: "en-US",
      copy,
      jobTitle: "word ".repeat(80),
      tagline: "",
    });

    expect(model.titleTruncated).toBe(true);
    expect([...model.title].length).toBeLessThanOrEqual(OG_TITLE_MAX_LENGTH + 1);
    expect(model.subtitle).toBeNull();
  });
});

describe("deriveArticleOgImage", () => {
  it("uses the article's own data", () => {
    const model = articleCard();

    expect(model.title).toBe(firstArticle.title);
    expect(model.subtitle).toBe(firstArticle.excerpt);
    expect(model.kicker).toBe(enUS.og.categories[firstArticle.category]);
    expect(model.accent).toBe(OG_CATEGORY_ACCENTS[firstArticle.category]);
    expect(model.alt).toBe(enUS.og.articleAlt);
  });

  it("orders the fact row as date then reading time", () => {
    expect(articleCard().facts).toEqual([
      { id: "published", text: "Jun 18, 2026" },
      { id: "readingTime", text: `${firstArticle.readingTimeMinutes} min read` },
    ]);
  });

  /**
   * The two are separate facts on purpose. A card for a row with no publication
   * date is a shorter card, not a broken one, and a crawler asking for a post
   * that was just unpublished should still get an image.
   */
  it("drops each fact independently when the article does not have it", () => {
    const noDate = articleCard({ publishedAt: null });
    const noTime = articleCard({ readingTimeMinutes: null });
    const neither = articleCard({ publishedAt: "nonsense", readingTimeMinutes: 0 });

    expect(noDate.facts.map((fact) => fact.id)).toEqual(["readingTime"]);
    expect(noTime.facts.map((fact) => fact.id)).toEqual(["published"]);
    expect(neither.facts).toEqual([]);
  });

  it("drops the subtitle when the article has no excerpt", () => {
    const model = articleCard({ excerpt: null });

    expect(model.subtitle).toBeNull();
    expect(model.subtitleTruncated).toBe(false);
  });

  it("truncates a title long enough to overflow, and says so", () => {
    const model = articleCard({ title: "word ".repeat(120) });

    expect(model.titleTruncated).toBe(true);
    expect([...model.title].length).toBeLessThanOrEqual(OG_TITLE_MAX_LENGTH + 1);
    expect(model.title.endsWith("…")).toBe(true);
  });

  it("truncates an excerpt that would push the fact row off the card", () => {
    const model = articleCard({ excerpt: "sentence. ".repeat(200) });

    expect(model.subtitleTruncated).toBe(true);
    expect([...(model.subtitle ?? "")].length).toBeLessThanOrEqual(OG_SUBTITLE_MAX_LENGTH + 1);
  });

  it("falls back to the slug when the title is empty", () => {
    // An empty headline would leave a card that is a coloured rectangle with a
    // date on it. The slug is the one thing known to be true about the row.
    expect(articleCard({ title: "   " }).title).toBe(firstArticle.slug);
  });

  it("degrades an unknown category to its slug and the default accent", () => {
    const model = articleCard({ category: "edge-computing" });

    expect(model.kicker).toBe("edge computing");
    expect(model.accent).toBe(OG_DEFAULT_ACCENT);
  });

  it("falls back to the site kicker when the article has no category", () => {
    expect(articleCard({ category: null }).kicker).toBe(enUS.og.siteKicker);
  });

  it("dates the card in the locale the card is for", () => {
    const en = deriveArticleOgImage({ locale: "en-US", copy, article: firstArticle });
    const pt = deriveArticleOgImage({ locale: "pt-BR", copy: copyPtBR, article: firstArticle });

    expect(en.facts[0]?.text).toBe("Jun 18, 2026");
    expect(pt.facts[0]?.text).toBe("18 de jun. de 2026");
    expect(pt.facts[1]?.text).toBe(
      ptBR.blog.readingTime.replace("{minutes}", String(firstArticle.readingTimeMinutes)),
    );
  });

  /**
   * The whole point of a per-article card: two posts from the same blog must not
   * produce the same image. If this fails, every share of every post previews as
   * the same picture.
   */
  it("gives two different articles two different cards", () => {
    const published = articlesEnUS.filter((article) => article.status === "published");
    const [a, b] = published;

    expect(published.length).toBeGreaterThan(1);

    const first = deriveArticleOgImage({ locale: "en-US", copy, article: a! });
    const second = deriveArticleOgImage({ locale: "en-US", copy, article: b! });

    expect(first.title).not.toBe(second.title);
    expect(first.kicker).not.toBe(second.kicker);
    expect(first.accent).not.toBe(second.accent);
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });

  it("is deterministic, so a rebuild produces the same card", () => {
    expect(articleCard()).toEqual(articleCard());
  });

  /**
   * There is no cover image to lay in, and this is the assertion that says so
   * rather than leaving it as a comment. If a future migration adds an image
   * column, this fails and the card gains a layout decision it does not have yet.
   */
  it("has no cover image to design around, because the contract has none", () => {
    for (const article of articlesEnUS) {
      expect(Object.keys(article)).not.toContain("cover");
      expect(Object.keys(article)).not.toContain("image");
      expect(Object.keys(article)).not.toContain("coverImage");
    }
  });
});

describe("deriveMissingArticleOgImage", () => {
  /**
   * A crawler cannot tell "unpublished" from "never a slug", and it asks for the
   * image anyway. A 500 makes the platform drop the preview; a card that names
   * the slug is still a usable preview of a page that is genuinely gone.
   */
  it("renders a card for a slug that resolved to nothing", () => {
    const model = deriveMissingArticleOgImage(
      { copy, tagline: enUS.metadata.openGraphDescription },
      "there-is-no-such-article",
    );

    expect(model.title).toBe("there-is-no-such-article");
    expect(model.subtitle).toBe(enUS.metadata.openGraphDescription);
    expect(model.kicker).toBe(enUS.og.siteKicker);
    expect(model.facts).toEqual([]);
    expect(model.accent).toBe(OG_DEFAULT_ACCENT);
    expect(model.alt).toBe(enUS.og.articleAlt);
  });

  it("does not throw on an empty or absurd slug", () => {
    for (const slug of ["", "   ", "x".repeat(400)]) {
      const model = deriveMissingArticleOgImage({ copy, tagline: "" }, slug);

      expect(model.title.length).toBeGreaterThan(0);
      expect(model.subtitle).toBeNull();
    }
  });

  it("names the site on a card built from no slug at all", () => {
    expect(deriveMissingArticleOgImage({ copy, tagline: "" }, "  ").title).toBe(copy.siteName);
  });
});
