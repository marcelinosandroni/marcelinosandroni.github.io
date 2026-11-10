/**
 * Syncs résumé content from Supabase to a JSON snapshot.
 *
 * ## Why a snapshot and not the typed catalog files
 *
 * The typed catalog files (`resume-data.ts`, `stack-variants.pt-br.ts`) are
 * hand-maintained TypeScript with rich types, comments and derived logic. Rewriting
 * them from the database would destroy that structure and make diffs unreadable.
 *
 * Instead, this script writes a JSON snapshot (`public/artifacts/db-snapshot.json`)
 * that the build pipeline can read when available. The typed catalog remains the
 * fallback, so a build without database access still works — it just uses the
 * last committed catalog.
 *
 * ## Usage
 *
 *   npm run db:sync          # reads from Supabase, writes snapshot
 *   npm run db:sync -- --dry # prints what would change without writing
 *
 * ## What it syncs
 *
 * - resume_profile, resume_experience, resume_highlight, resume_case_study,
 *   resume_technology, resume_skill_group, resume_skill, resume_education,
 *   resume_language
 * - resume_variant + children (metrics, inventory, roles, bullets)
 * - cheatsheet_category, cheatsheet_term, cheatsheet_tag, cheatsheet_term_tag
 * - home_content
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

  console.log("Syncing résumé content from Supabase to snapshot...");
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

  // Read all data from DB
  const [
    profiles, experiences, highlights, caseStudies, technologies,
    skillGroups, skills, education, languages,
    variants, variantMetrics, variantInventory, variantRoles, variantBullets,
    cheatsheetCategories, cheatsheetTerms, cheatsheetTags, cheatsheetTermTags,
    homeContent,
  ] = await Promise.all([
    fetchRows("resume_profile", { order: "locale.asc" }),
    fetchRows("resume_experience", { order: "sort_order.asc" }),
    fetchRows("resume_highlight", { order: "sort_order.asc" }),
    fetchRows("resume_case_study", { order: "sort_order.asc" }),
    fetchRows("resume_technology", { order: "sort_order.asc" }),
    fetchRows("resume_skill_group", { order: "sort_order.asc" }),
    fetchRows("resume_skill", { order: "sort_order.asc" }),
    fetchRows("resume_education", { order: "sort_order.asc" }),
    fetchRows("resume_language", { order: "sort_order.asc" }),
    fetchRows("resume_variant", { order: "sort_order.asc" }),
    fetchRows("resume_variant_metric", { order: "sort_order.asc" }),
    fetchRows("resume_variant_inventory", { order: "sort_order.asc" }),
    fetchRows("resume_variant_role", { order: "sort_order.asc" }),
    fetchRows("resume_variant_role_bullet", { order: "sort_order.asc" }),
    fetchRows("cheatsheet_category", { order: "sort_order.asc" }),
    fetchRows("cheatsheet_term", { order: "sort_order.asc" }),
    fetchRows("cheatsheet_tag", { order: "sort_order.asc" }),
    fetchRows("cheatsheet_term_tag", { order: "term_id.asc" }),
    fetchRows("home_content", { order: "locale.asc" }),
  ]);

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
  console.log(`  Cheatsheet tags: ${cheatsheetTags.length}`);
  console.log(`  Home content: ${homeContent.length}`);

  if (dryRun) {
    console.log("\nDry run — no files written.");
    return;
  }

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
    cheatsheetTags,
    cheatsheetTermTags,
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
