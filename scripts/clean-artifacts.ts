import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Removes what a PDF run leaves behind.
 *
 * Two directories, and the difference between them is the whole point.
 *
 * `public/artifacts/cache` is the runtime cache the database path writes into -
 * one file per version, locale, template and focus, plus a `.meta` signature
 * beside each. It is disposable by definition: the next request rebuilds it. It is
 * also gitignored, so it can only confuse a person looking at `public/artifacts`
 * and wondering which PDF is the real one.
 *
 * `public/artifacts/fixed` is not disposable in the same sense. Those files are
 * committed on purpose and served directly by the download route - Chromium
 * cannot run in a serverless function, so there is nothing to regenerate them
 * from at request time. `--purge-fixed` therefore only removes them from *disk*,
 * never from the index, and the files come straight back with `git checkout` -
 * which is the escape hatch for the time a build fails halfway through and
 * leaves a directory with four PDFs in it.
 *
 * The source documents are never touched. `resume-shell.html` is the source of
 * truth for all five documents and no script may write it; a cleaning command
 * that could delete it would be a command nobody runs twice.
 */
const ROOT = process.cwd();
const CACHE_DIR = join(ROOT, "public", "artifacts", "cache");
const FIXED_DIR = join(ROOT, "public", "artifacts", "fixed");
const SHELL = join(ROOT, "resume-shell.html");

const purgeFixed = process.argv.includes("--purge-fixed");

function directorySize(dir: string): number {
  if (!existsSync(dir)) {
    return 0;
  }

  let total = 0;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);

    total += entry.isDirectory() ? directorySize(full) : statSync(full).size;
  }

  return total;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

if (!existsSync(SHELL)) {
  throw new Error("resume-shell.html is missing - run this from the project root");
}

console.log(`runtime cache  ${CACHE_DIR}`);
console.log(`  ${mb(directorySize(CACHE_DIR))} before`);

rmSync(CACHE_DIR, { recursive: true, force: true });

console.log("  removed");

if (purgeFixed) {
  console.log(`\nfixed artifacts  ${FIXED_DIR}`);
  console.log(`  ${mb(directorySize(FIXED_DIR))} before`);

  rmSync(FIXED_DIR, { recursive: true, force: true });

  console.log("  removed from disk only - `git checkout -- public/artifacts/fixed` brings them back");
} else {
  console.log(`\nfixed artifacts left alone (${FIXED_DIR}).`);
  console.log("  pass --purge-fixed to remove them from disk as well");
}

console.log("\nThe source documents were not touched.");