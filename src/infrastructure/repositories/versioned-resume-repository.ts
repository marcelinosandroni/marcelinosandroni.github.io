import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackSection,
} from "@/domain/portfolio";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
  TechnologyCatalog,
} from "@/domain/resume/resume-repository";
import type { ResumeContent } from "@/domain/resume/types";
import { getResumeContent } from "@/infrastructure/content";
import { getHomeContent } from "@/infrastructure/content/home";

/**
 * The versioned answer, and the fallback that reaches for it.
 *
 * ## Why the typed catalog is still here
 *
 * It is the fallback, not the source of truth any more. A database outage must
 * not take the résumé offline — this is the document of record, and a hiring
 * manager who gets a 500 here gets a different engineer.
 *
 * That is the same argument the blog already makes, and it is why this is a
 * separate object rather than a branch inside the Supabase adapter: the fallback
 * has to be constructible and testable with no database in sight.
 *
 * ## Testimonials are empty here, on purpose
 *
 * The typed catalog has never contained a testimonial, and inventing one is the
 * one thing this site does not do. Until the owner adds a real quote to the
 * database, this returns nothing — which is correct, not a gap to be filled by
 * the fallback.
 */
export class VersionedResumeRepository implements ResumeRepository {
  async readResume(locale: Locale, _surface: ResumeSurfaceRead): Promise<ResumeContent> {
    return getResumeContent(locale);
  }

  async readTestimonials(_locale: Locale): Promise<ResumeTestimonial[]> {
    return [];
  }

  /**
   * The typed home page is already the fallback for these two, so they are read
   * straight out of it rather than seeded into a parallel shape.
   */
  async readHomeStack(locale: Locale): Promise<HomeStackSection | null> {
    return getHomeContent(locale).stack;
  }

  async readHomeTrackRecord(locale: Locale): Promise<HomeExperienceAnnotation[] | null> {
    return getHomeContent(locale).trackRecord.annotations;
  }

  /**
   * Empty, deliberately.
   *
   * The typed catalog has no technology *entity* — it has the strings that were
   * written per role, which is exactly what this catalog was introduced to
   * stop being the source of. Synthesising rows from those strings here would
   * look like a working fallback and quietly reintroduce the ambiguity: "Java
   * Spring" and "Java" would become two technologies that no focused résumé
   * could group.
   *
   * So the fallback reports no catalog, and the admin says so. An owner editing
   * the catalog needs the database anyway; a deployment without one cannot have
   * edited anything, so there is nothing to fall back *to*.
   */
  async readTechnologyCatalog(_locale: Locale): Promise<TechnologyCatalog> {
    return { categories: [], technologies: [], relations: [] };
  }
}

/** The adapter used when Supabase is not configured. Never a network call. */
export const versionedResumeRepository = new VersionedResumeRepository();

/**
 * Database, then the versioned catalog.
 *
 * ## Why a failure is not an empty page
 *
 * `readResume` returning `[]` when the database is empty would render a résumé
 * with no experience at all, which is indistinguishable from a person with no
 * career. The database being *unavailable* and the database being *empty* are
 * different states and only one of them is an error, so this distinguishes
 * them: a rejection becomes the catalog, and an empty document does not.
 */
export class FallbackResumeRepository implements ResumeRepository {
  constructor(
    private readonly primary: ResumeRepository,
    private readonly fallback: ResumeRepository,
    private readonly onFailure: (error: Error) => void = () => undefined,
  ) {}

  async readResume(locale: Locale, surface: ResumeSurfaceRead): Promise<ResumeContent> {
    try {
      const content = await this.primary.readResume(locale, surface);

      if (content.experiences.length === 0 && content.name === "") {
        // Provisioned but empty: a migration that ran without its seed. The
        // document of record is better served by the catalog than by a blank.
        throw new Error(`resume content for ${locale} is empty`);
      }

      return content;
    } catch (error) {
      this.report(error);

      return this.fallback.readResume(locale, surface);
    }
  }

  async readTestimonials(locale: Locale): Promise<ResumeTestimonial[]> {
    try {
      return await this.primary.readTestimonials(locale);
    } catch (error) {
      this.report(error);

      return this.fallback.readTestimonials(locale);
    }
  }

  async readHomeStack(locale: Locale): Promise<HomeStackSection | null> {
    try {
      const stack = await this.primary.readHomeStack(locale);

      // `null` from the primary means "not provisioned", which is a different
      // state from a failure and must not be treated as one.
      return stack ?? (await this.fallback.readHomeStack(locale));
    } catch (error) {
      this.report(error);

      return this.fallback.readHomeStack(locale);
    }
  }

  async readHomeTrackRecord(locale: Locale): Promise<HomeExperienceAnnotation[] | null> {
    try {
      const annotations = await this.primary.readHomeTrackRecord(locale);

      return annotations ?? (await this.fallback.readHomeTrackRecord(locale));
    } catch (error) {
      this.report(error);

      return this.fallback.readHomeTrackRecord(locale);
    }
  }

  /**
   * Unlike the two above, an empty catalog is **not** a reason to fall back.
   *
   * The other three reads have a typed answer, so a failure degrades to a
   * document that is slightly stale. This one has none, and a catalog invented
   * from the fallback's flat strings would be indistinguishable from a real one
   * while merging tools that should stay separate. So the caller's failure is
   * the honest answer, and the admin renders "needs the database" — which is
   * true, and actionable in a way an empty table is not.
   */
  async readTechnologyCatalog(locale: Locale): Promise<TechnologyCatalog> {
    return this.primary.readTechnologyCatalog(locale);
  }

  private report(error: unknown): void {
    this.onFailure(error instanceof Error ? error : new Error(String(error)));
  }
}