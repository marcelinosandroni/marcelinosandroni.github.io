import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * The social preview: favicon, home-screen icon, and the Open Graph card.
 *
 * Everything here is asserted against the built server rather than a component,
 * because the thing that can be wrong is not the derivation — that is unit-tested
 * in `tests/unit/domain/og-image.test.ts` — it is the wiring. A card can be
 * generated perfectly and still never be announced, because a `metadataBase` is
 * missing, because a page's own `openGraph` block replaced the inherited one, or
 * because the URL is relative and the platform resolves it against nothing.
 *
 * The URLs in the HTML are absolute and point at the production apex, so they
 * are never requested as-is: the origin is checked, then the path is replayed
 * against the local server the suite is already running.
 */
const CANONICAL_ORIGIN = "https://marcelinosandroni.com";

/** The PNG signature, so "content-type says png" is not the whole assertion. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ARTICLE_A = "resilient-agent-swarms-on-kafka";
const ARTICLE_B = "rds-to-clickhouse-100m-messages-a-day";

async function metaContent(page: Page, property: string): Promise<string> {
  const content = await page.locator(`meta[property="${property}"]`).first().getAttribute("content");

  expect(content, `og property ${property} is missing`).not.toBeNull();

  return content as string;
}

/**
 * Asserts the URL is absolute on the canonical origin and returns it as a path
 * the local server can serve.
 */
function localPath(absolute: string, label: string): string {
  expect(absolute, `${label} must be absolute on the canonical origin`).toContain(
    `${CANONICAL_ORIGIN}/`,
  );

  return absolute.slice(CANONICAL_ORIGIN.length);
}

async function expectPng(request: APIRequestContext, url: string, label: string) {
  const response = await request.get(url);

  expect(response.status(), `${label} responded ${response.status()}`).toBe(200);
  expect(response.headers()["content-type"], `${label} content-type`).toContain("image/png");

  const body = await response.body();

  expect([...body.subarray(0, 8)], `${label} is a real PNG`).toEqual([...PNG_SIGNATURE]);
}

test.describe("Favicon and home-screen icon", () => {
  test("declares the favicon at every size a browser asks for", async ({ page }) => {
    await page.goto("/en-us");

    const icons = page.locator('link[rel="icon"]');
    const count = await icons.count();

    expect(count).toBeGreaterThan(0);

    const declared: string[] = [];

    for (let index = 0; index < count; index += 1) {
      const sizes = await icons.nth(index).getAttribute("sizes");
      const type = await icons.nth(index).getAttribute("type");

      expect(type).toBe("image/png");
      declared.push(sizes ?? "");
    }

    /*
     * The 16x16 is the one that has to exist. It is also the one that carries
     * the monogram's initial rather than the full `MSD`, because three letters do
     * not survive a downscale to a tab strip — so a build that only shipped the
     * wordmark would render a smudge at the size people actually see.
     */
    expect(declared).toContain("16x16");
    expect(declared).toContain("32x32");
  });

  test("declares the home-screen icon iOS asks for", async ({ page }) => {
    await page.goto("/en-us");

    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "type",
      "image/png",
    );
  });

  test("serves every declared icon as a real PNG", async ({ page, request }) => {
    await page.goto("/en-us");

    const hrefs = await page
      .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));

    expect(hrefs.length).toBeGreaterThan(1);

    for (const href of hrefs) {
      await expectPng(request, href, `icon ${href}`);
    }
  });

  test("declares the same icons in every locale", async ({ page }) => {
    await page.goto("/pt-br/blog");

    await expect(page.locator('link[rel="icon"]')).toHaveCount(3);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  });
});

test.describe("Site-wide Open Graph card", () => {
  test("is announced, absolute, and on the canonical origin", async ({ page }) => {
    await page.goto("/en-us");

    const image = await metaContent(page, "og:image");

    expect(image).toContain(`${CANONICAL_ORIGIN}/`);
    expect(image).toMatch(/\/en-us\/opengraph-image/u);
  });

  test("declares the geometry and the type the platform reads", async ({ page }) => {
    await page.goto("/en-us");

    // 1200x630 is the ratio every social network crops for; a card at any other
    // size is letterboxed in at least one of them.
    expect(await metaContent(page, "og:image:width")).toBe("1200");
    expect(await metaContent(page, "og:image:height")).toBe("630");
    expect(await metaContent(page, "og:image:type")).toBe("image/png");
    expect(await metaContent(page, "og:image:alt")).not.toBe("");
  });

  test("is localized, so a shared pt-BR link previews in Portuguese", async ({ page }) => {
    await page.goto("/en-us");
    const english = await metaContent(page, "og:image");

    await page.goto("/pt-br");
    const portuguese = await metaContent(page, "og:image");

    expect(english).not.toBe(portuguese);
    expect(portuguese).toMatch(/\/pt-br\/opengraph-image/u);
  });

  test("serves the card it points at as a real PNG", async ({ page, request }) => {
    await page.goto("/en-us");
    const image = await metaContent(page, "og:image");

    await expectPng(request, localPath(image, "site og:image"), "site card");
  });

  /*
   * Next.js replaces rather than merges the `openGraph` object a page declares,
   * and both of these pages declare one — which drops the image inherited from
   * the layout. The repo states the rule at `src/app/[locale]/page.tsx:16`, so
   * this test is the record of the gap rather than a passing expectation: when
   * the card is added to those two `openGraph` blocks, this flips to asserting the
   * card URL, and the suite is what proves the fix landed.
   */
  test("is present on the routes whose own openGraph block used to replace it", async ({ page }) => {
    /*
     * `/blog` and `/resume` each declare an `openGraph` object in their
     * `generateMetadata`, and Next replaces that object rather than merging it, so
     * the inherited site-wide card was dropped and both pages shipped with no
     * `og:image` at all. The fix is an `opengraph-image.tsx` in each of those
     * segments, and this is the assertion that the fix reached them.
     */
    await page.goto("/en-us/blog");
    const blog = await metaContent(page, "og:image");

    await page.goto("/en-us/resume");
    const resume = await metaContent(page, "og:image");

    for (const image of [blog, resume]) {
      expect(image).toContain(`${CANONICAL_ORIGIN}/`);
      expect(image).toMatch(/\.png|\?/);
    }
  });
});

test.describe("Per-article Open Graph card", () => {
  test("is announced, absolute, and specific to the article", async ({ page }) => {
    await page.goto(`/en-us/blog/${ARTICLE_A}`);

    const image = await metaContent(page, "og:image");

    expect(image).toContain(`${CANONICAL_ORIGIN}/`);
    expect(image).toContain(ARTICLE_A);
  });

  /**
   * The whole point of a per-article card. If this fails, every post in the blog
   * previews as the same picture, which is indistinguishable from having no
   * per-article card at all.
   */
  test("gives two different articles two different images", async ({ page }) => {
    await page.goto(`/en-us/blog/${ARTICLE_A}`);
    const first = await metaContent(page, "og:image");

    await page.goto(`/en-us/blog/${ARTICLE_B}`);
    const second = await metaContent(page, "og:image");

    expect(first).not.toBe(second);
  });

  test("is localized, so the same article previews in the language it was read in", async ({ page }) => {
    await page.goto(`/en-us/blog/${ARTICLE_A}`);
    const english = await metaContent(page, "og:image");

    await page.goto(`/pt-br/blog/${ARTICLE_A}`);
    const portuguese = await metaContent(page, "og:image");

    expect(english).not.toBe(portuguese);
    expect(portuguese).toContain("/pt-br/");
    expect(english).toContain("/en-us/");
  });

  test("declares the geometry and the type the platform reads", async ({ page }) => {
    await page.goto(`/en-us/blog/${ARTICLE_A}`);

    expect(await metaContent(page, "og:image:width")).toBe("1200");
    expect(await metaContent(page, "og:image:height")).toBe("630");
    expect(await metaContent(page, "og:image:type")).toBe("image/png");
  });

  test("serves the card it points at as a real PNG", async ({ page, request }) => {
    await page.goto(`/pt-br/blog/${ARTICLE_B}`);
    const image = await metaContent(page, "og:image");

    await expectPng(request, localPath(image, "article og:image"), "article card");
  });

  /**
   * A crawler cannot tell "unpublished" from "never a slug", and it asks for the
   * image anyway. A 500 makes the platform drop the preview entirely, so the
   * route answers with a card that names the slug.
   */
  test("answers a card for a slug that resolves to nothing instead of failing", async ({ request }) => {
    await expectPng(
      request,
      `/en-us/blog/there-is-no-such-article/opengraph-image`,
      "missing article card",
    );

    await expectPng(request, `/en-us/blog/Not%20A%20Slug/opengraph-image`, "malformed slug card");
  });
});

test.describe("The existing share contract is intact", () => {
  /**
   * Adding images must not have disturbed the fields the share dialog already
   * read. `pdf-download.spec.ts` asserts the locale pair on the home route; this
   * repeats it on an article, where the `openGraph` block is a different object
   * and the article's own file-based image is merged into it.
   */
  test("keeps og:locale, og:locale:alternate and the description on an article", async ({ page }) => {
    await page.goto(`/pt-br/blog/${ARTICLE_A}`);

    expect(await metaContent(page, "og:locale")).toBe("pt_BR");
    expect(await metaContent(page, "og:locale:alternate")).toBe("en_US");
    expect(await metaContent(page, "og:description")).not.toBe("");
    expect(await metaContent(page, "og:title")).not.toBe("");
  });

  test("keeps the canonical link pointing at the article", async ({ page }) => {
    await page.goto(`/pt-br/blog/${ARTICLE_A}`);

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/pt-br/blog/${ARTICLE_A}$`, "u"),
    );
  });
});
