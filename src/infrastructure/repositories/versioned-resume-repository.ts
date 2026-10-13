import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackSection,
} from "@/domain/portfolio";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
  StackProfileSummary,
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

  /**
   * Empty, for the same reason the catalog is.
   *
   * A profile is a selection of technologies, and the typed catalog has no
   * technology entities to select from. Synthesising profiles from the flat chip
   * strings would invent a taxonomy the owner never chose and could not edit,
   * which is the whole thing the catalog exists to prevent.
   *
   * So there are no profiles offline, and the page shows the generic résumé —
   * the default view, and the one that is always correct.
   */
  async readStackProfiles(_locale: Locale): Promise<StackProfileSummary[]> {
    return [];
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

  /**
   * Falls back, unlike the catalog above — because this one has a usable answer.
   *
   * The catalog has no fallback because inventing technology entities from flat
   * chip strings would merge tools that should stay apart. A profile is only a
   * selection of slugs, so an absent one degrades to the generic résumé, which
   * is the default view and is always correct.
   */
  async readStackProfiles(locale: Locale): Promise<StackProfileSummary[]> {
    try {
      const profiles = await this.primary.readStackProfiles(locale);

      return profiles.length > 0 ? profiles : await this.fallback.readStackProfiles(locale);
    } catch (error) {
      this.report(error);

      return this.fallback.readStackProfiles(locale);
    }
  }

  private report(error: unknown): void {
    this.onFailure(error instanceof Error ? error : new Error(String(error)));
  }
}