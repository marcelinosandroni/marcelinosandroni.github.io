import { expect, test } from "@playwright/test";

/**
 * The navigation transition.
 *
 * Two properties matter and one of them is counter-intuitive:
 *
 * 1. **A slow navigation shows a grid.** Straightforward.
 * 2. **A fast navigation shows nothing.** This is the one that is easy to get
 *    wrong, and a full-screen overlay on a warm cache reads as a glitch rather
 *    than as speed. The component arms a 120ms timer precisely so a prefetched
 *    route that resolves in 30ms never mounts anything.
 *
 * ## Why the route is delayed at page load, not at click
 *
 * The App Router prefetches `/en-us/resume` the moment the header is in the
 * viewport, so by the time the link is clicked the payload is already in the
 * client cache and **no request happens at all**. Delaying the click therefore
 * delays nothing — the "slow" tests were asserting against a request that never
 * occurred.
 *
 * Registering the route before `goto` puts the delay on the *prefetch*, which is
 * the fetch the navigation actually depends on. That is what makes a genuinely
 * slow navigation reproducible, and it is the only place a test can simulate
 * one without disabling prefetch and testing a different product.
 */

const RESUME_LINK = 'nav[aria-label] a[href="/en-us/resume"]';

/**
 * Delays every request the resume route makes, prefetch included.
 *
 * Applied *before* the initial load on purpose. The prefetch and the click use
 * the same URL, so a route registered afterwards never sees a request.
 */
async function withSlowResume(page: import("@playwright/test").Page, delayMs = 4_000): Promise<void> {
  await page.route(/\/en-us\/resume/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

test.describe("Navigation transition", () => {
  test("shows a grid and a progress bar while a slow route loads", async ({ page }) => {
    test.setTimeout(120_000);

    // Before the load, so the prefetch is the thing being delayed.
    await withSlowResume(page);
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const grid = page.locator(".msd-transition-grid");

    // The click itself does not await the navigation, so the overlay is
    // observable while the prefetch is still in flight.
    await page.locator(RESUME_LINK).first().click();
    await expect(grid).toBeVisible({ timeout: 20_000 });

    await expect(page.locator(".msd-progress")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(1);

    await page.waitForURL("**/en-us/resume", { timeout: 30_000 });
    await expect(grid).toHaveCount(0, { timeout: 8_000 });
  });

  test("shows nothing on a navigation that is already warm", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "networkidle" });

    // Visit once so the route is prefetched and warm, exactly as a returning
    // reader experiences it.
    await page.locator(RESUME_LINK).first().click();
    await page.waitForURL("**/en-us/resume", { timeout: 20_000 });
    await page.waitForTimeout(600);

    await page.goto("/en-us", { waitUntil: "networkidle" });

    const grid = page.locator(".msd-transition-grid");
    await page.locator(RESUME_LINK).first().click();
    await page.waitForURL("**/en-us/resume", { timeout: 20_000 });

    /*
     * Asserted after a fixed wait rather than with a polling matcher, because
     * `toHaveCount(0)` polls and could pass before the 120ms timer could have
     * fired — proving nothing at all. The wait must exceed the arm delay.
     */
    await page.waitForTimeout(500);
    await expect(grid).toHaveCount(0);
  });

  test("is decorative, and the progress bar carries the accessible state", async ({ page }) => {
    test.setTimeout(120_000);
    await withSlowResume(page);
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.locator(RESUME_LINK).first().click();

    const grid = page.locator(".msd-transition-grid");
    await expect(grid).toBeVisible({ timeout: 20_000 });

    /*
     * The grid is a decoration and must not be announced. Exposed as a live
     * region it would interrupt whatever the screen reader was saying, which is
     * worse than having no grid at all.
     */
    await expect(grid).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByRole("progressbar")).toHaveCount(1);
  });

  test("never blocks a click, because it is not interactive", async ({ page }) => {
    test.setTimeout(120_000);
    await withSlowResume(page);
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.locator(RESUME_LINK).first().click();

    const grid = page.locator(".msd-transition-grid");
    await expect(grid).toBeVisible({ timeout: 20_000 });

    /*
     * An overlay that swallows clicks is a worse bug than no overlay: the reader
     * clicks again, nothing happens, and the site looks frozen. `pointer-events`
     * is read rather than assumed, because it is the one property separating a
     * visual bug from a functional one.
     */
    const pointerEvents = await grid.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("none");
  });

  test("does not appear for a modified click that opens a new tab", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "networkidle" });

    await page.locator(RESUME_LINK).first().click({ modifiers: ["ControlOrMeta"] });

    // A new tab is not a transition on this page, so nothing should mount. A grid
    // here would be claiming work that is not happening.
    await page.waitForTimeout(500);
    await expect(page.locator(".msd-transition-grid")).toHaveCount(0);
  });

  test("respects prefers-reduced-motion by arriving instantly, not by disappearing", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await withSlowResume(page);

    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.locator(RESUME_LINK).first().click();

    const grid = page.locator(".msd-transition-grid");
    await expect(grid).toBeVisible({ timeout: 20_000 });

    /*
     * The grid still appears — a reader who asked for less motion still needs to
     * know something is happening — but it does not animate. Removing the
     * animation is right; removing the indicator would make a slow navigation
     * look like a frozen page.
     */
    const progress = page.locator(".msd-progress");
    const animation = await progress.evaluate((el) => getComputedStyle(el).animationName);

    expect(animation).toBe("none");

    await context.close();
  });

  test("adds no horizontal overflow while it is up", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await withSlowResume(page);

    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.locator(RESUME_LINK).first().click();
    await expect(page.locator(".msd-transition-grid")).toBeVisible({ timeout: 20_000 });

    const metrics = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));

    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
  });
});
