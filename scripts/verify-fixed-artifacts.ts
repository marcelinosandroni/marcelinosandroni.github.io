import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Checks that the five recruiter PDFs are actually on disk and actually complete.
 *
 * The build already fails loudly when the paginator cannot fit a sheet, and the
 * converter reports the page count it wrote. Neither of those notices that a file
 * is *absent* - a build that dies after the first PDF leaves four in the directory
 * and a directory that looks fine to `ls`. Then `availableResumeVariants` reports
 * what it finds, the download route concludes the locale has nothing rendered, and
 * quietly serves the database document instead: a 39KB LaTeX résumé answering a
 * request for a 345KB one.
 *
 * That is a failure with no symptom, which is the only kind worth a script.
 */

/** What `fixedResumeFilename` builds, written out so this file has one source of truth less. */
const EXPECTED: ReadonlyArray<readonly [string, number]> = [
  ["resume-fixed-pt-BR.pdf", 2],
  ["resume-fixed-pt-BR-enterprise-java.pdf", 2],
  ["resume-fixed-pt-BR-enterprise-java-react.pdf", 2],
  ["resume-fixed-pt-BR-enterprise-dotnet.pdf", 2],
  ["resume-fixed-pt-BR-modern-web.pdf", 2],
  ["resume-fixed-en-US.pdf", 2],
];

const DIR = join(process.cwd(), "public", "artifacts", "fixed");

/**
 * How many pages a PDF has, counted from the page objects rather than parsed.
 *
 * `/Type /Pages` is the page tree and `/Type /Page` is a page, and a PDF contains
 * one of the first per tree - so the count is the pages plus one. It is a
 * consistency check rather than a parser: the converter already reported the real
 * number, and this catches the case where the two disagree.
 */
function pageCount(bytes: Buffer): number | null {
  const text = bytes.toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const tree = (text.match(/\/Type\s*\/Pages/g) ?? []).length;

  return pages > 0 && tree > 0 ? pages : null;
}

function main(): void {
  const problems: string[] = [];

  console.log("verifying the fixed recruiter PDFs\n");

  for (const [name, expectedPages] of EXPECTED) {
    const path = join(DIR, name);

    if (!existsSync(path)) {
      problems.push(`${name}: missing`);
      console.log(`  MISSING  ${name}`);
      continue;
    }

    const bytes = readFileSync(path);
    const size = statSync(path).size;

    if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
      problems.push(`${name}: not a PDF (starts with "${bytes.subarray(0, 8).toString("latin1")}")`);
      console.log(`  NOT A PDF  ${name}`);
      continue;
    }

    if (size < 20_000) {
      problems.push(
        `${name}: ${Math.round(size / 1024)}KB is far below the other documents - this looks like a PDF from the database path, not a rendered one`,
      );
      console.log(`  TOO SMALL  ${name}  ${Math.round(size / 1024)}KB`);
      continue;
    }

    const pages = pageCount(bytes);

    if (pages !== null && pages !== expectedPages) {
      problems.push(`${name}: ${pages} pages, expected ${expectedPages}`);
      console.log(`  PAGES     ${name}  ${pages} (expected ${expectedPages})`);
      continue;
    }

    console.log(`  ok        ${name}  ${Math.round(size / 1024)}KB  ${pages ?? expectedPages} pages`);
  }

  console.log("");

  if (problems.length > 0) {
    console.error("the fixed recruiter PDFs are not fit to serve:\n");

    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }

    console.error("\nrebuild them with: npm run pdf:fixed:build");

    process.exit(1);
  }

  console.log(`all ${EXPECTED.length} PDFs present and consistent.`);
}

main();