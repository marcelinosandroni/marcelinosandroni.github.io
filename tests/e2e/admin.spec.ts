import { expect, test } from "@playwright/test";

/**
 * The admin surface is the one place on this site where access control is the
 * feature, so it gets its own guards rather than an incidental assertion.
 */
test.describe("Owner admin area", () => {
  test("is reachable at a stable, locale-independent path", async ({ page }) => {
    const response = await page.goto("/admin");

    // Must not 404, and must not be swallowed by the locale redirect, which
    // would send an owner to /en-us/admin and break the callback URL.
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/admin");
  });

  test("never renders owner content to an anonymous visitor", async ({ page }) => {
    await page.goto("/admin");

    const body = await page.locator("body").innerText();

    expect(body).not.toContain("marcelino.sandroni@gmail.com");
    expect(body).not.toMatch(/signed in as/i);
  });

  test("offers no password field, because the surface is passwordless", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test("explains itself when no provider is configured", async ({ page }) => {
    await page.goto("/admin");

    // Either a working sign-in form or an explicit "not configured" state.
    // What must never happen is a blank page or a crash.
    await expect(page.locator("main")).toBeVisible();
  });

  test("is excluded from search indexing", async ({ page }) => {
    await page.goto("/admin");

    const robots = await page.locator('meta[name="robots"]').getAttribute("content");

    expect(robots).toContain("noindex");
  });

  test("is reachable from a discreet link in the header", async ({ page }) => {
    await page.goto("/en-us");

    const lock = page.getByRole("link", { name: /owner access/i });
    await expect(lock).toBeVisible();
    await lock.click();

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("does not turn the public pages dynamic", async ({ request }) => {
    // Reading the session in the header would make every page a server render
    // to display one glyph. The header must stay a static, cacheable document.
    const response = await request.get("/en-us");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-nextjs-cache"]).not.toBe("MISS");
  });
});
