"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useThemeShortcut } from "@/components/theme/use-theme-shortcut";
import { applyTheme } from "@/components/theme/theme-script";
import {
  DEFAULT_THEME_ID,
  isThemeId,
  nextThemeInCycle,
  themeColorFor,
  type ThemeId,
} from "@/domain/theme/theme";

/**
 * The theme control in the header: the shortcut and the symbol that advertises it.
 *
 * ## Why one control and not the picker as well
 *
 * The first attempt put the full three-glyph picker in the header next to this
 * button. It looked reasonable and it broke the suite: the picker was already in
 * the footer, so the page ended up with two `role="group"` elements named "Theme"
 * and two buttons named "Matrix theme", and every existing theme test died on a
 * strict-mode violation. Two controls meaning nearly the same thing is also just
 * worse — a second way to pick a specific theme when one tap already cycles
 * through all three.
 *
 * So the header gets the single advance button, which is the shortcut made
 * visible, and the picker stays in the footer as the escape hatch for someone who
 * wants a particular theme rather than the next one. One name per control.
 */
export function HeaderThemeControl(): React.ReactElement {
  useThemeShortcut();

  const current = useSyncExternalStore(subscribeToTheme, readTheme, readThemeOnServer);

  const advance = useCallback(() => {
    const next = nextThemeInCycle(readTheme());
    applyAndSync(next);
  }, []);

  return (
    <div className="flex items-center gap-space-xs">
      <button
        type="button"
        onClick={advance}
        aria-label={SHORTCUT_LABEL}
        title={`${currentThemeName(current)} — ${SHORTCUT_LABEL}`}
        data-theme-advance="true"
        className="header-control gap-space-xs"
      >
        {/*
          A sun/moon pair rather than the single theme glyph, because the button
          says "something is going to change" and not "you are now in matrix".
          The filled/half variant tracks the actual surface: a hollow moon is the
          light theme, a filled one is the dark theme.
        */}
        <span aria-hidden="true">{current === "paper" ? "○" : "●"}</span>
      {/*
        The `kbd` is shown rather than hidden in a tooltip. An undocumented
        shortcut is not a feature, and a `title` is not discoverable on a phone
        or by a keyboard user.
      */}
        <kbd className="font-label-mono text-[0.6rem] uppercase tracking-widest text-text-muted">T</kbd>
      </button>
    </div>
  );
}

/**
 * The accessible name, constant and deliberately generic.
 *
 * The first version read "Dark theme, press T to change" and changed with the
 * theme. That is more descriptive and it broke the existing theme suite: the
 * picker in the footer is named "Dark theme", "Light theme" and "Matrix theme",
 * and a substring match on those found this button too, so every assertion about
 * the picker became a strict-mode violation. Two controls must not share a name,
 * and the current theme is already carried by the glyph and the tooltip.
 */
const SHORTCUT_LABEL = "Change theme";

/** Short current-theme name, for the tooltip only. */
function currentThemeName(theme: ThemeId): string {
  switch (theme) {
    case "paper":
      return "Light";
    case "matrix":
      return "Matrix";
    default:
      return "Dark";
  }
}

function applyAndSync(theme: ThemeId): void {
  applyTheme(theme);

  /*
   * The browser chrome does not follow `data-theme`. A stale address-bar colour
   * after a switch reads as a rendering bug even though the page is correct.
   */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta !== null) {
    meta.setAttribute("content", themeColorFor(theme));
  }
}

/** Reads the theme the CSS is actually using: the attribute, not storage. */
function readTheme(): ThemeId {
  const attribute = document.documentElement.getAttribute("data-theme");

  return isThemeId(attribute) ? attribute : DEFAULT_THEME_ID;
}

function readThemeOnServer(): ThemeId {
  return DEFAULT_THEME_ID;
}

const THEME_CHANGE_EVENT = "msd:themechange";

function subscribeToTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);

  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}
