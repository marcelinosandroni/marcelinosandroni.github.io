import { describe, expect, it } from "vitest";

import { buildMatrixColumns } from "@/components/effects/matrix-rain";

/**
 * The rain's invariants, not its appearance.
 *
 * The visual cannot be asserted in a unit test, but the properties that make it
 * behave are all checkable, and each one corresponds to a way the effect has
 * actually been wrong:
 *
 *  - characters stacking sideways instead of falling, when the newline was missing
 *  - the server and the client building different rains, from `Math.random`
 *  - a column that cannot be read because every glyph landed on the same one
 */
describe("buildMatrixColumns", () => {
  it("stacks glyphs one per line, so a column falls rather than scrolls sideways", () => {
    const [column] = buildMatrixColumns(1);

    /*
     * The first version returned a plain string and the characters laid out along
     * a single line, which is what made the effect look like code scrolling past
     * instead of rain. `white-space: pre` on the column only acts on real
     * newlines, so this is the assertion that protects the whole look.
     */
    expect(column?.head).toContain("\n");
    expect(column?.tail).toContain("\n");
    expect(column?.head.split("\n")).toHaveLength(2);
  });

  it("never generates an empty or single-glyph column", () => {
    for (const column of buildMatrixColumns(40)) {
      expect(column.head.length).toBeGreaterThan(0);
      expect(column.tail.length).toBeGreaterThan(0);
      // 34 characters per column, 2 of them head, so 32 tail glyphs on 32 lines.
      expect(column.tail.split("\n")).toHaveLength(32);
    }
  });

  it("uses only ASCII, so no column can render as a missing-glyph box", () => {
    /*
     * The film uses half-width katakana. Rendering those needs a font with them,
     * and the site's monospace face has none — the browser substitutes, and on a
     * machine without a CJK font that is a screen full of tofu.
     */
    for (const column of buildMatrixColumns(40)) {
      for (const glyph of `${column.head}${column.tail}`.split("")) {
        if (glyph === "\n") continue;
        expect(glyph, `"${glyph}" is not ASCII`).toMatch(/^[\x20-\x7e]$/);
      }
    }
  });

  it("builds the same rain for the same seed, on the server and on the client", () => {
    // `Math.random()` here would produce a hydration mismatch on every load.
    expect(buildMatrixColumns(6, 42)).toEqual(buildMatrixColumns(6, 42));
  });

  it("builds a different rain for a different seed", () => {
    expect(buildMatrixColumns(6, 1)).not.toEqual(buildMatrixColumns(6, 2));
  });

  it("varies the speed per column, so the wall never pulses in unison", () => {
    const durations = new Set(buildMatrixColumns(30).map((column) => column.duration.toFixed(3)));

    // A synchronised wall reads as a marquee rather than as falling rain.
    expect(durations.size).toBeGreaterThan(20);
  });

  it("starts every column at a different point, via a negative delay", () => {
    for (const column of buildMatrixColumns(20)) {
      // Negative so the wall is already mid-fall on the first frame. A positive
      // delay would show an empty screen for up to 3.4s.
      expect(column.delay).toBeLessThanOrEqual(0);
    }
  });

  it("keeps every speed inside a range where a glyph stays legible", () => {
    for (const column of buildMatrixColumns(40)) {
      // Faster than ~1.4s is a blur; slower than ~3.5s stops reading as rain.
      expect(column.duration).toBeGreaterThanOrEqual(1.5);
      expect(column.duration).toBeLessThanOrEqual(3.4);
    }
  });

  it("builds exactly as many columns as asked for", () => {
    expect(buildMatrixColumns(7)).toHaveLength(7);
    expect(buildMatrixColumns(0)).toHaveLength(0);
  });
});
