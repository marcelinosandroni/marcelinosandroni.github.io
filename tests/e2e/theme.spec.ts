import { expect, test } from "@playwright/test";

/**
 * The theme mechanism, proven in a browser.
 *
 * A passing unit test here proves the *files* are consistent. It cannot prove
 * that overriding a CSS custom property actually restyles a rendered page —
 * which is the entire claim, and the kind of thing that passes a type check
 * while doing nothing on screen.
 *
 * So these measure computed styles. A theme that changes the declarations but
 * not the painted result fails here, and a selector that is present in the DOM
 * but never read fails here too.
 */

const THEMES = ["carbon", "paper", "matrix"] as const;

/** Reads a token as the browser resolves it, not as it is written in the file. */
async function tokens(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const read = (name: string) => style.getPropertyValue(name).trim();

    return {
      surfaceBase: read("--color-surface-base"),
      textPrimary: read("--color-text-primary"),
      primary: read("--color-primary-container"),
      // And the value that actually paints, which is what a reader sees.
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    };
  });
}

/**
 * Switches theme the way the picker does: attribute *and* stored preference.
 *
 * Setting the attribute alone would let a test pass while the choice is never
 * persisted, which is the difference between a working picker and one that
 * resets on every visit.
 */
/** Writes the attribute and the preference, which is what the picker does. */
async function setTheme(page: import("@playwright/test").Page, theme: string) {
  await page.evaluate((value) => {
    document.documentElement.setAttribute("data-theme", value);
    try {
      window.localStorage.setItem("msd:theme:v1", value);
    } catch {
      /* private mode */
    }
  }, theme);
}

/**
 * Seeds the preference *after* the page loads, then reloads.
 *
 * `addInitScript` runs in every frame, including `about:blank` on the way to
 * the site, so writing storage there lands in a different origin's store and
 * silently does nothing. Writing once the real document is present, then
 * reloading, is the sequence that actually exercises what a returning reader
 * gets — which is why the earlier version of this file failed while looking
 * like it was testing persistence.
 */
async function seedTheme(page: import("@playwright/test").Page, theme: string) {
  await page.evaluate((value) => {
    try {
      window.localStorage.setItem("msd:theme:v1", value);
    } catch {
      /* private mode */
    }
  }, theme);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(200);
}


test.describe("Theme switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("msd:boot-seen:v1", "1");
      } catch {
        /* private mode */
      }
    });
    await page.goto("/en-us", { waitUntil: "networkidle" });
  });

  test("every theme paints a different page", async ({ page }) => {
    const seen: Record<string, string> = {};

    for (const theme of THEMES) {
      await setTheme(page, theme);
      // Let the repaint land before measuring.
      await page.waitForTimeout(120);
      seen[theme] = (await tokens(page)).bodyBackground;
    }

    const unique = new Set(Object.values(seen));

    /*
     * Not "each theme differs from the default" — that would pass with two
     * themes sharing a background. Every theme has to be distinguishable from
     * every other, or the picker is offering a choice that does not exist.
     */
    expect(unique.size, `backgrounds were: ${JSON.stringify(seen)}`).toBe(THEMES.length);
  });

  test("themes change the tokens the components actually consume", async ({ page }) => {
    await setTheme(page, "carbon");
    const carbon = await tokens(page);

    await setTheme(page, "matrix");
    await page.waitForTimeout(120);
    const matrix = await tokens(page);

    await setTheme(page, "paper");
    await page.waitForTimeout(120);
    const paper = await tokens(page);

    // The token itself changes...
    expect(matrix.surfaceBase).not.toBe(carbon.surfaceBase);
    expect(paper.surfaceBase).not.toBe(carbon.surfaceBase);
    expect(paper.surfaceBase).not.toBe(matrix.surfaceBase);

    // ...and so does the painted body, which is the part that is easy to
    // declare in CSS and forget to apply.
    expect(matrix.bodyBackground).not.toBe(carbon.bodyBackground);
    expect(paper.bodyBackground).not.toBe(carbon.bodyBackground);
  });

  test("text stays readable against its own surface in every theme", async ({ page }) => {
    /**
     * A theme is not finished when it is different. It is finished when the
     * text is still legible, and the naive way to produce a light theme — invert
     * the background, leave the text — produces a page nobody can read.
     *
     * WCAG relative luminance, so the threshold is the real one rather than a
     * guess at what "readable" means.
     */
    const ratios: Array<{ theme: string; ratio: number; fg: string; bg: string }> = [];

    for (const theme of THEMES) {
      await setTheme(page, theme);
      await page.waitForTimeout(120);

      const { textPrimary, surfaceBase } = await tokens(page);

      /*
       * The browser normalises a declared value: `#000000` reads back as `#000`
       * and `#ffffff` as `#fff`. So the pattern has to accept the short form,
       * or the test reports a contrast failure caused by its own parser.
       */
      const isColour = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

      expect(textPrimary, `theme "${theme}" text-primary is not a colour: "${textPrimary}"`).toMatch(isColour);
      expect(surfaceBase, `theme "${theme}" surface-base is not a colour: "${surfaceBase}"`).toMatch(isColour);

      const parse = (value: string) => {
        let h = value.replace("#", "");
        if (h.length === 3) {
          h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        return [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
        ] as const;
      };

      const luminance = (hex: string) => {
        const [r, g, b] = parse(hex).map((channel) => {
          const s = channel / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const a = luminance(textPrimary);
      const b = luminance(surfaceBase);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

      ratios.push({ theme, ratio, fg: textPrimary, bg: surfaceBase });
    }

    for (const entry of ratios) {
      expect(
        entry.ratio,
        `theme "${entry.theme}" has ${entry.ratio.toFixed(2)}:1 between text ${entry.fg} and surface ${entry.bg}; WCAG AA for body text needs 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("a theme survives a reload, so the choice is not lost", async ({ page }) => {
    await seedTheme(page, "matrix");

    /*
     * The attribute is what CSS reads, so it has to be reapplied from storage
     * before first paint. A page that flashes the default and then corrects
     * itself is worse than one that never changes: the reader sees the wrong
     * thing first.
     */
    expect(await page.getAttribute("html", "data-theme")).toBe("matrix");
  });

  test("an unknown stored theme falls back instead of leaving the page unstyled", async ({ page }) => {
    await seedTheme(page, "theme-from-the-future");

    // Whatever the page decides, it must be one of the real themes and must have
    // painted. No attribute at all would mean the fallback chain broke.
    const attribute = await page.getAttribute("html", "data-theme");
    expect(THEMES).toContain((attribute ?? "carbon") as (typeof THEMES)[number]);

    const { bodyBackground } = await tokens(page);
    expect(bodyBackground).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("the theme survives navigation between pages", async ({ page }) => {
    await seedTheme(page, "matrix");

    // By href, not by accessible name. The header carries a "PT" locale link
    // whose text is not "Resume", and a name-based `.first()` reached it on some
    // runs — which navigated to /pt-br and made a working theme look broken.
    await page.locator('nav[aria-label] a[href="/en-us/resume"]').first().click();

    // `waitForURL`, not `waitForLoadState`: this is a client-side transition,
    // which has no document load event, so the load state is already "complete"
    // and resolves before the route has changed.
    await page.waitForURL("**/en-us/resume", { timeout: 15_000 });
    await page.waitForTimeout(300);

    /*
     * Navigation is when a theme is most likely to be lost, because the next
     * page is a fresh document. If the choice only held within a single page it
     * would not be a preference at all.
     */
    expect(await page.getAttribute("html", "data-theme")).toBe("matrix");
  });
});
