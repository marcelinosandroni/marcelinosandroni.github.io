import { describe, expect, it } from "vitest";

import { THEME_IDS, nextThemeInCycle } from "@/domain/theme/theme";

/**
 * The `T` shortcut cycles through the three themes.
 *
 * The interesting cases are the invalid ones, because the shortcut is pressed by
 * someone who has not looked at the header and whose stored preference may be
 * stale or hand-edited. If the current theme cannot be trusted, the cycle must
 * still move — otherwise the shortcut silently does nothing on exactly the page
 * that is already broken.
 */
describe("nextThemeInCycle", () => {
  it("advances through every theme and comes back round", () => {
    expect(nextThemeInCycle("carbon")).toBe("paper");
    expect(nextThemeInCycle("paper")).toBe("matrix");
    expect(nextThemeInCycle("matrix")).toBe("carbon");
  });

  it("returns to the start after one full pass, for every theme", () => {
    for (const start of THEME_IDS) {
      const afterThree = nextThemeInCycle(nextThemeInCycle(nextThemeInCycle(start)));
      expect(afterThree, `three presses from ${start} must return to ${start}`).toBe(start);
    }
  });

  it("cycles from the default when the current theme is not a valid id", () => {
    for (const hostile of [null, undefined, "", "neon", 42, {}, []]) {
      expect(nextThemeInCycle(hostile), `${JSON.stringify(hostile)} must not break the cycle`).toBe("paper");
    }
  });

  it("always lands on a real theme", () => {
    for (const start of [...THEME_IDS, "garbage", null]) {
      expect(THEME_IDS).toContain(nextThemeInCycle(start));
    }
  });

  it("puts the two conventional themes before the joke one", () => {
    /*
     * A reader pressing `T` once expects a change of brightness. Landing on the
     * matrix theme first would be a joke landing on someone who has not opted
     * into it, so the order is fixed rather than incidental.
     */
    expect(THEME_IDS).toEqual(["carbon", "paper", "matrix"]);
  });
});
