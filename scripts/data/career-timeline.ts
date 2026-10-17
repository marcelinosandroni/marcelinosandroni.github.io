/**
 * The career timeline bar.
 *
 * ## What this is for
 *
 * A visual restatement of something the document already says. Every company,
 * every date and every level on this bar appears in the experience section, in
 * words, in the same order. The bar is there because a shape reads faster than a
 * list - not because it says anything new.
 *
 * ## Why the widths are flex and not percentages
 *
 * Because `flex: <months> 1 0` is the only way to keep the ratios exact.
 *
 * The third value is the part that matters. Flexbox hands out the space *left
 * over* after every item has taken its basis, so with the default `auto` basis
 * each item starts at the width of its own contents - and "Zup", "BNP Paribas"
 * and "Principal & AI Engineer" are three different widths. The free space is
 * then divided by grow factor on top of those unequal bases, and the segments
 * come out wrong: measured at 120 / 151 / 173 / 87 / 146 pixels for ratios that
 * should read 101 / 183 / 214 / 76 / 103.
 *
 * `flex-basis: 0` starts every item from nothing, so the grow factor alone decides
 * the width and the proportions are the months exactly. A percentage cannot do it
 * either - a percentage measures the container, and the gaps between segments are
 * not part of any one of them.
 *
 * ## The ATS rule
 *
 * Everything in here is decoration and says nothing the body does not say, so the
 * whole block is `aria-hidden` and `role="presentation"`: a screen reader walks
 * past it rather than reading five fragments of a career out of context.
 *
 * The honest limit of that is written down rather than glossed over. `aria-hidden`
 * is honoured by assistive technology reading the HTML, and by nothing else.
 * Chromium's print-to-PDF turns every glyph into text in the content stream, and
 * `pdftotext` - which is what an ATS usually runs - has no way to know a run was
 * hidden, so it will still emit these labels. If the pipeline that reads these
 * PDFs needs them gone from the text layer as well, the bar has to be rasterised
 * or the labels dropped; `html-to-pdf.ts` is where that choice would be made.
 *
 * Until then this satisfies the screen-reader half of the rule exactly and the
 * extractor half not at all, and pretending otherwise would be worse than saying
 * so.
 */

/** One segment of the bar. */
export type Segment = {
  /** What is printed above the segment. Kept short: the bar is narrow. */
  readonly label: string;
  /** Months in the role. Drives the width. Ignored for the future segment. */
  readonly months: number;
  /** Printed under the segment. Empty for a segment that has no level to show. */
  readonly level: string;
  /** Fill. The past runs light to dark so the eye reads time left to right. */
  readonly tone: string;
  /** The reserved end of the bar: outlined, unfilled, no time behind it. */
  readonly future?: boolean;
};

/**
 * The share of the bar held back for what comes next.
 *
 * Not decoration either. A bar that ends flush at the present implies the career
 * stopped there, which is the one thing this document should not imply.
 */
export const FUTURE_SHARE = 0.15;

export const FUTURE_LABEL = "?";
export const FUTURE_LEVEL = "Principal &amp; AI Engineer";

/*
  The ramp, from the CV's own palette.

  Slate is what the rest of the document is drawn in - the section rules, the card
  borders, the metric values - so the bar reads as part of the page instead of a
  chart pasted onto it. Light to dark means the longest stretch of career sits at
  the dark end and the newest role carries the weight, which is the opposite of
  how seniority usually reads and closer to how a recruiter scans a timeline.
*/
export const TONES = {
  lightest: "#cbd5e1",
  light: "#94a3b8",
  mid: "#64748b",
  dark: "#1e293b",
} as const;

/** A role as the timeline needs it: a range of dates, not a rendered string. */
export type TimelineRole = {
  readonly label: string;
  readonly period: string;
  readonly level: string;
  readonly tone: string;
};

const MONTH_INDEX: Readonly<Record<string, number>> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

/**
 * The two ends of a period, as month numbers.
 *
 * One parser, used by the widths and by the year ruler, because a ruler reading a
 * different date than the bar it sits under is a ruler that lies - and it did, for
 * a while, over a single untrimmed leading space turning " set" into a month that
 * does not exist.
 */
function parsePeriod(period: string): { start: [number, number]; end: [number, number] } {
  const [from, to] = period
    .split("·")[0]
    .split("–")
    .map((part) => part.trim());

  const read = (value: string | undefined): [number, number] => {
    const [month, year] = (value ?? "").split("/");
    const index = MONTH_INDEX[(month ?? "").trim().toLowerCase()];
    const parsedYear = Number(year);

    if (index === undefined || Number.isNaN(parsedYear)) {
      throw new Error(`cannot read a date: "${value ?? ""}" in "${period}"`);
    }

    return [index, parsedYear];
  };

  return { start: read(from), end: read(to) };
}

/**
 * Months between two dates, counting both ends.
 *
 * Inclusive, because that is how the tenures on the document are counted: someone
 * who joins in March and leaves in June did four months of work, not three. A bar
 * built on a different convention from the text beside it would be a quiet lie.
 */
export function monthsIn(period: string): number {
  const { start, end } = parsePeriod(period);

  return (end[1] - start[1]) * 12 + (end[0] - start[0]) + 1;
}

/**
 * The bar must be talking about the same jobs the document lists.
 *
 * Every start date on the timeline has to be one the document actually carries. A
 * timeline is a second rendering of the experience section, and a second rendering
 * is where the two start drifting: a date gets moved, the bar keeps the old one,
 * and the two disagree on a page with no marker saying which is right.
 *
 * It checks the start dates rather than the widths, because the widths are derived
 * from those dates and so cannot independently disagree.
 */
export function assertTimelineMatchesRoles(
  slug: string,
  roles: ReadonlyArray<TimelineRole>,
  renderedHtml: string,
): void {
  const documentStarts = new Set(
    [...renderedHtml.matchAll(/class="role-meta">[^<]*?([A-Za-zç]{3})\/(\d{4})/g)].map(
      (match) => `${match[1]}/${match[2]}`,
    ),
  );

  const orphans = roles
    .filter((role) => !documentStarts.has(role.period.split("·")[0].trim().split("–")[0].trim()))
    .map((role) => `${role.label} (${role.period})`);

  if (orphans.length > 0) {
    throw new Error(
      `[${slug}] the career timeline mentions roles the document does not list: ` +
        `${orphans.join(", ")}. The bar restates the experience section - if a date ` +
        `moved, move it there too.`,
    );
  }
}

/**
 * Turns a run of segments into the markup.
 *
 * The future segment is not one of the caller's: it is always appended, always
 * reserved at the same share, so every document ends on the same open block and
 * the bar is comparable between them at a glance.
 */
/** Turns a run of roles into the markup, oldest stretch on the left. */
/**
 * Turns a run of roles into the markup, oldest stretch on the left.
 *
 * The open segment is not one of the caller's: it is always appended, always
 * reserved at the same share, so every document ends on the same empty block and
 * two bars can be compared at a glance.
 */
export function buildTimeline(roles: ReadonlyArray<TimelineRole>): string {
  if (roles.length === 0) {
    throw new Error("a timeline with no history is just an empty box");
  }

  const months = roles.map((role) => monthsIn(role.period));
  const pastMonths = months.reduce((total, value) => total + value, 0);
  const pastShare = 1 - FUTURE_SHARE;

  /*
    Flex-grow for the future is derived from the history rather than fixed.

    "15% of the bar" is 15% of the bar, and the bar is as long as the history is
    long. Two documents with different histories therefore need different numbers
    to reserve the same share, and fixing the figure would silently give one of
    them a longer or shorter open block.
  */
  const future = (pastMonths * FUTURE_SHARE) / pastShare;
  const grow = (value: number): string => `flex:${value.toFixed(3)} 1 0`;

  const row = (className: string, cells: ReadonlyArray<string>): string =>
    `<div class="${className}">${cells.join("")}</div>`;

  const slot = (flexGrow: string, inner: string): string =>
    `<div class="tl-slot" style="${flexGrow}"><div class="tl-inner">${inner}</div></div>`;

  const widths = [...months.map(grow), grow(future)];

  return [
    `<div class="tl">`,
    row(
      "tl-row tl-row--labels",
      widths.map((width, index) =>
        slot(
          width,
          index >= roles.length
            ? `<div class="tl-label tl-future-mark">${FUTURE_LABEL}</div>`
            : `<div class="tl-label">${roles[index].label}</div>`,
        ),
      ),
    ),
    row(
      "tl-row tl-row--bar",
      widths.map((width, index) =>
        index >= roles.length
          ? slot(width, `<div class="tl-bar tl-bar--future"></div>`)
          : slot(width, `<div class="tl-bar" style="background:${roles[index].tone}"></div>`),
      ),
    ),
    row("tl-row tl-row--levels", widths.map((width, index) =>
      slot(
        width,
        index >= roles.length
          ? `<div class="tl-level tl-level--future">${FUTURE_LEVEL}</div>`
          : `<div class="tl-level">${roles[index].level}</div>`,
      ),
    )),
    yearAxis(roles),
    `</div>`,
  ].join("\n            ");
}

/**
 * The year ruler, 2019 to 2026.
 *
 * A reader looking at four segments of different lengths is guessing at the dates.
 * The ruler turns the guess into a reading: it answers "how long was that one?"
 * without leaving the picture, which is the only thing a picture is good at.
 *
 * Positioned absolutely against the past region rather than laid out as its own
 * row of cells, because a second row of cells has its own gaps and its own
 * fractional widths, and the ticks would drift off the boundaries they are
 * supposed to mark - a tick claiming 2022 in the middle of a segment that ends in
 * 2021 is worse than no ruler at all.
 *
 * The years come from the roles rather than from a constant, so a document whose
 * career starts later does not carry a ruler claiming years it never worked in.
 */
function yearAxis(roles: ReadonlyArray<TimelineRole>): string {
  const first = roles[0];
  const last = roles[roles.length - 1];

  if (first === undefined || last === undefined) {
    throw new Error("the year ruler needs at least one role");
  }

  const [startMonth, startYear] = parsePeriod(first.period).start;
  const [endMonth, endYear] = parsePeriod(last.period).end;
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

  if (totalMonths <= 0) {
    throw new Error(
      `the year ruler found no span between "${first.period}" and "${last.period}"`,
    );
  }

  const ticks: string[] = [];

  for (let year = startYear; year <= endYear; year++) {
    /*
      The first year starts at the left edge and the last one ends at the right,
      so the outermost labels are pinned rather than centred on their tick - a
      centred one hangs off the edge of the bar and the ruler looks broken.
    */
    const firstTick = year === startYear;
    const lastTick = year === endYear;

    const offset =
      firstTick ? 0 : (year * 12 + 1 - (startYear * 12 + startMonth)) / totalMonths;
    const position = Math.min(1, Math.max(0, offset)) * (1 - FUTURE_SHARE) * 100;

    /*
      The last year is positioned like the rest, then pulled left by its own width.

      Pinning it with `right: 0` would put it under the reserved block, claiming a
      year the career has not reached - which is the one thing the open end of the
      bar is there to say it has not.
    */
    const align = firstTick
      ? "left:0;"
      : `left:${position.toFixed(2)}%;${lastTick ? "transform:translateX(-100%);" : ""}`;

    ticks.push(
      `<span class="tl-year${firstTick ? " tl-year--first" : ""}${lastTick ? " tl-year--last" : ""}" style="${align}">${year}</span>`,
    );
  }

  return `<div class="tl-axis" aria-hidden="true">${ticks.join("")}</div>`;
}


/**
 * The CSS the bar needs, appended to the print stylesheet.
 *
 * Kept beside the markup that uses it on purpose: the two encode the same
 * decision, and splitting them across a stylesheet and a data module is how a
 * proportion and a label end up disagreeing without either file looking wrong.
 */
export const TIMELINE_CSS = `
            /* The career timeline. One block, never split across a page break. */
            .tl { display: flex; flex-direction: column; gap: 0.9mm; padding-top: 0.5mm; }
            .tl-row { display: flex; align-items: stretch; gap: 0.7mm; }
            .tl-slot { display: flex; min-width: 0; }
            .tl-inner {
                display: flex; flex: 1 1 auto; min-width: 0;
                /*
                  Stretch, not centre.

                  Centring a column's children sizes them to their content, and a
                  segment has no content - so every bar came out zero pixels wide
                  and the timeline rendered as labels floating over an empty strip.
                  The text centres itself instead.
                */
                flex-direction: column; align-items: stretch; justify-content: center;
                text-align: center;
            }

            /*
              The sizes are the document's own.

              9px is what the metric captions use and 11.5px is the body; the bar
              was first drawn at 7.4 and 6.6, smaller than anything else on the
              page, which made the one element meant to be read at a glance the
              hardest thing on it to read.

              No backticks in these comments: this is a template literal, and one
              would close the string the CSS lives in.
            */
            .tl-label {
                font-size: 9.5px; font-weight: 700; line-height: 1.15; color: #1e293b;
                text-align: center; white-space: nowrap;
            }
            /*
              min-width 0 is what lets the caption wrap inside its own segment.

              A flex item's default minimum is its content width, so a caption
              longer than its segment refuses to wrap and spills over the edge of
              the thing it belongs to.
            */
            .tl-level {
                font-size: 8.5px; font-weight: 500; line-height: 1.2; color: #64748b;
                text-align: center; letter-spacing: 0.01em; min-width: 0; max-width: 100%;
            }
            .tl-bar { width: 100%; height: 4.4mm; border-radius: 0.9mm; }
            .tl-bar--future {
                background: transparent;
                border: 0.5mm dashed #94a3b8;
                border-radius: 0.9mm;
            }
            .tl-future-mark {
                font-size: 15px; font-weight: 800; color: #94a3b8; line-height: 1;
                text-align: center;
            }
            .tl-level--future { color: #1e293b; font-weight: 700; }

            /*
              The year ruler.

              Absolutely positioned inside the bar and scaled by the past share,
              so a tick for 2023 lands where January actually falls rather than a
              fraction of the way along. Pinned at the two ends rather than
              centred on their tick: a centred one hangs off the edge of the bar
              and the ruler reads as broken.
            */
            .tl-axis {
                position: relative; height: 4.6mm; margin-top: 0.2mm;
                border-top: 1px solid #e2e8f0;
            }
            .tl-year {
                position: absolute; top: 0.8mm; transform: translateX(-50%);
                font-size: 9px; font-weight: 600; color: #94a3b8;
                line-height: 1; white-space: nowrap;
            }
            .tl-year--first { transform: none; }
`;
