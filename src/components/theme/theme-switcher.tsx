"use client";

import { useCallback, useSyncExternalStore } from "react";

import { applyTheme } from "@/components/theme/theme-script";
import {
  DEFAULT_THEME_ID,
  THEME_IDS,
  isThemeId,
  themeColorFor,
  type ThemeId,
} from "@/domain/theme/theme";

/**
 * Theme picker.
 *
 * Deliberately three glyphs rather than a labelled menu. A theme control is a
 * preference, not a setting most readers will think to look for, so it earns
 * its place by being recognisable at a glance and costing one tap — a dropdown
 * with three word labels costs two and looks like a form.
 *
 * The active theme is marked with `aria-pressed` rather than a separate
 * "current" element, so a screen reader announces the state on the same control
 * instead of leaving the reader to infer it from colour.
 */
export function ThemeSwitcher(): React.ReactElement {
  const current = useSyncExternalStore(subscribeToTheme, readTheme, readThemeOnServer);

  const choose = useCallback((theme: ThemeId) => {
    applyTheme(theme);

    /*
     * The browser chrome is a separate surface and does not follow
     * `data-theme`. Left stale, the mobile address bar keeps the previous
     * theme's colour after a switch, which reads as a rendering bug even though
     * the page itself is correct.
     */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta !== null) {
      meta.setAttribute("content", themeColorFor(theme));
    }
  }, []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-space-xs"
      /*
       * `suppressHydrationWarning` because the server has no way to know the
       * reader's stored preference, and rendering the default here then
       * correcting it after hydration would flash the wrong one. The glyphs are
       * identical either way; only `aria-pressed` moves, and it is set in an
       * effect once the real value is known.
       */
      suppressHydrationWarning
    >
      {THEME_IDS.map((theme) => {
        const active = current === theme;

        return (
          <button
            key={theme}
            type="button"
            onClick={() => choose(theme)}
            aria-pressed={active}
            aria-label={THEME_LABEL[theme]}
            title={THEME_LABEL[theme]}
            data-theme-option={theme}
            className={
              "tap-target min-w-11 justify-center border px-2 py-1 font-label-mono text-label-mono uppercase tracking-widest transition-colors " +
              (active
                ? "border-text-secondary text-text-primary"
                : "border-border-subtle text-text-muted hover:border-text-secondary hover:text-text-secondary")
            }
          >
            {THEME_GLYPH[theme]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One glyph per theme.
 *
 * Characters rather than icons so the control costs no extra network request and
 * renders identically before and after hydration.
 */
const THEME_GLYPH: Record<ThemeId, string> = {
  carbon: "◐",
  paper: "◑",
  matrix: "◈",
};

/** Accessible names, English in both catalogs: these are not prose. */
const THEME_LABEL: Record<ThemeId, string> = {
  carbon: "Dark theme",
  paper: "Light theme",
  matrix: "Matrix theme",
};

/** Reads the theme the CSS is actually using: the attribute, not storage. */
function readTheme(): ThemeId {
  const attribute = document.documentElement.getAttribute("data-theme");

  return isThemeId(attribute) ? attribute : DEFAULT_THEME_ID;
}

/**
 * Server and hydration snapshot.
 *
 * The server cannot know a stored preference, so it renders the default. Using
 * the same value for hydration means the first client render matches the server
 * and React reports no mismatch; the store corrects it on the next tick rather
 * than mid-render.
 */
function readThemeOnServer(): ThemeId {
  return DEFAULT_THEME_ID;
}

/**
 * Notifies React when the attribute changes.
 *
 * `applyTheme` is the only writer in the application, so it dispatches this. A
 * `MutationObserver` would also catch a devtools edit, at the cost of an observer
 * per picker instance.
 */
const THEME_CHANGE_EVENT = "msd:themechange";

function subscribeToTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}