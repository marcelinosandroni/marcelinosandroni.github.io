/**
 * The portrait loop: which files, and who is allowed to see them move.
 *
 * ## Why the paths live in the domain
 *
 * Because two independent places need to agree on them — the first-visit intro and
 * the hero frame on the home route, and the résumé header on the document route —
 * and a string written twice is a string that will drift. There is one source
 * here and both surfaces import it.
 *
 * The filenames carry a content hash because `next start` serves `public/` without
 * long-lived caching. An unhashed name means every visitor re-downloads 74KB of
 * video on every page view, forever, in exchange for a URL that never changes.
 *
 * ## Why the decision is a function and not a media query
 *
 * `prefers-reduced-motion` is a media query, and CSS can act on it. But "should
 * this reader download 74KB of video at all" is a different question from "should
 * it animate", and on a metered connection the honest answer to the first is no
 * while the answer to the second is also no. Expressing it as a pure function of
 * the reader's signals means the whole matrix is testable in a millisecond instead
 * of one browser at a time.
 */

/**
 * Encoded derivatives of `public/portrait-action-video.mp4`.
 *
 * Regenerate with `npm run encode:portrait`, which writes these exact names. The
 * sizes below were measured, not estimated:
 *
 * | File                | Bytes | Notes                                    |
 * |---------------------|-------|------------------------------------------|
 * | `portrait-loop.webm`| 106KB | VP9, the one every target browser gets   |
 * | `portrait-loop.mp4` | 178KB | H.264 baseline, the fallback             |
 * | `portrait-poster.webp` | 24KB | first frame; paints before any video byte |
 *
 * WebM leads in `<source>` order and MP4 follows it. Both are square 420px, nine
 * seconds, silent, 20fps — and **exactly** nine seconds, verified with ffprobe.
 *
 * ## Why nine seconds, and why the loop is a boomerang
 *
 * The loop is the first 4.5 seconds played forwards and then **backwards**. The
 * master is 9.7 seconds of a head turn that never returns to its opening pose, so
 * no single cut of it loops cleanly — a 6-second cut was measured and the head was
 * at a strong three-quarter at t=0 and noticeably more frontal at t=6, which made
 * the portrait visibly jump once every six seconds.
 *
 * Reversing the same segment makes the last frame *be* the first frame by
 * construction rather than by coincidence. That costs 74KB over the broken
 * 6-second cut and is the entire reason for the difference in the table above.
 *
 * ## Why the length is pinned rather than approximate
 *
 * Because the first boomerang encode *declared* nine seconds and produced a file
 * the browser read as 8.85s. Two 4.5s segments concatenated at the source's 24fps
 * span 8.958s of timestamps, and the resample to 20fps emits nothing for the last
 * partial interval — so the CSS marker, timed at 9s, drifted 150ms per cycle and
 * after twenty loops was firing somewhere other than the seam it exists to mark.
 *
 * The encoder now pads the timeline and cuts at an exact frame count, and the e2e
 * suite compares `video.duration` against the declared value so this cannot recur
 * quietly.
 */
export const PORTRAIT_VIDEO = {
  /** Square 420px, VP9. First in source order. */
  webm: "/media/portrait-loop.6d256292.webm",
  /** Square 420px, H.264 baseline. Safari and anything that skips WebM. */
  mp4: "/media/portrait-loop.4df8146d.mp4",
  /** The first frame, as an image. Paints before a single video byte arrives. */
  poster: "/media/portrait-poster.bf14ad93.webp",
  /** Intrinsic size of every derivative, so nothing shifts when it lands. */
  width: 420,
  height: 420,
  /**
   * The full loop. Must equal `LOOP_HALF_SECONDS * 2` in the encoder, and the CSS
   * glitch's period — both are asserted against this number.
   */
  durationMs: 9_000,
} as const;

export type PortraitVideoDecision =
  | { readonly kind: "video" }
  | { readonly kind: "still"; readonly reason: "reduced-motion" | "data-saver" };

/**
 * Whether this reader gets the moving portrait or the still one.
 *
 * Reduced motion is checked first and for the same reason the intro skips itself
 * entirely: a person who has asked for less motion does not get a gentler version
 * of a moving portrait, they get the photograph.
 *
 * `saveData` is the browser telling us the connection is metered and the reader
 * has asked us to be careful with it. Spending 74KB of a metered plan on a loop
 * nobody asked for is the kind of default that gets a site blocked on a train.
 */
export function evaluatePortraitVideoDecision(signal: {
  readonly reducedMotion?: boolean;
  readonly saveData?: boolean;
}): PortraitVideoDecision {
  if (signal.reducedMotion === true) {
    return { kind: "still", reason: "reduced-motion" };
  }

  if (signal.saveData === true) {
    return { kind: "still", reason: "data-saver" };
  }

  return { kind: "video" };
}

/**
 * Whether a path is a home route, which is the only place the intro exists.
 *
 * Used by the pre-paint bootstrap script, which cannot import React and must
 * therefore make this judgement from the URL alone. It is here, and exported, so
 * the test can drive it from `/`, `/en-us` and `/en-us/resume` rather than the
 * script asserting its own reasoning.
 */
export function isHomePathname(pathname: string, localeSegments: readonly string[]): boolean {
  const path = pathname.split(/[?#]/)[0] ?? "";
  const trimmed = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

  if (trimmed === "" || trimmed === "/") {
    return true;
  }

  const segments = trimmed.split("/").filter((segment) => segment.length > 0);

  // `/{locale}` and nothing after it. `/en-us/resume` is the document route.
  return segments.length === 1 && localeSegments.includes(segments[0] ?? "");
}