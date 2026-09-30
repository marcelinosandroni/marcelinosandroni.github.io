import { expect, test } from "@playwright/test";

/**
 * `/admin` sits outside `app/[locale]`, so it is its own root layout. Without one
 * it still answered 200 from the server, and only failed in the browser with
 * "Missing <html> and <body> tags in the root layout" — which reads like a sign-in
 * bug, because that is the page the owner signs in on.
 *
 * Every assertion here is made in the browser, which is the only place the failure
 * appeared. Checking the server's HTML would have passed throughout.
 */
test.describe("Admin root layout", () => {
  test("renders its own html and body", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.locator("html")).toHaveCount(1);
    await expect(page.locator("body")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  });

  test("applies the theme variables the fonts and tokens depend on", async ({ page }) => {
    await page.goto("/admin");

    // A root layout that skipped the font variables would render unstyled text,
    // which is easy to miss on a page only the owner ever sees.
    const variables = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        manrope: style.getPropertyValue("--msd-font-manrope").trim(),
        surface: style.getPropertyValue("--color-surface-base").trim(),
      };
    });

    expect(variables.manrope).not.toBe("");
    expect(variables.surface).not.toBe("");
  });

  test("keeps the owner's traffic out of the public analytics", async ({ page }) => {
    await page.goto("/admin");

    // The locale layout documents this as deliberate: owner traffic is not part
    // of the public signal.
    const hasAnalytics = await page.evaluate(() => Boolean(document.querySelector("script[src*='/analytics']")));
    expect(hasAnalytics).toBe(false);
  });

  test("does not carry the public telemetry bar", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByText(/visit/i).first()).toHaveCount(0);
  });
});
