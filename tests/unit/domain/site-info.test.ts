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
