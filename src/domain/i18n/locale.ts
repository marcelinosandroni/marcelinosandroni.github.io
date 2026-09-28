/**
 * Locale contract for the resume platform.
 *
 * This module is the single source of truth for supported languages. It is pure
 * domain logic: no React, no Next.js, no transport concerns.
 *
 * Two representations exist on purpose:
 * - `Locale` (canonical BCP-47 tag, e.g. `pt-BR`): used in domain, content and
 *   persisted artifacts. It is case-sensitive and stable.
 * - `LocaleSegment` (lowercase URL segment, e.g. `pt-br`): used in routes.
 *   Lowercase keeps URLs canonical and avoids duplicate-content variants.
 */

export const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALE_SEGMENTS = {
  "en-US": "en-us",
  "pt-BR": "pt-br",
} as const satisfies Record<Locale, string>;

export type LocaleSegment = (typeof LOCALE_SEGMENTS)[Locale];

export const SUPPORTED_LOCALE_SEGMENTS = SUPPORTED_LOCALES.map(
  (locale) => LOCALE_SEGMENTS[locale],
) as readonly LocaleSegment[];

/**
 * Endonyms and UI codes for each locale. These describe the language itself
 * rather than translatable copy, so they live with the locale registry instead
 * of in a message dictionary. A user always sees a language in its own name.
 */
export const LOCALE_LABELS = {
  "en-US": { endonym: "English", short: "EN" },
  "pt-BR": { endonym: "Português", short: "PT" },
} as const satisfies Record<Locale, { endonym: string; short: string }>;

const SEGMENT_TO_LOCALE = new Map<string, Locale>(
  SUPPORTED_LOCALES.map((locale) => [LOCALE_SEGMENTS[locale], locale]),
);

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function isLocaleSegment(value: string): value is LocaleSegment {
  return SEGMENT_TO_LOCALE.has(value.toLowerCase());
}

export function toLocaleSegment(locale: Locale): LocaleSegment {
  return LOCALE_SEGMENTS[locale];
}

/** Total lookup for values already narrowed by `isLocaleSegment`. */
export function toLocaleFromSegment(segment: LocaleSegment): Locale {
  return SEGMENT_TO_LOCALE.get(segment) as Locale;
}

/**
 * Canonicalizes a raw path segment into its lowercase locale form.
 * Returns `null` when the segment is not a supported locale.
 */
export function canonicalizeSegment(segment: string): LocaleSegment | null {
  const normalized = segment.toLowerCase();
  return SEGMENT_TO_LOCALE.has(normalized) ? (normalized as LocaleSegment) : null;
}

/** Lenient lookup for untrusted input; `null` when the locale is unsupported. */
export function toLocale(segment: string): Locale | null {
  return SEGMENT_TO_LOCALE.get(segment.toLowerCase()) ?? null;
}

/**
 * Maps a possibly regional language tag onto a supported locale, so that
 * `en`, `en-GB`, `pt` and `pt-PT` resolve to the closest supported variant.
 * Accepts underscore separators (`pt_BR`), which browsers and older links use.
 * Returns `null` when the language is not supported at all.
 */
export function resolveLocale(tag: string): Locale | null {
  const normalized = tag.trim().replace(/_/g, "-").toLowerCase();
  if (normalized === "") {
    return null;
  }

  const direct = SEGMENT_TO_LOCALE.get(normalized);
  if (direct) {
    return direct;
  }

  const language = normalized.split("-")[0];
  for (const locale of SUPPORTED_LOCALES) {
    if (LOCALE_SEGMENTS[locale].split("-")[0] === language) {
      return locale;
    }
  }

  return null;
}

/**
 * The other supported locale. With two locales this is a simple toggle, and it
 * keeps locale switching exhaustive at compile time.
 */
export function getAlternateLocale(locale: Locale): Locale {
  return locale === DEFAULT_LOCALE
    ? SUPPORTED_LOCALES.find((candidate) => candidate !== locale) ?? DEFAULT_LOCALE
    : DEFAULT_LOCALE;
}

/**
 * The `hreflang` set for a localized document.
 *
 * `suffix` appends a route below the locale segment, so nested routes declare
 * their own alternates with the same shape the layout uses at the root. A page
 * that redeclares `alternates` replaces the layout's object outright in Next.js,
 * so every route must restate the full set rather than only `canonical`.
 */
export function getAlternateLanguageMap(suffix = ""): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const candidate of SUPPORTED_LOCALES) {
    languages[candidate] = `/${LOCALE_SEGMENTS[candidate]}${suffix}`;
  }
  languages["x-default"] = `/${LOCALE_SEGMENTS[DEFAULT_LOCALE]}${suffix}`;
  return languages;
}

/** Open Graph `locale` values for every locale except the active one. */
export function getAlternateOpenGraphLocales(locale: Locale): string[] {
  return SUPPORTED_LOCALES.filter((candidate) => candidate !== locale).map(toOpenGraphLocale);
}

/** Open Graph uses underscore-separated, capitalized tags. */
export function toOpenGraphLocale(locale: Locale): string {
  return locale.replace("-", "_");
}
