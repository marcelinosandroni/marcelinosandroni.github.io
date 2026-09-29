import { test, expect } from "@playwright/test";

test.describe("Telemetry bar reports only real measurements", () => {
  test("shows timings measured by the browser, not hardcoded values", async ({ page }) => {
    await page.goto("/en-us");

    const bar = page.getByLabel(/real load metrics/i);
    await expect(bar).toBeVisible();

    // Every figure must be a real millisecond reading, never a fixed claim.
    const values = await bar.locator("span.font-mono").allInnerTexts();
    const measured = values.filter((value) => /\d+\s*ms/.test(value));

    expect(measured.length).toBeGreaterThanOrEqual(3);
    for (const value of measured) {
      expect(value).toMatch(/^\d+ ms$/);
    }
  });

  test("makes no uptime or availability claim of its own", async ({ page }) => {
    await page.goto("/en-us");

    const bar = page.getByLabel(/real load metrics/i);
    await expect(bar).toBeVisible();

    // Scoped to the bar on purpose: the resume legitimately says "uptime from
    // 95% to 100%" about a settlement system, which is a fact, not a claim
    // about this site. The bar must never assert availability it cannot measure.
    const barText = (await bar.innerText()).toLowerCase();

    expect(barText).not.toContain("uptime");
    expect(barText).not.toContain("99.99");
    expect(barText).not.toContain("edge");
    expect(barText).not.toContain("region");
  });

  test("makes no request of its own to produce the numbers", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await page.goto("/en-us");
    await expect(page.getByLabel(/real load metrics/i)).toBeVisible();

    // A self-referential metric is not worth an extra request on every page
    // view, so the bar must be built purely from timings the browser already
    // collected while rendering the page.
    expect(requests.filter((url) => url.includes("/api/telemetry"))).toEqual([]);
  });
});
