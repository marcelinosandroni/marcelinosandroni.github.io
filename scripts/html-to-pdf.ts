import { promises as fs } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

/**
 * Renders a print-designed HTML file to a real, text-based PDF.
 *
 * ## Why this exists
 *
 * The résumé this repository publishes is generated from typed content through
 * LaTeX, which is the right answer for a site that owns its content: the layout
 * is versioned, diffable and reproducible from a database read. It is the wrong
 * answer for a layout someone designed deliberately in another tool, where the
 * design *is* the deliverable and rewriting it in LaTeX would be a translation
 * exercise with a real chance of losing the thing that made it good.
 *
 * So this renders what was designed, through the browser that already runs the
 * project's end-to-end suite, and writes a PDF with real selectable text — which
 * is what an applicant tracking system parses. A screenshot-based "PDF" would
 * look identical and score zero.
 *
 * ## What it deliberately does not do
 *
 * It does not fix the HTML. A page that overflows A4 is a design decision the
 * author made, and silently re-flowing it would hide the problem behind a file
 * that looks fine. The page count is reported and can be asserted, so an overflow
 * is *visible* here rather than discovered by a recruiter.
 */

/**
 * A4 in inches — the unit `page.pdf` takes.
 *
 * Only a fallback: `preferCSSPageSize` lets the source's own `@page { size: A4 }`
 * win, which is what a millimetre-designed layout needs. This is here so the
 * output is still A4 for a source that declares nothing.
 */
const A4 = "A4";

type Options = {
  readonly input: string;
  readonly output: string;
  readonly expectPages?: number;
};

export async function convertHtmlToPdf(options: Options): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(pathToFileURL(options.input).href, {
      waitUntil: "networkidle",
      /*
        The timeout is generous on purpose. A CDN-hosted stylesheet has to be
        fetched and compiled before the document has its layout, and the default
        30s fails on a cold cache or a slow connection — producing a PDF that
        looks *almost* right, with unstyled text and no boxes, which is the worst
        possible outcome because it looks like a rendering bug rather than a
        timing one.
      */
      timeout: 60_000,
    });

    /*
      Web fonts must be loaded before printing, or Chromium lays the page out
      with a fallback and substitutes a different one at paint time — producing a
      PDF whose line breaks do not match the screen and whose columns drift.
    */
    await page.evaluate(() => document.fonts.ready);

    await page.addStyleTag({
      content: `
        /*
          The trailing break the source asks for.

          Each .a4-page carries page-break-after: always, which is right between
          pages and wrong after the last one: Chromium honours it and emits a
          blank third page, which reads as a formatting mistake to a recruiter and
          costs an applicant a page of someone's attention.

          Neutralised on the last element only, so the break between pages is
          untouched.
        */
        .a4-page:last-of-type { page-break-after: auto; break-after: auto; }
      `,
    });

    await page.pdf({
      path: options.output,
      printBackground: true,
      /*
        The source declares @page { size: A4; margin: 0 } and relies on it for its
        own 210mm geometry. Without preferCSSPageSize the caller's size wins and
        Chromium scales the page down to fit the margins it chose, which shrinks
        every font and breaks the millimetre layout the author designed.
      */
      preferCSSPageSize: true,
      format: A4,
      /*
        Zero margins, matching the source's `@page { margin: 0 }`. The page draws
        its own 15mm gutter inside `.a4-page`; a caller-supplied margin would be
        added *on top of* it, shrinking the content box and re-flowing every
        section the author fitted to a page.
      */
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }

  await report(options);
}

async function report(options: Options): Promise<void> {
  const { size } = await fs.stat(options.output);
  const pages = await countPages(options.output);

  console.log(`  wrote  ${display(options.output)}`);
  console.log(`  pages  ${pages}${options.expectPages === undefined ? "" : ` (expected ${options.expectPages})`}`);
  console.log(`  size   ${(size / 1024).toFixed(1)} KB`);

  if (options.expectPages !== undefined && pages !== options.expectPages) {
    /*
      A mismatch is a real defect and the script is the right place to say so:
      it is the one moment the layout is known to be wrong rather than merely
      unverified, and a PDF is easy to send and hard to notice.
    */
    throw new Error(
      `expected ${options.expectPages} page(s), got ${pages}. ` +
        "Content is overflowing its .a4-page — check the source layout.",
    );
  }
}

/**
 * The page count, read from the PDF itself.
 *
 * Counted rather than inferred from the source's `.a4-page` count, because the
 * two are the same only when nothing overflows — which is the exact condition
 * worth checking.
 */
async function countPages(file: string): Promise<number> {
  const bytes = await fs.readFile(file);
  const text = bytes.toString("latin1");

  const matches = text.match(/\/Type\s*\/Page[^s]/g);

  return matches?.length ?? 0;
}

function display(path: string): string {
  return relative(process.cwd(), path) || path;
}

function usage(): string {
  return [
    "Usage: npm run pdf:from-html -- <input.html> [output.pdf] [expectedPages]",
    "",
    "  input.html      a print-designed HTML file",
    "  output.pdf      defaults to the input path with a .pdf extension",
    "  expectedPages   optional; the run fails if the PDF has a different count",
    "",
    "Example:",
    "  npm run pdf:from-html -- resume-recruiter-pt-br.html resume-recruiter-pt-br.pdf 2",
  ].join("\n");
}

function parse(argv: string[]): Options {
  const [input, second, third] = argv;

  if (input === undefined || input === "--help" || input === "-h") {
    console.log(usage());
    process.exit(input === undefined ? 1 : 0);
  }

  const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);

  if (!basename(inputPath).endsWith(".html")) {
    throw new Error(`expected an .html file, got ${input}`);
  }

  const outputPath =
    second === undefined
      ? inputPath.replace(/\.html?$/i, ".pdf")
      : isAbsolute(second)
        ? second
        : resolve(process.cwd(), second);

  if (third !== undefined) {
    const pages = Number.parseInt(third, 10);

    if (!Number.isInteger(pages) || pages < 1) {
      throw new Error(`expectedPages must be a positive integer, got "${third}"`);
    }

    return { input: inputPath, output: outputPath, expectPages: pages };
  }

  return { input: inputPath, output: outputPath };
}

/**
 * Entry point.
 *
 * Wrapped rather than top-level awaited because this repository compiles
 * `scripts/*.ts` as CommonJS, where `await` at module scope is a syntax error —
 * and a script that fails to transform tells you nothing about whether the
 * conversion works.
 *
 * A non-zero exit on failure is what makes this usable from CI or a Makefile,
 * so the page-count assertion actually stops something rather than printing a
 * warning nobody reads.
 */
async function main(): Promise<void> {
  const options = parse(process.argv.slice(2));

  await fs.mkdir(dirname(options.output), { recursive: true });

  console.log(`rendering ${display(options.input)}`);

  await convertHtmlToPdf(options);

  console.log("done.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});