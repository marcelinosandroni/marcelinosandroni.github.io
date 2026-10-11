import { requireSupabaseConfig, supabaseReadConfigFromEnv } from "@/infrastructure/supabase/server";
import { LOCALE_SEGMENTS, SUPPORTED_LOCALES, type Locale } from "@/domain/i18n";
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
  | "resume_testimonial";

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
]);

export type ResumeWrite =
  | { kind: "update"; table: WritableTable; id: string; values: Record<string, unknown> }
  | { kind: "insert"; table: WritableTable; values: Record<string, unknown> }
  | { kind: "delete"; table: WritableTable; id: string };

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
): Promise<{ affected: number }> {
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

  if (write.kind === "delete") {
    response = await fetch(`${endpoint}?id=eq.${encodeURIComponent(write.id)}`, {
      method: "DELETE",
      headers,
    });
  } else if (write.kind === "insert") {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal,resolution=merge-duplicates" },
      body: JSON.stringify([write.values]),
    });
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

  return { affected: 1 };
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