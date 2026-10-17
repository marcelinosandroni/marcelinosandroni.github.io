import { chromium } from "playwright";
import { promises as fs } from "node:fs";
import { LAYOUT_RULES } from "./data/resume-layout-rules";

/**
 * Measures the rendered résumé against the layout contract.
 *
 * ## What it checks, and why each measurement is the one that is used
 *
 * **Lines**, from the browser's own line boxes rather than from a height divided
 * by a line height. The division approach is wrong in a way that only shows up on
 * the document being checked: a paragraph whose last line holds one word still
 * occupies a full line, and a paragraph with a taller inline element - a `<strong>`
 * carrying an accent - gets a line box the divisor does not know about. Counting
 * distinct tops of the client rects of a range over the element's contents is the
 * only one of the two that agrees with what the reader sees.
 *
 * **Horizontal overflow**, separately. Most of the one-line elements on this
 * document are held to one line by `white-space: nowrap`, and that is a trap: a
 * nowrap element that is too long does not wrap, it *spills*, and its line count
 * stays at one. The line check passes and the page is broken. `scrollWidth` is
 * what catches it, and it costs nothing on the wrapping elements, where the two
 * widths are equal by construction.
 *
 * **Characters**, on the element's own text with the markup stripped and the
 * whitespace collapsed. This is the budget that can be checked without a browser,
 * so it is the one a writer works against.
 *
 * ## Why it fails the build
 *
 * Because a limit nothing enforces is a suggestion, and this document has already
 * shipped a page that was made to fit by making its body smaller than its summary.
 * The point of a number is that something stops.
 *
 * The error names the element, its limit, what it actually measured, and the text
 * that caused it - because "resumo is 6 lines" is a fact to work from and "the
 * layout check failed" is not.
 */

/** One element measured against the rule that applies to it. */
export type LayoutMeasurement = {
  readonly hook: string;
  /** Which occurrence, counted from zero. Present so the error can point. */
  readonly index: number;
  readonly lines: number;
  readonly maxLines: number;
  readonly chars: number;
  readonly maxChars: number;
  /** Pixels wider than its box. Never allowed to be more than a rounding error. */
  readonly overflowPx: number;
  /** The element's own text, trimmed, for the error message. */
  readonly text: string;
  /** Every hook present on the page, for the report. */
  readonly present: boolean;
};

/** A document that was measured. */
export type LayoutDocument = {
  readonly slug: string;
  readonly html: string;
};

/** What one document measured. */
export type LayoutResult = {
  readonly slug: string;
  readonly measurements: ReadonlyArray<LayoutMeasurement>;
  /** Rules whose hook matched nothing on this page. */
  readonly missingHooks: ReadonlyArray<string>;
};

/**
 * Sub-pixel tolerance for the overflow check.
 *
 * Layout is fractional and `scrollWidth` is rounded up, so an element that fits
 * exactly can report a pixel. Half a pixel is below what a reader could see and
 * above the rounding.
 */
const OVERFLOW_TOLERANCE_PX = 0.5;

/**
 * Measures every document in one browser.
 *
 * One launch for the set, because the launch is the expensive part and the
 * variants are four documents that are meant to be identical in structure - the
 * per-document cost of opening Chromium four times buys nothing.
 */
export async function measureLayout(
  documents: ReadonlyArray<LayoutDocument>,
): Promise<ReadonlyArray<LayoutResult>> {
  if (documents.length === 0) {
    return [];
  }

  const hooks = LAYOUT_RULES.map((rule) => rule.hook);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    const results: LayoutResult[] = [];

    for (const doc of documents) {
      await page.setContent(doc.html, { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "print" });
      await page.evaluate(() => document.fonts.ready);

      const measured = await page.evaluate((wanted: string[]) => {
        /*
          Written inline rather than as helpers declared inside `evaluate`.

          esbuild wraps any function declared in an evaluated body with a `__name`
          helper that does not exist in the browser, and the whole evaluation dies
          on a `ReferenceError` naming no line of this file. This has been the
          behaviour of this file's siblings; it is not worth re-discovering.
        */
        const out: Array<{
          hook: string;
          index: number;
          lines: number;
          chars: number;
          overflowPx: number;
          text: string;
        }> = [];

        for (const hook of wanted) {
          const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-rule="${hook}"]`));

          nodes.forEach((node, index) => {
            const range = document.createRange();

            range.selectNodeContents(node);

            const tops = new Set<number>();
            let tallest = 0;

            for (const rect of Array.from(range.getClientRects())) {
              /*
                Zero-height rects come from inline elements with no content of
                their own - a `<strong>` around nothing, an `<a>` with no text. They
                are not lines and counting them would fail every bolded run.
              */
              if (rect.height < 1) {
                continue;
              }

              tallest = Math.max(tallest, rect.height);
              tops.add(Math.round(rect.top * 2) / 2);
            }

            /*
              No rects at all means no text. An element that was emptied still
              exists, so it has to measure as one line rather than zero, or
              `lines <= maxLines` would approve a document that prints nothing
              where something was meant to be.
            */
            const lines = tops.size === 0 ? 1 : tops.size;

            const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();

            out.push({
              hook,
              index,
              lines,
              chars: text.length,
              overflowPx: Math.max(0, node.scrollWidth - node.clientWidth),
              text: text.length > 180 ? `${text.slice(0, 177)}...` : text,
            });
          });
        }

        return out;
      }, hooks);

      const byHook = new Map<string, Array<(typeof measured)[number]>>();

      for (const entry of measured) {
        const list = byHook.get(entry.hook);

        if (list === undefined) {
          byHook.set(entry.hook, [entry]);
        } else {
          list.push(entry);
        }
      }

      results.push({
        slug: doc.slug,
        missingHooks: hooks.filter((hook) => !byHook.has(hook)),
        measurements: LAYOUT_RULES.flatMap((rule) =>
          (byHook.get(rule.hook) ?? []).map((entry) => ({
            hook: rule.hook,
            index: entry.index,
            lines: entry.lines,
            maxLines: rule.maxLines,
            chars: entry.chars,
            maxChars: rule.maxChars,
            overflowPx: entry.overflowPx,
            text: entry.text,
            present: true,
          })),
        ),
      });
    }

    await page.close();

    return results;
  } finally {
    await browser.close();
  }
}

/** One thing wrong with a document, phrased so it can be acted on. */
type Violation = {
  readonly where: string;
  readonly problem: string;
};

/**
 * Turns measurements into the list of things that have to change.
 *
 * Both halves are reported, not just the first: a section that is three lines
 * over a two-line budget *and* forty characters over its budget is one edit, and
 * telling the writer about only the line count would make them run the build twice
 * to find the rest.
 */
export function findViolations(result: LayoutResult): ReadonlyArray<Violation> {
  const violations: Violation[] = [];

  for (const rule of LAYOUT_RULES) {
    const measured = result.measurements.filter((entry) => entry.hook === rule.hook);

    if (measured.length === 0) {
      continue;
    }

    for (const entry of measured) {
      const where =
        measured.length === 1
          ? rule.label
          : `${rule.label} #${entry.index + 1}`;

      if (entry.lines > entry.maxLines) {
        violations.push({
          where,
          problem:
            `${entry.lines} lines, limit ${entry.maxLines}. ` +
            `Cut ${entry.chars - entry.maxChars > 0 ? `${entry.chars - entry.maxChars} characters and ` : ""}` +
            `rewrite it shorter.\n      "${entry.text}"`,
        });
      }

      if (entry.chars > entry.maxChars) {
        violations.push({
          where,
          problem: `${entry.chars} characters, limit ${entry.maxChars}.\n      "${entry.text}"`,
        });
      }

      if (entry.overflowPx > OVERFLOW_TOLERANCE_PX) {
        violations.push({
          where,
          problem:
            `${entry.overflowPx.toFixed(1)}px wider than its box and set not to wrap, ` +
            `so it spills off the page instead of taking another line.\n      "${entry.text}"`,
        });
      }
    }
  }

  for (const hook of result.missingHooks) {
    const rule = LAYOUT_RULES.find((candidate) => candidate.hook === hook);

    violations.push({
      where: rule?.label ?? hook,
      problem:
        `nothing on the page carries data-rule="${hook}", so this limit checked nothing. ` +
        `A rule that matches nothing is worse than no rule - it reads as one that passes.`,
    });
  }

  return violations;
}

/**
 * Measures, reports and refuses.
 *
 * Returns the report so the caller can print it; throws with every violation in
 * the message when there is anything to refuse, because fixing them one build at a
 * time is the slowest way to edit a document.
 */
export async function checkLayout(
  documents: ReadonlyArray<LayoutDocument>,
): Promise<ReadonlyArray<LayoutResult>> {
  const results = await measureLayout(documents);

  printReport(results);

  const broken = results
    .map((result) => ({ result, violations: findViolations(result) }))
    .filter((entry) => entry.violations.length > 0);

  if (broken.length === 0) {
    return results;
  }

  const detail = broken
    .map(({ result, violations }) => {
      const list = violations
        .map((violation) => `  - ${violation.where}: ${violation.problem}`)
        .join("\n");

      return `[${result.slug}]\n${list}`;
    })
    .join("\n\n");

  throw new Error(
    `the résumé is over its layout contract.\n\n${detail}\n\n` +
      `These are content limits at a fixed typography, and the typography is the one ` +
      `thing that does not move: shrinking the type to fit is what this check exists to ` +
      `prevent. Shorten the text, or raise the limit in scripts/data/resume-layout-rules.ts ` +
      `if the document genuinely needs the room.`,
  );
}

/** Prints the contract and what each document actually used. */
function printReport(results: ReadonlyArray<LayoutResult>): void {
  console.log("\nlayout contract");

  const width = Math.max(...LAYOUT_RULES.map((rule) => rule.label.length));

  console.log(`  ${"part".padEnd(width)}  lines  chars`);

  for (const rule of LAYOUT_RULES) {
    const worst = results.reduce<LayoutMeasurement | undefined>((held, result) => {
      const entries = result.measurements.filter((entry) => entry.hook === rule.hook);

      if (entries.length === 0) {
        return held;
      }

      const fullest = entries.reduce((a, b) => (b.chars > a.chars ? b : a));

      return held === undefined || fullest.chars > held.chars ? fullest : held;
    }, undefined);

    const cells =
      worst === undefined
        ? `  ${"-".padStart(5)}  ${"-".padStart(5)}   (absent)`
        : `  ${String(worst.lines).padStart(5)}/${String(rule.maxLines).padEnd(2)} ${String(worst.chars).padStart(4)}/${String(rule.maxChars).padEnd(3)}`;

    const flag =
      worst !== undefined &&
      (worst.lines > rule.maxLines || worst.chars > rule.maxChars || worst.overflowPx > OVERFLOW_TOLERANCE_PX)
        ? "  OVER"
        : "";

    console.log(`  ${rule.label.padEnd(width)}${cells}${flag}`);
  }

  console.log("");
}

/**
 * Command line: check the HTML files given as arguments.
 *
 * So the contract can be checked against a document that already exists - the one
 * just rendered, the one a build left behind - without rebuilding it first. That is
 * the difference between learning that a caption went to three lines from the build
 * output and from seeing it in a PDF.
 */
async function main(): Promise<void> {
  const files = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));

  if (files.length === 0) {
    console.error(
      "usage: tsx scripts/check-layout.ts <document.html> [more.html ...]\n" +
        "The contract itself lives in scripts/data/resume-layout-rules.ts",
    );
    process.exit(1);
  }

  const documents = await Promise.all(
    files.map(async (file) => ({ slug: file, html: await fs.readFile(file, "utf8") })),
  );

  await checkLayout(documents);
  console.log("every document is inside its layout contract.");
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}