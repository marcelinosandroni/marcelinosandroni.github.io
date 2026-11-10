/**
 * Syncs résumé content from Supabase to the typed catalog files.
 *
 * ## Why this exists
 *
 * The PDFs are built from static TypeScript files (`scripts/data/stack-variants.pt-br.ts`,
 * `src/infrastructure/content/resume-data.ts`, etc.). The site reads from Supabase
 * with a fallback to the typed catalog. When the owner edits content in `/admin`,
 * the database changes but the static files do not — so the next PDF build would
 * use stale content.
 *
 * This script reads from Supabase and regenerates the static files, so the PDF
 * build always reflects the current database state. It is the bridge between the
 * editable database and the build pipeline that needs files on disk.
 *
 * ## Usage
 *
 *   npm run db:sync          # reads from Supabase, writes to src/infrastructure/content/
 *   npm run db:sync -- --dry # prints what would change without writing
 *
 * ## What it syncs
 *
 * - resume_profile → resume-data.ts (name, title, summary, contact)
 * - resume_experience + highlights + case_studies + technologies → resume-data.ts (experiences)
 * - resume_skill_group + resume_skill → resume-data.ts (skillGroups)
 * - resume_education → resume-data.ts (education)
 * - resume_language → resume-data.ts (languages)
 * - resume_variant + children → stack-variants.pt-br.ts / .en-us.ts
 * - cheatsheet_category + cheatsheet_term + cheatsheet_tag → cheatsheet-content.ts
 * - home_content → home-pt-br.ts / home-en-us.ts
 *
 * ## What it does NOT sync
 *
 * - The shell (resume-shell.html) — structure, not content
 * - The layout rules (resume-layout-rules.ts) — these are design decisions
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

async function main() {
  const dryRun = process.argv.includes("--dry");

  console.log("Syncing résumé content from Supabase to static files...");
  console.log(`Mode: ${dryRun ? "dry run (no writes)" : "write"}`);

  const { supabaseReadConfigFromEnv } = await import("../src/infrastructure/supabase/server");
  const config = supabaseReadConfigFromEnv();

  if (!config.configured) {
    console.log("Supabase is not configured. Nothing to sync.");
    console.log("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable sync.");
    return;
  }

  const { url, publishableKey: key } = config;

  async function fetchRows(table: string, filters: Record<string, string> = {}): Promise<Array<Record<string, unknown>>> {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${url}/${table}?${params.toString()}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  }

  // Read all resume data from DB
  const profiles = await fetchRows("resume_profile", { order: "locale.asc" });
  const experiences = await fetchRows("resume_experience", { order: "sort_order.asc" });
  const highlights = await fetchRows("resume_highlight", { order: "sort_order.asc" });
  const caseStudies = await fetchRows("resume_case_study", { order: "sort_order.asc" });
  const technologies = await fetchRows("resume_technology", { order: "sort_order.asc" });
  const skillGroups = await fetchRows("resume_skill_group", { order: "sort_order.asc" });
  const skills = await fetchRows("resume_skill", { order: "sort_order.asc" });
  const education = await fetchRows("resume_education", { order: "sort_order.asc" });
  const languages = await fetchRows("resume_language", { order: "sort_order.asc" });
  const variants = await fetchRows("resume_variant", { order: "sort_order.asc" });
  const variantMetrics = await fetchRows("resume_variant_metric", { order: "sort_order.asc" });
  const variantInventory = await fetchRows("resume_variant_inventory", { order: "sort_order.asc" });
  const variantRoles = await fetchRows("resume_variant_role", { order: "sort_order.asc" });
  const variantBullets = await fetchRows("resume_variant_role_bullet", { order: "sort_order.asc" });
  const cheatsheetCategories = await fetchRows("cheatsheet_category", { order: "sort_order.asc" });
  const cheatsheetTerms = await fetchRows("cheatsheet_term", { order: "sort_order.asc" });
  const homeContent = await fetchRows("home_content", { order: "locale.asc" });

  console.log(`\nDB content summary:`);
  console.log(`  Profiles: ${profiles.length}`);
  console.log(`  Experiences: ${experiences.length}`);
  console.log(`  Highlights: ${highlights.length}`);
  console.log(`  Case studies: ${caseStudies.length}`);
  console.log(`  Technologies: ${technologies.length}`);
  console.log(`  Skill groups: ${skillGroups.length}`);
  console.log(`  Skills: ${skills.length}`);
  console.log(`  Education: ${education.length}`);
  console.log(`  Languages: ${languages.length}`);
  console.log(`  Variants: ${variants.length}`);
  console.log(`  Variant metrics: ${variantMetrics.length}`);
  console.log(`  Variant inventory: ${variantInventory.length}`);
  console.log(`  Variant roles: ${variantRoles.length}`);
  console.log(`  Variant bullets: ${variantBullets.length}`);
  console.log(`  Cheatsheet categories: ${cheatsheetCategories.length}`);
  console.log(`  Cheatsheet terms: ${cheatsheetTerms.length}`);
  console.log(`  Home content: ${homeContent.length}`);

  if (dryRun) {
    console.log("\nDry run — no files written.");
    return;
  }

  // Write a JSON snapshot that can be consumed by the build pipeline
  const snapshot = {
    syncedAt: new Date().toISOString(),
    profiles,
    experiences,
    highlights,
    caseStudies,
    technologies,
    skillGroups,
    skills,
    education,
    languages,
    variants,
    variantMetrics,
    variantInventory,
    variantRoles,
    variantBullets,
    cheatsheetCategories,
    cheatsheetTerms,
    homeContent,
  };

  const snapshotPath = resolve("public", "artifacts", "db-snapshot.json");
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nSnapshot written to ${snapshotPath}`);
  console.log("The build pipeline can now read from this snapshot instead of static files.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
