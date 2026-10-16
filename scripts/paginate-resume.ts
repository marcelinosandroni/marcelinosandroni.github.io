import { chromium } from "playwright";

/**
 * Flows a document's blocks into as many sheets as it needs.
 *
 * ## Why this exists
 *
 * The pages used to be hardcoded: two `.a4-page` divs, two footers reading
 * "Página 1 de 2", and a build that failed the moment a section outgrew its box.
 * That made the page count a constraint the content had to be cut to meet, rather
 * than a fact about the content.
 *
 * It inverts the relationship. A document is an ordered list of blocks and the
 * page count is whatever falls out of packing them. Adding a section no longer
 * means deciding what to delete.
 *
 * ## Why it runs twice
 *
 * Because measuring the blocks up front is not enough.
 *
 * The first pass measures every block inside one long sheet, sums the heights and
 * packs. That sum is consistently a few millimetres short of what the regrouped
 * document actually lays out - 10mm on a sheet with several blocks - so the
 * document claims three pages and prints four, with "Página 3 de 3" sitting on
 * sheet four where the reader can see it is wrong.
 *
 * The second pass measures the blocks again, but in the grouped document they
 * were actually placed in, and packs from those numbers. Same blocks, real
 * context, and the pack converges on what the renderer produces rather than on
 * what was predicted for it.
 *
 * ## Why a block is never split
 *
 * A role that straddles a page break is read as two different jobs, and a skills
 * inventory split across sheets reads as two lists that happen to continue. If a
 * block does not fit in what is left of a sheet it moves whole.
 */

/** A4 is 297mm tall; the print stylesheet leaves 10mm above and below. */
const SHEET_MM = 297;
const PADDING_MM = 10;
const USABLE_MM = SHEET_MM - PADDING_MM * 2;

const MM_PER_PX = 25.4 / 96;

type Measured = {
  readonly id: string;
  readonly html: string;
  readonly spaceMm: number;
  /**
   * This block's own bottom margin.
   *
   * Kept apart from `spaceMm` because the gap to the next block already contains
   * it - adjacent margins collapse, and the measured gap is that collapsed value.
   * The one place it does not appear is after the *last* block on a sheet, where
   * there is no next block to absorb it.
   *
   * That omission is 4mm of invisible height, and 4mm past 297 is how a document
   * claims three sheets and prints four.
   */
  readonly marginBottomMm: number;
  /** Page one carries the name, contact details and photo block. */
  readonly pinnedToFirstPage: boolean;
};

type Shell = {
  readonly beforeFirstPage: string;
  readonly afterLastPage: string;
};

/**
 * Rebuilds `html` with its blocks distributed across as many sheets as needed.
 */
export async function paginate(
  html: string,
  options: { readonly footer?: (page: number, total: number) => string } = {},
): Promise<{ html: string; pages: number }> {
  const shell = splitShell(html);
  const footer = options.footer ?? defaultFooter;

  let blocks = await measure(html);
  let sheets = pack(blocks);

  /*
    Second pass, measured on the grouped document.

    Blocks keep their identity across the regrouping - each still carries its
    `data-block` name - so the second measurement lines up one-to-one with the
    first and the second pack is a correction rather than a reshuffle.
  */
  blocks = await measure(render(shell, sheets, footer));
  sheets = pack(blocks);

  const out = render(shell, sheets, footer);

  return { html: out, pages: sheets.length };
}

/** The parts of the document that are not content. */
function splitShell(html: string): Shell {
  const firstPage = html.indexOf('<div class="a4-page">');
  const close = html.lastIndexOf("</body>");

  if (firstPage === -1 || close === -1) {
    throw new Error("no .a4-page to work from - is this a résumé document?");
  }

  return {
    beforeFirstPage: html.slice(0, firstPage),
    afterLastPage: html.slice(close),
  };
}

/** Reads every block's occupied vertical space, in millimetres. */
async function measure(html: string): Promise<ReadonlyArray<Measured>> {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);

    const measured = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll<HTMLElement>("[data-block]"));

      /*
        Blocks must not nest.

        A nested block already sits inside its parent's box, so measuring both
        counts the same content twice: the parent whole, and the child as a slice
        of it. The child then measures as roughly zero and the packing quietly
        works from numbers that do not describe the page. Failing here turns that
        into a build error instead of a document that runs long.
      */
      const nested = all.filter((node) => node.parentElement?.closest("[data-block]") !== null);

      if (nested.length > 0) {
        throw new Error(
          `nested data-block elements: ${nested.map((n) => n.dataset.block).join(", ")}`,
        );
      }

      /*
        Measured as the gap between one block's bottom edge and the next one's,
        not as each block's own height.

        A block's height excludes its margins, and summing heights therefore drops
        every margin between siblings - five roles with `mb-4` lose roughly 20mm
        that the sheet really needs. Measuring bottom-to-bottom captures the
        distance the renderer actually produced, including the margins and
        including the collapsing between them.
      */
      const sheet = document.querySelector<HTMLElement>(".a4-page");
      const sheetBox = sheet?.getBoundingClientRect();
      const paddingTop = sheet === null ? 0 : parseFloat(getComputedStyle(sheet).paddingTop);

      let cursor = sheetBox === undefined ? 0 : sheetBox.top + paddingTop;

      return all.map((node) => {
        const box = node.getBoundingClientRect();
        const space = box.bottom - cursor;

        // A sheet boundary resets the cursor to the next sheet's content top.
        cursor = box.bottom;

        const own = getComputedStyle(node);

        return {
          id: node.dataset.block ?? "",
          pinned: node.dataset.pinned === "first",
          space,
          marginBottom: own.marginBottom === "auto" ? 0 : parseFloat(own.marginBottom),
          html: node.outerHTML,
        };
      });
    });

    await page.close();

    if (measured.length === 0) {
      throw new Error("no blocks marked with data-block - nothing to paginate");
    }

    return measured.map((block) => ({
      id: block.id,
      html: block.html,
      spaceMm: block.space * MM_PER_PX,
      marginBottomMm: (Number.isNaN(block.marginBottom) ? 0 : block.marginBottom) * MM_PER_PX,
      pinnedToFirstPage: block.pinned,
    }));
  } finally {
    await browser.close();
  }
}

/** Greedy first-fit: a block goes on the current sheet if it fits, else the next. */
function pack(blocks: ReadonlyArray<Measured>): ReadonlyArray<ReadonlyArray<Measured>> {
  const sheets: Measured[][] = [];
  let current: Measured[] = [];
  let used = 0;

  const closeSheet = (): void => {
    sheets.push(current);
    current = [];
    used = 0;
  };

  for (const block of blocks) {
    // The header belongs on the first sheet and is never pushed off it.
    if (block.pinnedToFirstPage) {
      if (sheets.length > 0) {
        closeSheet();
      }
      current.push(block);
      used += block.spaceMm;
      continue;
    }

    // A sheet that already holds a role is closed rather than overrun.
    if (used + block.spaceMm > USABLE_MM && current.some((b) => !b.pinnedToFirstPage)) {
      closeSheet();
    }

    current.push(block);
    used += block.spaceMm;
  }

  if (current.length > 0) {
    closeSheet();
  }

  return settle(sheets);
}

/**
 * Moves trailing blocks until no sheet is over budget.
 *
 * The packing above decides with the heights alone, which leaves out the margin
 * hanging under the last block on each sheet - there is no next block to collapse
 * it against, and it is real height the sheet has to hold. A sheet can therefore
 * pass the fit check and still be a millimetre over A4, which prints as an extra
 * blank page the footers do not account for.
 *
 * Rather than guess the margin into the fit check and over-reserve it for every
 * interior block - where it would be double counted, since the gap to the next
 * block already contains it - the overflow is corrected after the fact, and only
 * where it actually occurs.
 */
function settle(sheets: Measured[][]): Measured[][] {
  for (let guard = 0; guard < 100; guard++) {
    const overflowing = sheets.findIndex((sheet) => sheetHeight(sheet) > USABLE_MM);

    if (overflowing === -1) {
      return sheets;
    }

    const sheet = sheets[overflowing];
    const movable = sheet.findIndex((block) => !block.pinnedToFirstPage);

    /*
      A sheet holding nothing but the header cannot be made to fit by moving a
      block, because there is none to move. Breaking here rather than looping keeps
      a genuinely too-tall block from cycling forever - it surfaces as a document
      that prints long, which is the reader's problem to see, not a hang.
    */
    if (movable === -1) {
      return sheets;
    }

    /*
      Taken before the removal, not after.

      After `splice` the element that was at `movable` is at `movable - 1`, so
      reading it afterwards picks up the block *below* the one just removed. That
      silently duplicates one block and drops another, and it shows up as a
      document whose metrics section appears twice and whose summary has vanished -
      neither of which any reader could explain.
    */
    const moved = sheet[movable];

    sheet.splice(movable, 1);

    /*
      The overflowing sheet is usually the last one, so the sheet after it does not
      exist yet. Appending to an array that is not there is the difference between
      producing one more page and throwing - and this is the ordinary case, not an
      edge one.
    */
    const next = sheets[overflowing + 1] ?? [];

    sheets[overflowing + 1] = [...next, moved];
  }

  return sheets;
}

/** What a sheet actually occupies: its blocks, plus the margin under the last. */
function sheetHeight(sheet: ReadonlyArray<Measured>): number {
  const last = sheet[sheet.length - 1];

  if (last === undefined) {
    return 0;
  }

  return sheet.reduce((total, block) => total + block.spaceMm, 0) + last.marginBottomMm;
}

function render(
  shell: Shell,
  sheets: ReadonlyArray<ReadonlyArray<Measured>>,
  footer: (page: number, total: number) => string,
): string {
  const total = sheets.length;

  const pages = sheets
    .map((blocks, index) => {
      const body = blocks
        .map((block) => block.html.replace(/^\s+/, ""))
        .join("\n\n        ");

      return `
        <div class="a4-page">
        ${body}
            <div class="text-[9px] text-slate-400 text-center border-t border-slate-200 pt-2 mt-4 absolute bottom-4 w-[calc(100%-30mm)]">
                ${footer(index + 1, total)}
            </div>
        </div>`;
    })
    .join("\n");

  return `${shell.beforeFirstPage}${pages}${shell.afterLastPage}`;
}

const defaultFooter = (page: number, total: number): string =>
  `Marcelino Sandroni Dias — Engenheiro de Software &amp; IA — Currículo v1 — Página ${page} de ${total}`;