import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/domain/i18n";
import { articlePath, blogPath, homePath, localePath, resumePath } from "@/domain/site/routes";

/**
 * Guards the internal route table.
 *
 * Every cross-page link on the site is built here, so this is where a pt-BR
 * reader ending up on an English page, or a footer pointing at a path that no
 * longer exists, is caught.
 */
describe("site routes", () => {
  it("builds the home path per locale", () => {
    expect(homePath("en-US")).toBe("/en-us");
    expect(homePath("pt-BR")).toBe("/pt-br");
  });

  it("builds the resume and blog paths under the locale segment", () => {
    expect(resumePath("en-US")).toBe("/en-us/resume");
    expect(resumePath("pt-BR")).toBe("/pt-br/resume");
    expect(blogPath("pt-BR")).toBe("/pt-br/blog");
  });

  it("builds an article path from the blog path", () => {
    expect(articlePath("en-US", "resilient-agent-swarms-on-kafka")).toBe(
      "/en-us/blog/resilient-agent-swarms-on-kafka",
    );
  });

  it("resolves every route name", () => {
    expect(localePath("pt-BR", "home")).toBe("/pt-br");
    expect(localePath("pt-BR", "resume")).toBe("/pt-br/resume");
    expect(localePath("pt-BR", "blog")).toBe("/pt-br/blog");
  });

  it("never emits a double slash, which would break canonical URLs", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const paths = [homePath(locale), resumePath(locale), blogPath(locale)];

      for (const path of paths) {
        expect(path, locale).not.toContain("//");
        expect(path.startsWith(`/${locale.toLowerCase()}`), path).toBe(true);
      }
    }
  });

  it("keeps every route lowercase, matching the canonical URL segments", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const path of [homePath(locale), resumePath(locale), blogPath(locale)] as string[]) {
        expect(path, path).toBe(path.toLowerCase());
      }
    }
  });

  it("translates the same article path per locale", () => {
    const slug = "dual-core-leader-accounting-rigor";

    expect(articlePath("pt-BR", slug)).not.toBe(articlePath("en-US", slug));
  });
});
