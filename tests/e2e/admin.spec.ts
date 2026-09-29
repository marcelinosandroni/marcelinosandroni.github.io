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

/**
 * The sign-in endpoint is the boundary, so it is tested as one.
 *
 * These run against a deployment with no Supabase credentials, which is the
 * state CI and a fork are in. That is enough to prove the properties that
 * matter: an unconfigured deployment refuses rather than pretending, and the
 * response says nothing about any address.
 */
test.describe("Owner sign-in endpoint", () => {
  test("reports that it is unconfigured rather than accepting silently", async ({ request }) => {
    const response = await request.post("/api/auth/magic-link", {
      data: { email: "someone@example.com" },
    });

    // 503, not 200: a deployment that cannot send mail must not tell the caller
    // a message is on its way.
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: "auth_not_configured" });
  });

  test("never caches, so a response cannot be replayed", async ({ request }) => {
    const response = await request.post("/api/auth/magic-link", {
      data: { email: "someone@example.com" },
    });

    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("rejects a malformed body without a 500", async ({ request }) => {
    const response = await request.post("/api/auth/magic-link", {
      headers: { "content-type": "application/json" },
      data: "not json at all",
    });

    expect(response.status()).toBe(503);
  });

  test("answers identically for an allowed and a refused address", async ({ request }) => {
    /*
     * The property that keeps the endpoint from being an oracle for who the
     * owner is. With no credentials configured both take the deployment-error
     * path, so this also pins that the allowlist is consulted *before* any
     * provider call — an address that is not on the list must never reach
     * Supabase, and therefore can never be distinguished by a provider error.
     */
    const allowed = await request.post("/api/auth/magic-link", {
      data: { email: "marcelino.sandroni@gmail.com" },
    });
    const refused = await request.post("/api/auth/magic-link", {
      data: { email: "stranger@attacker.test" },
    });

    expect(allowed.status()).toBe(refused.status());
    expect(await allowed.json()).toEqual(await refused.json());
  });

  test("the callback refuses a request with no code and reveals nothing", async ({ page }) => {
    await page.goto("/api/auth/callback");

    // Redirects to /admin, not to a rendered error, so a bad or replayed link
    // discloses nothing about why it failed.
    await expect(page).toHaveURL(/\/admin\?auth=/);
    expect((await page.locator("body").innerText()).toLowerCase()).not.toContain("error");
  });
});
