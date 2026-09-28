import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALE_SEGMENTS, type Locale } from "@/domain/i18n";
import { RESUME_TEMPLATE_IDS } from "@/infrastructure/pdf/resume-template-registry";
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

  it("aligns structured data and template coverage across locales", () => {
    // Unlike SEO keywords, these two feed machine-readable output, so the
    // entries must correspond one-to-one between locales.
    for (const path of ["metadata.knowsAbout"] as const) {
      const expected = leafValues(reference).get(path) as string[];

      for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
        const translated = leafValues(catalog).get(path) as string[];

        expect(`${locale}:${path}:${translated.length}`).toBe(`${locale}:${path}:${expected.length}`);
      }
    }

    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const templateIds = (catalog as typeof enUS).pdf.templates;

      for (const templateId of RESUME_TEMPLATE_IDS) {
        expect(`${locale}:${templateId}:${templateId in templateIds}`).toBe(`${locale}:${templateId}:true`);
      }
    }
  });

  it("names every PDF template in every locale", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const templates = (catalog as typeof enUS).pdf.templates;

      for (const templateId of RESUME_TEMPLATE_IDS) {
        const entry = templates[templateId];

        expect(`${locale}:${templateId}:${entry.label.length > 0 && entry.description.length > 0}`).toBe(
          `${locale}:${templateId}:true`,
        );
      }
    }
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

  it("keeps the locale pair listing every supported segment", () => {
    for (const [locale, catalog] of Object.entries(catalogsByLocale)) {
      const { localePair } = (catalog as typeof enUS).signal;

      for (const segment of Object.values(LOCALE_SEGMENTS)) {
        expect(`${locale}:${segment}:${localePair.toUpperCase().includes(segment.toUpperCase())}`).toBe(
          `${locale}:${segment}:true`,
        );
      }
    }
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
