import type { Locale } from "@/domain/i18n";
import type { ResumeContent } from "@/domain/resume/types";

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
};

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