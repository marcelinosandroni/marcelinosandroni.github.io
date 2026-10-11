/**
 * Loads `.env.local` into `process.env` before anything reads it.
 *
 * `tsx` does not load `.env.local` the way `next dev` does, so without this the
 * script falls through to its defaults and PostgREST answers "Expected 3 parts
 * in JWT; got 1" for a key that is present on disk and correct. The error names
 * the token, not the environment, which sends you looking in the wrong place.
 *
 * Written by hand rather than pulling in dotenv: the file is `KEY=value` lines
 * with `#` comments, and a seeding script does not justify a dependency.
 */
function loadEnvLocal(): void {
  if (!existsSync(".env.local")) {
    return;
  }

  for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = raw.trim();

    if (line === "" || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    // A real environment variable wins, so CI and production are never
    // shadowed by a file that happens to be in the checkout.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// Imported after the environment is loaded, because these read it at module
// scope for their default endpoints.
import { existsSync, readFileSync } from "node:fs";

import { getResumeContent } from "../src/infrastructure/content";
import { getHomeContent } from "../src/infrastructure/content/home";
import { SUPPORTED_LOCALES, type Locale } from "../src/domain/i18n";

/**
 * Seeds the résumé tables from the typed catalog.
 *
 * ## Why the seed is a script and not part of the migration
 *
 * The typed catalog is the build-time fallback and the source of truth for what
 * these rows must contain. Generating the rows from it — rather than pasting
 * five thousand lines of SQL into a migration — means the two cannot drift: the
 * database is populated from the same objects the fallback serves, so
 * "the database says X" and "the fallback says X" are the same statement.
 *
 * It is also re-runnable and safe: every write upserts on the natural key, so
 * running it again refreshes the content rather than duplicating it. That
 * matters because this is the bridge between two sources, and a bridge that can
 * only be crossed once is not a bridge.
 *
 * ## What it deliberately does not seed
 *
 * Testimonials. A quote is a named person saying something true about working
 * with the owner, and inventing one would be fabricating a reference. The table
 * ships empty and stays empty until the owner adds a real one from `/admin`.
 *
 * Run with `npm run db:seed`.
 */

/** PostgREST endpoint, matching `docker-compose.supabase.yml`. */
function restUrl(): string {
  return process.env["SUPABASE_URL"] ?? "http://127.0.0.1:54321";
}

/**
 * The key the writes go through.
 *
 * The service key, not the anon key, and not by preference: the migration
 * revokes `insert`, `update` and `delete` from `anon` and `authenticated` and
 * creates no write policy at all, so a seed with the anon key fails with a
 * permission error rather than writing a partial document.
 */
function writeKey(): string {
  return process.env["SUPABASE_SECRET_KEY"] ?? "local-service-role-key";
}

/**
 * Reports a write failure and stops.
 *
 * PostgREST's error object nests the reason under `message`, `details` and
 * `hint`, and printing it with `String()` yields `[object Object]` — which is
 * useless at exactly the moment it is needed. So the fields are named.
 *
 * Exits rather than throwing: a half-applied seed is worse than none, because
 * the next run upserts and the tables look plausible while being incomplete.
 */
function fail(what: string, detail: unknown): never {
  const payload = detail as { message?: string; details?: string; hint?: string } | null;
  const reason =
    detail instanceof Error
      ? detail.message
      : [payload?.message, payload?.details, payload?.hint].filter(Boolean).join(" — ") ||
        String(detail);

  console.error(`\n${what}\n  ${reason}`);
  process.exit(1);
}

/**
 * PostgREST over `fetch`, not `supabase-js`.
 *
 * `supabase-js` v2.112 routes a single-row `insert`/`upsert` through a code
 * path this PostgREST build answers with `PGRST125 Invalid path specified in
 * request URL` — while the identical request via `fetch` returns 201. Rather
 * than pin a library version or debug its retry/negotiation behaviour for a
 * seeding script that runs once, this speaks the HTTP API directly. It is the
 * same wire format the client uses; only the caller differs.
 */
async function upsert(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const url = `${restUrl()}/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const key = writeKey();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // Merge on conflict is what makes the seed re-runnable: without it a
      // second run fails on the primary key instead of refreshing the rows.
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    fail(`Could not write ${table}`, await response.json().catch(() => response.statusText));
  }

  console.log(`  ${table}: ${rows.length}`);
}

/** One row by natural key, or `null`. */
async function selectOne(
  table: string,
  filters: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const key = writeKey();
  const query = new URLSearchParams({ ...filters, limit: "1" });

  const response = await fetch(`${restUrl()}/${table}?${query.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    fail(`Could not read ${table}`, await response.json().catch(() => response.statusText));
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;

  return rows[0] ?? null;
}

/** Many rows by filter, in an explicit order. */
async function selectMany(
  table: string,
  filters: Record<string, string>,
  order = "sort_order.asc",
): Promise<Array<Record<string, unknown>>> {
  const key = writeKey();
  const query = new URLSearchParams({ ...filters, order });

  const response = await fetch(`${restUrl()}/${table}?${query.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!response.ok) {
    fail(`Could not read ${table}`, await response.json().catch(() => response.statusText));
  }

  return (await response.json()) as Array<Record<string, unknown>>;
}

async function main(): Promise<void> {
  console.log(`Seeding ${restUrl()}\n`);

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`${locale}`);
    const resume = getResumeContent(locale);
    const home = getHomeContent(locale);

    // --- Profile -------------------------------------------------------
    await upsert(
      "resume_profile",
      [
        {
          locale,
          name: resume.name,
          title: resume.title,
          location: resume.location,
          phone: resume.contact.phone,
          email: resume.contact.email,
          linkedin: resume.contact.linkedin,
          summary: resume.summary,
        },
      ],
      "locale",
    );

    // --- Experience, then everything hanging off it --------------------
    await upsert(
      "resume_experience",
      resume.experiences.map((experience, index) => ({
        locale,
        company: experience.company,
        role: experience.role,
        period: experience.period,
        location: experience.location,
        summary: experience.summary,
        team_size: experience.teamSize ?? null,
        scope: experience.scope ?? "",
        sort_order: index,
        // Absent surfaces means "both". The typed content states no surfaces
        // today, so every role seeds to both and the admin narrows from there.
        surfaces: experience.surfaces ?? ["home", "resume"],
      })),
      "locale,company",
    );

    // Child rows need the parent's generated id, so they are read back by the
    // natural key rather than by an id we would have to guess.
    const experienceRows = await selectMany("resume_experience", { locale: `eq.${locale}` });
    const idFor = new Map(experienceRows.map((row) => [String(row["company"]), String(row["id"])]));

    for (const experience of resume.experiences) {
      const id = idFor.get(experience.company);

      if (id === undefined) {
        fail(`No row for ${experience.company}`, "the experience upsert did not create one");
      }

      await upsert(
        "resume_highlight",
        experience.highlights.map((body, order) => ({
          experience_id: id,
          locale,
          body,
          sort_order: order,
        })),
        "experience_id,locale,sort_order",
      );

      await upsert(
        "resume_technology",
        (experience.technologies ?? []).map((label, order) => ({
          experience_id: id,
          locale,
          label,
          sort_order: order,
        })),
        "experience_id,locale,sort_order",
      );

      await upsert(
        "resume_case_study",
        (experience.caseStudies ?? []).map((caseStudy, order) => ({
          experience_id: id,
          locale,
          title: caseStudy.title,
          challenge: caseStudy.challenge,
          solution: caseStudy.solution,
          result: caseStudy.result,
          metrics: caseStudy.metrics,
          sort_order: order,
        })),
        "experience_id,locale,sort_order",
      );
    }

    // --- Skills ---------------------------------------------------------
    for (const [order, group] of resume.skillGroups.entries()) {
      await upsert(
        "resume_skill_group",
        [{ locale, label: group.label, sort_order: order }],
        "locale,label",
      );

      const groupRow = await selectOne("resume_skill_group", {
        locale: `eq.${locale}`,
        label: `eq.${group.label}`,
      });

      const groupId = groupRow === null ? undefined : String(groupRow["id"]);

      if (groupId === undefined) {
        fail(`No group row for ${group.label}`, "the skill group upsert did not create one");
      }

      await upsert(
        "resume_skill",
        group.skills.map((label, skillOrder) => ({
          group_id: groupId,
          locale,
          label,
          sort_order: skillOrder,
        })),
        "group_id,locale,sort_order",
      );
    }

    // --- Education and languages ---------------------------------------
    await upsert(
      "resume_education",
      resume.education.map((entry, order) => ({
        locale,
        title: entry.title,
        institution: entry.institution,
        period: entry.period,
        description: entry.description,
        sort_order: order,
      })),
      "locale,title",
    );

    await upsert(
      "resume_language",
      resume.languages.map((label, order) => ({ locale, label, sort_order: order })),
      "locale,label",
    );

    // --- Home page tech stack ------------------------------------------
    for (const [order, cluster] of home.stack.clusters.entries()) {
      await upsert(
        "tech_stack_cluster",
        [
          {
            locale,
            slug: cluster.id,
            title: cluster.title,
            description: cluster.description,
            icon: cluster.icon,
            accent: cluster.accent,
            sort_order: order,
            surfaces: ["home"],
          },
        ],
        "locale,slug",
      );

      const clusterRow = await selectOne("tech_stack_cluster", {
        locale: `eq.${locale}`,
        slug: `eq.${cluster.id}`,
      });

      const clusterId = clusterRow === null ? undefined : String(clusterRow["id"]);

      if (clusterId === undefined) {
        fail(`No cluster row for ${cluster.id}`, "the cluster upsert did not create one");
      }

      await upsert(
        "tech_stack_item",
        cluster.items.map((label, itemOrder) => ({
          cluster_id: clusterId,
          locale,
          label,
          sort_order: itemOrder,
          surfaces: ["home"],
        })),
        "cluster_id,locale,sort_order",
      );
    }

    // --- Track record annotations --------------------------------------
    for (const [order, annotation] of home.trackRecord.annotations.entries()) {
      await upsert(
        "track_record_annotation",
        [
          {
            locale,
            company: annotation.company,
            impact_label: annotation.impact.label,
            impact_value: annotation.impact.value,
            impact_accent: annotation.impact.accent,
            blueprint_label: annotation.blueprintLabel,
            team_line: annotation.teamLine,
            sort_order: order,
            surfaces: ["home"],
          },
        ],
        "locale,company",
      );

      const annotationRow = await selectOne("track_record_annotation", {
        locale: `eq.${locale}`,
        company: `eq.${annotation.company}`,
      });

      const annotationId = annotationRow === null ? undefined : String(annotationRow["id"]);

      if (annotationId === undefined) {
        fail(`No annotation for ${annotation.company}`, "the annotation upsert created none");
      }

      await upsert(
        "track_record_blueprint",
        annotation.blueprint.map((label, itemOrder) => ({
          annotation_id: annotationId,
          locale,
          label,
          sort_order: itemOrder,
        })),
        "annotation_id,locale,sort_order",
      );
    }

    console.log("");
  }

  // Testimonials are intentionally absent. See the header.
  console.log("Testimonials: not seeded. Add real quotes from /admin.");
}

void main();