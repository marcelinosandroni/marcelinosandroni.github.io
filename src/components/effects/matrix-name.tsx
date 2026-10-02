"use client";

import { useMemo } from "react";

import { MATRIX_GLYPHS, createSeededRandom } from "@/components/effects/matrix-rain";

/**
 * A name, written out by the rain.
 *
 * ## What it is
 *
 * The reader's name, one vertical column per character, each column falling from
 * off the top of the screen and coming to rest with its own letter locked into
 * place and a trail of random glyphs standing above it.
 *
 * That trail is the whole effect. In the film a column is not a uniform strip of
 * characters: it is one bright glyph at the head and noise fading to dark behind
 * it, and the head is what makes it read as *written* rather than as a marquee.
 * Here the head happens to be the letter the reader is meant to read, so the name
 * is legible the instant each column lands and the noise behind it reads as the
 * process that put it there.
 *
 * ## Why the letters are stacked with newlines and not with columns
 *
 * `white-space: pre` plus a newline between glyphs, which is the same mechanism
 * `MatrixRain` uses and for the same reason. A `<span>` with inline children lays
 * its characters out *sideways* on one line; the newlines are what turn a string
 * into a falling column.
 *
 * ## Why every column has the same trail length
 *
 * Because the trail is taken *out of flow* — it hangs above its letter rather than
 * pushing it down — so a cell's height is its letter's line box and nothing else.
 * Every cell is therefore one line tall, every letter is on the same row, and there
 * is no per-column vertical offset anywhere. That is the usual failure of matrix name
 * effects and it is the one this design does not have, and the trail length is fixed
 * at `MATRIX_NAME_TRAIL` to keep it that way: a variable trail would be legal here
 * and would put the letters at different heights the moment anyone changed it.
 *
 * The equal lengths are still worth a test, because "legal" and "load-bearing" are
 * different claims and only one of them is enforced by the browser.
 *
 * ## Why a space is an empty column rather than a column of noise
 *
 * A word gap in the middle of a name is typography. Filling it with glyphs would
 * put a live column of rain inside the reader's own name, in the one position where
 * the eye is looking for a word boundary, and it would read as an unresolved
 * character rather than as a space. The cell keeps its width — one `ch`, from
 * `MatrixRain`'s monospace face — so the name is set correctly and the gap is a
 * gap.
 *
 * ## Why it is seeded rather than random
 *
 * The same argument as the rain, and it is the same generator: this renders on the
 * server, `Math.random()` would produce a different name on each side, and React
 * would report a hydration mismatch on every single load.
 */

/**
 * Glyphs of noise standing above each locked letter.
 *
 * Fixed rather than random per column, for the reason in the header: it is the
 * invariant that puts every letter on the same row, and a per-column value would
 * still work until the day somebody varied it.
 */
export const MATRIX_NAME_TRAIL = 9;

/**
 * How long the columns take to cross the screen.
 *
 * A floor and a ceiling rather than one number, because the effect needs two things
 * at once: long enough that a falling glyph is readable rather than a blur, and
 * with enough spread between columns that the name assembles rather than arriving
 * as a block. Every column falling in the same time reads as a slide.
 */
const MIN_FALL_MS = 1_000;
const FALL_SPREAD_MS = 520;

/**
 * The left-to-right stagger between columns, in ms.
 *
 * This is what makes the name *resolve* instead of appearing. It is deliberately
 * left to right — the way text is read — with a jitter on top, because a purely
 * random order produces a name no reader can follow as it forms.
 *
 * The budget matters: `INTRO_PHASES` gives the `locking` beat 2.6 seconds, and
 * with seventeen columns the last one has to have landed before the beat ends. At
 * 42ms a column plus the jitter ceiling and the slowest fall that lands at about
 * 2.23s, leaving the name alone for over a third of a second. Raising this number is
 * the first thing that would cut the last letters off mid-fall, and
 * `tests/unit/effects/matrix-name.test.ts` asserts the budget rather than trusting
 * the arithmetic.
 */
const STAGGER_MS = 42;

/**
 * Jitter, on top of the stagger.
 *
 * Must stay *below* `STAGGER_MS`, and that constraint is the whole reason this is a
 * named constant next to it rather than a number typed into the formula: at 160ms of
 * jitter on a 42ms stagger, a column can start before the one to its left and the
 * name forms out of order, which is exactly the thing the left-to-right stagger
 * exists to prevent. The unit test caught that by asserting the order rather than by
 * looking at it.
 *
 * The organic quality does not come from here. It comes from the 520ms spread in
 * fall *durations* below, which randomises how long each column takes without
 * touching the order they set off in — and order is what a readable name needs.
 */
const STAGGER_JITTER_MS = 38;

export type MatrixNameCell = {
  /** Position in the name. The index is the identity; these never reorder. */
  readonly index: number;
  /**
   * The character this column resolves to, or `null` for a space.
   *
   * `null` is not an empty string on purpose: it is the difference between "this
   * cell has nothing to lock" and "this cell locks a space", and only the first is
   * rendered as a gap.
   */
  readonly target: string | null;
  /**
   * The glyphs stacked above the target, newline-terminated.
   *
   * Empty for a space, because that cell has no stack at all.
   */
  readonly trail: string;
  /** Fall duration in ms. */
  readonly durationMs: number;
  /** Delay before this column starts falling, in ms. */
  readonly delayMs: number;
  /** When this column's letter reaches the name's row. */
  readonly landsAtMs: number;
};

/**
 * Builds one cell per character in `text`.
 *
 * Exported for tests: the letters are not assertable in a unit test, but every
 * *invariant* behind them is — each column has exactly one target glyph, the trail
 * is `MATRIX_NAME_TRAIL` lines, no target is a glyph from the alphabet by
 * accident, and the last column lands inside the beat.
 */
export function buildMatrixNameCells(text: string, seed = 7_770_426): MatrixNameCell[] {
  const random = createSeededRandom(seed);

  return Array.from({ length: text.length }, (_, index) => {
    const character = text.charAt(index);
    const isSpace = character.trim().length === 0;

    const durationMs = MIN_FALL_MS + random() * FALL_SPREAD_MS;
    const delayMs = index * STAGGER_MS + random() * STAGGER_JITTER_MS;

    if (isSpace) {
      return {
        index,
        target: null,
        trail: "",
        durationMs,
        delayMs,
        landsAtMs: delayMs + durationMs,
      };
    }

    let trail = "";

    for (let line = 0; line < MATRIX_NAME_TRAIL; line += 1) {
      trail += MATRIX_GLYPHS.charAt(Math.floor(random() * MATRIX_GLYPHS.length)) + "\n";
    }

    return {
      index,
      target: character,
      trail,
      durationMs,
      delayMs,
      landsAtMs: delayMs + durationMs,
    };
  });
}

export function MatrixName({
  text,
  seed,
  className = "",
}: {
  text: string;
  seed?: number;
  className?: string;
}): React.ReactElement {
  const cells = useMemo(() => buildMatrixNameCells(text, seed), [text, seed]);

  return (
    <div aria-hidden="true" className={`msd-intro__name ${className}`} data-testid="matrix-name">
      {cells.map((cell) => (
        <span
          key={cell.index}
          className="msd-intro__name-cell"
          data-gap={cell.target === null}
          /*
            Two animations, one inline declaration, and both are load-bearing.

            The first is the fall; the second settles the colour, which is why the
            delay and duration are written as *pairs* rather than once. A single
            value would apply to both comma-separated lists positionally, and a
            delay that only reached the first would leave the colour settling while
            the column was still off screen — the flash would be over before the
            letter arrived.
          */
          style={
            {
              animationDuration: `${cell.durationMs}ms, ${cell.durationMs}ms`,
              animationDelay: `${cell.delayMs}ms, ${cell.delayMs}ms`,
            } as React.CSSProperties
          }
        >
          {cell.target === null ? null : (
            <>
              <span className="msd-intro__name-trail">{cell.trail}</span>
              <span className="msd-intro__name-lock">{cell.target}</span>
            </>
          )}
        </span>
      ))}
    </div>
  );
}