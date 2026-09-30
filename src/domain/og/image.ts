import type { ArticleCategory } from "@/domain/blog";
import type { Locale } from "@/domain/i18n";
import { SITE_URL } from "@/domain/site/site-info";

/**
 * Open Graph image contract.
 *
 * Pure domain: no React, no `ImageResponse`, no Next.js, no file system and no
 * network. Two things come out of here that would otherwise be duplicated:
 *
 * 1. **The card geometry.** The site-wide card and the per-article card must be
 *    the same size, or a link shared from the home page and a link shared from a
 *    post are two different shapes in the same feed.
 * 2. **The derivation rules.** Which text is allowed on a card, how long it may
 *    be, what happens when an article has no date, and what a brand new
 *    `ArticleCategory` does before anybody has translated it. Those are rules
 *    with edge cases, so they are stated once and unit-tested without a browser
 *    and without rendering a PNG.
 *
 * The renderers (`app/opengraph-image.tsx` and
 * `app/[locale]/blog/[slug]/opengraph-image.tsx`) do nothing but load data and
 * hand the result to `OgImageFrame`. That is what makes the two generators agree
 * by construction instead of by review.
 */

/**
 * The one card size every social network crops for: Open Graph's recommended
 * `1.91:1`, which Twitter, LinkedIn, Slack, WhatsApp and iMessage all render
 * without letterboxing.
 */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const OG_IMAGE_SIZE = {
  width: OG_IMAGE_WIDTH,
  height: OG_IMAGE_HEIGHT,
} as const;

/**
 * Title budget, in characters.
 *
 * A character count rather than a pixel count because the renderer that turns
 * this into an image is a text-layout engine that cannot measure a string
 * without laying it out, and a title that silently overflows the card is only
 * discoverable by looking at a PNG. 96 characters is roughly three lines of
 * 64px type across the 1072px of usable width, so the headline block never
 * collides with the fact row underneath it.
 *
 * Long titles are cut at a word boundary with an ellipsis rather than allowed to
 * wrap: a card whose headline is four lines pushes the date and the reading time
 * off the bottom, and a card without a date looks broken.
 */
export const OG_TITLE_MAX_LENGTH = 96;

/**
 * Subtitle budget. The excerpt is the one field with no editorial length limit
 * in the article contract, so it is bounded here instead of by the writers.
 */
export const OG_SUBTITLE_MAX_LENGTH = 190;

/**
 * Per-category accent, taken verbatim from the design tokens in `globals.css`.
 *
 * The article contract has no cover image (see `BlogArticle`), so the card has to
 * carry its identity typographically. A category-coloured rule and kicker is
 * what makes two articles from the same blog distinguishable at a glance in a
 * list of shares, and it is deterministic, so a rebuild produces the same card.
 *
 * Values are the carbon-theme accents, because the card is always rendered on the
 * carbon ground (see `OgImageFrame`) regardless of which theme the reader has
 * stored — a card is fetched by a crawler that has never executed the theme
 * bootstrap script.
 */
export const OG_CATEGORY_ACCENTS: Readonly<Record<ArticleCategory, string>> = {
  "distributed-systems": "#baf336", // --color-primary-container
  "data-platforms": "#34d399", // --color-secondary
  leadership: "#93c5fd", // --color-tertiary
  "ai-ml": "#cce2ff", // --color-tertiary-container
  fintech: "#00bd85", // --color-secondary-container
};

/** Used for a card with no category, and for a category added after this build. */
export const OG_DEFAULT_ACCENT = "#baf336";

/**
 * Every user-visible string on a card.
 *
 * Passed in rather than imported, because the domain must not depend on the
 * message catalogs: the dictionaries are the presentation layer's business, and
 * a domain test has to be able to assert derivation with a fixture instead of
 * reaching for a locale.
 */
export type OgImageCopy = {
  /** The `MSD` wordmark. */
  monogram: string;
  /** The owner's name, shown in the top rail beside the monogram. */
  siteName: string;
  /** Section label above the site-wide title. */
  siteKicker: string;
  /** `og:image:alt` for the site-wide card. */
  alt: string;
  /** `og:image:alt` for an article card. */
  articleAlt: string;
  /** `{minutes}` template for the reading-time fact. */
  readingTime: string;
  /** Category slug to label. A slug with no entry degrades, see `resolveCategoryLabel`. */
  categories: Readonly<Record<string, string>>;
};

/**
 * The shape a message catalog has to have to fill an `OgImageCopy`.
 *
 * Declared structurally rather than imported as `Dictionary`, so the domain keeps
 * its independence from the message catalogs while a catalog is still accepted
 * wherever one is passed. TypeScript checks assignability, so a catalog that
 * drops `og.categories` stops compiling at the call site instead of producing a
 * card with no categories.
 */
export type OgImageCopySource = {
  og: {
    monogram: string;
    siteKicker: string;
    alt: string;
    articleAlt: string;
    categories: Readonly<Record<string, string>>;
  };
  metadata: {
    siteName: string;
  };
  blog: {
    readingTime: string;
  };
};

/** Projects a message catalog onto the strings a card is allowed to print. */
export function ogImageCopyFrom(source: OgImageCopySource): OgImageCopy {
  return {
    monogram: source.og.monogram,
    siteName: source.metadata.siteName,
    siteKicker: source.og.siteKicker,
    alt: source.og.alt,
    articleAlt: source.og.articleAlt,
    readingTime: source.blog.readingTime,
    categories: source.og.categories,
  };
}

/**
 * The fact row under the title.
 *
 * `id` is a machine name rather than only text, so a test can assert *which*
 * facts survived derivation without matching translated copy, and so the frame
 * can style them differently without parsing strings.
 */
export type OgImageFactId = "published" | "readingTime";

export type OgImageFact = {
  id: OgImageFactId;
  text: string;
};

/**
 * Everything `OgImageFrame` draws, and nothing it has to decide.
 *
 * The model is flat on purpose: the frame maps fields to boxes, so there is no
 * second place where a colour or a length can be chosen.
 */
export type OgImageModel = {
  size: { width: number; height: number };
  alt: string;
  monogram: string;
  siteName: string;
  /** Host of `SITE_URL`, printed in the footer. */
  host: string;
  /** Small accent label above the title. */
  kicker: string;
  title: string;
  /** Whether the title was cut, so a caller can log it instead of hiding it. */
  titleTruncated: boolean;
  /** `null` when the source had nothing to say. */
  subtitle: string | null;
  subtitleTruncated: boolean;
  facts: readonly OgImageFact[];
  accent: string;
};

export type SiteOgImageInput = {
  locale: Locale;
  copy: OgImageCopy;
  /** Localized job title; becomes the headline. */
  jobTitle: string;
  /** Localized one-line pitch; becomes the subtitle. */
  tagline: string;
};

export type ArticleOgImageInput = {
  locale: Locale;
  copy: OgImageCopy;
  /**
   * The list projection of an article. Typed loosely on purpose: a card is
   * generated for a row that came out of a database, and the derivation has to
   * survive a null date or a missing excerpt without throwing at the crawler.
   */
  article: {
    slug: string;
    title: string;
    excerpt?: string | null;
    category?: string | null;
    publishedAt?: string | null;
    readingTimeMinutes?: number | null;
  };
};

/** Host of the canonical origin, derived so it can never disagree with `SITE_URL`. */
export function siteHost(): string {
  return new URL(SITE_URL).host;
}

/**
 * Cuts a string to `maxLength` without leaving a dangling separator, and never
 * reports a truncation it did not perform.
 *
 * The cut is taken on whole code points rather than UTF-16 units, because a
 * title with an emoji or a combining accent would otherwise end in a lone
 * surrogate or a half-composed glyph — a broken card from a row that is otherwise
 * perfectly valid.
 */
export function truncateForCard(
  value: string | null | undefined,
  maxLength: number,
): { text: string; truncated: boolean } {
  // Whitespace in a database title is a formatting accident, and a newline in
  // the middle of a card headline collapses the layout rather than wrapping it.
  const collapsed = (value ?? "").replace(/\s+/gu, " ").trim();

  if (collapsed === "") {
    return { text: "", truncated: false };
  }

  const codePoints = [...collapsed];

  if (codePoints.length <= maxLength) {
    return { text: collapsed, truncated: false };
  }

  const head = codePoints.slice(0, maxLength).join("");
  const lastSpace = head.lastIndexOf(" ");

  /*
   * Only honour the word boundary when it is reasonably far along. A title with
   * one very long token would otherwise be cut to a handful of characters, which
   * is worse than a clean mid-word cut.
   */
  const body = (
    lastSpace >= Math.floor(maxLength * 0.6) ? head.slice(0, lastSpace) : head
  ).replace(/[\s.,;:!?—–-]+$/u, "");

  return { text: `${body}…`, truncated: true };
}

/**
 * Formats a `YYYY-MM-DD` column as a short, locale-aware date.
 *
 * `null` for anything that is not a date, because a fact row with the word
 * "undefined" in it is worse than a fact row that is simply absent. Pinned to
 * UTC for the same reason the blog's own `<time>` is: a date-only column
 * rendered in a timezone behind UTC would show the previous day to part of the
 * audience, and a card is generated once and cached forever, so the wrong day
 * would be wrong for every reader.
 *
 * `Intl` is used rather than a hand-rolled format: it is part of the platform
 * rather than a dependency, it needs no network, and it is the only way a
 * pt-BR card can read "18 de jun. de 2026" without a per-locale string table
 * that would have to be kept in step with the browser's own.
 */
export function formatCardDate(locale: Locale, isoDate: string | null | undefined): string | null {
  if (typeof isoDate !== "string") {
    return null;
  }

  const day = isoDate.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(day)) {
    return null;
  }

  const parsed = new Date(`${day}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/**
 * Substitutes the one placeholder a card fact can carry.
 *
 * Local rather than reusing `formatMessage` from `src/i18n`: the domain may not
 * depend on the message catalogs, and a card needs a number, not a general
 * value map. An absent placeholder is left visible, exactly as `formatMessage`
 * does, so a mistyped template surfaces instead of rendering a gap.
 */
function formatCardTemplate(template: string, minutes: number): string {
  return template.replace(/\{(\w+)\}/gu, (token, key: string) =>
    key === "minutes" ? String(minutes) : token,
  );
}

/**
 * Reading-time fact, or `null` when there is nothing true to say.
 *
 * A missing or non-positive duration is dropped rather than rendered as "0 min
 * read": the article page shows the same value, and a card that contradicts the
 * page it is a preview of is a bug in the sharing preview.
 */
export function formatCardReadingTime(
  template: string,
  minutes: number | null | undefined,
): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  return formatCardTemplate(template, Math.round(minutes));
}

/**
 * Human label for an `ArticleCategory`.
 *
 * A category this build has never heard of degrades to its slug with the hyphens
 * turned into spaces. It does not throw and it does not go blank: a new row in
 * `blog_articles.category` reaches the card before anybody has translated it, and
 * an empty kicker reads as a rendering failure.
 */
export function resolveCategoryLabel(
  category: string | null | undefined,
  copy: OgImageCopy,
): string | null {
  if (typeof category !== "string") {
    return null;
  }

  const slug = category.trim();

  if (slug === "") {
    return null;
  }

  return copy.categories[slug] ?? slug.replace(/-/gu, " ");
}

/** Accent for a category, falling back to the brand lime for anything unknown. */
export function resolveCategoryAccent(category: string | null | undefined): string {
  if (typeof category !== "string") {
    return OG_DEFAULT_ACCENT;
  }

  return OG_CATEGORY_ACCENTS[category.trim() as ArticleCategory] ?? OG_DEFAULT_ACCENT;
}

/** The site-wide card: role as the headline, the pitch as the subtitle. */
export function deriveSiteOgImage({ copy, jobTitle, tagline }: SiteOgImageInput): OgImageModel {
  const title = truncateForCard(jobTitle, OG_TITLE_MAX_LENGTH);
  const subtitle = truncateForCard(tagline, OG_SUBTITLE_MAX_LENGTH);

  return {
    size: OG_IMAGE_SIZE,
    alt: copy.alt,
    monogram: copy.monogram,
    siteName: copy.siteName,
    host: siteHost(),
    kicker: copy.siteKicker,
    title: title.text,
    titleTruncated: title.truncated,
    subtitle: subtitle.text === "" ? null : subtitle.text,
    subtitleTruncated: subtitle.truncated,
    // A fact row of proportions and a version string would be decoration. The
    // site card states the role and the pitch, and stops.
    facts: [],
    accent: OG_DEFAULT_ACCENT,
  };
}

/**
 * The per-article card.
 *
 * The category is the kicker, so it is not repeated in the fact row; the date
 * and the reading time are the only facts, and each is dropped independently
 * when the article does not have it. A card for a row with no publication date
 * is a shorter card, not a broken one.
 */
export function deriveArticleOgImage({ locale, copy, article }: ArticleOgImageInput): OgImageModel {
  const title = truncateForCard(article.title, OG_TITLE_MAX_LENGTH);
  const subtitle = truncateForCard(article.excerpt, OG_SUBTITLE_MAX_LENGTH);
  const published = formatCardDate(locale, article.publishedAt);
  const readingTime = formatCardReadingTime(copy.readingTime, article.readingTimeMinutes);
  const kicker = resolveCategoryLabel(article.category, copy);

  const facts: OgImageFact[] = [];

  if (published !== null) {
    facts.push({ id: "published", text: published });
  }

  if (readingTime !== null) {
    facts.push({ id: "readingTime", text: readingTime });
  }

  return {
    size: OG_IMAGE_SIZE,
    alt: copy.articleAlt,
    monogram: copy.monogram,
    siteName: copy.siteName,
    host: siteHost(),
    kicker: kicker ?? copy.siteKicker,
    title: title.text === "" ? article.slug : title.text,
    titleTruncated: title.truncated,
    subtitle: subtitle.text === "" ? null : subtitle.text,
    subtitleTruncated: subtitle.truncated,
    facts,
    accent: resolveCategoryAccent(article.category),
  };
}

/**
 * The card shown when an article cannot be read at all.
 *
 * A crawler fetching `og:image` for a URL that has just been unpublished — or one
 * that was never a slug at all — gets a 200 and a card that still looks like the
 * site, rather than a 500 that makes the social platform drop the preview
 * entirely. The requested slug becomes the headline because it is the only thing
 * known to be true about the request.
 */
export function deriveMissingArticleOgImage(
  { copy, tagline }: { copy: OgImageCopy; tagline: string },
  slug: string,
): OgImageModel {
  const title = truncateForCard(slug, OG_TITLE_MAX_LENGTH);
  const subtitle = truncateForCard(tagline, OG_SUBTITLE_MAX_LENGTH);

  return {
    size: OG_IMAGE_SIZE,
    alt: copy.articleAlt,
    monogram: copy.monogram,
    siteName: copy.siteName,
    host: siteHost(),
    kicker: copy.siteKicker,
    // A request with no slug at all cannot be rendered into an article card, and
    // a blank headline would leave a coloured rectangle. The site name is the
    // honest thing to put on a card for a URL that resolved to nothing.
    title: title.text === "" ? copy.siteName : title.text,
    titleTruncated: title.truncated,
    subtitle: subtitle.text === "" ? null : subtitle.text,
    subtitleTruncated: subtitle.truncated,
    facts: [],
    accent: OG_DEFAULT_ACCENT,
  };
}
