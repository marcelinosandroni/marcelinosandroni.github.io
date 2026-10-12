import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackCluster,
  HomeStackSection,
} from "@/domain/portfolio";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
  TechnologyCatalog,
} from "@/domain/resume/resume-repository";
import type { CaseStudy, ResumeContent, Surface } from "@/domain/resume/types";
import { toSurfaces } from "@/domain/resume/types";
import type { ResumeStackIndex } from "@/domain/resume/technology";
import { requireSupabaseReadConfig } from "@/infrastructure/supabase/server";

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

/** One technology's footprint, as the index stores it. */
type StackEntry = {
  experiences: string[];
  highlights: Array<{ company: string; index: number }>;
  caseStudies: Array<{ company: string; index: number }>;
  skills: Array<{ group: string; index: number }>;
};

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

    const stackIndex = await this.buildStackIndex(locale, detail, skillsByGroup);

    const built = this.toContent(
      locale,
      profile,
      experiences,
      detail,
      groups,
      skillsByGroup,
      education,
      languages,
      stackIndex,
    );

    return surface === "both" ? built : this.filterToSurface(built, surface);
  }

  /**
   * The catalog, for the admin's technology manager.
   *
   * Separate from `readResume` on purpose. The index is a *relation* view —
   * technology to positions in the document — and this is the *entity* view:
   * slugs, labels, aliases, categories, publish state. Folding one into the
   * other would make the résumé query carry columns the page does not render and
   * make the editor carry positions it cannot use.
   */
  async readTechnologyCatalog(locale: Locale): Promise<TechnologyCatalog> {
    const [categories, technologies] = await Promise.all([
      this.many("technology_category", `locale=eq.${locale}&order=sort_order.asc`),
      this.many("technology", `locale=eq.${locale}&order=sort_order.asc`),
    ]);

    const categoryById = new Map(categories.map((row) => [String(row["id"]), row]));

    return {
      categories: categories.map((row) => ({
        id: String(row["id"]),
        slug: text(row["slug"]),
        label: text(row["label"]),
        sortOrder: number(row["sort_order"]),
      })),
      technologies: technologies.map((row) => {
        const category = categoryById.get(String(row["category_id"]));

        return {
          id: String(row["id"]),
          slug: text(row["slug"]),
          label: text(row["label"]),
          categoryId: String(row["category_id"] ?? ""),
          categorySlug: category ? text(category["slug"]) : null,
          categoryLabel: category ? text(category["label"]) : null,
          aliases: Array.isArray(row["aliases"])
            ? (row["aliases"] as unknown[]).filter((a): a is string => typeof a === "string")
            : [],
          surfaces: toSurfaces(row["surfaces"] as string[] | null),
          isPublished: row["is_published"] !== false,
          sortOrder: number(row["sort_order"]),
        };
      }),
    };
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

  async readHomeStack(locale: Locale): Promise<HomeStackSection | null> {
    const clusters = await this.manyOnSurface(
      "tech_stack_cluster",
      `locale=eq.${locale}&order=sort_order.asc`,
      "home",
    );

    if (clusters.length === 0) {
      return null;
    }

    const withItems = await Promise.all(
      clusters.map(async (cluster) => ({
        cluster,
        items: await this.manyOnSurface(
          "tech_stack_item",
          `cluster_id=eq.${cluster["id"]}&locale=eq.${locale}&order=sort_order.asc`,
          "home",
        ),
      })),
    );

    return {
      id: "arsenal",
      // The kicker, title and note stay with the page's own copy rather than
      // the row: those are editorial, not facts, and the admin does not edit
      // the sentence that introduces a section.
      kicker: "",
      title: "",
      note: "",
      clusters: withItems.map(({ cluster, items }) => ({
        id: text(cluster["slug"]),
        title: text(cluster["title"]),
        description: text(cluster["description"]),
        icon: text(cluster["icon"]) as HomeStackCluster["icon"],
        accent: text(cluster["accent"]) as HomeStackCluster["accent"],
        // A chip marked résumé-only is absent here, which is the whole reason
        // `surfaces` exists on the item and not only on the cluster.
        items: items.map((item) => text(item["label"])),
      })),
    };
  }

  async readHomeTrackRecord(locale: Locale): Promise<HomeExperienceAnnotation[] | null> {
    const annotations = await this.manyOnSurface(
      "track_record_annotation",
      `locale=eq.${locale}&order=sort_order.asc`,
      "home",
    );

    if (annotations.length === 0) {
      return null;
    }

    return Promise.all(
      annotations.map(async (annotation) => {
        const blueprint = await this.many(
          "track_record_blueprint",
          `annotation_id=eq.${annotation["id"]}&locale=eq.${locale}&order=sort_order.asc`,
        );

        return {
          company: text(annotation["company"]),
          impact: {
            label: text(annotation["impact_label"]),
            value: text(annotation["impact_value"]),
            accent: text(annotation["impact_accent"]) as HomeExperienceAnnotation["impact"]["accent"],
          },
          blueprintLabel: text(annotation["blueprint_label"]),
          blueprint: blueprint.map((item) => text(item["label"])),
          teamLine: text(annotation["team_line"]),
        };
      }),
    );
  }
  /**
   * Drops the rows a surface does not show.
   *
   * Applied after assembly rather than in the query so the filter has one
   * definition. Pushing it into SQL would mean two queries per table and two
   * places for the rule to live, which is how a home page and a résumé end up
   * disagreeing about which roles exist.
   *
   * The stack index is rebuilt here rather than passed through, because it
   * addresses the document by *position*. A résumé-only role dropped from the
   * home page would shift every bullet after it, and an index still holding the
   * unfiltered positions would attribute a Kafka bullet to the wrong employer —
   * the worst possible failure for a page whose argument is that its claims are
   * checked.
   */
  private filterToSurface(content: ResumeContent, surface: "home" | "resume"): ResumeContent {
    const experiences = content.experiences.filter((experience) =>
      (experience.surfaces ?? ["home", "resume"]).includes(surface),
    );

    return {
      ...content,
      experiences,
      ...(content.stackIndex === undefined
        ? {}
        : { stackIndex: renumberStackIndex(content.stackIndex, experiences) }),
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
    stackIndex: ResumeStackIndex | undefined,
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
      ...(stackIndex === undefined ? {} : { stackIndex }),
    };
  }

  /**
   * Resolves which technologies appear where, in three batched reads.
   *
   * ## Why an index and not the relations on the rows
   *
   * The focused résumé asks one question — "for React, which roles and which
   * bullets?" — and this answers it with a map read. Building it once per read
   * rather than re-deriving it per consumer is what keeps the filter, the badge
   * and the PDF from disagreeing about what "focused on React" means.
   *
   * ## Why three queries and not one per parent
   *
   * The document has one query per experience per child table already. Adding
   * `highlight_technology` the same way would make a five-role résumé issue
   * fifteen round trips to render one page, on the path that a recruiter is
   * waiting for. PostgREST's `in.(...)` collapses each child table into a single
   * read, so the whole index costs three regardless of how long the career is.
   *
   * ## Why it can come back undefined
   *
   * A database that has not applied the catalog migration has no such tables,
   * and that is a *deployment* fact, not an empty résumé. Reporting "nothing is
   * tagged" would make an unapplied migration look like a document the owner
   * deliberately left untagged — and the focused view would then render almost
   * nothing, which is indistinguishable from a career that shrank.
   */
  private async buildStackIndex(
    locale: Locale,
    detail: Array<{ row: Row; highlights: Row[]; caseStudies: Row[]; technologies: Row[] }>,
    skillsByGroup: Array<{ group: Row; skills: Row[] }>,
  ): Promise<ResumeStackIndex | undefined> {
    const technologies = await this.many("technology", `locale=eq.${locale}`).catch(() => null);

    if (technologies === null) {
      return undefined;
    }

    const slugById = new Map(technologies.map((row) => [String(row["id"]), text(row["slug"])]));
    const byTechnology: Record<string, StackEntry> = {};

    const add = (slug: string, mutate: (entry: StackEntry) => void): void => {
      const entry = (byTechnology[slug] ??= {
        experiences: [],
        highlights: [],
        caseStudies: [],
        skills: [],
      });

      mutate(entry);
    };

    /*
      Experience → technology comes from the chip rows themselves, which is why
      this needs no extra read: `resume_technology.technology_id` is on a row
      already fetched above.
    */
    for (const entry of detail) {
      const company = text(entry.row["company"]);

      for (const chip of entry.technologies) {
        const slug = chip["technology_id"] ? slugById.get(String(chip["technology_id"])) : undefined;

        if (slug) {
          add(slug, (bucket) => bucket.experiences.push(company));
        }
      }
    }

    const highlightIds = detail.flatMap((entry) => entry.highlights.map((h) => String(h["id"])));
    const caseStudyIds = detail.flatMap((entry) => entry.caseStudies.map((c) => String(c["id"])));

    const [highlightLinks, caseStudyLinks] = await Promise.all([
      highlightIds.length === 0
        ? Promise.resolve([] as Row[])
        : this.many("highlight_technology", `highlight_id=in.(${highlightIds.join(",")})`).catch(() => [] as Row[]),
      caseStudyIds.length === 0
        ? Promise.resolve([] as Row[])
        : this.many("case_study_technology", `case_study_id=in.(${caseStudyIds.join(",")})`).catch(() => [] as Row[]),
    ]);

    /*
      Positions are resolved from the *fetched order* rather than `sort_order`
      read back from the database, because the index has to address the array the
      renderer is about to walk. `sort_order` and array position agree here —
      both queries order by it — but the index would silently point at the wrong
      bullet the moment they diverged, so it is built from the array.
    */
    const companyByHighlightId = new Map<string, string>();
    const companyByCaseStudyId = new Map<string, string>();

    detail.forEach((entry) => {
      const company = text(entry.row["company"]);

      entry.highlights.forEach((row, index) => {
        companyByHighlightId.set(String(row["id"]), `${company} ${index}`);
      });

      entry.caseStudies.forEach((row, index) => {
        companyByCaseStudyId.set(String(row["id"]), `${company} ${index}`);
      });
    });

    for (const link of highlightLinks) {
      const slug = slugById.get(String(link["technology_id"]));

      if (!slug) {
        continue;
      }

      const where = companyByHighlightId.get(String(link["highlight_id"]));

      if (!where) {
        continue;
      }

      const [company, rawIndex] = where.split(" ");
      const index = Number(rawIndex);

      add(slug, (bucket) => bucket.highlights.push({ company, index }));
    }

    for (const link of caseStudyLinks) {
      const slug = slugById.get(String(link["technology_id"]));

      if (!slug) {
        continue;
      }

      const where = companyByCaseStudyId.get(String(link["case_study_id"]));

      if (!where) {
        continue;
      }

      const [company, rawIndex] = where.split(" ");
      const index = Number(rawIndex);

      add(slug, (bucket) => bucket.caseStudies.push({ company, index }));
    }

    // Skill → technology is a column on rows already fetched; no read at all.
    for (const { group, skills } of skillsByGroup) {
      const label = text(group["label"]);

      skills.forEach((skill, index) => {
        const slug = skill["technology_id"] ? slugById.get(String(skill["technology_id"])) : undefined;

        if (slug) {
          add(slug, (bucket) => bucket.skills.push({ group: label, index }));
        }
      });
    }

    return { byTechnology };
  }

  /**
   * Reads rows over PostgREST directly.
   *
   * `supabase-js` answers `PGRST125 Invalid path specified in request URL`
   * against this PostgREST build for the filtered selects this repository needs,
   * while the identical request via `fetch` returns 200. Measured, not
   * assumed — the seeding script hit the same thing and the fallback path hid
   * it here until a value in the database failed to appear on the page.
   *
   * So this speaks the HTTP API rather than the client. It is the same wire
   * format; only the caller differs, and the alternative is an adapter that
   * silently never reads the database.
   */
  private async one(table: string, query: string): Promise<Row | null> {
    const rows = await this.read(table, queryParams(query), 1);
    return rows[0] ?? null;
  }

  /**
   * `order` and any extra `contains` filters are appended to the filter map
   * rather than smuggled into `query`, so the surface filter is an explicit
   * argument and not something a future edit has to notice inside a string.
   */
  private async many(table: string, query: string, ...extraFilters: string[]): Promise<Row[]> {
    const params: Record<string, string> = {
      ...queryParams(query),
      ...Object.fromEntries(extraFilters.map((filter) => filter.split("="))),
    };

    return this.read(table, params);
  }

  private async read(
    table: string,
    filters: Record<string, string>,
    limit?: number,
  ): Promise<Row[]> {
    const { publishableKey } = requireSupabaseReadConfig();

    /*
      `order` is the one filter that is not an equality match, so it is kept out
      of the equality map and sent as its own query parameter.
    */
    const { order, ...equality } = filters;
    const params = new URLSearchParams(equality);

    if (order !== undefined) {
      params.set("order", order);
    }

    if (limit !== undefined) {
      params.set("limit", String(limit));
    }

    const { data, error } = await this.withDeadline(
      fetch(`${requireSupabaseReadConfig().url}/${table}?${params.toString()}`, {
        headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
      }).then(async (response) => {
        if (!response.ok) {
          return { data: null, error: new Error(`${response.status} ${await response.text()}`) };
        }

        return { data: (await response.json()) as unknown, error: null };
      }),
      `Failed to read ${table}`,
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? (data as Row[]) : [];
  }

  /**
   * Reads rows and keeps only those visible on a surface.
   *
   * The membership test happens here rather than as a `contains` filter in the
   * query. PostgREST answers `PGRST108 'contains' is not an embedded resource
   * in this request` for a scalar enum array on the version this project pins —
   * with `select=*`, with the column named, and with the filter in the URL — so
   * the server-side form is simply unavailable here.
   *
   * Filtering in the adapter is also the honest place for it: the rule "an item
   * appears on the home page if its surfaces say so" belongs with the code that
   * reads the rows, not in a query string that a database upgrade can silently
   * invalidate. The row counts here are a page's worth of chips, so there is
   * nothing to gain from pushing it down.
   */
  private async manyOnSurface(
    table: string,
    query: string,
    surface: Surface,
  ): Promise<Row[]> {
    const rows = await this.many(table, query);

    return rows.filter((row) => toSurfaces(row["surfaces"] as string[] | null).includes(surface));
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
/**
 * Re-addresses the stack index after the document has been filtered.
 *
 * The index points at `index` within a company's highlights; the surviving
 * document may hold a different subset of them. So every entry is dropped when
 * its company went away, and re-indexed against the surviving array.
 *
 * Skills are untouched because the surface filter only removes experiences — but
 * the function maps them anyway rather than assuming, so a future filter that
 * also narrows the skills section cannot silently ship wrong positions.
 */
function renumberStackIndex(
  index: ResumeStackIndex,
  experiences: ReadonlyArray<{ company: string; highlights: string[]; caseStudies?: { title: string }[] }>,
): ResumeStackIndex {
  const position = new Map<string, { highlights: number[]; caseStudies: number[] }>();

  experiences.forEach((experience) => {
    position.set(experience.company, {
      highlights: experience.highlights.map((_, at) => at),
      caseStudies: (experience.caseStudies ?? []).map((_, at) => at),
    });
  });

  const byTechnology: Record<string, StackEntry> = {};

  for (const [slug, entry] of Object.entries(index.byTechnology)) {
    const kept: StackEntry = {
      experiences: entry.experiences.filter((company) => position.has(company)),
      highlights: [],
      caseStudies: [],
      skills: [...entry.skills],
    };

    for (const { company, index: at } of entry.highlights) {
      const target = position.get(company)?.highlights[at];

      if (target !== undefined) {
        kept.highlights.push({ company, index: target });
      }
    }

    for (const { company, index: at } of entry.caseStudies) {
      const target = position.get(company)?.caseStudies[at];

      if (target !== undefined) {
        kept.caseStudies.push({ company, index: target });
      }
    }

    byTechnology[slug] = kept;
  }

  return { byTechnology };
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A number from a database column, defaulting rather than producing NaN. */
function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

    params[rawKey.trim()] = rest.join("=").trim();
  }

  return params;
}