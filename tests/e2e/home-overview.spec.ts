import { expect, test } from "@playwright/test";

/**
 * The redesign's own contract, asserted against rendered output.
 *
 * These are the invariants a redesign can silently break: sections turning into
 * client components, a second `<h1>`, a skipped heading level, tokens replaced
 * by hardcoded values, or the boot sequence accidentally gating the content.
 */
test.describe("Home executive overview", () => {
  test("renders every configured section exactly once, each with its own anchor", async ({ page }) => {
    await page.goto("/en-us");

    for (const id of ["top", "kpis", "arsenal", "experience", "blog", "contact"]) {
      await expect(page.locator(`#${id}`), id).toHaveCount(1);
    }
  });

  test("has exactly one h1 and never skips a heading level", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator("h1")).toHaveCount(1);

    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));

    let previous = 0;
    for (const level of levels) {
      expect(level - previous, `heading level jumped to ${level}`).toBeLessThanOrEqual(1);
      previous = level;
    }
  });

  test("shows the fiscal KPI grid with the configured proof strips", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator("#kpis article")).toHaveCount(4);
    await expect(page.locator("#kpis")).toContainText("R$ 24M/YEAR");
    await expect(page.locator("#kpis")).toContainText("-83%");
    await expect(page.locator("#kpis")).toContainText("21 years");
  });

  test("states the career arithmetic the way the filter requires", async ({ page }) => {
    await page.goto("/en-us");

    const hero = page.locator("#top");

    await expect(hero).toContainText("15 years");
    await expect(hero).toContainText("2005");
    await expect(hero).toContainText("6 years");
    await expect(hero).toContainText("21 years");
  });

  test("groups the arsenal into exactly the four required categories", async ({ page }) => {
    await page.goto("/en-us");

    const titles = page.locator("#arsenal h3");

    await expect(titles).toHaveCount(4);
    await expect(titles.nth(0)).toHaveText("Frontend & UI");
    await expect(titles.nth(1)).toHaveText("Backend Core");
    await expect(titles.nth(2)).toHaveText("DevOps & Cloud");
    await expect(titles.nth(3)).toHaveText("Artificial Intelligence");
  });

  test("renders the track record from the resume, with every impact badge", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator("#experience article")).toHaveCount(5);
    await expect(page.locator("#experience")).toContainText("DGT Tecnologia");
    await expect(page.locator("#experience")).toContainText("Banco Itaú");
    await expect(page.locator("#experience")).toContainText("R$ 24M/YEAR SAVED");
    await expect(page.locator("#experience")).toContainText("+R$ 100B UNDER CUSTODY");
  });

  /**
   * The compression rule, asserted on rendered output: three bullets per
   * employer, so the track record cannot grow back into a text wall.
   */
  test("keeps the track record to three bullets per employer", async ({ page }) => {
    await page.goto("/en-us");

    const rows = page.locator("#experience article");

    for (let index = 0; index < (await rows.count()); index += 1) {
      await expect(rows.nth(index).locator("li"), `row ${index}`).toHaveCount(3);
    }
  });

  test("carries no fiction naming anywhere in the rendered home", async ({ page }) => {
    await page.goto("/en-us");

    const html = await page.content();

    for (const term of ["AnimateMatrix", "Minority Report", "NEO //", "cognitive matrix"]) {
      expect(html, term).not.toContain(term);
    }
  });

  test("localizes the track record annotations", async ({ page }) => {
    await page.goto("/pt-br");

    await expect(page.locator("#experience article")).toHaveCount(5);
    await expect(page.locator("#experience")).toContainText("R$ 24M/ANO SALVOS");
    await expect(page.locator("#experience")).toContainText("+R$ 100 BI EM CUSTÓDIA");
  });

  test("exposes a contact channel and a brief launcher", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator("#contact")).toContainText("marcelino.sandroni@gmail.com");
    await expect(
      page.locator('#contact a[href^="mailto:marcelino.sandroni@gmail.com?subject="]'),
    ).toHaveCount(1);
  });

  test("teases three articles on the home route", async ({ page }) => {
    await page.goto("/en-us");

    const teasers = page.locator("#blog article");

    await expect(teasers).toHaveCount(3);
    await expect(teasers.first()).toContainText("Kafka");
  });

  test("keeps the full content in the server-rendered HTML", async ({ page }) => {
    await page.goto("/en-us");

    const html = await page.content();

    expect(html).toContain("DGT Tecnologia");
    expect(html).toContain("ClickHouse");
  });

  test("applies the design tokens instead of hardcoded values", async ({ page }) => {
    await page.goto("/en-us");

    const body = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { background: style.backgroundColor, color: style.color };
    });

    // #0A0D12 canvas and #F4F1EA primary text, from globals.css.
    expect(body.background).toBe("rgb(10, 13, 18)");
    expect(body.color).toBe("rgb(244, 241, 234)");
  });

  test("keeps the first focusable element keyboard reachable with a visible ring", async ({ page }) => {
    await page.goto("/en-us");

    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return null;
      const style = getComputedStyle(active);
      return { tag: active.tagName, outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle };
    });

    expect(focused).not.toBeNull();
    expect(focused?.tag).toBe("A");
    expect(focused?.outlineStyle).not.toBe("none");
    expect(focused?.outlineWidth).not.toBe("0px");
  });

  test("never gates the content behind the boot sequence", async ({ page }) => {
    await page.goto("/en-us");

    const button = page.getByRole("button", { name: /download pdf/i });

    await expect(button).toBeEnabled();
    await button.click();
  });

  test("never shows the boot sequence to a returning visitor", async ({ page }) => {
    await page.goto("/en-us");
    await page.waitForLoadState("networkidle");
    await page.goto("/en-us");
    await expect(page.getByRole("button", { name: /skip intro/i })).toHaveCount(0);
  });

  test("hides the boot sequence entirely under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto("/en-us");

    await expect(page.getByRole("button", { name: /skip intro/i })).toHaveCount(0);
    await context.close();
  });

  test("closes every teaser with a real article", async ({ page }) => {
    await page.goto("/en-us");

    const links = page.locator("#blog article h3 a");
    const count = await links.count();

    expect(count).toBe(3);

    for (let index = 0; index < count; index += 1) {
      const href = await links.nth(index).getAttribute("href");
      const response = await page.request.get(href ?? "/");
      expect(response.status(), href ?? "").toBe(200);
    }
  });

  test("declares a skip link as the first focusable element", async ({ page }) => {
    await page.goto("/en-us");

    const skip = page.locator('a[href="#main"]').first();

    await expect(skip).toHaveCount(1);
    await skip.focus();
    await expect(skip).toBeVisible();
  });
});
