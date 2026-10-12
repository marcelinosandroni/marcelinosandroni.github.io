import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackSection,
} from "@/domain/portfolio";
import type { ResumeContent, Surface } from "@/domain/resume/types";

/**
 * Storage contract for résumé content.
 *
 * ## Why this exists
 *
 * The résumé was typed TypeScript, which made a typo correction a deploy. This
 * is the seam that lets the database hold the document while the typed catalog
 * stays as the answer when the database cannot be reached — the same arrangement
 * `PostRepository` already uses for the blog CMS, for the same reasons and with
 * the same failure modes.
 *
 * Pure domain: no Next.js, no Supabase, no HTTP, no environment access.
 *
 * ## Why the reads are by surface rather than by page
 *
 * The home page and the résumé are two renderings of one career, so the port
 * asks for the content *for a surface* rather than asking for "the home page
 * content" or "the résumé content". That keeps the filtering decision in one
 * place — the adapter — instead of letting each page re-derive which of its
 * rows are its own, which is how two views of one dataset start disagreeing.
 */

/** What a reader is served. */
export type ResumeSurfaceRead = "home" | "resume" | "both";

/** The adapter that answered, and why — surfaced for the telemetry and logs. */
export type ResumeSource = "database" | "versioned";

export type ResumeSnapshot = {
  readonly content: ResumeContent;
  readonly source: ResumeSource;
};

/** The port the application layer depends on. */
export type ResumeRepository = {
  /** The whole document for a locale, filtered to a surface. */
  readResume(locale: Locale, surface: ResumeSurfaceRead): Promise<ResumeContent>;
  /** Published testimonials for a locale, in display order. */
  readTestimonials(locale: Locale): Promise<ResumeTestimonial[]>;
  /**
   * The home page tech stack, or `null` when the database has none.
   *
   * `null` rather than an empty section on purpose: "the database says this
   * page has no stack" and "the database is not there" are different states, and
   * only the second one should fall back to the typed catalog. An empty stack
   * rendered from a successful read would be a page that silently lost its
   * content.
   */
  readHomeStack(locale: Locale): Promise<HomeStackSection | null>;
  /** The home page track-record annotations, or `null` when unavailable. */
  readHomeTrackRecord(locale: Locale): Promise<HomeExperienceAnnotation[] | null>;
  /**
   * The whole technology catalog for a locale, grouped by category.
   *
   * The entity view — slug, label, aliases, publish state — as opposed to the
   * relation view `ResumeContent.stackIndex` carries. Reading the catalog is an
   * owner action; the résumé never needs it, and adding it to `readResume`
   * would put two unused columns on the hot path.
   */
  readTechnologyCatalog(locale: Locale): Promise<TechnologyCatalog>;
}

/** One category, as the admin lists them. */
export type TechnologyCategory = {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly sortOrder: number;
};

/** One catalog row, as the admin edits it. */
export type TechnologyCatalogEntry = {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly categoryId: string;
  readonly categorySlug: string | null;
  readonly categoryLabel: string | null;
  readonly aliases: readonly string[];
  readonly surfaces: readonly Surface[];
  readonly isPublished: boolean;
  readonly sortOrder: number;
};

/**
 * The catalog as one value.
 *
 * Returned whole rather than through a list method per category: the admin
 * renders all of it at once, and splitting it would mean the editor could load a
 * category list and a technology list from different moments in time — which
 * produces a technology whose category was deleted between the two requests,
 * rendered as an orphaned chip with no way to re-file it.
 */
export type TechnologyCatalog = {
  readonly categories: readonly TechnologyCategory[];
  readonly technologies: readonly TechnologyCatalogEntry[];
};;

/** One named reference. See the `resume_testimonial` table for why it ships empty. */
export type ResumeTestimonial = {
  readonly id: string;
  readonly authorName: string;
  readonly authorRole: string;
  readonly authorCompany: string;
  readonly quote: string;
  /** Optional verification link. Rendered only when present. */
  readonly linkUrl: string | null;
};

/** The record written when the owner saves a testimonial. */
export type NewTestimonialRecord = ResumeTestimonial & {
  readonly locale: Locale;
  readonly status: "published" | "draft";
  readonly sortOrder: number;
};