import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, type Locale } from "@/domain/i18n";
import { articlesPtBR } from "@/infrastructure/content/blog";
import {
  DEFAULT_RESUME_TEMPLATE,
  DOWNLOADABLE_RESUME_TEMPLATE_IDS,
} from "@/infrastructure/pdf/resume-template-registry";
import { formatMessage } from "@/i18n/format-message";
import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

type Tree = Record<string, unknown>;

/** Collects dotted leaf paths so two catalogs can be compared structurally. */
function collectLeafPaths(tree: Tree, prefix = ""): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      paths.push(...collectLeafPaths(value as Tree, path));
      continue;
    }

    paths.push(path);
  }

  return paths.sort();
}

function placeholdersOf(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function leafValues(tree: Tree, prefix = ""): Map<string, unknown> {
  const entries = new Map<string, unknown>();

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedPath, nestedValue] of leafValues(value as Tree, path)) {
        entries.set(nestedPath, nestedValue);
      }
      continue;
    }

    entries.set(path, value);
  }

  return entries;
}

/** Every supported locale and its catalog, so a new locale is a one-line change. */
const catalogsByLocale: Record<Locale, Tree> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

const reference = catalogsByLocale[DEFAULT_LOCALE];

describe("message catalog parity", () => {
  it("defines the same keys in every locale", () => {
    const referencePaths = collectLeafPaths(reference);

    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      expect({ locale, paths: collectLeafPaths(catalog) }).toEqual({ locale, paths: referencePaths });
    }
  });

  it("uses the same placeholders in every locale", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const translated = leafValues(catalog);

      for (const [path, value] of leafValues(reference)) {
        expect({ locale, path, placeholders: placeholdersOf(translated.get(path)) }).toEqual({
          locale,
          path,
          placeholders: placeholdersOf(value),
        });
      }
    }
  });

  it("never leaves a user-facing string empty", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      for (const [path, value] of leafValues(catalog)) {
        expect(`${locale}:${path}:${String(value).trim().length > 0}`).toBe(`${locale}:${path}:true`);
      }
    }
  });

  it("keeps every string list non-empty and free of duplicates", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      for (const [path, value] of leafValues(catalog)) {
        if (!Array.isArray(value)) {
          continue;
        }

        const entries = value as string[];

        expect(`${locale}:${path}:${entries.length > 0}`).toBe(`${locale}:${path}:true`);
        expect(`${locale}:${path}:${new Set(entries).size}`).toBe(`${locale}:${path}:${entries.length}`);
        expect(`${locale}:${path}:${entries.every((entry) => entry.trim().length > 0)}`).toBe(
          `${locale}:${path}:true`,
        );
      }
    }
  });

  it("gives every locale the same set of PDF strings", () => {
    /*
     * This replaced two tests that asserted every locale named every PDF template.

     * Those were there for the download menu: a menu with an untranslated entry
     * shows a reader the raw id. The menu is gone - the download offers one
     * document per stack, chosen by a selector that is already on the page as a
     * URL - so the template names are no longer user-facing and asserting them
     * would have guarded strings nothing reads.

     * What replaces it is the invariant that actually bit: the two catalogs have
     * to carry the same keys. A key added to one and not the other is a string
     * that silently has no translation, which is the same failure the old tests
     * were reaching for by a longer route.
     */
    const referencePaths = collectLeafPaths(
      (reference as Tree).pdf as Tree,
      "pdf",
    );

    expect(referencePaths.length).toBeGreaterThan(0);

    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      expect(`${locale}:${collectLeafPaths((catalog as Tree).pdf as Tree, "pdf").join(",")}`).toBe(
        `${locale}:${referencePaths.join(",")}`,
      );
    }
  });

  it("keeps nothing user-facing for a template the download does not offer", () => {
    /*
     * A label for a document that is not downloadable is a promise the site cannot
     * keep. If `pdf.templates` comes back - a merge, a revert, someone restoring a
     * menu - it has to fail here rather than sit in the catalog looking available.
     */
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const pdf = (catalog as Tree).pdf as Tree;

      expect(`${locale}:templates in catalog:${"templates" in pdf}`).toBe(
        `${locale}:templates in catalog:false`,
      );
    }

    expect(DOWNLOADABLE_RESUME_TEMPLATE_IDS).toEqual([DEFAULT_RESUME_TEMPLATE]);
  });

  it("exposes metadata for the SEO surface of every locale", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const metadata = (catalog as typeof enUS).metadata;

      for (const key of ["title", "description", "openGraphDescription", "jobTitle"] as const) {
        expect(`${locale}:${key}:${metadata[key].length > 0}`).toBe(`${locale}:${key}:true`);
      }

      expect(`${locale}:keywords:${metadata.keywords.length > 0}`).toBe(`${locale}:keywords:true`);
      expect(`${locale}:knowsAbout:${metadata.knowsAbout.length > 0}`).toBe(`${locale}:knowsAbout:true`);
    }
  });

  /**
   * The locale switcher is the only place the site tells a reader that a second
   * language exists, and its accessible name is built from a placeholder. The
   * previous guard checked `signal.localePair`, a string on a status bar the
   * redesign removed; this asserts the invariant that still holds on the surface
   * that replaced it.
   */
  it("keeps the locale switcher template carrying its language placeholder", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const template = (catalog as typeof enUS).localeSwitcher.switchTo;

      expect(`${locale}:${placeholdersOf(template).join(",")}`).toBe(`${locale}:language`);
    }
  });
});

describe("untranslated product nouns", () => {
  /**
   * `blog` is a product noun, not a Portuguese word to translate. The pt-BR
   * catalog used to render it as "Escritos" / "Ler os escritos", which made the
   * navigation look like a different destination in each language and left a
   * reader on /pt-br guessing whether the section they clicked was the blog.
   */
  it("calls the section `blog` in pt-BR, never a translated synonym", () => {
    expect(ptBR.nav.blog).toBe("blog");
    expect(ptBR.blog.indexKicker).toContain("BLOG");
    expect(ptBR.blog.allArticles).toContain("blog");
  });

  it("never reintroduces the translated label anywhere in the pt-BR catalog", () => {
    const text = JSON.stringify(ptBR);

    expect(text).not.toMatch(/escritos/i);
  });

  /**
   * The mirror image of the rule above: a technical term that the industry uses
   * in English stays in English. "Swarm" is the name of the pattern, so the
   * Portuguese article talks about `swarms`, not "enxames" — and a translated
   * synonym sends a reader looking for a term they will not find in any doc.
   */
  it("keeps established English technical terms untranslated in pt-BR", () => {
    const text = JSON.stringify(articlesPtBR);

    expect(text).not.toMatch(/enxame/i);
    expect(text).not.toMatch(/\bfrotas?\b/i);
    expect(text.toLowerCase()).toContain("swarms");
  });
});

describe("formatMessage", () => {
  it("substitutes named placeholders", () => {
    expect(formatMessage("Live Resume · v{version} · Updated {period}", { version: "1.2.3", period: "2026.08" })).toBe(
      "Live Resume · v1.2.3 · Updated 2026.08",
    );
  });

  it("returns the template unchanged when no values are supplied", () => {
    expect(formatMessage("Read this resume in {language}")).toBe("Read this resume in {language}");
  });

  it("keeps unknown placeholders visible instead of rendering empty gaps", () => {
    expect(formatMessage("Hello {name}, missing {other}", { name: "Marcelino" })).toBe(
      "Hello Marcelino, missing {other}",
    );
  });

  it("stringifies numeric values", () => {
    expect(formatMessage("Year {year}", { year: 2026 })).toBe("Year 2026");
  });

  it("does not treat repeated placeholders specially", () => {
    expect(formatMessage("{a}-{a}", { a: "x" })).toBe("x-x");
  });
});
