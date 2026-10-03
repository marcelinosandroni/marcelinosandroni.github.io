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

    const grid = page.locator(".msd-rain");

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

    const grid = page.locator(".msd-rain");
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

    const grid = page.locator(".msd-rain");
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

    const grid = page.locator(".msd-rain");
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
    await expect(page.locator(".msd-rain")).toHaveCount(0);
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

    const grid = page.locator(".msd-rain");
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

  /**
   * The bug that made the site unusable, and the one property every other test here
   * depends on: the overlay always comes back down.
   *
   * Clicking the MSD logo while already on the home page used to leave the rain and the
   * progress bar up **forever**. The overlay's whole lifetime is derived from
   * `pathname` changing: arm on click, show after 120ms, resolve when the new pathname
   * arrives. A link to the page you are already on navigates to the same pathname, so
   * the effect keyed on it never re-ran, the timer fired, and no second signal was
   * coming. Measured before the fix: still up at +3000ms, and every further click
   * re-armed it.
   */
  test("does not raise the transition for a link to the page already open", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "networkidle" });

    const brand = page.locator("header a").first();

    // The precondition, stated rather than assumed: this test is about a self-link,
    // and a brand pointing somewhere else would make it pass for the wrong reason.
    expect(await brand.getAttribute("href")).toBe("/en-us");

    const rain = page.locator(".msd-rain");
    await brand.click();

    /*
      A fixed wait well past the 120ms arm delay rather than `toHaveCount(0)`, which
      polls and could pass before the timer had any chance to fire — the same trap the
      warm-navigation test above documents. 500ms is four arm delays.
     */
    await page.waitForTimeout(500);
    await expect(rain).toHaveCount(0);
    await expect(page.locator(".msd-progress")).toHaveCount(0);

    // And still nothing a second later, so this is not a late mount.
    await page.waitForTimeout(500);
    await expect(rain).toHaveCount(0);
  });

  /**
   * The belt to that braces, and the part that matters for a bug this bad.
   *
   * The first fix stops the self-link from arming at all. This one is about every
   * *other* way a navigation can start and never report back — a hung fetch, a router
   * that never commits, anything added later that starts a transition and changes no
   * pathname. The failure mode those share is a full-screen overlay with no way out,
   * and that has to be impossible regardless of which signal goes missing.
   *
   * ## Reproducing a navigation that never lands
   *
   * By hanging the request rather than by cancelling the click, because
   * `preventDefault()` does not work and the first attempt proved it: the listener was
   * registered on `window` in the bubble phase so it ran *after* the component's
   * capture listener, exactly as intended — and the router navigated anyway. `<Link>`
   * calls `preventDefault()` on the event itself and then drives `router.push`
   * programmatically, so the navigation is already in flight by the time anything
   * outside React can reach the event. Measured: the listener logged `prevented` and
   * the path was `/en-us/resume` anyway.
   *
   * A fetch that never settles is the thing that actually strands the overlay, and it
   * is reachable: registered before the initial load, so it is the *prefetch* that
   * hangs, and the navigation that depends on the prefetch waits with it.
   */
  test("cannot strand the overlay when the navigation never lands", async ({ page }) => {
    test.setTimeout(120_000);

    // Before the load, so this is the prefetch that hangs. See the file header.
    await page.route(/\/en-us\/resume/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      await route.abort();
    });

    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const rain = page.locator(".msd-rain");
    await page.locator(RESUME_LINK).first().click();

    await expect(rain, "the arm never fired, so this proves nothing").toBeVisible({ timeout: 5_000 });

    /*
      The precondition of the whole test: the pathname has *not* changed, so the effect
      that normally resolves the overlay is not going to. Checked after a wait well past
      the 120ms arm, because "still on /en-us" before the overlay is up proves nothing.
     */
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname, "the navigation landed, so nothing was stranded").toBe("/en-us");
    await expect(rain, "the overlay resolved itself, so the ceiling was never needed").toHaveCount(1);

    /*
      The ceiling. `expect` retries, so this asserts "gone eventually" rather than
      "gone by 6s" — the exact bound is the component's private constant, and
      duplicating that number here is how the two drift apart. What is asserted is the
      property: a full-screen effect cannot outlive its own navigation.
     */
    await expect(rain).toHaveCount(0, { timeout: 12_000 });
    await expect(page.locator(".msd-progress")).toHaveCount(0, { timeout: 12_000 });
  });

  test("adds no horizontal overflow while it is up", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await withSlowResume(page);

    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.locator(RESUME_LINK).first().click();
    await expect(page.locator(".msd-rain")).toBeVisible({ timeout: 20_000 });

    const metrics = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));

    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
  });
});
