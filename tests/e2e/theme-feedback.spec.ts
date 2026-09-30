import { expect, test, devices } from "@playwright/test";

/**
 * The feedback question, end to end.
 *
 * Two properties matter and they pull in opposite directions: the question must
 * be *reachable* — a reader who wants to answer has to be able to — and it must
 * be *rare*, or it becomes an obstacle on every page. Most of these tests are
 * about the second.
 */

test.describe("Theme feedback prompt", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "networkidle" });
  });

  test("does not appear before the reader has used the control", async ({ page }) => {
    /*
     * The whole reason this prompt is acceptable. Asking on load puts a question
     * in front of every visitor on every page before they have any opinion, and
     * a control nobody can walk past is a control people stop seeing.
     */
    await expect(page.locator('[data-theme-feedback="prompt"]')).toHaveCount(0);

    await page.waitForTimeout(500);

    await expect(page.locator('[data-theme-feedback="prompt"]')).toHaveCount(0);
  });

  test("appears after a switch, and asks about the theme just chosen", async ({ page }) => {
    await page.getByRole("button", { name: "Matrix theme" }).click();

    const prompt = page.locator('[data-theme-feedback="prompt"]');
    await expect(prompt).toBeVisible();

    /*
     * "About the theme just chosen" is the point: the question must be about
     * matrix, not whatever the page started on.
     *
     * Asserted from the request body rather than the UI, because a prompt that
     * *says* it is about matrix while sending a stale theme is the exact bug
     * that is easy to write and hard to see.
     */
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().includes("/api/feedback/theme")),
      prompt.getByRole("button", { name: "Keep it" }).click(),
    ]);

    expect(JSON.parse(request.postData() ?? "{}")).toEqual({ theme: "matrix", verdict: "keep" });
    await expect(prompt).toHaveCount(0);
  });

  test("stays away after being answered", async ({ page }) => {
    await page.getByRole("button", { name: "Light theme" }).click();

    const prompt = page.locator('[data-theme-feedback="prompt"]');
    await expect(prompt).toBeVisible();

    await prompt.getByRole("button", { name: "Keep it" }).click();
    await expect(prompt).toHaveCount(0);

    // And it does not come back on the next page, which is the other half of
    // "once per visit".
    await page.locator('nav[aria-label] a[href="/en-us/resume"]').first().click();
    await page.waitForURL("**/en-us/resume", { timeout: 15_000 });

    await expect(page.locator('[data-theme-feedback="prompt"]')).toHaveCount(0);
  });

  test("stays away after being dismissed", async ({ page }) => {
    await page.getByRole("button", { name: "Matrix theme" }).click();

    const prompt = page.locator('[data-theme-feedback="prompt"]');
    await expect(prompt).toBeVisible();

    await prompt.getByRole("button", { name: "Dismiss this question" }).click();
    await expect(prompt).toHaveCount(0);

    // Switching again raises a fresh question: dismissal is about this one.
    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(prompt).toBeVisible();
  });

  test("offers no free-text field, because there is nowhere to put one", async ({ page }) => {
    await page.getByRole("button", { name: "Matrix theme" }).click();

    const prompt = page.locator('[data-theme-feedback="prompt"]');

    /*
     * A comment box is the obvious thing to add and it is exactly the thing
     * this design refuses. A visitor is never offered one, so a comment cannot
     * be composed, sent, or stored.
     */
    await expect(prompt.locator("textarea")).toHaveCount(0);
    await expect(prompt.locator('input[type="text"]')).toHaveCount(0);
    await expect(prompt.getByRole("textbox")).toHaveCount(0);
  });

  test("exposes every answer as a named control", async ({ page }) => {
    await page.getByRole("button", { name: "Matrix theme" }).click();

    const prompt = page.locator('[data-theme-feedback="prompt"]');

    /*
     * Three glyphs with no text are unreadable to a screen reader unless the
     * accessible name is right. `aria-label` on each button is what makes the
     * row meaningful; without it this is three anonymous symbols.
     */
    await expect(prompt.getByRole("button", { name: "Keep it" })).toBeVisible();
    await expect(prompt.getByRole("button", { name: "Not sure" })).toBeVisible();
    await expect(prompt.getByRole("button", { name: "Prefer another" })).toBeVisible();
  });

  test("every answer is a usable tap target on a phone", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/en-us", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Matrix theme" }).click();

    const small = await page
      .locator('[data-theme-feedback="prompt"]')
      .getByRole("button")
      .evaluateAll((buttons) =>
        buttons
          .map((b) => {
            const r = b.getBoundingClientRect();
            return { label: b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height) };
          })
          .filter((entry) => entry.w < 44 || entry.h < 44),
      );

    expect(small, `feedback buttons under 44px: ${JSON.stringify(small)}`).toEqual([]);

    await context.close();
  });

  test("adds no horizontal overflow on a phone", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 320, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/en-us", { waitUntil: "networkidle" });

    const before = await page.evaluate(() => document.documentElement.scrollWidth);

    await page.getByRole("button", { name: "Matrix theme" }).click();
    await page.waitForTimeout(300);

    const after = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));

    expect(before).toBeLessThanOrEqual(after.client);
    expect(after.scroll).toBeLessThanOrEqual(after.client);

    await context.close();
  });
});

test.describe("Theme feedback endpoint", () => {
  test("refuses an unknown theme", async ({ request }) => {
    const response = await request.post("/api/feedback/theme", {
      data: { theme: "neon", verdict: "keep" },
    });

    expect(response.status()).toBe(400);
  });

  test("refuses an unknown verdict", async ({ request }) => {
    const response = await request.post("/api/feedback/theme", {
      data: { theme: "paper", verdict: "excellent" },
    });

    expect(response.status()).toBe(400);
  });

  test("refuses a body carrying a comment", async ({ request }) => {
    /*
     * The endpoint, not just the UI. A crafted request with a comment field must
     * be refused even though the UI never offers one — otherwise the shape of
     * the data is a UI convention rather than a server-side guarantee.
     */
    const response = await request.post("/api/feedback/theme", {
      data: { theme: "paper", verdict: "keep", comment: "love it" },
    });

    expect(response.status()).toBe(400);
  });

  test("rejects a malformed body without a 500", async ({ request }) => {
    const response = await request.post("/api/feedback/theme", {
      headers: { "content-type": "application/json" },
      data: "not json",
    });

    expect(response.status()).toBe(400);
  });

  test("accepts a valid verdict", async ({ request }) => {
    const response = await request.post("/api/feedback/theme", {
      data: { theme: "carbon", verdict: "unsure" },
    });

    expect(response.status()).toBe(204);
  });

  test("never caches a count", async ({ request }) => {
    const response = await request.get("/api/feedback/theme");

    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("returns only enums and numbers", async ({ request }) => {
    const response = await request.get("/api/feedback/theme");
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(Array.isArray(body.counts)).toBe(true);

    for (const row of body.counts) {
      // The read side has the same shape as the write side: nothing that could
      // be a sentence, an address or a device.
      expect(Object.keys(row).sort()).toEqual(["count", "theme", "verdict"]);
      expect(typeof row.count).toBe("number");
    }
  });
});
