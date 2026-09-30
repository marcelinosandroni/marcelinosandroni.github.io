import { expect, test } from "@playwright/test";

/**
 * The arrival sequence, end to end, in a browser.
 *
 * The domain tests own the policy; this owns the three things only a browser can
 * answer — that the beats actually advance, that the layer actually leaves, and
 * that nothing on the page is unreachable while it is up.
 */
test.describe("First-visit intro", () => {
  test("plays the four beats in order on a first visit, then gets out of the way", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    // Each phase is polled rather than awaited by name, so the test asserts the
    // *order* without hard-coding the millisecond each beat takes.
    const seen: string[] = [];
    const deadline = Date.now() + 12_000;

    while (Date.now() < deadline && seen.length < 4) {
      const phase = await page.locator("[data-intro-phase]").getAttribute("data-intro-phase").catch(() => null);
      if (phase !== null && seen.at(-1) !== phase) {
        seen.push(phase);
      }
      await page.waitForTimeout(80);
    }

    expect(seen).toEqual(["connecting", "door", "reveal", "enter"]);

    // And it leaves on its own, without the reader touching anything.
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 4_000 });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("shows the portrait, which is the point of the reveal", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const portrait = page.locator(".msd-intro__portrait");
    await expect(portrait).toBeVisible({ timeout: 8_000 });

    // The image resolves rather than showing a broken frame. The alt is empty on
    // purpose — the intro is aria-hidden decoration — so the assertion is on the
    // natural width, which is zero for an image that failed to decode.
    const loaded = await portrait
      .locator("img")
      .evaluate((element) => (element as HTMLImageElement).naturalWidth > 0);
    expect(loaded, "the portrait did not decode").toBe(true);
  });

  test("is abandoned by a single keypress, at any point", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    // During the handshake, which is the beat people are most likely to be
    // waiting through. A first-visit animation is a promise, not a prison.
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 2_000 });
  });

  test("does not play again on a return visit", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);

    // A refresh is not an absence. This is the assertion that stops the arrival
    // from becoming the thing a reader sees every time they hit reload.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("an open tab is not an absence", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);
    await page.keyboard.press("Escape");

    // The activity stamp refreshes on an interval while the tab is open, so
    // coming back to a tab left open is not "arriving again".
    const stored = await page.evaluate(() => window.localStorage.getItem("msd:intro-seen:v1"));
    expect(stored, "the visit was never recorded").not.toBeNull();
    expect(JSON.parse(stored ?? "{}").lastActiveAt).toBeGreaterThan(0);
  });

  test("never runs under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(2_500);

    // Not "shorter". The sequence is a stack of full-screen animation, and a
    // reduced version of it is still a stack of full-screen animation.
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("is not announced, focusable, or able to trap a keyboard reader", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const intro = page.locator(".msd-intro");
    await expect(intro).toHaveAttribute("aria-hidden", "true");

    const roles = await intro.evaluate((element) =>
      element.querySelectorAll("[role], [aria-live], [aria-modal], [tabindex]").length,
    );
    expect(roles, "the intro exposed focusable or announced structure").toBe(0);

    // Tabbing must reach the page underneath, not bounce inside the overlay.
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
    }
    const inside = await page.evaluate(() => document.activeElement?.closest(".msd-intro") !== null);
    expect(inside, "focus was trapped inside the intro").toBe(false);
  });

  test("does not cover the site once it has played", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 12_000 });

    // The site was painted and interactive the whole time; the intro is a
    // curtain over it, not a load.
    await expect(page.getByRole("link", { name: /resume/i }).first()).toBeVisible();
  });
});
