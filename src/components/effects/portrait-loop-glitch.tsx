import { PORTRAIT_VIDEO } from "@/domain/media/portrait-video";

/**
 * The loop boundary, marked as a signal error rather than left as a jump.
 *
 * ## What this is for
 *
 * The portrait loop used to cut from one head position to another once every six
 * seconds, which read as a bug. It no longer does — the loop is a boomerang, so it
 * closes on the same frame it opens — but a loop that simply repeats forever gives
 * the reader nothing at the boundary, and the boundary is exactly where the eye
 * lands once it has learned the cycle.
 *
 * So the seam is marked: a very short burst of CRT signal failure, synchronised to
 * the video's own duration, once per cycle. It is the difference between "the file
 * broke" and "the file is doing something on purpose", and it costs one element and
 * no JavaScript.
 *
 * ## Why it is timed from the loop length and not from a fixed number
 *
 * Because a marker that drifts out of phase with the thing it marks is worse than
 * no marker. `--portrait-loop` is written from `PORTRAIT_VIDEO.durationMs`, which is
 * the same number the encoder was given, so the burst lands on the seam by
 * construction. Change the encode and the marker follows it.
 *
 * ## Why the period is the loop and not the glitch
 *
 * The animation runs for a full cycle and does nothing for 96.8% of it. The
 * alternative — a short animation on a short delay — needs a second timer, and two
 * timers drift apart.
 *
 * ## Why `steps(1, end)`
 *
 * A signal error is digital: the picture jumps between discrete states and holds.
 * A smooth ease between two offsets reads as a camera move or a rubber-band
 * transition, which is the opposite of what this is imitating.
 *
 * ## Not on the first-visit intro
 *
 * The intro shows the portrait for about two seconds of a nine-second loop and then
 * unmounts it, so it never reaches a loop boundary and this would never fire. The
 * marker is therefore only on the two surfaces that actually loop: the hero and the
 * résumé.
 */
export function PortraitLoopGlitch() {
  return (
    <div
      aria-hidden="true"
      className="msd-portrait-glitch"
      style={{ "--portrait-loop": `${PORTRAIT_VIDEO.durationMs}ms` } as React.CSSProperties}
    >
      {/*
        Two tear bars rather than one. A single band reads as a scratch; two at
        different offsets and widths read as a signal losing sync, which is the
        reference. They are static elements — the motion is entirely in the
        parent's clip-path, so nothing here is animated or composited.
      */}
      <span className="msd-portrait-glitch__bar" data-offset="-14%" />
      <span className="msd-portrait-glitch__bar" data-offset="46%" />
    </div>
  );
}