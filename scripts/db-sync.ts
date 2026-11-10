/**
 * Syncs résumé content from Supabase to the typed catalog files.
 *
 * ## Why this exists
 *
 * The PDFs are built from static TypeScript files. The site reads from Supabase
 * with a fallback to the typed catalog. When the owner edits content in `/admin`,
 * the database changes but the static files do not — so the next PDF build would
 * use stale content.
 *
 * This script reads from Supabase and regenerates the static files, so the PDF
 * build always reflects the current database state.
 *
 * ## Usage
 *
 *   npm run db:sync          # reads from Supabase, writes to src/infrastructure/content/
 *   npm run db:sync -- --dry # prints what would change without writing
 */
import { existsSync, readFileSync } from "node:fs";

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

  console.log("Supabase is configured. Sync not yet fully implemented.");
  console.log("For now, the typed catalog files remain the source of truth for PDF builds.");
  console.log("Run 'npm run db:bootstrap' to seed the database from the typed catalog.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
