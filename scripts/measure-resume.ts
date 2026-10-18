import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

/**
 * Reports how much room each résumé actually takes on each page.
 *
 * ## Why the last child's bottom edge, and not the sum of the heights
 *
 * Summing children silently drops the margins *between* them. A document can
 * report plenty of slack that way and still render three pages, which is exactly
 * the kind of measurement that is worse than none: it says the fit is fine at the
 * moment it is not.
 *
 * The bottom edge of the last in-flow child is the only number that accounts for
 * every margin, every collapsed margin and every line box that came before it.
 * The footer is excluded because it is absolutely positioned - it floats above
 * the flow and would otherwise report the page height rather than the content.
 *
 * ## What this number is not
 *
 * It is a necessary condition, not a sufficient one.
 *
 * `.keep-together` sets `page-break-inside: avoid`, so a role block that does not
 * fit in what is left of a page moves *whole* to the next one. The pages then
 * stop matching this measurement: the page that gave up a block gets shorter, and
 * the page that received it gets taller. A document measured at +2mm on page 1
 * rendered three pages for exactly this reason while another measured at +2mm on
 * page 2 rendered two.
 *
 * So this script is for finding *where* the pressure is and how much has to go,
 * and `html-to-pdf.ts` asserting the page count is what decides whether a résumé
 * is actually shippable. Use both; believe the second one.
 *
 * Usage: tsx scripts/measure-resume.ts <file.html> [...]
 */

const MM_PER_PX = 25.4 / 96;

async function measure(browser: Awaited<ReturnType<typeof chromium.launch>>, file: string) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "networkidle" });
  // The print stylesheet is what Chromium renders; measuring the screen layout
  // reports a different padding and a different box, and neither is the PDF.
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);

  const pages = await page.evaluate(() => {
    const asPages = Array.from(document.querySelectorAll<HTMLElement>(".a4-page"));

    return asPages.map((a4) => {
      const style = getComputedStyle(a4);
      const padTop = parseFloat(style.paddingTop);
      const padBottom = parseFloat(style.paddingBottom);

      /*
        The sheet's height, not the element's.

        `.a4-page` declares `min-height: 297mm`, so an overflowing document
        silently grows its own box. Measuring against the box that grew reports
        "it fits" for exactly the documents that do not fit - the measurement moves
        with the failure instead of catching it. A4 is 297mm tall by definition, so
        that is the number the content has to live within.

        In pixels, because every other number here is in pixels and mixing the two
        is how this first reported 59mm of usable height on a sheet that has 277.
      */
      const SHEET_HEIGHT_PX = 297 * (96 / 25.4);

      // The last child that takes part in the normal flow.
      let lastBottom = padTop;
      const origin = a4.getBoundingClientRect().top;

      for (const child of Array.from(a4.children)) {
        const position = getComputedStyle(child).position;

        if (position === "absolute" || position === "fixed") {
          continue;
        }

        const box = child.getBoundingClientRect();
        lastBottom = Math.max(lastBottom, box.bottom - origin);
      }

      return {
        used: lastBottom - padTop,
        available: SHEET_HEIGHT_PX - padTop - padBottom,
      };
    });
  });

  await page.close();

  return pages.map((p) => ({
    usedMm: Math.round(p.used * MM_PER_PX),
    availableMm: Math.round(p.available * MM_PER_PX),
    slackMm: Math.round((p.available - p.used) * MM_PER_PX),
  }));
}

async function main(): Promise<void> {
  const browser = await chromium.launch();

  for (const file of process.argv.slice(2)) {
    const pages = await measure(browser, file);
    console.log(`\n${file}`);

    pages.forEach((p, index) => {
      const verdict = p.slackMm < 0 ? "OVERFLOW" : "ok";
      console.log(
        `  page ${index + 1}: ${p.usedMm}mm / ${p.availableMm}mm  slack ${p.slackMm >= 0 ? "+" : ""}${p.slackMm}mm  [${verdict}]`,
      );
    });
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});