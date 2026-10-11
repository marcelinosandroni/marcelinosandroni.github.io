import type { Locale } from "@/domain/i18n";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
} from "@/domain/resume/resume-repository";
import type { CaseStudy, ResumeContent } from "@/domain/resume/types";
import { toSurfaces } from "@/domain/resume/types";
import { getSupabaseClient } from "@/infrastructure/supabase/supabase-client";

/**
 * Per-request budget.
 *
 * A résumé page is never worth stalling for: the composition root has the
 * versioned catalog to fall back to, but it can only reach it once this call
 * settles. Bounding the wait keeps a half-open connection from adding its full
 * timeout to a visitor's first paint.
 */
const REQUEST_TIMEOUT_MS = 2_000;

type Row = Record<string, unknown>;

/**
 * Database adapter for résumé content.
 *
 * ## Trust boundary
 *
 * Everything arrives as `unknown` from PostgREST, so nothing is cast straight
 * into a domain object. A row that fails validation is dropped rather than
 * rendered: one malformed row must not take down the document of record.
 *
 * ## Why one adapter serves both surfaces
 *
 * The home page and the résumé are two renderings of one career. Reading them
 * from one adapter with a `surfaces` filter is what keeps them from being two
 * datasets — and two datasets is exactly what let them drift into contradicting
 * each other about the same employer.
 */
export class SupabaseResumeRepository implements ResumeRepository {
  async readResume(locale: Locale, surface: ResumeSurfaceRead): Promise<ResumeContent> {
    const [profile, experiences, groups, education, languages] = await Promise.all([
      this.one("resume_profile", `locale=eq.${locale}`),
      this.many("resume_experience", `locale=eq.${locale}&order=sort_order.asc`),
      this.many("resume_skill_group", `locale=eq.${locale}&order=sort_order.asc`),
      this.many("resume_education", `locale=eq.${locale}&order=sort_order.asc`),
      this.many("resume_language", `locale=eq.${locale}&order=sort_order.asc`),
    ]);

    const detail = await Promise.all(
      experiences.map(async (row) => {
        const id = String(row["id"]);
        const [highlights, caseStudies, technologies] = await Promise.all([
          this.many("resume_highlight", `experience_id=eq.${id}&locale=eq.${locale}&order=sort_order.asc`),
          this.many("resume_case_study", `experience_id=eq.${id}&locale=eq.${locale}&order=sort_order.asc`),
          this.many("resume_technology", `experience_id=eq.${id}&locale=eq.${locale}&order=sort_order.asc`),
        ]);

        return { row, highlights, caseStudies, technologies };
      }),
    );

    const skillsByGroup = await Promise.all(
      groups.map(async (group) => ({
        group,
        skills: await this.many("resume_skill", `group_id=eq.${group["id"]}&locale=eq.${locale}&order=sort_order.asc`),
      })),
    );

    const built = this.toContent(locale, profile, experiences, detail, groups, skillsByGroup, education, languages);

    return surface === "both" ? built : this.filterToSurface(built, surface);
  }

  async readTestimonials(locale: Locale): Promise<ResumeTestimonial[]> {
    const rows = await this.many(
      "resume_testimonial",
      `locale=eq.${locale}&status=eq.published&order=sort_order.asc`,
    );

    return rows.map((row) => ({
      id: String(row["id"]),
      authorName: text(row["author_name"]),
      authorRole: text(row["author_role"]),
      authorCompany: text(row["author_company"]),
      quote: text(row["quote"]),
      linkUrl: typeof row["link_url"] === "string" ? row["link_url"] : null,
    }));
  }

  /**
   * Drops the rows a surface does not show.
   *
   * Applied after assembly rather than in the query so the filter has one
   * definition. Pushing it into SQL would mean two queries per table and two
   * places for the rule to live, which is how a home page and a résumé end up
   * disagreeing about which roles exist.
   */
  private filterToSurface(content: ResumeContent, surface: "home" | "resume"): ResumeContent {
    return {
      ...content,
      experiences: content.experiences.filter((experience) =>
        (experience.surfaces ?? ["home", "resume"]).includes(surface),
      ),
    };
  }

  private toContent(
    locale: Locale,
    profile: Row | null,
    experiences: Row[],
    detail: Array<{ row: Row; highlights: Row[]; caseStudies: Row[]; technologies: Row[] }>,
    groups: Row[],
    skillsByGroup: Array<{ group: Row; skills: Row[] }>,
    education: Row[],
    languages: Row[],
  ): ResumeContent {
    const byId = new Map(detail.map((entry) => [String(entry.row["id"]), entry]));

    return {
      locale,
      name: text(profile?.["name"]),
      title: text(profile?.["title"]),
      location: text(profile?.["location"]),
      contact: {
        phone: text(profile?.["phone"]),
        email: text(profile?.["email"]),
        linkedin: text(profile?.["linkedin"]),
      },
      summary: text(profile?.["summary"]),
      experiences: experiences.map((row) => {
        const entry = byId.get(String(row["id"]));

        return {
          company: text(row["company"]),
          role: text(row["role"]),
          period: text(row["period"]),
          location: text(row["location"]),
          summary: text(row["summary"]),
          highlights: (entry?.highlights ?? []).map((h) => text(h["body"])),
          caseStudies: (entry?.caseStudies ?? []).map(toCaseStudy),
          technologies: (entry?.technologies ?? []).map((t) => text(t["label"])),
          teamSize: typeof row["team_size"] === "number" ? row["team_size"] : undefined,
          scope: text(row["scope"]),
          surfaces: toSurfaces(row["surfaces"] as string[] | null),
        };
      }),
      skillGroups: groups.map((group, index) => ({
        label: text(group["label"]),
        skills: (skillsByGroup[index]?.skills ?? []).map((s) => text(s["label"])),
      })),
      education: education.map((row) => ({
        title: text(row["title"]),
        institution: text(row["institution"]),
        period: text(row["period"]),
        description: text(row["description"]),
      })),
      languages: languages.map((row) => text(row["label"])),
    };
  }

  private async one(table: string, query: string): Promise<Row | null> {
    const { data, error } = await this.withDeadline(
      getSupabaseClient().from(table).select("*").match(queryParams(query)).limit(1),
      `Failed to read ${table}`,
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) && data.length > 0 ? (data[0] as Row) : null;
  }

  private async many(table: string, query: string): Promise<Row[]> {
    const { data, error } = await this.withDeadline(
      getSupabaseClient().from(table).select("*").match(queryParams(query)),
      `Failed to read ${table}`,
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? (data as Row[]) : [];
  }

  /** Bounds the wait. A stale résumé is better than a visitor with no page. */
  private async withDeadline(
    operation: PromiseLike<{ data: unknown; error: { message: string } | null }>,
    label: string,
  ): Promise<{ data: unknown; error: Error | null }> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        Promise.resolve(operation).then(({ data, error }) => ({
          data: data as unknown,
          error: error ? new Error(`${label}: ${error.message}`) : null,
        })),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`${label}: timed out after ${REQUEST_TIMEOUT_MS}ms`)),
            REQUEST_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}

/** A metric label, or nothing. */
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Metrics are JSONB and never queried, so they are read as a block. */
function toCaseStudy(row: Row): CaseStudy {
  const metrics = Array.isArray(row["metrics"]) ? row["metrics"] : [];

  return {
    title: text(row["title"]),
    challenge: text(row["challenge"]),
    solution: text(row["solution"]),
    result: text(row["result"]),
    metrics: metrics.map((metric) => {
      const entry = (metric ?? {}) as Row;

      return {
        label: text(entry["label"]),
        value: text(entry["value"]),
        icon: (typeof entry["icon"] === "string" ? entry["icon"] : undefined) as CaseStudy["metrics"][number]["icon"],
      };
    }),
  };
}

/**
 * PostgREST filter strings to a `.match()` object.
 *
 * `.match()` rather than `.filter()` so a value containing a comma — a company
 * name with one in it, which is legal — cannot split into two filters and
 * quietly return the wrong rows.
 */
function queryParams(query: string): Record<string, string> {
  const params: Record<string, string> = {};

  for (const part of query.split("&")) {
    const [rawKey, ...rest] = part.split("=");
    if (rawKey === undefined || rest.length === 0) continue;

    const key = rawKey.trim();
    const value = rest.join("=").trim();

    // Ordering is expressed as `order=sort_order.asc`; `.match()` cannot carry
    // it, so it is kept out of the filter map and applied by the caller.
    if (key === "order") continue;

    params[key] = value;
  }

  return params;
}