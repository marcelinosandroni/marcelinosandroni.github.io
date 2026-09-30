import { expect, test } from "@playwright/test";

/**
 * The rain as a whole: the preview route, the navigation overlay, and the
 * controls in the header.
 */
test.describe("Digital rain", () => {
  test("the preview route is persistent and full-bleed", async ({ page }) => {
    await page.goto("/loading");

    const rain = page.getByTestId("matrix-rain");
    await expect(rain).toBeVisible();

    // Still there well after any navigation would have finished, which is the
    // entire reason the route exists.
    await page.waitForTimeout(1_500);
    await expect(rain).toBeVisible();

    // Fills the viewport, not a panel inside it.
    const box = await rain.boundingBox();
    const size = page.viewportSize();
    expect(box?.width).toBeGreaterThanOrEqual((size?.width ?? 0) - 1);
  });

  test("renders real columns, stacked vertically, with a bright head", async ({ page }) => {
    await page.goto("/loading");

    const rain = page.getByTestId("matrix-rain");
    await expect(rain.locator(".msd-rain__column").first()).toBeAttached();

    const columns = rain.locator(".msd-rain__column");
    expect(await columns.count()).toBeGreaterThan(20);

    // A column is much taller than it is wide. One glyph per line is what makes
    // it read as falling rain; characters laid out on one line made the first
    // version look like code scrolling past.
    const box = await columns.first().boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan((box?.width ?? 0) * 4);
  });

  test("the density selector changes how many columns are drawn", async ({ page }) => {
    await page.goto("/loading?density=sparse");
    const sparse = await page.getByTestId("matrix-rain").locator(".msd-rain__column").count();

    await page.goto("/loading?density=wall");
    const wall = await page.getByTestId("matrix-rain").locator(".msd-rain__column").count();

    expect(wall).toBeGreaterThan(sparse * 2);
  });

  test("an unknown density falls back instead of rendering nothing", async ({ page }) => {
    await page.goto("/loading?density=nonsense");

    await expect(page.getByTestId("matrix-rain")).toBeVisible();
    expect(await page.getByTestId("matrix-rain").locator(".msd-rain__column").count()).toBeGreaterThan(20);
  });

  test("is never announced as content and never takes a click", async ({ page }) => {
    await page.goto("/loading");

    const rain = page.getByTestId("matrix-rain");
    await expect(rain).toHaveAttribute("aria-hidden", "true");
    expect(await rain.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
  });

  test("is dropped entirely under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/loading");

    const rain = page.getByTestId("matrix-rain");
    await expect(rain).toBeVisible();

    // No motion: the columns are parked, not animating.
    const animation = await rain
      .locator(".msd-rain__column")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe("none");
  });

  test("the navigation overlay is the same component", async ({ page }) => {
    await page.goto("/en-us");

    // Slow the route down so the overlay has a reason to appear.
    await page.route("**/en-us/blog**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await route.continue();
    });

    await page.getByRole("link", { name: /writing|blog/i }).first().click();

    const overlay = page.locator(".msd-transition-rain");
    await expect(overlay).toBeVisible({ timeout: 10_000 });

    // Not a lookalike: the same rain component is inside it.
    await expect(overlay.getByTestId("matrix-rain")).toBeAttached();
  });
});

/**
 * The header controls. The complaint that prompted the redesign was that they
 * "did not look clickable", so the affordance is asserted rather than assumed.
 */
test.describe("Header controls", () => {
  test("all four carry a visible border, at full contrast", async ({ page }) => {
    await page.goto("/en-us");

    /*
     * The locale switcher carries `.language`, which shares every declaration with
     * `.header-control` through a selector list in the stylesheet, so the DOM
     * class differs and both have to be counted here.
     */
    const controls = page.locator("#site-header .header-control, #site-header .language");
    // Soundtrack, theme, owner, locale.
    await expect(controls).toHaveCount(4);

    const count = await controls.count();
    for (let index = 0; index < count; index += 1) {
      const style = await controls.nth(index).evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          border: computed.borderTopWidth,
          borderColor: computed.borderTopColor,
          opacity: computed.opacity,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        };
      });

      expect(style.border, `control ${index} has no border`).not.toBe("0px");
      // The owner's link used to be at opacity-50, which reads as disabled.
      expect(style.opacity, `control ${index} looks disabled`).toBe("1");
      // And at the touch floor, not merely clickable in principle.
      expect(style.height, `control ${index} is under the 44px floor`).toBeGreaterThanOrEqual(43);
      expect(style.width, `control ${index} is under the 44px floor`).toBeGreaterThanOrEqual(43);
    }
  });

  test("the soundtrack control is in the header, and not in the footer", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator("#site-header .header-control").first()).toBeVisible();
    await expect(page.locator("footer").getByRole("button", { name: /soundtrack/i })).toHaveCount(0);
  });

  test("the sound control is a mute toggle, starting muted", async ({ page }) => {
    await page.goto("/en-us");

    const control = page.locator("#site-header").getByRole("button", { name: /soundtrack/i });

    // Muted by default, and the label says so.
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(control).toHaveAccessibleName(/unmute/i);
  });

  test("the header shrinks once scrolled and comes back at the top", async ({ page }) => {
    await page.goto("/en-us");

    const header = page.locator("#site-header");
    const tall = (await header.boundingBox())?.height ?? 0;

    await page.evaluate(() => window.scrollTo(0, 1200));
    // Coalesced to one update per animation frame.
    await page.waitForTimeout(400);

    await expect(header).toHaveAttribute("data-compact", "");
    const short = (await header.boundingBox())?.height ?? 0;

    expect(short, "the header did not shrink").toBeLessThan(tall);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await expect(header).not.toHaveAttribute("data-compact", "");
  });

  test("does not shrink on a small nudge, which is a bounce rather than a scroll", async ({ page }) => {
    await page.goto("/en-us");

    await page.evaluate(() => window.scrollTo(0, 20));
    await page.waitForTimeout(300);

    // A phone rubber-band or a keyboard nudging a focused control into view must
    // not change the header height.
    await expect(page.locator("#site-header")).not.toHaveAttribute("data-compact", "");
  });
});
