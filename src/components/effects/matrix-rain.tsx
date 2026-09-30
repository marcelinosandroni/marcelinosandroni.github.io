"use client";

import { useMemo } from "react";

/**
 * The digital rain.
 *
 * ## What makes it read as the film rather than as a loading spinner
 *
 * Three things, and all three are load-bearing:
 *
 *  1. **Columns of glyphs, not bars.** A bar or a grid says "progress". A wall of
 *     falling characters says "a machine is thinking", which is the whole point
 *     of the reference.
 *  2. **A bright leading character with a dim tail.** In the film each column has
 *     one near-white glyph at its head and a trail fading to dark green behind it.
 *     A column of uniform colour reads as static text scrolling; the head is what
 *     makes it look *written*.
 *  3. **Uneven speed.** Every column falls at its own rate. Synchronised columns
 *     read as a marquee.
 *
 * ## Why the glyphs are ASCII
 *
 * The film uses half-width katakana. Rendering those needs a font that has them,
 * and the site's own monospace face does not — the browser substitutes, and on a
 * machine without a CJK font that is a screen full of tofu boxes. Digits, capitals
 * and a little punctuation render everywhere and carry the same texture, so the
 * effect cannot break on someone else's machine.
 *
 * ## Why the columns are seeded rather than random
 *
 * This renders on the server as well as the client. `Math.random()` there would
 * produce a different rain on each side and React would report a hydration
 * mismatch on every load. A tiny seeded PRNG gives the same rain in both places,
 * and makes the effect reproducible when someone reports what they are seeing.
 */

/** Half-width feel from ASCII: narrow glyphs at a tight leading. */
const GLYPHS = "0123456789ABCDEFHJKLMNPRSTUVWXYZ+-*/<>=:;[]{}$#%&@!?^~abcdefghijklmnopqrstuvwxyz";

/** Characters per column. Enough to fill the tallest viewport and scroll. */
const COLUMN_LENGTH = 34;

/** How many characters at the head get the bright treatment. */
const HEAD_LENGTH = 2;

/**
 * Stacks a string one character per line.
 *
 * The newline is the whole mechanism, and it is load-bearing: the first version
 * returned a plain string, and because the head and tail were inline spans the
 * characters flowed *sideways* along a single line. The rain looked like lines of
 * code scrolling past rather than columns falling, which is the opposite of the
 * reference. `white-space: pre` on the column is what makes the newlines real.
 */
function toColumn(text: string): string {
  return text.split("").join("\n");
}

/**
 * mulberry32: a small, fast, well-distributed 32-bit PRNG.
 *
 * Used for both the glyph choice and the per-column timing. It is not a
 * cryptographic generator and does not need to be — the only requirement is that
 * the server and the client agree.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export type MatrixColumn = {
  /** The head glyphs, rendered bright. */
  head: string;
  /** The tail, rendered dim. */
  tail: string;
  /** Animation duration in seconds. */
  duration: number;
  /** Negative delay, so the columns start at different points. */
  delay: number;
  /** Horizontal offset as a fraction of a column width. */
  offset: number;
};

/**
 * Builds `count` columns.
 *
 * Exported for tests: the visual is not assertable in a unit test, but the
 * *invariants* are — every column has a head, no column is empty, and the same
 * seed always produces the same rain.
 */
export function buildMatrixColumns(count: number, seed = 20_260_930): MatrixColumn[] {
  const random = createRandom(seed);

  return Array.from({ length: count }, () => {
    let head = "";
    let tail = "";

    for (let i = 0; i < COLUMN_LENGTH; i += 1) {
      const glyph = GLYPHS[Math.floor(random() * GLYPHS.length)];

      if (i < HEAD_LENGTH) {
        head += glyph;
      } else {
        tail += glyph;
      }
    }

    return {
      head: toColumn(head),
      tail: toColumn(tail),
      // 1.5s to 3.4s. Fast enough to read as continuous, slow enough that a
      // glyph is legible rather than a blur.
      duration: 1.5 + random() * 1.9,
      delay: -random() * 3.4,
      offset: random(),
    };
  });
}

export function MatrixRain({
  columnCount = 96,
  seed,
  className = "",
}: {
  columnCount?: number;
  seed?: number;
  className?: string;
}): React.ReactElement {
  const columns = useMemo(() => buildMatrixColumns(columnCount, seed), [columnCount, seed]);

  return (
    <div aria-hidden="true" className={`msd-rain ${className}`} data-testid="matrix-rain">
      {columns.map((column, index) => (
        <span
          // The index is the identity here: these are positional, never
          // reordered, and a stable key from a generated list is the generated
          // string, which is long and unique per render.
          key={index}
          className="msd-rain__column"
          style={
            {
              left: `${(index / columnCount) * 100}%`,
              animationDuration: `${column.duration}s`,
              animationDelay: `${column.delay}s`,
              // A sub-column nudge so the wall is not perfectly even, which is
              // what stops it reading as a grid.
              transform: `translateX(${column.offset * 0.35}ch)`,
            } as React.CSSProperties
          }
        >
          <span className="msd-rain__head">{column.head}</span>
          <span className="msd-rain__tail">{column.tail}</span>
        </span>
      ))}
    </div>
  );
}
