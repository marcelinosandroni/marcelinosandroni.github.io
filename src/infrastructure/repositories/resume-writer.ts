import { requireSupabaseConfig, supabaseReadConfigFromEnv } from "@/infrastructure/supabase/server";
import { LOCALE_SEGMENTS, SUPPORTED_LOCALES, type Locale } from "@/domain/i18n";
import type {
  TechnologyCatalogEntry,
  TechnologyCategory,
} from "@/domain/resume/resume-repository";
import type { Surface } from "@/domain/resume/types";
import { toSurfaces } from "@/domain/resume/types";

/**
 * Owner-only writes to the résumé tables.
 *
 * ## Why this is not the read adapter
 *
 * Reads go through the publishable key and are subject to row level security;
 * this bypasses it. Mixing the two would either mean the read path holding a
 * credential that can defeat its own policies, or the write path paying for
 * policies the migration already refuses to define.
 *
 * The migration revokes `insert`, `update` and `delete` from `anon` and
 * `authenticated` and creates no write policy at all, so the publishable key
 * *cannot* write — there is nothing to be tempted with. The secret key is used
 * here and only here.
 *
 * ## Every write revalidates
 *
 * `revalidatePath` is called after every successful mutation. The pages are
 * statically generated with a one-hour revalidation window, so without it an
 * owner edit would not appear until the window elapsed — which is the exact
 * problem moving the content into the database was meant to solve.
 */

/** Tables the owner may write. Anything else is refused by name. */
export type WritableTable =
  | "resume_profile"
  | "resume_experience"
  | "resume_highlight"
  | "resume_case_study"
  | "resume_technology"
  | "resume_skill_group"
  | "resume_skill"
  | "resume_education"
  | "resume_language"
  | "tech_stack_cluster"
  | "tech_stack_item"
  | "track_record_annotation"
  | "track_record_blueprint"
  | "resume_testimonial"
  /*
    The technology catalog and its links.

    `technology` and `technology_category` are the entities every other row now
    points at, so they are writable here for the same reason `resume_experience`
    is. The three join tables are included so the admin can tag a bullet or a
    case study with a stack — which is the write that makes a targeted résumé
    possible at all, and without it the catalog would be a list nobody could
    attach anything to.
  */
  | "technology"
  | "technology_category"
  | "highlight_technology"
  | "case_study_technology"
  | "case_study_media";

const WRITABLE: ReadonlySet<string> = new Set<WritableTable>([
  "resume_profile",
  "resume_experience",
  "resume_highlight",
  "resume_case_study",
  "resume_technology",
  "resume_skill_group",
  "resume_skill",
  "resume_education",
  "resume_language",
  "tech_stack_cluster",
  "tech_stack_item",
  "track_record_annotation",
  "track_record_blueprint",
  "resume_testimonial",
  "technology",
  "technology_category",
  "highlight_technology",
  "case_study_technology",
  "case_study_media",
]);

export type ResumeWrite =
  | { kind: "update"; table: WritableTable; id: string; values: Record<string, unknown> }
  | { kind: "insert"; table: WritableTable; values: Record<string, unknown> }
  | { kind: "delete"; table: WritableTable; id: string }
  /*
    Delete by column values rather than by primary key.

    Added for the join tables, and it exists because they have no single-column
    primary key to delete by: `highlight_technology` is
    `(highlight_id, technology_id)`. Without this the only way to untag a bullet
    would be to read the row's id — which it does not have — so the feature the
    whole catalog exists to enable, tagging a bullet with the stacks it
    describes, would be writable but not reversible.
  */
  | { kind: "deleteWhere"; table: WritableTable; filters: Record<string, string> };

export class ResumeWriteError extends Error {
  constructor(
    readonly reason: string,
    readonly status: number,
  ) {
    super(reason);
  }
}

/**
 * Applies one write and revalidates whatever it could have changed.
 *
 * Revalidation is deliberately broad rather than surgical: a résumé edit can
 * reach the home page, the résumé and both locales at once, and a stale page is
 * worse than a redundant revalidation. This is an owner action measured in
 * dozens per year, not a hot path.
 */
export async function applyResumeWrite(
  write: ResumeWrite,
  revalidate: (path: string, type: "page" | "layout") => void,
): Promise<{ affected: number; entry?: Record<string, unknown> }> {
  const { url, secretKey } = requireSupabaseConfig();

  if (!WRITABLE.has(write.table)) {
    throw new ResumeWriteError("table_not_writable", 400);
  }

  const endpoint = `${url}/${write.table}`;
  const headers = {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  let response: Response;
  let entry: Record<string, unknown> | undefined;

  if (write.kind === "deleteWhere") {
    /*
      Refuses an empty filter set outright.

      A `DELETE` with no `WHERE` is `TRUNCATE` in everything but syntax, and this
      module writes to the document of record with no undo and no version
      history. A malformed request arriving with `filters: {}` must fail at the
      boundary rather than empty `highlight_technology` and silently return every
      bullet on the site to untagged.
    */
    const entries = Object.entries(write.filters);

    if (entries.length === 0) {
      throw new ResumeWriteError("delete_needs_a_filter", 400);
    }

    const query = entries
      .map(([column, value]) => `${column}=eq.${encodeURIComponent(value)}`)
      .join("&");

    response = await fetch(`${endpoint}?${query}`, { method: "DELETE", headers });
  } else if (write.kind === "delete") {
    response = await fetch(`${endpoint}?id=eq.${encodeURIComponent(write.id)}`, {
      method: "DELETE",
      headers,
    });
  } else if (write.kind === "insert") {
    /*
      `return=representation`, not `return=minimal`, because the editor needs the
      id the database assigned.

      Without it a newly created technology has no id in the editor's hands, and
      the two choices are both bad: re-reading the catalog is a second round trip
      that can disagree with the row just written, and a client-side id is a guess
      that silently attaches later links to nothing.
    */
    response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify([write.values]),
    });

    if (response.ok) {
      const written = (await response.json().catch(() => [])) as unknown;

      if (Array.isArray(written) && written.length > 0) {
        entry = written[0] as Record<string, unknown>;
      }
    }
  } else {
    response = await fetch(`${endpoint}?id=eq.${encodeURIComponent(write.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(write.values),
    });
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}) as { message?: string });
    console.error(`[admin] ${write.kind} on ${write.table} failed:`, detail);

    throw new ResumeWriteError(detail.message ?? "write_failed", response.status >= 500 ? 503 : 400);
  }

  /*
    Revalidated per locale rather than per segment.

    `revalidatePath("/[locale]")` without a `type` is a no-op on a dynamic
    segment — Next.js warns and discards it, which was measured here rather than
    assumed. Naming a concrete path with `"page"` is what actually purges the
    cached HTML, and a concrete path means naming the locales too, so the
    segment list is passed in rather than guessed at inside this module.
  */
  for (const path of resumePaths()) {
    revalidate(path, "page");
  }

  return entry === undefined ? { affected: 1 } : { affected: 1, entry };
}

/**
 * Every concrete page an edit can change: both routes, in every locale.
 *
 * Derived from `LOCALE_SEGMENTS` rather than written out, because a literal list
 * is one more thing to forget when a locale is added — and forgetting it means
 * the new locale's résumé shows yesterday's content until the revalidation
 * window elapses, with nothing in the logs to say why.
 *
 * `revalidatePath("/[locale]")` without a `type` would have covered this in one
 * call, except that on a dynamic segment it is a no-op: Next.js warns and
 * discards it. That was measured here, not assumed.
 */
function resumePaths(): string[] {
  return SUPPORTED_LOCALES.flatMap((locale) => {
    const segment = LOCALE_SEGMENTS[locale];

    return [`/${segment}`, `/${segment}/resume`];
  });
}

/** Surfaces an owner may assign, for the editor's checkboxes. */
export const EDITABLE_SURFACES: readonly Surface[] = ["home", "resume"];

/** The locale the editor itself is written in. */
export const RESUME_EDITOR_LOCALE: Locale = "pt-BR";

/** One chip as the editor sees it. */
export type EditorChip = { id: string; label: string; surfaces: Surface[] };

/** One cluster as the editor sees it. */
export type EditorCluster = { id: string; title: string; items: EditorChip[] };

/**
 * The stack as the editor needs it.
 *
 * Deliberately **unfiltered by surface**. The public read path hides a chip that
 * is résumé-only, which is correct for a reader and useless here: the chip the
 * owner removed from the home page would disappear from the editor too, and
 * there would be no way to put it back without a database edit.
 *
 * So this reads the rows directly, with their `surfaces` intact, and the editor
 * shows the checkbox state that produced the current rendering rather than the
 * rendering itself.
 *
 * `null` when Supabase is not configured, so the panel can say so rather than
 * rendering an empty editor that looks like "you have no stack".
 */
export async function readStackForEditor(locale: Locale): Promise<EditorCluster[] | null> {
  const config = supabaseReadConfigFromEnv();

  if (!config.configured) {
    return null;
  }

  const rows = await fetchRows(
    config.url,
    config.publishableKey,
    "tech_stack_cluster",
    { locale: `eq.${locale}` },
  );

  const clusters = await Promise.all(
    rows.map(async (cluster) => {
      const items = await fetchRows(
        config.url,
        config.publishableKey,
        "tech_stack_item",
        { cluster_id: `eq.${cluster["id"]}`, locale: `eq.${locale}`, order: "sort_order.asc" },
      );

      return {
        id: String(cluster["slug"] ?? cluster["id"]),
        title: String(cluster["title"] ?? ""),
        items: items.map((item) => ({
          id: String(item["id"]),
          label: String(item["label"] ?? ""),
          surfaces: toSurfaces(item["surfaces"] as string[] | null),
        })),
      };
    }),
  );

  return clusters;
}

/** One read, bounded. Failing loudly is right here: the editor must not lie. */

/** A bullet as the editor needs it, with the stacks it describes. */
export type EditorHighlight = {
  id: string;
  body: string;
  sortOrder: number;
  technologyIds: string[];
};

/** A case study as the editor needs it: text, metrics, stack and imagery. */
export type EditorCaseStudy = {
  id: string;
  title: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: Array<{ label: string; value: string; icon?: string }>;
  sortOrder: number;
  technologyIds: string[];
  media: EditorMedia[];
};

/** One optional image. Zero rows is the normal case and renders nothing. */
export type EditorMedia = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  sortOrder: number;
  surfaces: Surface[];
};

/** One role, with everything under it. */
export type EditorExperience = {
  id: string;
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  teamSize: number | null;
  scope: string;
  sortOrder: number;
  surfaces: Surface[];
  highlights: EditorHighlight[];
  caseStudies: EditorCaseStudy[];
  technologies: Array<{ id: string; label: string; sortOrder: number; technologyId: string | null }>;
};

/**
 * The whole editable document, plus the catalog to tag it with.
 *
 * ## Why one read and not one per row
 *
 * The editor renders every role, every bullet and every case study at once, in
 * one screen the owner works down. Assembled row by row that is well over a
 * hundred round trips against a local database that is three container hops away,
 * and the owner would sit there watching it.
 *
 * ## Why the catalog travels with it
 *
 * Because the pickers need it on the same render. A second fetch would show a
 * bullet list built from one moment and a technology list from another, and the
 * result is a chip that cannot be untagged because the option it refers to had
 * not loaded yet.
 */
export type ExperienceEditorDocument = {
  experiences: EditorExperience[];
  catalog: { categories: TechnologyCategory[]; technologies: TechnologyCatalogEntry[] };
};

export async function readExperienceEditor(locale: Locale): Promise<ExperienceEditorDocument | null> {
  const config = supabaseReadConfigFromEnv();

  if (!config.configured) {
    return null;
  }

  const { url, publishableKey: key } = config;

  const experiences = await fetchRows(url, key, "resume_experience", {
    locale: `eq.${locale}`,
    order: "sort_order.asc",
  });

  /*
    One query per child table, addressed by `in.(...)` over every id in the
    document.

    A `child` call with an empty list is skipped rather than sent as a filter
    that matches nothing: PostgREST has no `in.()` empty form, and a filter that
    was dropped because it was "empty" would silently widen to the whole table —
    so every bullet on the site could appear under one case study.
  */
  const child = async <T>(table: string, column: string, values: string[]): Promise<T[]> =>
    values.length === 0
      ? []
      : ((await fetchRows(url, key, table, {
          [column]: `in.(${values.join(",")})`,
        })) as T[]);

  const detail = await Promise.all(
    experiences.map(async (experience) => {
      const id = String(experience["id"]);

      return {
        experience,
        highlights: await fetchRows(url, key, "resume_highlight", {
          experience_id: `eq.${id}`,
          locale: `eq.${locale}`,
          order: "sort_order.asc",
        }),
        caseStudies: await fetchRows(url, key, "resume_case_study", {
          experience_id: `eq.${id}`,
          locale: `eq.${locale}`,
          order: "sort_order.asc",
        }),
        technologies: await fetchRows(url, key, "resume_technology", {
          experience_id: `eq.${id}`,
          locale: `eq.${locale}`,
          order: "sort_order.asc",
        }),
      };
    }),
  );

  const highlightIds = detail.flatMap((entry) => entry.highlights.map((row) => String(row["id"])));
  const caseStudyIds = detail.flatMap((entry) => entry.caseStudies.map((row) => String(row["id"])));

  const [highlightLinks, caseStudyLinks, media, categories, technologies] = await Promise.all([
    child<Record<string, unknown>>("highlight_technology", "highlight_id", highlightIds),
    child<Record<string, unknown>>("case_study_technology", "case_study_id", caseStudyIds),
    child<Record<string, unknown>>("case_study_media", "case_study_id", caseStudyIds),
    fetchRows(url, key, "technology_category", { locale: `eq.${locale}`, order: "sort_order.asc" }),
    fetchRows(url, key, "technology", { locale: `eq.${locale}`, order: "sort_order.asc" }),
  ]);

  const linksFor = (links: Array<Record<string, unknown>>, column: string, id: string): string[] =>
    links
      .filter((link) => String(link[column]) === id)
      .map((link) => String(link["technology_id"]))
      .filter((value) => value !== "undefined" && value !== "null");

  return {
    experiences: detail.map(({ experience, highlights, caseStudies, technologies: chips }) => ({
      id: String(experience["id"]),
      company: String(experience["company"] ?? ""),
      role: String(experience["role"] ?? ""),
      period: String(experience["period"] ?? ""),
      location: String(experience["location"] ?? ""),
      summary: String(experience["summary"] ?? ""),
      teamSize: typeof experience["team_size"] === "number" ? experience["team_size"] : null,
      scope: String(experience["scope"] ?? ""),
      sortOrder: number(experience["sort_order"]),
      surfaces: toSurfaces(experience["surfaces"] as string[] | null),
      highlights: highlights.map((row, index) => ({
        id: String(row["id"]),
        body: String(row["body"] ?? ""),
        sortOrder: typeof row["sort_order"] === "number" ? row["sort_order"] : index,
        technologyIds: linksFor(highlightLinks, "highlight_id", String(row["id"])),
      })),
      caseStudies: caseStudies.map((row, index) => {
        const id = String(row["id"]);

        return {
          id,
          title: String(row["title"] ?? ""),
          challenge: String(row["challenge"] ?? ""),
          solution: String(row["solution"] ?? ""),
          result: String(row["result"] ?? ""),
          metrics: readMetrics(row["metrics"]),
          sortOrder: typeof row["sort_order"] === "number" ? row["sort_order"] : index,
          technologyIds: linksFor(caseStudyLinks, "case_study_id", id),
          media: media
            .filter((row2) => String(row2["case_study_id"]) === id)
            .map((row2, at) => ({
              id: String(row2["id"]),
              url: String(row2["url"] ?? ""),
              alt: String(row2["alt"] ?? ""),
              caption: String(row2["caption"] ?? ""),
              sortOrder: typeof row2["sort_order"] === "number" ? row2["sort_order"] : at,
              surfaces: toSurfaces(row2["surfaces"] as string[] | null),
            })),
        };
      }),
      technologies: chips.map((row, index) => ({
        id: String(row["id"]),
        label: String(row["label"] ?? ""),
        sortOrder: typeof row["sort_order"] === "number" ? row["sort_order"] : index,
        technologyId:
          typeof row["technology_id"] === "string" && row["technology_id"] !== ""
            ? row["technology_id"]
            : null,
      })),
    })),
    catalog: {
      categories: categories.map((row) => ({
        id: String(row["id"]),
        slug: String(row["slug"] ?? ""),
        label: String(row["label"] ?? ""),
        sortOrder: number(row["sort_order"]),
      })),
      technologies: technologies.map((row) => ({
        id: String(row["id"]),
        slug: String(row["slug"] ?? ""),
        label: String(row["label"] ?? ""),
        categoryId: String(row["category_id"] ?? ""),
        categorySlug: null,
        categoryLabel: null,
        aliases: Array.isArray(row["aliases"])
          ? (row["aliases"] as unknown[]).filter((a): a is string => typeof a === "string")
          : [],
        surfaces: toSurfaces(row["surfaces"] as string[] | null),
        isPublished: row["is_published"] !== false,
        sortOrder: number(row["sort_order"]),
        kind: null,
        description: String(row["description"] ?? ""),
      })),
    },
  };
}

/** Metrics are JSONB; a malformed array must not take the editor down. */
function readMetrics(value: unknown): Array<{ label: string; value: string; icon?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => entry as Record<string, unknown>)
    .map((entry) => ({
      label: String(entry["label"] ?? ""),
      value: String(entry["value"] ?? ""),
      ...(typeof entry["icon"] === "string" ? { icon: entry["icon"] } : {}),
    }));
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function fetchRows(
  url: string,
  key: string,
  table: string,
  filters: Record<string, string>,
): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${url}/${table}?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    throw new Error(`${table}: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as unknown;

  return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
}