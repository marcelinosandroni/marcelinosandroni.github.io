import { expect, test } from "@playwright/test";

/**
 * Blog, resume document and the discovery surfaces that link them.
 *
 * The blog is database-backed. These tests run against whatever the composition
 * root resolves, which is the versioned catalog when Supabase is not configured
 * — exactly the degraded path a credential-less build takes, and therefore the
 * path most likely to break silently.
 */
test.describe("Blog", () => {
  test("lists the published articles on the index", async ({ page }) => {
    await page.goto("/en-us/blog");

    await expect(page.locator("h1")).toContainText("Whitepapers");
    await expect(page.locator("main article")).toHaveCount(3);
    await expect(page.locator("main")).toContainText("Kafka");
  });

  test("localizes the index", async ({ page }) => {
    await page.goto("/pt-br/blog");

    await expect(page.locator("h1")).toContainText("Whitepapers");
    await expect(page.locator("main")).toContainText("min");
  });

  test("opens an article and renders its structured body", async ({ page }) => {
    await page.goto("/en-us/blog");
    await page.getByRole("link", { name: /resilient swarms/i }).click();

    await expect(page).toHaveURL(/\/en-us\/blog\/resilient-agent-swarms-on-kafka$/);
    await expect(page.locator("h1")).toContainText("Kafka");
    await expect(page.locator("main article h2").first()).toBeVisible();
    await expect(page.locator("main pre")).toBeVisible();
    await expect(page.locator("main blockquote")).toBeVisible();
  });

  test("publishes BlogPosting structured data on the article", async ({ page }) => {
    await page.goto("/en-us/blog/rds-to-clickhouse-100m-messages-a-day");

    const jsonLd = await page.locator('script[type="application/ld+json"]').last().textContent();

    expect(jsonLd).toContain("BlogPosting");
    expect(jsonLd).toContain("ClickHouse");
  });

  test("declares per-article canonical and hreflang alternates", async ({ page }) => {
    await page.goto("/en-us/blog/dual-core-leader-accounting-rigor");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/en-us\/blog\/dual-core-leader-accounting-rigor$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
      "href",
      /\/pt-br\/blog\/dual-core-leader-accounting-rigor$/,
    );
  });

  test("serves the same article in both languages", async ({ page }) => {
    await page.goto("/pt-br/blog/dual-core-leader-accounting-rigor");

    await expect(page.locator("h1")).toContainText("núcleo duplo");
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });

  test("returns 404 for an unknown slug and for a malformed one", async ({ page }) => {
    expect((await page.goto("/en-us/blog/there-is-no-such-article"))?.status()).toBe(404);
    expect((await page.goto("/en-us/blog/Not%20A%20Slug"))?.status()).toBe(404);
  });

  test("links every article card to a real article page", async ({ page }) => {
    await page.goto("/en-us/blog");

    const links = page.locator("main article h3 a");
    const count = await links.count();

    expect(count).toBe(3);

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      const response = await page.request.get(href ?? "/");
      expect(response.status(), href ?? "").toBe(200);
    }
  });

  test("navigates back to the index and to the overview", async ({ page }) => {
    await page.goto("/en-us/blog/rds-to-clickhouse-100m-messages-a-day");

    await page.getByRole("link", { name: /back to overview/i }).first().click();
    await expect(page).toHaveURL(/\/en-us$/);

    // The header carries the same route back to the catalog on every blog page.
    await page.goto("/en-us/blog/rds-to-clickhouse-100m-messages-a-day");
    await page.getByRole("link", { name: /all articles/i }).first().click();
    await expect(page).toHaveURL(/\/en-us\/blog$/);
  });

  test("renders a real date for every article", async ({ page }) => {
    await page.goto("/en-us/blog/rds-to-clickhouse-100m-messages-a-day");

    const published = page.locator("main time").first();

    await expect(published).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
    await expect(published).toContainText("2026");
  });
});

test.describe("Resume document route", () => {
  test("keeps the full resume, not the summary", async ({ page }) => {
    await page.goto("/en-us/resume");

    await expect(page.locator("h1")).toContainText("Marcelino Sandroni Dias");
    await expect(page.locator("#experience article")).toHaveCount(5);
    await expect(page.locator("#skills article")).toHaveCount(4);
    await expect(page.locator("#education article")).toHaveCount(5);
  });

  test("keeps every case study the original document carried", async ({ page }) => {
    await page.goto("/pt-br/resume");

    // 24 case studies across the five roles in the canonical content:
    // 5 + 5 + 5 + 5 + 4.
    await expect(page.locator("#experience article h5")).toHaveCount(24);
    await expect(page.locator("body")).toContainText("Sistema Preditivo de Segurança Pública");
  });

  test("labels each case study with problem, solution and outcome", async ({ page }) => {
    await page.goto("/en-us/resume");

    await expect(page.locator("main")).toContainText("Problem");
    await expect(page.locator("main")).toContainText("Result");
  });

  test("declares its own canonical and hreflang set", async ({ page }) => {
    await page.goto("/en-us/resume");

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en-us\/resume$/);
    await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute(
      "href",
      /\/pt-br\/resume$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/en-us\/resume$/,
    );
  });

  test("offers the PDF download and a way back to the overview", async ({ page }) => {
    await page.goto("/pt-br/resume");

    await expect(page.getByRole("button", { name: /baixar pdf/i })).toBeVisible();

    await page.getByRole("link", { name: /voltar para a visão geral/i }).first().click();
    await expect(page).toHaveURL(/\/pt-br$/);
  });

  test("localizes the whole document", async ({ page }) => {
    await page.goto("/en-us/resume");

    await expect(page).toHaveTitle(/Complete resume/);
    await expect(page.locator("#experience h2")).toContainText("Experience");
  });

  test("is reachable from the header on the home route", async ({ page }) => {
    await page.goto("/pt-br");

    await page.getByRole("navigation", { name: /navegação principal/i }).getByRole("link", {
      name: "Currículo",
    }).click();

    await expect(page).toHaveURL(/\/pt-br\/resume$/);
  });
});

test.describe("Sitemap and robots", () => {
  test("lists the home, resume, blog and article routes in both languages", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    const xml = await response.text();

    expect(response.status()).toBe(200);
    for (const path of [
      "/en-us",
      "/pt-br",
      "/en-us/resume",
      "/pt-br/blog",
      "/en-us/blog/resilient-agent-swarms-on-kafka",
    ]) {
      expect(xml, path).toContain(path);
    }
  });

  test("disallows the API surface from crawlers", async ({ request }) => {
    const response = await request.get("/robots.txt");
    const text = await response.text();

    expect(response.status()).toBe(200);
    expect(text).toContain("Disallow: /api/");
  });
});
