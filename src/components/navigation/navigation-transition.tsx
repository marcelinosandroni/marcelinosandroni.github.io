"use client";

import { MatrixRain } from "@/components/effects/matrix-rain";

/**
 * The loading effect for a route change, and for the terminal's boot.
 *
 * ## Why the rain rather than a spinner, and why not on a fast navigation
 *
 * A client transition on a warm cache is a few tens of milliseconds. A
 * full-screen effect for that is a flash of green on every click, which reads as a
 * glitch rather than as speed. So the overlay is armed by a timer and only mounts
 * after `DELAY_MS`, and a navigation that finishes sooner never sets state. That
 * is the whole difference between a loading state and a flicker.
 *
 * The effect itself is the digital rain: a wall of falling glyphs with a bright
 * head on each column. It replaced a geometric grid, which was legible as "the
 * screen is resolving" but not as the reference it was reaching for. The progress
 * bar stays, because it is the cue every reader already understands and because it
 * carries the state to assistive technology, where the rain — being decoration —
 * cannot.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const DELAY_MS = 120;

/** How long the rain stays up after the route lands, so the resolve is seen. */
const MIN_VISIBLE_MS = 260;

/**
 * The longest the overlay may ever stay up once shown, whether or not the route
 * reported back.
 *
 * This is the fix for a bug that made the site permanently unusable, and the reason
 * it is a number rather than a cleverer signal is worth writing down.
 *
 * The overlay's whole lifetime is derived from one thing: `pathname` changing. Arm on
 * a click, show if the click took longer than `DELAY_MS`, resolve when the new
 * pathname arrives. Every one of those three steps was right. What was not covered was
 * the case where a navigation *starts* and the pathname never changes — and then
 * nothing ever calls `hide()` and the rain sits on top of the page indefinitely.
 *
 * Clicking the MSD logo while already on the home page was exactly that. The href is
 * the page you are on, `usePathname()` keeps returning the same string, so the effect
 * keyed on it does not re-run, the armed timer fires 120ms later, and there is no
 * second signal coming. Measured: the overlay was still up at +3000ms, and the reader
 * could keep clicking, which re-armed it every time.
 *
 * So the belt to that braces: once the overlay is up it comes down after this long,
 * whatever happened. A reader who hits it sees the transition on a navigation that
 * was not one — a wasted 120ms of green and nothing else. The alternative is a site
 * with a permanent full-screen effect on it and no way out, which is not a worse
 * version of the same thing, it is a different thing.
 */
const STUCK_CEILING_MS = 5_000;

export function NavigationTransition(): React.ReactElement | null {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);

  /*
   * When the overlay mounted, and the pathname it was mounted for.
   *
   * Refs rather than state on purpose: the arm timer has to be cancelled the
   * instant a route lands, and doing that with state would schedule the very
   * render the timer was meant to avoid.
   */
  const shownFor = useRef<string | null>(null);
  const shownAt = useRef(0);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stuckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The overlay is down and nothing is scheduled to bring it back.
   *
   * One function for both pending resolves rather than two calls at each site: a hide
   * left armed after the overlay has already come down is a timer that fires into a
   * no-op, and a ceiling left armed after a normal resolve is a second, redundant
   * path to the same `setVisible(false)`.
   */
  const clearResolves = useCallback((): void => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    if (stuckTimer.current !== null) {
      clearTimeout(stuckTimer.current);
      stuckTimer.current = null;
    }
  }, []);

  /** Take the overlay down and forget which route it was raised for. */
  const down = useCallback((): void => {
    clearResolves();
    setVisible(false);
    shownFor.current = null;
  }, [clearResolves]);

  /** Cancel a hide that a new navigation is about to replace. */
  const clearHide = useCallback((): void => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  /**
   * Hide, and wait out the minimum visible time first.
   *
   * Without the hold the overlay and the new page would swap in the same frame:
   * the transition would cost latency and show nothing for it.
   */
  const hide = useCallback((): void => {
    if (shownFor.current === null) {
      return;
    }

    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimer.current = setTimeout(down, remaining);
  }, [down]);

  /*
   * Arm on any link press, before the route has landed.
   *
   * A capture-phase listener on the document, because the click may be on any
   * link and a per-link handler would have to be attached to every one of them.
   * Modified clicks are excluded: opening in a new tab is not a transition on
   * this page, and a full-screen effect for it would be claiming work that is not
   * happening.
   */
  useEffect(() => {
    function onPress(event: MouseEvent): void {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest("a[href]");

      if (anchor === null || anchor === undefined) {
        return;
      }

      const href = anchor.getAttribute("href") ?? "";

      // Same-document anchors and non-navigating schemes are not transitions.
      if (href.startsWith("#") || /^(mailto:|tel:|https?:)/.test(href)) {
        return;
      }

      /*
        A link to the page already open is not a transition.

        This is the click that used to strand the overlay. The href resolves to the
        current pathname, so `usePathname()` returns the same string afterwards, the
        effect keyed on it never re-runs, and the armed timer fires 120ms later with
        no second signal coming to resolve it.

        Resolved with `new URL` rather than a string compare, because the ways two hrefs
        name the same page are the interesting part and they are all invisible to
        `===`: a trailing slash, a hash on the current path (`/en-us#kpis` navigates to
        `/en-us`), and a search string the router drops from the pathname. A literal
        compare against `location.pathname` fixes the logo and leaves the other three.
       */
      let target: URL;

      try {
        target = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (target.origin === window.location.origin && target.pathname === window.location.pathname) {
        return;
      }

      clearHide();

      armTimer.current = setTimeout(() => {
        setVisible(true);
        /*
          Read from `location` rather than from a closure over `pathname`. Both are the
          old path at this instant — the navigation has not committed yet — but reading
          it here means the recorded value cannot be a render behind, and it lets this
          listener stop depending on `pathname` entirely, which means it is attached
          once instead of being torn down and reattached on every route change.
        */
        shownFor.current = window.location.pathname;
        shownAt.current = Date.now();

        /*
          The ceiling, armed with the overlay rather than with the navigation. It is the
          only thing standing between "a navigation started" and "the page is covered
          forever", so it has to be scheduled from the one place the overlay comes up.
        */
        stuckTimer.current = setTimeout(down, STUCK_CEILING_MS);
      }, DELAY_MS);
    }

    document.addEventListener("click", onPress, { capture: true });

    return () => {
      document.removeEventListener("click", onPress, { capture: true });
    };
  }, [clearHide, down]);

  /*
   * The route landed. Cancel any armed timer and, if the rain is up, resolve it.
   *
   * This is the one effect that reads `pathname`, and the guard is what makes a
   * fast navigation a no-op: the arm timer is still pending, it gets cleared, and
   * `visible` was never set.
   */
  useEffect(() => {
    if (armTimer.current !== null) {
      clearTimeout(armTimer.current);
      armTimer.current = null;
    }

    /*
     * Only resolve an overlay mounted for a *different* route. The `shownFor`
     * guard matters because the effect also runs on mount and on re-renders where
     * `pathname` is unchanged; without it a re-render would schedule a hide for an
     * overlay that is not up.
     */
    if (shownFor.current !== null && shownFor.current !== pathname) {
      shownFor.current = pathname;
      hide();
    }
  }, [pathname, hide]);

  /* Only the pending arm timer needs clearing on unmount. */
  useEffect(
    () => () => {
      if (armTimer.current !== null) clearTimeout(armTimer.current);
      clearResolves();
    },
    [clearResolves],
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <div
        className="msd-progress"
        data-state="indeterminate"
        role="progressbar"
        aria-label="Loading the next page"
      />

      {/*
        `aria-hidden` because the progressbar above already carries the state. Two
        elements announcing one transition is worse than one announcing it late,
        and a decorative wall of characters exposed as a live region is worse than
        silence.
      */}
      <div className="msd-transition-rain" data-state="enter" aria-hidden="true">
        <MatrixRain />
      </div>
    </>
  );
}

