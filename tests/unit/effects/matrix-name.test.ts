import { describe, expect, it } from "vitest";

import { MATRIX_NAME_TRAIL, buildMatrixNameCells } from "@/components/effects/matrix-name";
import { MATRIX_GLYPHS } from "@/components/effects/matrix-rain";
import { INTRO_PHASES } from "@/domain/intro";
import { SITE_OWNER } from "@/domain/site/site-info";

/**
 * The name's invariants, not its appearance.
 *
 * The letters cannot be asserted in a unit test, but every property that makes the
 * effect behave is checkable, and each one corresponds to a way a matrix name effect
 * has actually gone wrong:
 *
 *  - a column that scrolls sideways instead of falling, when the newline is missing
 *  - a server/client split from `Math.random`, on every load
 *  - letters that do not line up, because one column had a longer trail than another
 *  - the last letter still falling when the beat ended
 */
describe("buildMatrixNameCells", () => {
  const cells = buildMatrixNameCells(SITE_OWNER.introName);

  it("makes one cell per character, so the name has the width it should", () => {
    expect(cells).toHaveLength(SITE_OWNER.introName.length);
    expect(cells.map((cell) => cell.index)).toEqual(
      Array.from({ length: SITE_OWNER.introName.length }, (_, index) => index),
    );
  });

  it("gives every character back exactly what went in", () => {
    expect(cells.filter((cell) => cell.target !== null).map((cell) => cell.target).join("")).toBe(
      SITE_OWNER.introName.replaceAll(" ", ""),
    );
  });

  it("stacks the trail one glyph per line, so a column falls rather than scrolls", () => {
    for (const cell of cells) {
      if (cell.target === null) {
        continue;
      }

      /*
        Newline-terminated, so the trail is `TRAIL` lines and the letter sits one line
        below the last of them. A trail built by joining without a trailing newline
        would put the letter on the same line as the last glyph — which renders as
        every column's letter arriving a glyph too early, and as the trail one line
        shorter than the constant says.
      */
      const lines = cell.trail.split("\n");
      expect(lines.length, `cell ${cell.index} has ${lines.length} lines`).toBe(MATRIX_NAME_TRAIL + 1);
      expect(lines.at(-1), `cell ${cell.index} has no trailing newline`).toBe("");
    }
  });

  it("draws the trail from the same alphabet the rain uses", () => {
    // A second alphabet would be a second texture: a name that resolved out of a
    // subtly different rain than the one behind it reads as pasted on.
    for (const cell of cells) {
      for (const glyph of cell.trail.replaceAll("\n", "")) {
        expect(MATRIX_GLYPHS, `"${glyph}" is not in the rain's alphabet`).toContain(glyph);
      }
    }
  });

  it("gives every column the same number of lines, which is what lines the letters up", () => {
    /*
      The trail hangs out of flow above its letter, so a cell's height is its
      letter's line box — equal trail lengths are *legal* to vary but would put the
      letters at different heights the moment anyone did. This asserts the invariant
      rather than trusting the constant, because the two claims are different and only
      one of them is enforced by the browser.
    */
    const heights = new Set(
      cells
        .filter((cell) => cell.target !== null)
        .map((cell) => cell.trail.split("\n").length),
    );

    expect(heights.size).toBe(1);
  });

  it("renders a space as a gap rather than another column of noise", () => {
    const gap = cells.find((cell) => cell.target === null);

    expect(gap, "the name has no space in it, so this asserts nothing").not.toBeUndefined();
    expect(gap?.trail).toBe("");
  });

  it("stagger left to right, with jitter, so the name can be followed as it forms", () => {
    for (let index = 1; index < cells.length; index += 1) {
      expect(
        cells[index]?.delayMs ?? 0,
        `cell ${index} starts before cell ${index - 1}`,
      ).toBeGreaterThan(cells[index - 1]?.delayMs ?? 0);
    }

    // The jitter is what stops it reading as a mechanical wipe, so it has to exist:
    // an all-zero difference would still pass the ordering above.
    const gaps = cells.map((cell, index) => cell.delayMs - (cells[index - 1]?.delayMs ?? 0));
    expect(new Set(gaps).size).toBeGreaterThan(1);
  });

  it("is deterministic, because it renders on the server too", () => {
    expect(buildMatrixNameCells("MARCELINO SANDRONI")).toEqual(cells);
    expect(buildMatrixNameCells("MARCELINO SANDRONI", 7_770_426)).toEqual(cells);
  });

  it("differs when the seed does, or the effect is not reproducible when reported", () => {
    expect(buildMatrixNameCells("MARCELINO SANDRONI", 1)).not.toEqual(cells);
  });
});

/**
 * The beat has to outlast the columns.
 *
 * This is the one assertion in this file that belongs to neither layer on its own:
 * the name's timings live in the presentation and the beat's length lives in the
 * domain, and nothing inside either of them notices when one outgrows the other.
 * A stagger that outlasts its beat does not error — it cuts the last letters off
 * mid-fall, which is only visible in a browser and reads as a typo.
 */
describe("the locking beat against the columns it has to contain", () => {
  const lockingMs = INTRO_PHASES.find((step) => step.phase === "locking")?.durationMs ?? 0;
  const cells = buildMatrixNameCells(SITE_OWNER.introName);

  it("lets the last column land before the beat ends", () => {
    const lastLanding = Math.max(...cells.map((cell) => cell.landsAtMs));

    expect(
      lastLanding,
      `the last letter lands at ${lastLanding}ms but the beat is ${lockingMs}ms`,
    ).toBeLessThan(lockingMs);
  });

  it("leaves the finished name alone on screen rather than cutting straight to the rise", () => {
    const lastLanding = Math.max(...cells.map((cell) => cell.landsAtMs));
    const hold = lockingMs - lastLanding;

    // A fifth of a second is the floor for a name to be read as a word rather than
    // as a flash. Below this the sequence should lose the name, not shorten the beat.
    expect(hold).toBeGreaterThanOrEqual(150);
  });

  it("lands the first column well before the last, so the name assembles", () => {
    const first = Math.min(...cells.map((cell) => cell.landsAtMs));
    const last = Math.max(...cells.map((cell) => cell.landsAtMs));

    // Synchronised columns read as a slide, which is the one thing the effect is not.
    expect(last - first).toBeGreaterThan(600);
  });
});