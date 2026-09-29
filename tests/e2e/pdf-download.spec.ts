import { expect, test } from "@playwright/test";

/**
 * Covers the localized routing contract (EPIC-02 / US-02):
 * canonical URLs per locale, shareable links, negotiation on the bare URL and
 * the PDF download flow in both languages.
 */
test.describe("Localized routing and PDF download", () => {
  test("serves the English resume at the canonical /en-us URL by default", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/en-us$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.locator("h1")).toContainText("Marcelino Sandroni Dias");
    await expect(page.locator(".hero-title")).toContainText("Senior Software Engineer");
    await expect(page.locator("#experience h2")).toContainText("Experience");

    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
    expect(download.suggestedFilename()).toContain("resume-marcelino-sandroni-en-US");
  });

  test("serves the Portuguese resume at /pt-br and downloads the PT-BR PDF", async ({ page }) => {
    await page.goto("/pt-br");

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator(".hero-title")).toContainText("Engenheiro de Software Sênior");
    await expect(page.locator("#experience h2")).toContainText("Experiência");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("resume-marcelino-sandroni-pt-BR");
  });

  test("navigates between locales through the switcher link", async ({ page }) => {
    await page.goto("/en-us");

    const switchLink = page.getByRole("link", { name: /read this resume in português/i });
    await expect(switchLink).toBeVisible();
    await switchLink.click();

    await expect(page).toHaveURL(/\/pt-br$/);
    await expect(page.locator("#experience h2")).toContainText("Experiência");

    const backLink = page.getByRole("link", { name: /ler este currículo em english/i });
    await backLink.click();

    await expect(page).toHaveURL(/\/en-us$/);
    await expect(page.locator("#experience h2")).toContainText("Experience");
  });

  test("negotiates the locale from Accept-Language on the bare URL", async ({ browser }) => {
    const ptContext = await browser.newContext({ locale: "pt-BR" });
    const ptPage = await ptContext.newPage();
    await ptPage.goto("/");
    await expect(ptPage).toHaveURL(/\/pt-br$/);
    await ptContext.close();

    const enContext = await browser.newContext({ locale: "en-US" });
    const enPage = await enContext.newPage();
    await enPage.goto("/");
    await expect(enPage).toHaveURL(/\/en-us$/);
    await enContext.close();
  });

  test("keeps legacy ?locale= links working by redirecting to a path", async ({ page }) => {
    await page.goto("/?locale=pt-BR");

    await expect(page).toHaveURL(/\/pt-br$/);
    await expect(page.locator("#experience h2")).toContainText("Experiência");
  });

  test("normalizes non-canonical locale casing", async ({ page }) => {
    await page.goto("/PT-BR");

    await expect(page).toHaveURL(/\/pt-br$/);
  });

  test("returns 404 for unsupported locales", async ({ page }) => {
    const response = await page.goto("/fr");

    expect(response?.status()).toBe(404);
  });

  test("declares hreflang alternates and canonical URLs for both locales", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en-us$/);

    const english = page.locator('link[rel="alternate"][hreflang="en-US"]');
    const portuguese = page.locator('link[rel="alternate"][hreflang="pt-BR"]');
    const fallback = page.locator('link[rel="alternate"][hreflang="x-default"]');

    await expect(english).toHaveAttribute("href", /\/en-us$/);
    await expect(portuguese).toHaveAttribute("href", /\/pt-br$/);
    await expect(fallback).toHaveAttribute("href", /\/en-us$/);
  });

  test("publishes localized metadata", async ({ page }) => {
    await page.goto("/pt-br");

    await expect(page).toHaveTitle(/Engenheiro de Software Sênior/);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "pt_BR");
    await expect(page.locator('meta[property="og:locale:alternate"]')).toHaveAttribute("content", "en_US");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Currículo vivo/);
  });

  test("displays a loading state during PDF generation", async ({ page }) => {
    /*
     * 700ms of injected latency was not reliably slower than the assertion that
     * reads the state, so the test passed or failed depending on machine load —
     * four consecutive runs gave two passes and two failures. The window has to
     * be comfortably longer than any plausible scheduling delay, and the route
     * handler is held open until the assertion has had its chance rather than
     * racing it.
     */
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route("**/api/resume/**/pdf", async (route) => {
      await held;
      await route.continue();
    });

    await page.goto("/pt-br");
    // The loading state only exists once the client island has hydrated, so wait
    // for the page to be interactive before clicking. Without this the click can
    // land on a not-yet-hydrated button and no state is ever set.
    await page.waitForLoadState("networkidle");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    const downloadPromise = page.waitForEvent("download");

    await downloadButton.click();
    // The request is parked, so the state below is guaranteed to still be
    // present when it is read.
    await expect(page.getByRole("button", { name: /gerando/i })).toBeVisible({ timeout: 10_000 });

    release();
    expect((await downloadPromise).suggestedFilename()).toContain(".pdf");
  });

  test("has accessible navigation and an English locale switcher", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.getByLabel(/back to top/i)).toBeVisible();
    await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /download pdf/i })).toBeEnabled();
  });

  test("downloads the selected alternate template from the arrow menu", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /choose pdf template/i }).click();

    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /reference/i })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: /reference/i }).click();

    expect((await downloadPromise).suggestedFilename()).toContain("REFERENCE");
  });

  test("ships no resume content in the browser JavaScript bundle", async ({ page }) => {
    const chunks: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/_next/static/") && url.endsWith(".js")) {
        chunks.push(await response.text());
      }
    });

    await page.goto("/en-us");
    await page.waitForLoadState("networkidle");

    const bundle = chunks.join("\n");

    expect(bundle.length).toBeGreaterThan(0);
    expect(bundle).not.toContain("Minority Report");
    expect(bundle).not.toContain("AnimateMatrix");
    expect(bundle).not.toContain("skillGroups");
    expect(bundle).not.toContain("Bacharelado");
  });
});
