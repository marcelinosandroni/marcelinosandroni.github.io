import {
  DEFAULT_THEME_ID,
  THEME_ATTRIBUTE,
  THEME_IDS,
  THEME_STORAGE_KEY,
  isThemeId,
} from "@/domain/theme/theme";

/**
 * Applies the stored theme before the first paint.
 *
 * ## Why this is an inline script and not React
 *
 * A theme set from a `useEffect` applies after hydration, which means the page
 * paints the default first and then corrects itself. That flash is the whole
 * problem: a reader who chose a theme sees the wrong one, and on a slow phone it
 * is long enough to be noticed.
 *
 * So this runs in the document `<head>`, before any stylesheet has been
 * applied, and it only ever writes one attribute. The server cannot know the
 * reader's choice, so the attribute has to be set client-side — and the only way
 * to do that without a flash is before paint.
 */

/**
 * The ids, inlined for the browser to compare against.
 *
 * A test asserts this string matches `THEME_IDS`, because the alternative is a
 * hand-maintained list in a template literal that drifts from the source the
 * moment a theme is added.
 */
/**
 * The comparison the browser runs, built here rather than in a literal.
 *
 * A hand-written list inside the template would drift from `THEME_IDS` the
 * moment a theme was added — and it would drift *silently*, because the
 * bootstrap would then reject the new theme and fall back, which looks like a
 * theme that does not save rather than like a missing id.
 */
const THEME_ID_COMPARISON = THEME_IDS.map((id) => `v===${JSON.stringify(id)}`).join("||");

const THEME_BOOTSTRAP = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var a=${JSON.stringify(THEME_ATTRIBUTE)};var d=${JSON.stringify(DEFAULT_THEME_ID)};var v=localStorage.getItem(k);document.documentElement.setAttribute(a,${THEME_ID_COMPARISON}?v:d);}catch(e){document.documentElement.setAttribute(a,d);}})();`;

/** Exposed for the test that keeps the inlined list honest. */
export const themeBootstrapSource = THEME_BOOTSTRAP;

/**
 * The script as a React element.
 *
 * Rendered with `dangerouslySetInnerHTML` because there is no other way to get
 * JavaScript to run before paint. The only interpolation is `JSON.stringify` of
 * three constants from the domain module, so there is no injection surface.
 */
export function ThemeBootstrapScript(): React.ReactElement {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />;
}

/**
 * Client-side switch, used by the picker.
 *
 * Writes the attribute, which is what the CSS reads, and the preference, which
 * is what survives the next visit. The write order is deliberate: the attribute
 * first, so the reader sees their choice even if storage throws — a private-mode
 * reader must not be left with a theme that reverted.
 */
export function applyTheme(theme: string): boolean {
  if (typeof document === "undefined" || !isThemeId(theme)) {
    return false;
  }

  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The switch still happened; it just will not persist. Not an error worth
    // surfacing to someone who was trying to change a colour.
  }

  return true;
}
