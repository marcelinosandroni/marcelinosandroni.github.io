import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  LOCALE_SEGMENTS,
  SUPPORTED_LOCALES,
  SUPPORTED_LOCALE_SEGMENTS,
  canonicalizeSegment,
  getAlternateLanguageMap,
  getAlternateLocale,
  isLocale,
  isLocaleSegment,
  resolveLocale,
  toLocale,
  toLocaleFromSegment,
  toLocaleSegment,
  toOpenGraphLocale,
} from "@/domain/i18n";

describe("locale contract", () => {
  it("defaults to en-US, as required by the product spec", () => {
    expect(DEFAULT_LOCALE).toBe("en-US");
  });

  it("keeps segments lowercase and round-trips with canonical tags", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const segment = toLocaleSegment(locale);
      expect(segment).toBe(segment.toLowerCase());
      expect(toLocaleFromSegment(segment)).toBe(locale);
      expect(toLocale(segment)).toBe(locale);
    }
  });

  it("derives the supported segment list from the locale list", () => {
    expect([...SUPPORTED_LOCALE_SEGMENTS]).toEqual(SUPPORTED_LOCALES.map((l) => LOCALE_SEGMENTS[l]));
  });

  it("rejects unsupported locales and segments", () => {
    expect(isLocale("fr-FR")).toBe(false);
    expect(isLocale("en")).toBe(false);
    expect(isLocaleSegment("fr")).toBe(false);
    expect(toLocale("fr")).toBeNull();
    expect(canonicalizeSegment("fr")).toBeNull();
  });

  it("accepts any casing when canonicalizing a segment", () => {
    expect(canonicalizeSegment("PT-BR")).toBe("pt-br");
    expect(canonicalizeSegment("pt-BR")).toBe("pt-br");
    expect(canonicalizeSegment("EN-US")).toBe("en-us");
  });

  it("resolves regional and language-only tags to the closest locale", () => {
    expect(resolveLocale("pt")).toBe("pt-BR");
    expect(resolveLocale("pt-PT")).toBe("pt-BR");
    expect(resolveLocale("PT_br")).toBe("pt-BR");
    expect(resolveLocale("en")).toBe("en-US");
    expect(resolveLocale("en-GB")).toBe("en-US");
    expect(resolveLocale("  en-US  ")).toBe("en-US");
  });

  it("returns null for unsupported or empty tags", () => {
    expect(resolveLocale("")).toBeNull();
    expect(resolveLocale("   ")).toBeNull();
    expect(resolveLocale("de-DE")).toBeNull();
    expect(resolveLocale("zh")).toBeNull();
  });

  it("always resolves the alternate locale to a different supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const alternate = getAlternateLocale(locale);
      expect(SUPPORTED_LOCALES).toContain(alternate);
      expect(alternate).not.toBe(locale);
    }
    expect(getAlternateLocale(DEFAULT_LOCALE)).toBe("pt-BR");
    expect(getAlternateLocale("pt-BR")).toBe("en-US");
  });

  it("builds an hreflang map covering every locale plus x-default", () => {
    const languages = getAlternateLanguageMap();

    expect(languages).toEqual({
      "en-US": "/en-us",
      "pt-BR": "/pt-br",
      "x-default": "/en-us",
    });
  });

  it("maps locales to the format required by Open Graph", () => {
    expect(toOpenGraphLocale("pt-BR")).toBe("pt_BR");
    expect(toOpenGraphLocale("en-US")).toBe("en_US");
  });

  it("exposes an endonym and a short code for every locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(LOCALE_LABELS[locale].endonym.length).toBeGreaterThan(0);
      expect(LOCALE_LABELS[locale].short.length).toBeGreaterThan(0);
    }
  });
});
