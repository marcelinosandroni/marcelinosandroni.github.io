"use client";

import { useEffect } from "react";

import { applyTheme } from "@/components/theme/theme-script";
import { nextThemeInCycle, themeColorFor } from "@/domain/theme/theme";

/**
 * The `T` shortcut: cycle carbon → paper → matrix.
 *
 * ## Why this is a hook and not an event handler on the body
 *
 * A global listener that advances the theme on every `T` press is correct only if
 * it can tell the difference between "the reader asked for the next theme" and
 * "someone is typing". The terminal copilot is the live case on this site: it is a
 * text field, and a `T` typed into a question about Kafka must not repaint the
 * page. So the guard is not optional.
 *
 * Three exclusions, each for a concrete reason:
 *
 *  - Any editable target, so typing never triggers it. `isContentEditable` is
 *    included because a rich-text block is not an `<input>`.
 *  - A key held down, so holding `T` does not race through all three themes and
 *    land somewhere nobody chose.
 *  - Any modifier, so `Ctrl+T` (reopen the browser tab) and `Cmd+T` are left
 *    alone. Both are browser-reserved and overriding them would break the page
 *    out from under the reader.
 */
export function useThemeShortcut(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() !== "t") {
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.repeat) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (target !== null) {
        const tag = target.tagName;

        if (target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          return;
        }
      }

      event.preventDefault();

      const next = nextThemeInCycle(document.documentElement.getAttribute("data-theme"));
      applyTheme(next);

      /*
       * Same reason the picker does it: the browser chrome does not follow
       * `data-theme`, so a stale address-bar colour after a keyboard switch reads
       * as a rendering bug.
       */
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta !== null) {
        meta.setAttribute("content", themeColorFor(next));
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
