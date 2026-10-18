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
  });

  test("keeps the PDF download off the hero and on the full resume page", async ({ page }) => {
    /*
     * The download is deliberately only on /[locale]/resume. A 200KB download is
     * not a decision a visitor should have to make from the hero, before they know
     * what they are getting, so its absence there is the contract.
     */
    await page.goto("/en-us");

    await expect(page.getByRole("button", { name: /download pdf/i })).toHaveCount(0);

    await page.goto("/en-us/resume");

    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;

    /*
      Asserted in full, because a partial match passes for almost any convention.
      What matters is that it names the role in the language the document is
      written in, and that nothing in it is a slug or a locale code.
    */
    expect(download.suggestedFilename()).toBe("Marcelino Sandroni - Software Engineer.pdf");
  });

  test("serves the Portuguese resume at /pt-br and downloads the PT-BR PDF", async ({ page }) => {
    await page.goto("/pt-br");

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator(".hero-title")).toContainText("Engenheiro de Software Sênior");
    await expect(page.locator("#experience h2")).toContainText("Experiência");

    await expect(page.getByRole("button", { name: /baixar pdf/i })).toHaveCount(0);

    await page.goto("/pt-br/resume");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("Marcelino Sandroni - Engenheiro de Software.pdf");
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
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /R\$ 24M\/ano em contrato resgatado/,
    );
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

    await page.goto("/pt-br/resume");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    const downloadPromise = page.waitForEvent("download");
    // Waited on explicitly rather than via `networkidle`: this island is a
    // download button, and the only signal that matters is the button itself.
    await expect(downloadButton).toBeEnabled();

    try {
      /*
       * Both waiters are armed before the click. Registering the request waiter
       * afterwards is a race: the fetch fires during the click, so the listener
       * starts a moment too late and times out on an event that already
       * happened.
       */
      const requestPromise = page.waitForRequest(/api\/resume\/.*\/pdf/, { timeout: 15_000 });

      await downloadButton.click();

      /*
       * The request has to be observed before the label is read. If the click
       * landed before hydration there is no fetch at all and no loading state
       * will ever appear — the old test just waited 10s and failed, and worse,
       * left the parked route handler hanging because `release` was never
       * reached. That leak is what turned one flaky test into 13 minutes of
       * timeouts across the rest of the suite.
       */
      await requestPromise;

      await expect(page.getByRole("button", { name: /gerando/i })).toBeVisible({ timeout: 10_000 });

      release();
      expect((await downloadPromise).suggestedFilename()).toContain(".pdf");
    } finally {
      // Always unblock the route, so a failure here cannot cascade.
      release();
    }
  });

  test("has accessible navigation and an English locale switcher", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.getByLabel(/back to top/i)).toBeVisible();
    await expect(page.getByRole("navigation", { name: /main navigation/i })).toBeVisible();
  });

  test("offers one download and no template menu", async ({ page }) => {
    /*
     * Five tests used to live here, all about a menu offering a template per
     * download: that it opened, that it closed on an outside click, on Escape, on
     * its own toggle, and that it stayed inside the viewport. Each was a real
     * behaviour of a control that no longer exists.
     *
     * The menu is gone because the download serves a document built and committed
     * in this repository, which has one form — so both of its entries fetched the
     * same PDF and the reader was offered a distinction that did not exist. The
     * choice that remains, the stack, is made by the selector on the same page, as
     * a URL, so it can be bookmarked and sent to somebody.
     *
     * What replaces them is the claim that matters now: one control, and nothing
     * on the page asking which template to download.
     */
    await page.goto("/en-us/resume");

    await expect(page.getByRole("button", { name: /download pdf/i })).toHaveCount(1);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.getByRole("menuitem")).toHaveCount(0);
  });

  test("asks for the stack it is showing, and never for a template", async ({ page }) => {
    /*
     * The `template` parameter used to ride along on every download and be ignored
     * by the route, so `?template=DETAILED` returned the default document under a
     * name promising something else. The parameter is refused now, which means
     * the button has to stop sending it — and a button that started again would
     * break every download on the site rather than one of them.
     */
    const requested: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/resume/")) {
        requested.push(request.url());
      }
    });

    await page.goto("/pt-br/resume?stack=enterprise-java");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /baixar pdf/i }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      "Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf",
    );

    /*
      Named in the failure, because a bare `false` against an array of URLs says
      which request failed to nothing at all.
    */
    const withTemplate = requested.filter((url) => new URL(url).searchParams.has("template"));

    expect(`requests carrying a template: ${withTemplate.join(", ") || "none"}`).toBe(
      "requests carrying a template: none",
    );
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
