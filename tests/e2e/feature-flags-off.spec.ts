import { expect, test } from "@playwright/test";

/**
 * Both features off — the configuration the site ships in.
 *
 * ## Why this build is different from the rest of the suite
 *
 * The pages are prerendered, so the flags are read while `next build` renders
 * them. The main e2e build sets both flags on (see `ci.yml`), which is what makes
 * the PDF path testable: it clicks a button and expects a compiled file. Nothing
 * there can prove the *absence* case, because the artefact it runs against was
 * built with the features on.
 *
 * So the disabled configuration gets its own build, with the two variables simply
 * absent — which is what `npm run build` does in an environment that has never
 * heard of them. That is the honest way to test "off by default": not by setting
 * a flag to `off`, but by not setting it.
 *
 * ## What is worth asserting
 *
 * "Off" has to mean absent, not relocated. A flag that hides the prominent button
 * and leaves a quieter link to the same phone number has moved the door, not
 * closed it. The WhatsApp assertions therefore count `wa.me` across whole
 * documents rather than checking one element, and the download assertion covers
 * the endpoint, because a hidden button over a live route is not a gate.
 */

const port = process.env.E2E_PORT ?? "3101";
const base = `http://127.0.0.1:${port}`;

test.describe("with the flags absent, which is the default", () => {
  test("the home page publishes no WhatsApp link anywhere", async ({ page }) => {
    await page.goto(`${base}/pt-br/`);

    expect(
      await page.locator('a[href*="wa.me"]').count(),
      "a wa.me link survived on the home page",
    ).toBe(0);
  });

  test("the resume page publishes no WhatsApp link", async ({ page }) => {
    await page.goto(`${base}/pt-br/resume`);

    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  });

  test("the contact section still offers email", async ({ page }) => {
    await page.goto(`${base}/pt-br/`);
    await page.locator("#contact").scrollIntoViewIfNeeded();

    // The fallback has to survive. A contact section that offers nothing once
    // WhatsApp is off would be a worse outcome than showing the number.
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  });

  test("the contact copy stops naming WhatsApp", async ({ page }) => {
    await page.goto(`${base}/pt-br/`);
    await page.locator("#contact").scrollIntoViewIfNeeded();

    // The narrative and the status line told the reader to use WhatsApp. Leaving
    // them would have the section describing a button that is not rendered.
    const contact = (await page.locator("#contact").innerText()).toUpperCase();

    expect(contact).not.toContain("WHATSAPP");
  });

  test("the resume page offers no download button", async ({ page }) => {
    await page.goto(`${base}/pt-br/resume`);

    await expect(page.getByRole("button", { name: /baixar pdf|download pdf/i })).toHaveCount(0);
  });

  test("the PDF endpoint answers 404", async ({ request }) => {
    const response = await request.get(`${base}/api/resume/pt-BR/pdf`, {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(404);
  });

  test("the PDF endpoint answers 404 before it looks at the locale", async ({ request }) => {
    // Not 400. A reader who can tell "this route is off" from "wrong language" has
    // been told the route exists, which is the thing the gate is for.
    const response = await request.get(`${base}/api/resume/xx-XX/pdf`, {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(404);
  });
});