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

/**
 * The whole content box, because nothing sits in it now.
 *
 * For a while this was five millimetres less: the footer is absolutely positioned
 * inside the bottom padding, so it hangs up into the box, and a page packed to
 * 277mm of 277mm printed two pages and passed every check with its last line of
 * text lying on the footer rule. The footer is gone, so the whole box is usable
 * again - which is the five millimetres it was worth.
 */
const USABLE_MM = SHEET_MM - PADDING_MM * 2;

const MM_PER_PX = 25.4 / 96;

/**
 * How many times the paginator will re-measure before giving up.
 *
 * A cap rather than a `while`: a packing that keeps disagreeing with itself is a
 * build failure with a number attached, not something to spin on until someone
 * notices the process is not finishing.
 */
const MAX_PASSES = 5;

type Measured = {
  readonly id: string;
  readonly html: string;
  readonly spaceMm: number;
  /** Page one carries the name, contact details and photo block. */
  readonly pinnedToFirstPage: boolean;
  /** Starts its own sheet, whatever room is left on the previous one. */
  readonly startsNewPage: boolean;
  /**
   * Which sheet this block was measured on, counted from zero.
   *
   * Present because a measurement taken on a document that is not the one being
   * built is only evidence. Reading the sheet number off the finished document is
   * what turns "the packer believed it fit" into "it fits".
   */
  readonly sheetIndex: number;
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
  options: {
    readonly footer?: (page: number, total: number) => string;
    /** Named only so an order failure says which document broke it. */
    readonly slug?: string;
  } = {},
): Promise<{ html: string; pages: number }> {
  const shell = splitShell(html);
  const slug = options.slug ?? "document";

  /*
    Pack, then keep correcting against the real document until it fits.

    Not "pack, re-pack until two packings agree". A packing is decided from
    measurements taken on a *different* arrangement - the one it is correcting -
    and those heights do not simply add up on the new sheet. So agreement between
    passes proves only that the packer is sure of itself, not that the page holds.
    One variant came four millimetres over while the packer that placed it believed
    it was under, and printed a fourth page.

    Instead the loop measures what it is about to ship and acts on that: the first
    sheet found over budget gives up its last movable block to the next sheet, and
    the document is measured again. Each round moves a block strictly later, so the
    loop cannot cycle - it runs out of blocks to move or out of pages, and the cap
    catches the rest rather than hanging the build.
  */
  let sheets = pack(await measure(html));

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const overflow = overflowingSheets(await measure(render(shell, sheets)));

    if (overflow.length === 0) {
      break;
    }

    sheets = pushOff(sheets, overflow[0].index);
  }

  assertOrder(sheets.flat(), slug);

  const out = render(shell, sheets);

  await assertFits(out, slug);

  return { html: out, pages: sheets.length };
}

/** The sheets of a finished document that are over budget, in reading order. */
function overflowingSheets(
  measured: ReadonlyArray<Measured>,
): ReadonlyArray<{ readonly index: number; readonly height: number }> {
  const bySheet = new Map<number, number>();

  for (const block of measured) {
    bySheet.set(block.sheetIndex, (bySheet.get(block.sheetIndex) ?? 0) + block.spaceMm);
  }

  return [...bySheet.entries()]
    .filter(([, height]) => height > USABLE_MM)
    .sort(([a], [b]) => a - b)
    .map(([index, height]) => ({ index, height }));
}

/**
 * Pushes the last movable block of one sheet onto the sheet after it.
 *
 * The *last* one, for the reason every other move here has the same reason: moving
 * an earlier block would jump it over the rest of its own sheet and reorder the
 * document. And prepended to the next sheet, because it came off the end of this
 * one - appending would put it below that sheet's content.
 *
 * Returns the input untouched when the sheet has nothing to give, which is the
 * case for a sheet holding only the pinned header. There is no rearrangement that
 * makes that page fit; the document is simply longer than the space available.
 */
function pushOff(
  sheets: ReadonlyArray<ReadonlyArray<Measured>>,
  index: number,
): ReadonlyArray<ReadonlyArray<Measured>> {
  const sheet = sheets[index];
  let movable = -1;

  for (let i = sheet.length - 1; i >= 0; i--) {
    if (!sheet[i].pinnedToFirstPage) {
      movable = i;
      break;
    }
  }

  if (movable === -1) {
    return sheets;
  }

  const next = sheets.map((entry) => [...entry]);
  const moved = next[index][movable];

  next[index].splice(movable, 1);
  next[index + 1] = [moved, ...(next[index + 1] ?? [])];

  return next;
}

/**
 * Every sheet of the finished document has to fit the page it prints on.
 *
 * The packer decides from measurements of a document that is not the one it emits:
 * two passes agreeing is evidence, not proof. This is the proof. The finished HTML
 * is measured the way it will print, the blocks are grouped by the sheet they
 * actually landed on, and a sheet over budget is named here with its height - rather
 * than arriving at a recruiter as an extra page of white with nothing in this
 * repository saying why.
 */
async function assertFits(html: string, slug: string): Promise<void> {
  const over = overflowingSheets(await measure(html));

  if (over.length > 0) {
    throw new Error(
      `[${slug}] the packed document does not fit A4 - ` +
        over
          .map((sheet) => `page ${sheet.index + 1} at ${sheet.height.toFixed(1)}mm of ${USABLE_MM}mm`)
          .join(", ") +
        `. Nothing was dropped to make room, so the block that has to give is the one ` +
        `following the overflow on each of those pages.`,
    );
  }
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
      /*
        Only `[data-block]` is checked for nesting.

        A `[data-item]` is *meant* to sit inside its section - that is the whole
        mechanism. What must never nest is a block inside a block, because the
        inner one measures as roughly zero and the packing then works from numbers
        that do not describe the page.
      */
      const blocksOnly = Array.from(document.querySelectorAll<HTMLElement>("[data-block]"));
      const nested = blocksOnly.filter(
        (node) => node.parentElement?.closest("[data-block]") !== null,
      );

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
      /*
        The cursor restarts at the top of each sheet's content box.

        Without that reset the first block of every sheet after the first measures
        as the distance from the previous sheet's last block - which includes the
        whole gap between them. Sheets came out holding 105mm of 277mm, because
        every block after a page break looked far taller than it is and the packer
        kept starting a new sheet.

        Written inline rather than as a helper: esbuild's name-keeping wraps any
        function declared inside `evaluate` with a `__name` helper that does not
        exist in the browser, and the whole evaluation dies on a ReferenceError
        that names no line of this file.
      */
      let cursor = 0;
      let sheet: Element | null = null;

      /*
        Splittable sections are measured one item at a time.

        The rule that decides where a page may break: never *inside* a sub-item.
        A job is a sub-item, so a role moves whole. An entry in the inventory is a
        sub-item, so the inventory flows between sheets - and its heading travels
        with its first entry, where it cannot be stranded at the foot of a sheet
        with its list overleaf.

        Without this, a section that fits comfortably in half a sheet still had to
        move whole, and its neighbour could not start behind it. That is where the
        white space came from: 632mm of content laid out across 831mm of sheets,
        with the slack sitting in gaps no block was allowed to fill.
      */
      /*
        One flat query over both kinds of thing.

        A `[data-block]` with no items is a whole unit. A `[data-item]` is a unit
        of its own, carrying the id of the section it belongs to. A section that
        has items contributes only its heading, which then travels with the first
        item so a title cannot be stranded at the foot of a sheet with its list
        overleaf.

        Querying both kinds in one pass is what keeps the count honest. Walking
        the blocks and then descending into their items nested the two, and a
        section came out counted once too many - which then failed the document's
        own order check for a reason nobody could see.
      */
      const every = Array.from(document.querySelectorAll<HTMLElement>("[data-block], [data-item]"));
      const units: Array<{ node: HTMLElement; id: string; html: string }> = [];

      for (const node of every) {
        if (node.dataset.item !== undefined) {
          const section = node.closest<HTMLElement>("[data-block]");
          const owner = section?.dataset.block ?? "";

          /*
            The marker is consumed here.

            An emitted item keeps its own wrapper, which is what makes it findable
            by the second pass - so leaving `data-item` on the paragraph inside means
            the next pass sees both the wrapper and the paragraph, and splits every
            item a second time. The count doubles per pass and the document fails
            its own order check. A split is a one-time act, not a property the
            markup carries forward.
          */
          const inner = node.outerHTML.replace(/ data-item(?:="")?/g, "");

          /*
            The wrapper wears the class of the container the item already lived in,
            not the class of the section around it.

            The section carries `mb-4 keep-together` - four millimetres of margin per
            unit, and it only exists to space the *section*. Paying it once per item
            instead of once per section added 30mm to a document that was already
            116mm too tall for the page count it was aiming at. The item's own
            typography comes from the container it is taken out of, so that is the
            class it keeps.
          */
          const holder = node.parentElement;
          const holderClass = holder === null ? "" : holder.className;

          /*
            The section's own bottom margin rides on its *last* item.

            `mb-4` on the section is the gap between this section and the next one -
            four millimetres of separation that mean nothing once the section is a
            list. With the heading emitted as its own unit, that margin ended up
            between the title and the first entry instead, which the original markup
            never had: it cost 2mm on every split section, and 2mm was the margin
            that pushed the first role off page one.

            It also has to land somewhere. Moved to the last item, the gap to the
            next section survives exactly as it was - and when that item is the last
            thing on a sheet, the print stylesheet drops it, which is the one place
            it was never real.
          */
          const sectionClass = (section?.className ?? "")
            .split(/\s+/)
            .filter((token) => token !== "" && token !== "keep-together")
            .join(" ");

          const siblings = section === null ? [] : Array.from(section.querySelectorAll("[data-item]"));
          const isLast = siblings.length > 0 && siblings[siblings.length - 1] === node;

          units.push({
            node,
            id: owner,
            html: `<div data-block="${owner}" class="${isLast ? `${holderClass} ${sectionClass}`.trim() : holderClass}">${inner}</div>`,
          });

          continue;
        }

        const id = node.dataset.block ?? "";

        if (node.querySelectorAll("[data-item]").length === 0) {
          units.push({ node, id, html: node.outerHTML });
          continue;
        }

        const heading = node.querySelector<HTMLElement>("h3.section-title");

        /*
          Nothing in a splittable section may go unmarked.

          Splitting a section emits its heading and its items - and only those. A
          paragraph without the marker is not emitted by either, so it leaves the
          document without a word of warning: the page still paginates, the order
          check still passes, and a line of the candidate's history is simply gone.
          Cheap to catch here and impossible to catch in a screenshot.

          The marker has to be on the element that is *meant* to be a unit, too.
          Marking the container around five paragraphs makes one indivisible unit
          and splits nothing.
        */
        const entries = Array.from(node.querySelectorAll<HTMLElement>("p, li"));
        const unmarked = entries.filter((entry) => entry.dataset.item === undefined);
        const markedContainers = Array.from(node.querySelectorAll<HTMLElement>("[data-item]")).filter(
          (marked) => marked.querySelectorAll("p, li").length > 0,
        );

        if (unmarked.length > 0 || markedContainers.length > 0) {
          throw new Error(
            `section "${id}" is marked as splittable but its entries are not:` +
              (unmarked.length > 0
                ? `\n  unmarked entries: ${unmarked.map((entry) => entry.tagName.toLowerCase()).join(", ")}`
                : "") +
              (markedContainers.length > 0
                ? `\n  marker is on a container, not on each entry: ${markedContainers
                    .map((entry) => entry.tagName.toLowerCase())
                    .join(", ")}`
                : ""),
          );
        }

        /*
          A closed element, not the section's opening tag with the heading cut off
          after it.

          That fragment is an unclosed `<section>`, and the units are concatenated
          into a document - so the browser closed it around everything that came
          next, nesting every following block inside it. The second pass then saw
          twelve blocks nested and refused to paginate. A page break cannot be
          allowed to emit malformed markup.

          And it carries `keep-together` but not the section's `mb-4`: the heading is
          no longer the end of a section, content follows it on the same sheet. The
          margin moved to the last item, where it means what it always meant.
        */
        units.push({
          node,
          id,
          html:
            heading === null
              ? node.outerHTML
              : `<div data-block="${id}" class="keep-together">${heading.outerHTML}</div>`,
        });
      }

      let sheetIndex = -1;

      return units.map(({ node, id, html }) => {
        const owner = node.closest<HTMLElement>(".a4-page");

        if (owner !== null && owner !== sheet) {
          sheet = owner;
          sheetIndex += 1;
          cursor =
            owner.getBoundingClientRect().top + parseFloat(getComputedStyle(owner).paddingTop);
        }

        const box = node.getBoundingClientRect();
        const space = box.bottom - cursor;

        cursor = box.bottom;

        return {
          id,
          pinned: node.dataset.pinned === "first",
          startsPage: node.dataset.breaksPage === "true",
          sheet: sheetIndex,
          space,
          html,
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
      pinnedToFirstPage: block.pinned,
      startsNewPage: block.startsPage,
      sheetIndex: block.sheet,
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
    /*
      A block that asks for its own sheet gets one.

      The experience is the argument of this document and the reader should meet it
      at the top of a page, not three lines under a heading that is itself three lines
      under a rule. Forcing the break is the whole point: the alternative is letting
      the packer decide, and the packer decides by what happens to fit.
    */
    if (block.startsNewPage && current.length > 0) {
      closeSheet();
    }

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

    /*
      The *last* movable block, never the first.

      Moving the first one jumps it over everything else on the sheet and drops it
      on the next, which reorders the document: a résumé came out with its summary
      stranded near the end and a role after the closing details. Order is the
      whole point of this layout, so an overflowing sheet gives up its tail.
    */
    let movable = -1;

    for (let i = sheet.length - 1; i >= 0; i--) {
      if (!sheet[i].pinnedToFirstPage) {
        movable = i;
        break;
      }
    }

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
      Prepended, not appended.

      The block came off the *end* of this sheet, so it belongs immediately before
      everything already on the next one. Appending it would put it after that
      sheet's own content - which is how a role ended up below the closing details,
      at the very end of the résumé.
    */
    const next = sheets[overflowing + 1] ?? [];

    sheets[overflowing + 1] = [moved, ...next];
  }

  return sheets;
}

/**
 * What a sheet actually occupies: the distance from its content top to the bottom
 * of its last block.
 *
 * The margin under that last block is not counted, because the print stylesheet
 * removes it - see the `last-child` rule in `resume-shell.html`. That rule is what
 * makes the arithmetic true rather than merely optimistic, so the two change
 * together: reserving here a margin that nothing renders pushes a role off a sheet
 * for four millimetres of space that no longer exists.
 */
function sheetHeight(sheet: ReadonlyArray<Measured>): number {
  return sheet.reduce((total, block) => total + block.spaceMm, 0);
}

/**
 * The reading order every document has to keep.
 *
 * A résumé is read top to bottom in about four minutes, and the order is the
 * argument: what he is, what that produced, what he can do, where he did it, what
 * else he knows. A page break can move a section to another sheet; it cannot
 * reorder them.
 *
 * Enforced here rather than trusted, because the failure is invisible in a
 * screenshot and obvious to a recruiter: a summary stranded at the bottom, a role
 * below the closing details. Three separate bugs produced exactly that, and each
 * one looked like a layout problem until the blocks were listed in order.
 */
/**
 * The reading order every document has to keep.
 *
 * A résumé is read top to bottom in about four minutes, and the order is the
 * argument: what he is, what that produced, what he can do, where he did it, what
 * else he knows. A page break can move a section to another sheet; it cannot
 * reorder them.
 *
 * Counted per section rather than by name, because a section that may break
 * between its items - the inventory, the profile block - arrives here as several
 * consecutive units and the count is what stays fixed.
 */
const REQUIRED_ORDER: ReadonlyArray<string> = [
  "header",
  "resumo",
  "metricas",
  "carreira",
  "habilidades",
  "formacao",
  "cargo",
  "cargo",
  "cargo",
  "cargo",
  "cargo",
];

function assertOrder(blocks: ReadonlyArray<Measured>, slug: string): void {
  const actual = blocks.map((block) => block.id);

  /*
    Both sides collapsed.

    A section that broke across a sheet arrives here as several consecutive units,
    so the document legitimately reads `habilidades, habilidades, ...` where the
    specification reads `habilidades` once. Comparing a collapsed document against
    an uncollapsed specification fails every time the packing does its job: the
    assertion is about the sequence of sections, not about how many units each one
    was split into.
  */
  const collapsed = actual.filter((id, i) => id !== actual[i - 1]);
  const expected = REQUIRED_ORDER.filter((id, i) => id !== REQUIRED_ORDER[i - 1]);

  /*
    The roles are counted separately.

    The sequence above cannot tell a document with five roles from one with a
    single role: collapsed, both read `... > cargo > formacao`. The count is a fact
    about the CV rather than about the layout, and a lost role is the one failure a
    reader would never notice and a recruiter would.
  */
  const roles = actual.filter((id) => id === "cargo").length;
  const rolesExpected = REQUIRED_ORDER.filter((id) => id === "cargo").length;

  const orderBroken =
    collapsed.length !== expected.length || collapsed.some((id, i) => id !== expected[i]);
  const rolesLost = roles !== rolesExpected;

  if (orderBroken || rolesLost) {
    const problems = [
      orderBroken
        ? `order differs. expected: ${expected.join(" > ")} | got: ${collapsed.join(" > ")}`
        : null,
      rolesLost ? `roles: expected ${rolesExpected}, got ${roles}` : null,
    ].filter((line) => line !== null);

    throw new Error(
      `[${slug}] document structure broken - ${problems.join("; ")}` +
        `\n  full order: ${actual.join(", ")}`,
    );
  }
}

function render(
  shell: Shell,
  sheets: ReadonlyArray<ReadonlyArray<Measured>>,
): string {
  const pages = sheets
    .map((blocks) =>
      `
        <div class="a4-page">
        ${blocks.map((block) => block.html.replace(/^\s+/, "")).join("\n        ")}
        </div>`,
    )
    .join("\n");

  return `${shell.beforeFirstPage}${pages}${shell.afterLastPage}`;
}
