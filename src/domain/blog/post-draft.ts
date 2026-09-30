import { isLocale, type Locale } from "@/domain/i18n";

import {
  ArticleSlug,
  InvalidArticleSlugError,
  type ArticleCategory,
} from "./article";

/**
 * Owner-authored blog posts, as a document.
 *
 * ## Why a post is Markdown and an article is not
 *
 * The blog article contract (`./article`) stores a body as typed blocks, and
 * `ArticleBody` renders each block with the design system's typography. That is
 * the right shape for *rendering* and the wrong shape for *authoring*: nobody
 * wants to hand-write a JSON array of discriminated unions to change a
 * paragraph.
 *
 * So a CMS post is authored as Markdown and **compiled into those same blocks**
 * before it is ever stored as an article. There is no second rendering path and
 * no Markdown in the published page: a post written in the CMS is
 * indistinguishable from a seeded one, because after `compileMarkdown` it *is*
 * one. See `src/application/blog/markdown.ts` for the grammar and
 * `src/infrastructure/repositories/supabase-post-repository.ts` for the write.
 *
 * ## Why the source is kept separately
 *
 * The Markdown is the owner's copy, and it is kept in its own table rather than
 * round-tripped through the compiled blocks. A compiler is lossy — the block
 * union has no inline emphasis, no links and no images — so rebuilding the
 * document from the blocks would quietly delete whatever the author wrote that
 * the union cannot express. The document is the source of truth; the blocks are
 * a projection of it.
 *
 * This module is pure: no framework, no Supabase, no clock other than what the
 * caller passes in, so every rule below is testable without a browser or a
 * database.
 */

/** Upper bound on a title, so a card and a `<h1>` both stay readable. */
export const POST_TITLE_MAX_LENGTH = 140;

/** Upper bound on the excerpt, which is also the meta description. */
export const POST_EXCERPT_MAX_LENGTH = 320;

/** Upper bounds on a tag, and on how many a post may carry. */
export const POST_TAG_MAX_LENGTH = 40;
export const POST_TAG_MAX_COUNT = 12;

/** Mirrors `blog_articles`' own check constraint, so the same bound applies here. */
export const POST_SLUG_MAX_LENGTH = 96;

/**
 * CMS lifecycle.
 *
 * `draft` and `published` mirror `ArticleStatus`; `archived` has no article
 * equivalent on purpose. An archived post was published once and has been
 * withdrawn — the Markdown survives so it can come back, but the article is no
 * longer readable through the public blog, which only ever serves
 * `status = 'published'`.
 */
export type PostStatus = "draft" | "published" | "archived";

const POST_STATUSES: ReadonlySet<string> = new Set<PostStatus>([
  "draft",
  "published",
  "archived",
]);

/**
 * The blog categories, as an ordered list.
 *
 * A fourth copy of the same five strings — the union in `./article`, the
 * `CATEGORIES` set in the Supabase adapter, the `blog_category` enum in the
 * migration — and it is here for the one reason the others cannot serve: the
 * editor needs a *list* to render a `<select>`, and a `Set` has no order a
 * person can read while a union cannot be enumerated at all. Moving the same
 * trust decision into the browser as a free-text field was the alternative, and
 * a category the database rejects is a save that fails for a reason the owner
 * cannot act on.
 */
export const POST_CATEGORIES: readonly ArticleCategory[] = [
  "distributed-systems",
  "data-platforms",
  "leadership",
  "ai-ml",
  "fintech",
];

/** The metadata half of a post: everything a reader sees before the body. */
export type PostFrontMatter = {
  title: string;
  slug: string;
  locale: Locale;
  category: ArticleCategory;
  excerpt: string;
  tags: string[];
  featured: boolean;
  /** `YYYY-MM-DD`. Matches `blog_articles.published_at`, a date-only column. */
  publishedAt: string;
};

/** A validated, saveable post. `markdown` is the body, without the front matter. */
export type PostDraft = {
  id: string;
  status: PostStatus;
  frontMatter: PostFrontMatter;
  markdown: string;
  createdAt: string;
  updatedAt: string;
};

/** List projection: the body is never loaded to render a list of posts. */
export type PostSummary = Omit<PostDraft, "markdown">;

/**
 * A field that failed validation, carrying a *code* rather than a sentence.
 *
 * The code is a stable identifier so the presentation layer can look up a
 * translated message. A domain that returned English prose would force either a
 * translation table keyed by a sentence — which breaks the moment a reason is
 * reworded — or an error the UI has to render untranslated.
 */
export type PostIssueCode =
  | "document_unreadable"
  | "front_matter_missing"
  | "front_matter_unterminated"
  | "front_matter_line_invalid"
  | "front_matter_key_unknown"
  | "front_matter_key_repeated"
  | "front_matter_key_missing"
  | "value_not_a_string"
  | "value_required"
  | "value_too_long"
  | "value_not_a_boolean"
  | "value_not_a_list"
  | "value_not_a_date"
  | "slug_invalid"
  | "locale_unknown"
  | "category_unknown"
  | "tags_too_many"
  | "body_empty";

export type PostIssue = {
  /** The front-matter key, or `document` / `body` for the document itself. */
  field: string;
  code: PostIssueCode;
};

/**
 * A document that is not a saveable post.
 *
 * Carries every issue rather than the first, because an editor that reports one
 * field per save is an editor the owner learns to avoid.
 */
export class InvalidPostDraftError extends Error {
  constructor(readonly issues: readonly PostIssue[]) {
    super(
      `Invalid post document (${issues.length} issue${issues.length === 1 ? "" : "s"}): ` +
        issues.map((issue) => `${issue.field}:${issue.code}`).join(", "),
    );
    this.name = "InvalidPostDraftError";
  }
}

/**
 * The split document, before validation.
 */
export type ParsedPostDocument = {
  frontMatter: Readonly<Record<string, string | string[]>>;
  markdown: string;
};

/**
 * What {@link composePostDocument} needs.
 *
 * Narrower than a `PostDraft` on purpose: the editor holds the fields in a form
 * before there is an id, a status or a timestamp to compose a document with, and
 * making it build a throwaway `PostDraft` to satisfy the type would put three
 * fake values in the code that produces the owner's file.
 */
export type PostDocumentSource = Pick<PostDraft, "frontMatter" | "markdown">;

/** Front-matter keys a document may carry, and nothing else. */
const KNOWN_KEYS = [
  "title",
  "slug",
  "locale",
  "category",
  "excerpt",
  "tags",
  "featured",
  "publishedAt",
] as const;

/**
 * Keys that must be present.
 *
 * `slug` is deliberately absent: a post that leaves it out gets one derived from
 * the title, which is the difference between a two-field and a one-field first
 * save.
 */
const REQUIRED_KEYS: readonly string[] = KNOWN_KEYS.filter((key) => key !== "slug");

/** Keys whose value is a comma-separated list rather than a single line. */
const LIST_KEYS: ReadonlySet<string> = new Set(["tags"]);

const FRONT_MATTER_FENCE = "---";

/**
 * Bound on the whole document.
 *
 * Not a per-field bound — there is no field to point at — but it exists so a
 * pasted 50MB file is refused before it is split into millions of lines. The
 * editor's textarea bounds it long before this does; the API does not, because
 * the API is the actual trust boundary.
 */
const DOCUMENT_MAX_LENGTH = 200_000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Splits a document into front matter and body.
 *
 * Deliberately a *line* parser and not a YAML parser. A general parser would
 * accept anchors, aliases, nested maps, multi-line scalars and tags, all of
 * which the domain has no field for — so it would turn a typo into a silently
 * dropped key rather than a refusal. Here an unrecognised key is an error, which
 * is the difference between "your `titel` was ignored" and "your post was not
 * saved".
 *
 * Also deliberately not YAML as a dependency: there is no `js-yaml` here, and
 * adding one to accept eight scalar keys would be a poor trade. The grammar is:
 *
 *     ---
 *     title: Architecting resilient swarms
 *     tags: Kafka, idempotency
 *     ---
 *     ## A heading
 *
 * Blank lines and `#` comments are skipped inside the block, values may be
 * quoted, and `tags` is a comma-separated list.
 */
export function parsePostDocument(source: unknown): ParsedPostDocument {
  if (typeof source !== "string") {
    throw new InvalidPostDraftError([{ field: "document", code: "document_unreadable" }]);
  }

  if (source.length > DOCUMENT_MAX_LENGTH) {
    throw new InvalidPostDraftError([{ field: "document", code: "value_too_long" }]);
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n");

  if (lines[0]?.trim() !== FRONT_MATTER_FENCE) {
    throw new InvalidPostDraftError([{ field: "document", code: "front_matter_missing" }]);
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONT_MATTER_FENCE,
  );

  if (closingIndex < 0) {
    throw new InvalidPostDraftError([{ field: "document", code: "front_matter_unterminated" }]);
  }

  const frontMatter: Record<string, string | string[]> = {};
  const issues: PostIssue[] = [];

  for (const line of lines.slice(1, closingIndex)) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf(":");

    if (separator <= 0) {
      issues.push({ field: trimmed, code: "front_matter_line_invalid" });
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();

    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      // Refused rather than ignored. A misspelled key that is silently dropped
      // produces a post missing a title, and the owner finds out from the
      // rendered page rather than from the editor.
      issues.push({ field: key, code: "front_matter_key_unknown" });
      continue;
    }

    if (key in frontMatter) {
      issues.push({ field: key, code: "front_matter_key_repeated" });
      continue;
    }

    frontMatter[key] = LIST_KEYS.has(key) ? splitList(rawValue) : unquote(rawValue);
  }

  if (issues.length > 0) {
    throw new InvalidPostDraftError(issues);
  }

  return { frontMatter, markdown: lines.slice(closingIndex + 1).join("\n").trim() };
}

/**
 * Rebuilds a document from a post.
 *
 * The inverse of {@link parsePostDocument}, and used by the editor so the
 * Markdown textarea and the labelled front-matter inputs can never disagree
 * about how a document is spelled. Quoting is applied only where a value would
 * otherwise be ambiguous — empty, leading/trailing space, a leading `#`, or an
 * embedded `": "` — which keeps a hand-written document looking hand-written.
 */
export function composePostDocument(draft: PostDocumentSource): string {
  const { frontMatter, markdown } = draft;

  const lines = KNOWN_KEYS.map((key) => {
    const value = frontMatter[key];

    if (Array.isArray(value)) {
      return `${key}: ${value.map(quoteListItem).join(", ")}`;
    }

    if (typeof value === "boolean") {
      return `${key}: ${value}`;
    }

    return `${key}: ${needsQuoting(value) ? quote(value) : value}`;
  });

  return [FRONT_MATTER_FENCE, ...lines, FRONT_MATTER_FENCE, "", markdown.trim(), ""].join("\n");
}

/**
 * Validates a document and returns the post fields it carries.
 *
 * Every field is checked even after one fails, so the editor can mark all of
 * them at once. Only the structural failures — a missing or unterminated front
 * matter block — are thrown by the parser, because without them there is nothing
 * to point a field marker at.
 */
export function readPostInput(source: unknown): {
  frontMatter: PostFrontMatter;
  markdown: string;
} {
  const { frontMatter: raw, markdown } = parsePostDocument(source);
  const issues: PostIssue[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!(key in raw)) {
      issues.push({ field: key, code: "front_matter_key_missing" });
    }
  }

  const title = readString(raw.title, "title", POST_TITLE_MAX_LENGTH, issues);
  const excerpt = readString(raw.excerpt, "excerpt", POST_EXCERPT_MAX_LENGTH, issues);
  const dateSource = readString(raw.publishedAt, "publishedAt", 10, issues);
  const localeSource = readString(raw.locale, "locale", 5, issues);
  const categorySource = readString(raw.category, "category", 32, issues);
  const featuredSource = readString(raw.featured, "featured", 5, issues);

  /*
   * The slug is read on its own rather than through `readString`, because blank
   * and absent both mean "derive one from the title" and neither is an error —
   * a new post is then one required field rather than two. A slug that is present
   * and *invalid* is still refused: it was typed, and silently replacing it would
   * publish a URL the owner did not choose.
   */
  const slugSource = typeof raw.slug === "string" ? raw.slug.trim() : "";

  if (markdown.trim() === "") {
    issues.push({ field: "body", code: "body_empty" });
  }

  /*
   * The blank slug is generated from the title, so a new post is one required
   * field rather than two. An *invalid* slug is still refused: it was typed, and
   * silently replacing it would publish a URL the owner did not choose.
   */
  const slug = slugSource === "" ? deriveSlug(title, issues) : validateSlug(slugSource, issues);

  const locale = readLocale(localeSource, issues);
  const category = readCategory(categorySource, issues);
  const publishedAt = readDate(dateSource, issues);
  const featured = readBoolean(featuredSource, issues);
  const tags = readTags(raw.tags, issues);

  // Read every field before refusing, so one save reports every problem. A
  // check placed between two readers would hide everything after it.
  if (issues.length > 0) {
    throw new InvalidPostDraftError(issues);
  }

  return {
    frontMatter: { title, slug, locale, category, excerpt, tags, featured, publishedAt },
    markdown,
  };
}

/**
 * Derives a URL segment from a title.
 *
 * Accent stripping is the part that matters, and it is why this is not
 * `title.toLowerCase().replace(/\s+/g, "-")`. A pt-BR title is full of accented
 * words and a slug is a URL: it travels through a `content-language` header, a
 * CDN, a sitemap file and somebody's notes app, where anything outside ASCII has
 * to be percent-encoded at every hop. The transliteration is deliberately small —
 * NFD decomposition covers Latin-1, plus a few ligatures — and it covers the two
 * languages this site publishes and nothing more. Anything it cannot
 * transliterate is dropped rather than encoded, and a title that reduces to
 * nothing raises {@link InvalidPostDraftError} rather than producing an empty
 * segment.
 */
export function slugifyPostTitle(title: string): string {
  const slug = title
    .normalize("NFD")
    // Combining marks: what NFD leaves behind once the base letters are split off.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00e6/g, "ae")
    .replace(/\u00c6/g, "AE")
    .replace(/\u00df/g, "ss")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, POST_SLUG_MAX_LENGTH)
    // A cut can leave a trailing hyphen, which is not a valid segment.
    .replace(/-+$/, "");

  if (slug === "") {
    throw new InvalidPostDraftError([{ field: "title", code: "value_required" }]);
  }

  return slug;
}

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === "string" && POST_STATUSES.has(value);
}

export function isArticleCategory(value: unknown): value is ArticleCategory {
  return typeof value === "string" && (POST_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Words per minute used to derive the reading time.
 *
 * Computed rather than authored, because `blog_articles.reading_time_minutes` is
 * `not null` with a check constraint: an owner-supplied number is a number that
 * drifts from the text it claims to measure, and the only way to keep it honest
 * is not to ask. 200 sits in the middle of the range the industry quotes and is
 * named here so changing it is a visible decision rather than a nudge.
 */
export const POST_READING_WORDS_PER_MINUTE = 200;

/** Ceiling that matches `blog_articles`' own check constraint. */
export const POST_READING_MAX_MINUTES = 120;

/**
 * Estimates the reading time of a body, in whole minutes.
 *
 * Always at least 1: a post with one short paragraph still takes a reader some
 * time, and `reading_time_minutes between 1 and 120` is enforced by the
 * database, so a zero would be a write that fails for a reason the owner cannot
 * act on.
 */
export function estimateReadingTimeMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / POST_READING_WORDS_PER_MINUTE);

  return Math.min(Math.max(minutes, 1), POST_READING_MAX_MINUTES);
}

/** Projects a post onto its list shape, dropping the body as `toArticleSummary` does. */
export function toPostSummary(draft: PostDraft): PostSummary {
  return {
    id: draft.id,
    status: draft.status,
    frontMatter: draft.frontMatter,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

/**
 * Newest first, then by title.
 *
 * The CMS list is ordered by recency rather than publication date on purpose:
 * the question the owner is answering here is "what did I touch last", and a
 * post edited today but published last year belongs at the top.
 */
export function comparePostSummaries(a: PostSummary, b: PostSummary): number {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? 1 : -1;
  }

  return a.frontMatter.title.localeCompare(b.frontMatter.title);
}

/* -------------------------------------------------------------------------
 * Field readers
 *
 * Each returns whatever it could read and appends an issue for what it could
 * not, so a caller can collect every problem in one pass. A reader that
 * returned `null` and forced an early return would mean the editor highlights
 * one field per save.
 *
 * The placeholder a failed reader returns is never observed: `readPostInput`
 * throws before it builds a `PostFrontMatter` from them. They exist only to
 * satisfy the type system, which is the cheaper trade over eight nullable
 * return types.
 * ---------------------------------------------------------------------- */

function readString(
  value: string | string[] | undefined,
  field: string,
  maxLength: number,
  issues: PostIssue[],
): string {
  if (value === undefined) {
    // Already reported by the required-key pass.
    return "";
  }

  if (Array.isArray(value)) {
    /*
     * Unreachable through `parsePostDocument`, which only produces a list for a
     * key declared in `LIST_KEYS`. Kept because the readers take the union the
     * parser's type declares: if a key is ever added to `LIST_KEYS` without a
     * scalar reader being adjusted, the failure should be a message on the field
     * rather than a coerced `["a,b"]` string reaching the database.
     */
    issues.push({ field, code: "value_not_a_string" });
    return "";
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    issues.push({ field, code: "value_required" });
    return "";
  }

  if (trimmed.length > maxLength) {
    issues.push({ field, code: "value_too_long" });
    return "";
  }

  return trimmed;
}

function deriveSlug(title: string, issues: PostIssue[]): string {
  if (title === "") {
    return "";
  }

  try {
    return slugifyPostTitle(title);
  } catch (error) {
    if (error instanceof InvalidPostDraftError) {
      issues.push(...error.issues);
      return "";
    }
    throw error;
  }
}

function validateSlug(value: string, issues: PostIssue[]): string {
  if (ArticleSlug.isValid(value)) {
    return value;
  }

  /*
   * The article's own invariant decides the reason, so the editor can say why a
   * canonical URL would have been wrong without this module restating the rule.
   * Only a length failure is distinguishable from the prose, and it maps to the
   * generic "too long" message rather than inventing a slug-specific one.
   */
  try {
    ArticleSlug.create(value);
  } catch (error) {
    const code: PostIssueCode =
      error instanceof InvalidArticleSlugError && /at most \d+ characters/.test(error.message)
        ? "value_too_long"
        : "slug_invalid";
    issues.push({ field: "slug", code });
  }

  return "";
}

function readLocale(value: string, issues: PostIssue[]): Locale {
  if (isLocale(value)) {
    return value;
  }

  issues.push({ field: "locale", code: "locale_unknown" });
  return "pt-BR";
}

function readCategory(value: string, issues: PostIssue[]): ArticleCategory {
  if (isArticleCategory(value)) {
    return value;
  }

  issues.push({ field: "category", code: "category_unknown" });
  return "leadership";
}

/**
 * Whether a string is a real `YYYY-MM-DD` calendar date.
 *
 * The round trip is the whole check. `Date.parse` is happy to roll `2026-02-30`
 * over into March and `2026-13-01` into the next year, so a bare `isNaN` test
 * would accept two dates the `date` column would then store as something else —
 * and `2026-02-29`, which is a leap day in 2028 and not in 2026. Formatting the
 * parsed value back and comparing catches all three in one line.
 */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function readDate(value: string, issues: PostIssue[]): string {
  if (isCalendarDate(value)) {
    return value;
  }

  issues.push({ field: "publishedAt", code: "value_not_a_date" });
  return "1970-01-01";
}

function readBoolean(value: string, issues: PostIssue[]): boolean {
  const normalised = value.toLowerCase();

  if (normalised === "true") {
    return true;
  }

  if (normalised === "false" || normalised === "no") {
    return false;
  }

  issues.push({ field: "featured", code: "value_not_a_boolean" });
  return false;
}

function readTags(value: string | string[] | undefined, issues: PostIssue[]): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    // Same reasoning as `readString`: the parser declares `tags` a list key, so
    // this cannot happen through the document path. It is here so a future change
    // to `LIST_KEYS` fails on a message rather than on a string split by guesswork.
    issues.push({ field: "tags", code: "value_not_a_list" });
    return [];
  }

  const tags: string[] = [];

  for (const raw of value) {
    const tag = raw.trim();

    // Duplicates are dropped rather than refused: they are a paste artefact, and
    // the tag list is rendered as chips where a repeat is invisible anyway.
    if (tag === "" || tags.includes(tag)) {
      continue;
    }

    if (tag.length > POST_TAG_MAX_LENGTH) {
      issues.push({ field: "tags", code: "value_too_long" });
      continue;
    }

    tags.push(tag);
  }

  if (tags.length > POST_TAG_MAX_COUNT) {
    issues.push({ field: "tags", code: "tags_too_many" });
  }

  return tags.slice(0, POST_TAG_MAX_COUNT);
}

/* -------------------------------------------------------------------------
 * Line-level helpers
 * ---------------------------------------------------------------------- */

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function needsQuoting(value: string): boolean {
  return value === "" || /^[\s#]/.test(value) || /:\s/.test(value) || /[\n\r]/.test(value);
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function quoteListItem(value: string): string {
  return needsQuoting(value) ? quote(value) : value;
}

function splitList(value: string): string[] {
  if (value.trim() === "") {
    return [];
  }

  return value.split(",").map((entry) => unquote(entry.trim()));
}
