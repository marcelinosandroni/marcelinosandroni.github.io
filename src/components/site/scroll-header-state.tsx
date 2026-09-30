"use client";

import { useEffect } from "react";

/**
 * Shrinks the header once the reader has scrolled past it.
 *
 * ## Why a data attribute instead of state
 *
 * The header is a Server Component, and making it a client island to read
 * `scrollY` would put the whole navigation — brand, six links, three controls —
 * into the client bundle for one boolean. Instead this renders nothing, finds the
 * header by its id, and sets an attribute on it. CSS does the rest.
 *
 * The attribute is also the right shape for the animation: the header can shrink
 * on a single CSS transition without React re-rendering on every scroll event.
 *
 * ## Why a threshold rather than any scroll at all
 *
 * A few pixels of movement is a phone nudge, or a rubber-band, or a keyboard
 * flicking a focused control into view. Shrinking the header for those is a
 * flicker, and a header that changes height on a bounce makes the page feel
 * unstable. A full header height is past the point where the reader is still
 * reading the brand.
 */
const COMPACT_AFTER_PX = 96;

/** Coalesced to one update per frame, so a fast scroll does not thrash layout. */
export function ScrollHeaderState({ headerId }: { headerId: string }): null {
  useEffect(() => {
    const header = document.getElementById(headerId);

    if (header === null) {
      return;
    }

    let frame = 0;

    const apply = (): void => {
      frame = 0;
      header.toggleAttribute("data-compact", window.scrollY > COMPACT_AFTER_PX);
    };

    const onScroll = (): void => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(apply);
    };

    // The page may already be scrolled on mount — a reload mid-article, or a
    // restored scroll position — so the initial state is set rather than waited
    // for the first event.
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [headerId]);

  return null;
}
