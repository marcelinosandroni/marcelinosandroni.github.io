"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The gap between clicking a link and the new page appearing.
 *
 * ## Why the router is the only source
 *
 * `usePathname` is the one stable signal the App Router gives: it changes the
 * moment the new route is committed. Everything here is derived from comparing it
 * against the previous value.
 *
 * There is deliberately no `useLinkStatus` — it exists in the installed Next but
 * is not in the public documentation, so depending on it would be depending on
 * an export that can change without a major version.
 *
 * And there is no scroll listener, no `IntersectionObserver`, no timer guessing
 * how long a fetch will take, no animation frame loop. A system that predicted
 * the transition would have to know things the router already knows, and would
 * then be wrong in exactly the cases that matter: a slow network, a cold route,
 * a failed one.
 *
 * ## Why nothing renders on a fast navigation
 *
 * A client transition on a warm cache is a few tens of milliseconds. A
 * full-screen grid for that is a flash of green on every click, which reads as a
 * glitch rather than as speed. So the grid is armed by a timer and only mounts
 * after `DELAY_MS`, and a navigation that finishes sooner never sets state.
 *
 * This is the whole difference between a loading state and a flicker, and it is
 * why this is not three lines of `useState`.
 */
const DELAY_MS = 120;

/** How long the grid stays up after the route lands, so the resolve is seen. */
const MIN_VISIBLE_MS = 200;

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

  /* Cancel a hide that a new navigation is about to replace. */
  const clearHide = (): void => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  /**
   * Hide, and wait out the minimum visible time first.
   *
   * Without the hold the overlay and the new page would swap in the same frame:
   * the transition would cost latency and show nothing for it.
   */
  const hide = (): void => {
    if (shownFor.current === null) {
      return;
    }

    const elapsed = Date.now() - shownAt.current;
    const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      shownFor.current = null;
      hideTimer.current = null;
    }, remaining);
  };

  /*
   * Arm on any link press, before the route has landed.
   *
   * A capture-phase listener on the document, because the click may be on any
   * link and a per-link handler would have to be attached to every one of them.
   * Modified clicks are excluded: opening in a new tab is not a transition on
   * this page, and a grid for it would be claiming work that is not happening.
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

      clearHide();

      armTimer.current = setTimeout(() => {
        setVisible(true);
        shownFor.current = pathname;
        shownAt.current = Date.now();
      }, DELAY_MS);
    }

    document.addEventListener("click", onPress, { capture: true });

    return () => {
      document.removeEventListener("click", onPress, { capture: true });
    };
  }, [pathname]);

  /*
   * The route landed. Cancel any armed timer and, if the grid is up, resolve it.
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
     * Only resolve a grid that was mounted for a *different* route. The
     * `shownFor` guard matters because the effect also runs on mount and on
     * re-renders where `pathname` is unchanged; without it a re-render would
     * schedule a hide for a grid that is not up.
     */
    if (shownFor.current !== null && shownFor.current !== pathname) {
      shownFor.current = pathname;
      hide();
    }
  }, [pathname]);

  /* Only the pending arm timer needs clearing on unmount. */
  useEffect(
    () => () => {
      if (armTimer.current !== null) clearTimeout(armTimer.current);
      clearHide();
    },
    [],
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
        `aria-hidden` because the progressbar above already carries the state.
        Two elements announcing one transition is worse than one announcing it
        late, and a decorative grid exposed as a live region is worse than
        silence.
      */}
      <div className="msd-transition-grid" data-state="enter" aria-hidden="true" />
    </>
  );
}
