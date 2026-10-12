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
import { technologySlug } from "../src/domain/resume/technology";
import { RELATIONS, classifyKind, describe, normalizeLabel } from "./technology-descriptions";
import { CATEGORIES, FALLBACK_CATEGORY, LANGUAGES, classify, sameTool } from "./technology-taxonomy";
import { SUPPORTED_LOCALES, type Locale } from "../src/domain/i18n";

/**
 * Bootstraps the résumé tables from the typed catalog.
 *
 * ## What this is, and is not
 *
 * **Not a migration.** Migrations own the schema and never touch rows — this
 * project has no `drop table`, `truncate` or `delete` in any migration, and
 * `tests/unit/publication/migration-safety.test.ts` fails the build if one
 * appears. So applying a migration cannot lose anything.
 *
 * **A bootstrap, not a sync.** It fills an empty database from the typed catalog
 * and thereafter only inserts rows that are genuinely absent — `ignore-duplicates`,
 * never `merge-duplicates`. Running it after the owner has edited anything in
 * `/admin` changes nothing, because there is nothing missing to add.
 *
 * That distinction is the whole design. It was previously an upsert, which
 * *overwrote* on conflict: the owner edits a job title in the admin panel,
 * someone runs the seed, and the old title comes back — silently, with a green
 * exit code. A database the owner edits and a script that overwrites it cannot
 * both be true, and since moving the content into the database was the point,
 * the script is the part that yields.
 *
 * ## Why the seed is a script and not part of the migration
 *
 * The typed catalog is the build-time fallback. Generating the rows from it —
 * rather than pasting five thousand lines of SQL — means the two start in
 * agreement instead of starting in an argument nobody notices.
 *
 * ## What it deliberately does not seed
 *
 * Testimonials. A quote is a named person saying something true about working
 * with the owner, and inventing one would be fabricating a reference. The table
 * ships empty and stays empty until the owner adds a real one from `/admin`.
 *
 * Run with `npm run db:bootstrap`.
 */

/** PostgREST endpoint, matching `docker-compose.supabase.yml`. */
function restUrl(): string {
  return process.env["SUPABASE_URL"] ?? "http://127.0.0.1:54330";
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
 * Inserts rows that are missing, and **never touches a row that exists**.
 *
 * ## Why `ignore-duplicates` and not `merge-duplicates`
 *
 * This used to be `merge-duplicates`, which *overwrites* on conflict. That made
 * the script silently revert every edit made from `/admin`: the owner changes a
 * job title in the admin panel, someone runs the bootstrap, and the old title is
 * back — with no error and a green exit code.
 *
 * A database the owner edits and a script that overwrites it cannot both be
 * true. Since making the database the source of truth was the point, the script
 * is the part that yields.
 *
 * `ignore-duplicates` makes this a **bootstrap, not a sync**: it fills an empty
 * database from the typed catalog and thereafter only adds rows that are
 * genuinely absent.
 *
 * ## Why `return=representation`
 *
 * So the count is real. With `return=minimal` PostgREST reports success for the
 * whole batch and the only honest number available is how many rows were *sent* —
 * which reported "602 inserted" against a database where 602 rows already
 * existed and nothing was added. With `return=representation` a duplicate is
 * skipped and not returned, so the response length is the number actually
 * written. Verified against this PostgREST, not assumed.
 */
async function insertMissing(
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
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    fail(`Could not write ${table}`, await response.json().catch(() => response.statusText));
  }

  const written = (await response.json().catch(() => [])) as unknown[];
  const added = Array.isArray(written) ? written.length : 0;

  inserted += added;
  offered += rows.length;
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

/**
 * Rows this run actually wrote, and rows it offered.
 *
 * Two numbers because one is not enough to read. "0 inserted, 602 already
 * present" says the bootstrap had nothing to add to a populated database;
 * "602 inserted, 0 already present" says it just built one. A single counter
 * conflates the two, which is how this script reported a no-op as six hundred
 * and two writes.
 */
let inserted = 0;
let offered = 0;

async function main(): Promise<void> {
  console.log(`Bootstrapping ${restUrl()}\n`);

  /*
    A populated database is a warning, not an error.

    `ignore-duplicates` means nothing here can be overwritten, so running this
    against a database the owner has edited is safe — and worth doing, because a
    row added to the typed catalog but not yet to the database is a gap the
    bootstrap should close. What it must not do is *look* like it re-seeded.
  */
  const existing = await selectMany("resume_experience", { locale: "eq.en-US" });

  if (existing.length > 0) {
    console.log(
      `This database already has ${existing.length} experience rows. Nothing will be\n` +
        `overwritten; only genuinely missing rows are added.\n`,
    );
  }

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`${locale}`);
    const resume = getResumeContent(locale);
    const home = getHomeContent(locale);

    // --- Profile -------------------------------------------------------
    await insertMissing(
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
    await insertMissing(
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

      await insertMissing(
        "resume_highlight",
        experience.highlights.map((body, order) => ({
          experience_id: id,
          locale,
          body,
          sort_order: order,
        })),
        "experience_id,locale,sort_order",
      );

      await insertMissing(
        "resume_technology",
        (experience.technologies ?? []).map((label, order) => ({
          experience_id: id,
          locale,
          label,
          sort_order: order,
        })),
        "experience_id,locale,sort_order",
      );

      await insertMissing(
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
      await insertMissing(
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

      await insertMissing(
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
    await insertMissing(
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

    await insertMissing(
      "resume_language",
      resume.languages.map((label, order) => ({ locale, label, sort_order: order })),
      "locale,label",
    );

    // --- Home page tech stack ------------------------------------------
    for (const [order, cluster] of home.stack.clusters.entries()) {
      await insertMissing(
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

      await insertMissing(
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
      await insertMissing(
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

      await insertMissing(
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

  /*
    After the document, because the catalog is derived from it.

    Every technology row is inferred from a label the owner already wrote, so
    there is nothing to insert until the chips and skills exist. Running it
    earlier would read an empty document and build an empty catalog — and an
    empty catalog is a failure state that looks like success, since the seed
    would report rows written.
  */
  for (const locale of SUPPORTED_LOCALES) {
    await bootstrapTechnologyCatalog(locale);
  }

  /*
    The numbers that distinguish a bootstrap from a no-op.

    Printed because "the command succeeded" and "the database now holds your
    résumé" are different sentences, and a contributor who has been editing
    their content needs to be able to tell at a glance which one just happened.
  */
  console.log(`${inserted} inserted, ${offered - inserted} already present (of ${offered} offered).`);
  console.log("Nothing was overwritten. Testimonials are never bootstrapped —");
  console.log("add real quotes from /admin.");
}

/**
 * Turns the flat chip and skill labels into catalog rows, and links them.
 *
 * ## Why this runs after the document, and links in a second pass
 *
 * A technology's id does not exist until its row is inserted, and the rows to
 * link are in tables the document pass just wrote. So: insert, read back the
 * ids, then link. Two passes rather than one because `ignore-duplicates` returns
 * only the rows it actually wrote — on a populated database that is none of
 * them, so the ids have to be read rather than captured.
 *
 * ## Why the link is by label, not by slug comparison
 *
 * The label is the only thing both sides share. A chip says "Java Spring Boot"
 * and a catalog row says "Java Spring Boot"; matching on normalised text finds
 * them regardless of which row was created first or what the owner has since
 * renamed the slug to.
 *
 * ## Why linking does not use `insertMissing`
 *
 * The join is a single-column update of an existing row, not an insert. It is
 * also the one write here that *does* overwrite — deliberately, and only ever
 * toward a value it computed from the owner's own label. Re-running it cannot
 * move a link to a different technology than the label names.
 */
async function bootstrapTechnologyCatalog(locale: Locale): Promise<void> {
  console.log(`${locale} — technology catalog`);

  // --- Categories ------------------------------------------------------
  await insertMissing(
    "technology_category",
    CATEGORIES.map((category, order) => ({
      locale,
      slug: category.slug,
      label: category[locale === "pt-BR" ? "pt" : "en"],
      sort_order: order,
    })),
    "locale,slug",
  );

  const categoryRows = await selectMany("technology_category", { locale: `eq.${locale}` });
  const categoryIdBySlug = new Map(categoryRows.map((row) => [String(row["slug"]), String(row["id"])]));

  // --- The technologies the document already names ------------------------
  const experienceChips = await selectMany("resume_technology", { locale: `eq.${locale}` });
  const skillRows = await selectMany("resume_skill", { locale: `eq.${locale}` });

  /*
    Deduplicated on the *normalised* label rather than the slug, because
    "Java Spring Boot" and "Java Spring Boot " are the same tool and a slug
    comparison would treat the stray space as a second one.

    Languages are added on top of what the document names, and that is not
    padding. **The résumé never says "JavaScript"** — it says React, NestJS and
    Next.js, all of which rest on it — so a catalog derived only from the chips
    would have no row for the root of its own graph. The first bootstrap run
    silently dropped fourteen relations for exactly this reason: "TypeScript →
    JavaScript" had nowhere to point.

    A language is a node in the graph whether or not it is a chip, and it earns
    its place here by being an endpoint of a real edge.
  */
  const labels: string[] = [];

  const offer = (label: string): void => {
    const trimmed = label.trim();

    if (trimmed !== "" && !labels.some((existing) => sameTool(existing, trimmed))) {
      labels.push(trimmed);
    }
  };

  for (const label of [
    ...experienceChips.map((row) => String(row["label"] ?? "")),
    ...skillRows.map((row) => String(row["label"] ?? "")),
    ...LANGUAGES,
  ]) {
    offer(label);
  }

  await insertMissing(
    "technology",
    labels.map((label, order) => ({
      category_id: categoryIdBySlug.get(classify(label)) ?? categoryIdBySlug.get(FALLBACK_CATEGORY),
      locale,
      slug: technologySlug(label),
      label,
      aliases: [],
      surfaces: ["resume"],
      sort_order: order,
    })),
    "locale,slug",
  );

  const technologyRows = await selectMany("technology", { locale: `eq.${locale}` });

  /*
    `kind` and `description` are patched onto existing rows rather than passed
    to the insert.

    The insert cannot carry them, because on a populated database it inserts
    nothing at all — `ignore-duplicates` skips every row — and a column absent
    from the payload is never written. So a second pass fills them in, which is
    also what lets a re-run pick up a description the owner rewrote, provided
    the patch never overwrites a non-empty one.
  */
  let shaped = 0;

  for (const row of technologyRows) {
    const label = String(row["label"] ?? "");
    const kind = classifyKind(label);
    const description = describe(label);

    const values: Record<string, unknown> = {};

    if (kind !== null && row["kind"] == null) {
      values["kind"] = kind;
    }

    // Empty-only, so the owner's own wording is never overwritten. See header.
    if (description !== null && String(row["description"] ?? "") === "") {
      values["description"] = description;
    }

    if (Object.keys(values).length === 0) {
      continue;
    }

    await patch("technology", String(row["id"]), values);
    shaped++;
  }

  /*
    Relations, matched by label.

    Written as `[from, to]` label pairs rather than slugs so that a pair whose
    endpoint does not exist in this locale is skipped with a note instead of
    inserting an edge to nothing. "Flutter rests on Dart" is a true claim; if
    Dart is not in the catalogue yet the edge has nowhere to point, and an edge
    to a missing row is a relation that will never expand.
  */
  const idBySlug = new Map(technologyRows.map((row) => [String(row["slug"]), String(row["id"])]));
  const labelBySlug = new Map(technologyRows.map((row) => [String(row["slug"]), String(row["label"])]));

  const findId = (label: string): string | undefined => {
    const wanted = normalizeLabel(label);

    for (const [slug, candidate] of labelBySlug) {
      if (normalizeLabel(candidate) === wanted) {
        return idBySlug.get(slug);
      }
    }

    return undefined;
  };

  const edges: Array<Record<string, unknown>> = [];
  const unresolved: string[] = [];

  for (const relation of RELATIONS) {
    const fromId = findId(relation.from);
    const toId = findId(relation.to);

    if (fromId === undefined || toId === undefined) {
      unresolved.push(`${relation.from} → ${relation.to}`);
      continue;
    }

    edges.push({ from_id: fromId, to_id: toId, kind: relation.kind });
  }

  await insertMissing("technology_relation", edges, "from_id,to_id,kind");

  if (unresolved.length > 0) {
    console.log(`  ${unresolved.length} relation(s) skipped, endpoint not in the catalogue:`);
    console.log(`    ${unresolved.join(", ")}`);
  }

  const idByLabel = new Map<string, string>();

  for (const row of technologyRows) {
    const label = String(row["label"] ?? "");

    if (![...idByLabel.keys()].some((existing) => sameTool(existing, label))) {
      idByLabel.set(label, String(row["id"]));
    }
  }

  const resolve = (label: string): string | undefined => {
    for (const [candidate, id] of idByLabel) {
      if (sameTool(candidate, label)) {
        return id;
      }
    }

    return undefined;
  };

  // --- Links --------------------------------------------------------------
  let linked = 0;

  for (const row of experienceChips) {
    const technologyId = resolve(String(row["label"] ?? ""));

    // Skipping an already-linked chip rather than re-patching it: a row the
    // owner deliberately re-pointed in the admin should not be moved back by a
    // bootstrap that happens to share its old label.
    if (technologyId === undefined || row["technology_id"] === technologyId) {
      continue;
    }

    if (row["technology_id"] !== null && row["technology_id"] !== undefined) {
      continue;
    }

    await patch("resume_technology", String(row["id"]), { technology_id: technologyId });
    linked++;
  }

  for (const row of skillRows) {
    const technologyId = resolve(String(row["label"] ?? ""));

    if (technologyId === undefined || row["technology_id"] !== null) {
      continue;
    }

    await patch("resume_skill", String(row["id"]), { technology_id: technologyId });
    linked++;
  }

  console.log(`  ${labels.length} technologies, ${linked} link(s) attached`);
}

/** Updates one row by id. The only write here that overwrites, and see above. */
async function patch(table: string, id: string, values: Record<string, unknown>): Promise<void> {
  const key = writeKey();
  const response = await fetch(
    `${restUrl()}/${table}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(values),
    },
  );

  if (!response.ok) {
    fail(`Could not update ${table}`, await response.json().catch(() => response.statusText));
  }
}

void main();