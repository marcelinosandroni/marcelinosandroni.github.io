/**
 * Theme contract.
 *
 * Pure domain: no React, no DOM, no CSS. That is what makes the rules testable
 * without a browser, and the rules are the whole point — a theme switch is a
 * string on an attribute, and every way that string can be wrong is enumerated
 * here.
 *
 * ## Why this is affordable at all
 *
 * Tailwind v4 compiles `.bg-surface-base` to `background-color:
 * var(--color-surface-base)`. The site has 136 such utilities across 24 files
 * and none of them hardcode a colour, so restyling means overriding the variable
 * under `[data-theme="..."]` and touching no component. This module is only the
 * vocabulary; the values live in `globals.css`, and a test asserts that every
 * theme there defines every token so a half-written theme fails CI rather than
 * rendering a page that is 95% right.
 */

/**
 * Themes, in the order the picker shows them. The first entry is the default and
 * is the one an unstyled or storage-less visit gets.
 *
 * Ids are part of the contract: they appear in localStorage and in the
 * `data-theme` attribute, so renaming one silently resets every reader's choice.
 * They are therefore asserted to be unique and url-safe, and a stored value that
 * no longer exists falls back to the default rather than leaving the page
 * unstyled.
 */
export const THEME_IDS = ["carbon", "paper", "matrix"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = "carbon";

/**
 * Where the reader's choice is stored.
 *
 * Versioned in the key, not just the value, so a future change to the token
 * structure cannot read a value written under the old one and render wrongly.
 */
export const THEME_STORAGE_KEY = "msd:theme:v1";

/** The attribute the CSS blocks key off. */
export const THEME_ATTRIBUTE = "data-theme";

/** Type guard. Deliberately narrow: an unrecognised id is not a theme. */
export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Coerces anything to a usable theme id.
 *
 * Always returns a valid id. A reader with a stale, corrupted or hostile stored
 * value gets the default, because the alternative — no theme at all — means
 * unstyled text on a page about a career.
 */
export function normalizeThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

/**
 * Picks the theme to render.
 *
 * An explicit request wins over a stored preference, which wins over the
 * default. The explicit path exists so a switch is immediate even if the write
 * to storage fails — a private-mode reader must still see the theme they chose.
 */
export function resolveTheme(requested: unknown, stored: unknown): ThemeId {
  if (isThemeId(requested)) {
    return requested;
  }

  if (isThemeId(stored)) {
    return stored;
  }

  return DEFAULT_THEME_ID;
}

/**
 * Reads the stored preference, or `null`.
 *
 * Takes the storage object rather than reaching for `localStorage` so this is
 * testable and so a server render can pass nothing. Private browsing, a blocked
 * context and `undefined` all look the same, and all mean "no stored choice" —
 * none of them may throw, because the caller runs before the first paint.
 */
export function readThemePreference(storage: Pick<Storage, "getItem"> | undefined): ThemeId | null {
  if (storage === undefined) {
    return null;
  }

  let value: string | null;

  try {
    value = storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }

  // A value that is no longer a valid id is treated as absent rather than
  // coerced, so `normalizeThemeId` stays the single place that decides what a
  // bad value becomes.
  return isThemeId(value) ? value : null;
}

/** Serialises a theme for a `<meta name="theme-color">`. */
export function themeColorFor(theme: ThemeId): string {
  // The surface behind everything. Mirrored in `globals.css`; a mismatch shows
  // as a wrong colour in the mobile browser chrome, not as a broken page, which
  // is why it lives here as a constant rather than being read from CSS.
  const surfaces: Record<ThemeId, string> = {
    carbon: "#0a0d12",
    paper: "#faf9f6",
    matrix: "#000000",
  };

  return surfaces[theme];
}
