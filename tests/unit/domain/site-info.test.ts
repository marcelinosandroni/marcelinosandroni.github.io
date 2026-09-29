import { describe, expect, it } from "vitest";

import { CONTENT_PERIOD, COPYRIGHT_YEAR, SITE_OWNER, SITE_URL, SITE_VERSION } from "@/domain/site/site-info";

describe("site identity", () => {
  it("derives the displayed version from package.json", async () => {
    const { version } = await import("../../../package.json", { with: { type: "json" } });

    expect(SITE_VERSION).toBe(version);
  });

  it("exposes a semantic version without a leading v", () => {
    expect(SITE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exposes an absolute canonical origin", () => {
    expect(() => new URL(SITE_URL)).not.toThrow();
    expect(new URL(SITE_URL).origin).toBe(SITE_URL);
  });

  /**
   * The canonical origin is the single value behind every absolute URL the site
   * emits — metadata, canonical links, hreflang, Open Graph, `sitemap.xml` and
   * `robots.txt`. It has to be the apex domain on https, because a canonical
   * pointing at a deployment host (`vercel.app`, `*.github.io`) splits the
   * ranking signal across hosts and turns every URL into a redirect. This test
   * is what makes a domain migration a deliberate, reviewed edit.
   */
  it("is the apex domain on https, with no path and no trailing slash", () => {
    const url = new URL(SITE_URL);

    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("marcelinosandroni.com");
    expect(url.port).toBe("");
    expect(url.pathname).toBe("/");
    expect(SITE_URL).toBe("https://marcelinosandroni.com");
  });

  it("emits no absolute URL that still points at a deployment host", async () => {
    const [{ getHomeContent }, { getResumeContent }, { SUPPORTED_LOCALES }] = await Promise.all([
      import("@/infrastructure/content/home"),
      import("@/infrastructure/content"),
      import("@/domain/i18n"),
    ]);

    const content = SUPPORTED_LOCALES.map((locale) =>
      JSON.stringify([getHomeContent(locale), getResumeContent(locale)]),
    ).join(" ");

    expect(`${SITE_URL} ${content}`).not.toMatch(/marcelinosandroni\.github\.io/);
    expect(`${SITE_URL} ${content}`).not.toMatch(/vercel\.app/);
  });

  it("keeps the content freshness stamp in YYYY.MM form", () => {
    expect(CONTENT_PERIOD).toMatch(/^\d{4}\.\d{2}$/);
  });

  it("exposes public contact details as absolute or mailto-ready values", () => {
    expect(SITE_OWNER.name.length).toBeGreaterThan(0);
    expect(SITE_OWNER.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(new URL(SITE_OWNER.linkedin).protocol).toBe("https:");
  });

  it("uses a plausible copyright year", () => {
    expect(COPYRIGHT_YEAR).toBeGreaterThanOrEqual(2020);
    expect(COPYRIGHT_YEAR).toBeLessThanOrEqual(new Date().getFullYear());
  });
});
