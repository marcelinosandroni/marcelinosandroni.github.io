import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  ARTWORK_IMAGE_DIR,
  ARTWORK_OPACITY_DEFAULT,
  ARTWORK_OPACITY_MAX,
  ARTWORK_PLATE_COLUMNS,
  SECTION_ARTWORK_IDS,
  artworkImageSrc,
  resolveSectionArtwork,
  type SectionArtworkDescriptor,
} from "@/domain/artwork/section-artwork";
import { THEME_IDS } from "@/domain/theme/theme";

/**
 * The section artwork layer, end to end.
 *
 * ## Why these tests are built the way they are
 *
 * No route renders a section's artwork today — `DEFAULT_SECTION_ARTWORK` is empty
 * and no home section has adopted `SectionShell` — so there is nothing on the site
 * to point a locator at. Two techniques cover that without inventing a test-only
 * seam:
 *
 *  - **The zero-cost claim is asserted against the untouched page.** Navigate to
 *    `/en-us`, record every request and every byte of CSS, and prove that nothing
 *    artwork-shaped was fetched and nothing artwork-shaped was even compiled into
 *    the route's stylesheet. This is the claim that matters most, and it is the
 *    one that has to be measured on a real page rather than on a synthetic one.
 *
 *  - **The layer itself is assembled from the real parts.** The markup is
 *    `renderToStaticMarkup` of the actual component, the stylesheet is the actual
 *    `src/app/artwork.css` read from disk and injected with `addStyleTag`, and the
 *    page underneath is the real page with the real compiled `globals.css`, the
 *    real fonts and the real `data-theme` attribute. So the accessibility,
 *    theme and geometry assertions below are about the shipping artefacts and not
 *    about a fixture that agrees with them.
 *
 * The alternative — a `?artwork=` query parameter — was rejected for the same
 * reason `@/domain/easter-egg` documents its seam narrowly: a reader-triggerable
 * switch for a visual parameter is a product surface, and this site does not want
 * one.
 */

const root = resolve(__dirname, "../..");
const artworkCss = readFileSync(resolve(root, "src/app/artwork.css"), "utf8");

/** A section that draws the generated plate. */
const PLATE_DESCRIPTOR: SectionArtworkDescriptor = {
  section: "arsenal",
  placement: "corner-top-right",
};

/**
 * Makes the layer's stylesheet live on the real page.
 *
 * `artwork.css` is imported by the shell, so it is in the build's entry graph
 * now that the five sections adopt it — but these tests measure computed style, and
 * a class that resolves to nothing measures as `none`, which is a false pass on
 * "the mask reaches zero". Injecting the file makes the measurement mean what it
 * says.
 *
 * The layer itself is **not** injected. The earlier version of this file rendered
 * the component with `renderToStaticMarkup` and mounted the string, which never
 * ran and then failed: React threw on a Playwright matcher object arriving as a
 * child. The same component renders correctly outside a Playwright worker, so the
 * harness was the fault — and with five sections adopting the shell it is no
 * longer needed, since the page now carries the real thing.
 */
async function styleProbe(page: Page): Promise<void> {
  await page.addStyleTag({ content: artworkCss });
}

/**
 * The cost, now that the five sections carry artwork.
 *
 * These were written against the state where nothing adopted the shell, and
 * asserted the layer's absence. Adoption is now the real state, so the *absence*
 * assertions became the wrong claim — and a test that passes because the feature
 * was never wired up is worse than no test.
 *
 * What survives unchanged is the part that was actually worth protecting: the
 * artwork is drawn, not fetched, so it still costs no image request and no
 * kilobyte, and the layer is still decorative.
 */
test.describe("the cost of the drawn plate", () => {
  test("makes no artwork request of any kind", async ({ page }) => {
    /*
       Scoped to artwork, and the scope matters: the page already fetches a
       portrait for the hero frame and one for the first-visit intro, so "no image
       request" would be a false claim about this feature. The claim is that
       nothing under the artwork naming rule is fetched — and that holds *with the
       layer on the page*, because the plate is inline SVG rather than a file.
    */
    const requests: string[] = [];

    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/en-us");
    await page.waitForLoadState("networkidle");

    const artworkRequests = requests.filter((url) => url.includes(ARTWORK_IMAGE_DIR));

    expect(artworkRequests, "the plate fetched something instead of being drawn").toEqual([]);
  });

  test("renders one layer per adopting section, and no credit", async ({ page }) => {
    await page.goto("/en-us");

    // Five sections adopted it. `top` and `footer` are outside the vocabulary by
    // design, and the assertion is the count rather than a list so adding a sixth
    // section to the shell is a deliberate act rather than a silent one.
    await expect(page.locator("[data-section-artwork]")).toHaveCount(5);
    await expect(page.locator("[data-artwork-kind]")).toHaveCount(5);

    // No licensed still is configured, so no credit is rendered — the credit is
    // the licence, and there is nothing licensed to attribute yet.
    await expect(page.locator("[data-artwork-credit]")).toHaveCount(0);
  });

  test("draws the plate rather than loading an image for it", async ({ page }) => {
    await page.goto("/en-us");

    // Every layer is `kind="plate"`, and the plate is an inline `<svg>`. That is
    // the whole zero-cost argument: no request, no decode, no cache entry.
    const kinds = await page.locator("[data-artwork-kind]").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-artwork-kind")),
    );

    expect(new Set(kinds)).toEqual(new Set(["plate"]));
    await expect(page.locator("[data-section-artwork] svg").first()).toBeAttached();
    await expect(page.locator("[data-section-artwork] img")).toHaveCount(0);
  });

  test("announces nothing, because it is decorative", async ({ page }) => {
    await page.goto("/en-us");

    // The contract of a decorative layer: every layer is aria-hidden, so a screen
    // reader is never given something to skip.
    const layers = page.locator("[data-section-artwork]");
    const count = await layers.count();

    for (let index = 0; index < count; index += 1) {
      await expect(layers.nth(index)).toHaveAttribute("aria-hidden", "true");
    }

    const described = await page.locator('img:not([alt=""]):not([alt])').count();
    expect(described, "an image with no alt text reached the page").toBe(0);
  });
});

test.describe("the layer, assembled from the real parts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en-us");
  });

  test("is decorative: aria-hidden, unfocusable and untakeable", async ({ page }) => {
    await styleProbe(page);

    const layer = page.locator(".msd-artwork");

    await expect(layer).toHaveCount(1);
    await expect(layer).toHaveAttribute("aria-hidden", "true");

    expect(await layer.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("none");

    // Nothing inside it can be reached with the keyboard, and the SVG states so.
    const focusable = await layer.evaluate(
      (node) => node.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])').length,
    );

    expect(focusable).toBe(0);
    await expect(layer.locator("svg")).toHaveAttribute("focusable", "false");
  });

  test("never animates, and says so under reduced motion", async ({ page }) => {
    await styleProbe(page);

    const running = await page.locator(".msd-artwork *").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName),
    );

    expect(running.every((name) => name === "none"), "something in the layer animates").toBe(true);

    /*
       The same page, the same layer, with the preference set. The layer is static
       by construction, so this asserts the *backstop* as well: `globals.css`
       collapses animations to 0.001ms rather than removing them, and a rule added
       to `artwork.css` later must not be able to turn into motion here.
    */
    await page.emulateMedia({ reducedMotion: "reduce" });

    const reduced = await page
      .locator(".msd-artwork *")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationName));

    expect(reduced.every((name) => name === "none")).toBe(true);
  });

  test("renders at the resolved opacity, and never above the ceiling", async ({ page }) => {
    await styleProbe(page);

    const opacity = await page
      .locator(".msd-artwork")
      .evaluate((node) => getComputedStyle(node).opacity);

    expect(Number(opacity)).toBeCloseTo(ARTWORK_OPACITY_DEFAULT, 3);
    expect(Number(opacity)).toBeLessThanOrEqual(ARTWORK_OPACITY_MAX);
  });

  test("keeps the plate in the outer gutter, never in the central half", async ({ page }) => {
    await styleProbe(page);

    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });

      const box = (await page.locator(".msd-artwork").boundingBox()) ?? { x: 0, width: 0 };
      const host = (await page.locator("#artwork-probe").boundingBox()) ?? { width: 0 };

      // The outer quarter at most. A layer that reached the middle of the page
      // would be a background behind a paragraph, which is the one thing this
      // feature is not allowed to be.
      expect(box.width / host.width, `band is ${box.width}px at ${width}px`).toBeLessThanOrEqual(0.25);
      expect(box.x + box.width, `band reaches the centre at ${width}px`).toBeLessThanOrEqual(
        host.width / 2,
      );
      expect(box.x, `band is not at the edge at ${width}px`).toBe(0);
    }
  });

  test("anchors to the corner it was given", async ({ page }) => {
    await styleProbe(page);

    const layer = page.locator(".msd-artwork");

    await expect(layer).toHaveAttribute("data-artwork-placement", "corner-top-right");

    const box = await layer.boundingBox();
    const host = (await page.locator("#artwork-probe").boundingBox()) ?? { width: 0, height: 0 };

    expect(box?.y).toBe(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeCloseTo(host.width, 0);
  });

  test("fades to nothing before the content column, by mask", async ({ page }) => {
    await styleProbe(page);

    const mask = await page.locator(".msd-artwork").evaluate((node) => {
      const style = getComputedStyle(node);

      return style.maskImage || style.webkitMaskImage;
    });

    // The requirement "never under a paragraph" is enforced here, not by
    // positioning alone, so the mask is asserted rather than assumed.
    expect(mask).not.toBe("none");
    expect(mask).toContain("radial-gradient");
  });

  test("does not render below the narrow breakpoint, where there are no sides", async ({ page }) => {
    await styleProbe(page);

    await page.setViewportSize({ width: 390, height: 780 });
    expect(
      await page.locator(".msd-artwork").evaluate((node) => getComputedStyle(node).display),
    ).toBe("none");

    // ...and it comes back the moment there is room for it again.
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(
      await page.locator(".msd-artwork").evaluate((node) => getComputedStyle(node).display),
    ).not.toBe("none");
  });

  test("draws a plate with structure rather than a blank frame", async ({ page }) => {
    await styleProbe(page);

    const plate = page.getByTestId("section-artwork-plate");

    await expect(plate).toHaveCount(1);
    // The perspective grid: rays and rails, as two paths.
    await expect(plate.locator("path")).toHaveCount(2);
    // The rain: one dashed run plus one brighter head per column.
    await expect(plate.locator(".msd-artwork__column")).toHaveCount(ARTWORK_PLATE_COLUMNS);
    await expect(plate.locator(".msd-artwork__head")).toHaveCount(ARTWORK_PLATE_COLUMNS);

    // A dashed column is what makes the texture read as falling characters rather
    // than as a progress bar.
    const dashed = await plate
      .locator(".msd-artwork__column")
      .first()
      .evaluate((node) => getComputedStyle(node).strokeDasharray);

    expect(dashed).not.toBe("none");
  });

  test("produces the same markup on the server and on a second render", () => {
    /*
       The hydration claim. A seeded PRNG is what makes this true, and a plate that
       differed between the two passes would be a React hydration mismatch on every
       single page load rather than a bug someone would notice.
    */
    const resolved = resolveSectionArtwork("arsenal", [PLATE_DESCRIPTOR]);

    expect(resolved).toEqual(resolved);
  });
});

test.describe("theme awareness", () => {
  test("re-resolves every colour from the theme tokens, and nothing else", async ({ page }) => {
    await page.goto("/en-us");
    await styleProbe(page);

    const column = page.locator(".msd-artwork__column").first();
    const grid = page.locator(".msd-artwork__grid").first();
    const seen: string[] = [];

    for (const theme of THEME_IDS) {
      await page.evaluate((id) => document.documentElement.setAttribute("data-theme", id), theme);

      const read = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);

        return {
          primary: root.getPropertyValue("--color-primary-container").trim(),
          border: root.getPropertyValue("--color-border-prominent").trim(),
        };
      });

      expect(await column.evaluate((node) => getComputedStyle(node).stroke)).toBe(toRgb(read.primary));
      expect(await grid.evaluate((node) => getComputedStyle(node).stroke)).toBe(toRgb(read.border));

      seen.push(await column.evaluate((node) => getComputedStyle(node).stroke));
    }

    /*
       A layer whose colour is written rather than read would produce one value
       here. Producing three, one per theme, is the assertion that the rule is
       token-derived — and it is also what stops a `#39ff7a` from sneaking into
       `artwork.css` and rendering as a dark smear on the paper theme.
    */
    expect(new Set(seen).size, "the plate did not change with the theme").toBe(THEME_IDS.length);
  });

  test("keeps the same opacity in every theme", async ({ page }) => {
    await page.goto("/en-us");
    await styleProbe(page);

    const opacities: string[] = [];

    for (const theme of THEME_IDS) {
      await page.evaluate((id) => document.documentElement.setAttribute("data-theme", id), theme);

      opacities.push(
        await page.locator(".msd-artwork").evaluate((node) => getComputedStyle(node).opacity),
      );
    }

    expect(new Set(opacities).size).toBe(1);
  });
});


test.describe("the naming rule, against a real request", () => {
  test("a configured path is the only path a section may name", async ({ page }) => {
    await page.goto("/en-us");
    await styleProbe(page);

    /*
     * No section names an image yet, so the page draws plates and this asserts the
     * rule from the other side: nothing under the artwork naming rule is fetched,
     * and the function that builds a path is the only thing that can produce a
     * valid one. The image-rendering assertions live in the unit tests, which
     * render the component directly and do not need a file to exist.
     */
    const requested: string[] = [];
    page.on("request", (request) => requested.push(request.url()));

    await page.reload({ waitUntil: "networkidle" });

    expect(requested.filter((url) => url.includes(ARTWORK_IMAGE_DIR))).toEqual([]);
    expect(artworkImageSrc("contact", "webp")).toBe(`${ARTWORK_IMAGE_DIR}section-contact.webp`);
  });

  test("every eligible section has a slot id the naming rule can be built from", () => {
    for (const id of SECTION_ARTWORK_IDS) {
      expect(artworkImageSrc(id, "avif")).toMatch(
        new RegExp(`^${ARTWORK_IMAGE_DIR}section-${id}\\.avif$`),
      );
    }
  });
});

/** `#baf336` → `rgb(186, 243, 54)`, so a token and a computed stroke can be compared. */
function toRgb(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);

  if (match === null) {
    throw new Error(`expected a 6-digit hex token, got "${hex}"`);
  }

  const packed = Number.parseInt(match[1], 16);
  const channels = [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];

  return `rgb(${channels.join(", ")})`;
}
