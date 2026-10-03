"use client";

import { useEffect, useRef } from "react";

import { PORTRAIT_VIDEO } from "@/domain/media/portrait-video";

/**
 * The moving portrait, as a plain `<video>`.
 *
 * ## Why this is not a component worth abstracting
 *
 * Because a muted, inline, looping `<video>` needs no JavaScript to play. Every
 * browser autoplays a muted video; the autoplay policy that blocks sound has
 * nothing to block here, because the encoder stripped the audio track. So the
 * element is declarative — `autoPlay muted playsInline loop` — and this component
 * only ever attaches one observer.
 *
 * That is the whole reason the hero frame can stay a Server Component. A video
 * needs nothing from React to play, and the only thing React is here for is the
 * viewport gate below.
 *
 * ## Why the video waits for the viewport
 *
 * The brief, and the reason this exists rather than a bare `<video>`: the loop
 * plays while the portrait is on screen and freezes the moment it leaves. A
 * portrait turning its head forever, on a résumé someone is halfway down reading,
 * is a battery cost and an attention tax for something nobody asked to look at.
 *
 * Frozen means genuinely paused, not faded: `pause()` releases the decoder, and a
 * paused video holds one decoded frame rather than compositing sixty a second. On
 * a phone that is the difference between a page you can read and a warm battery.
 *
 * ## Why the poster is a separate element and not the `poster` attribute
 *
 * Because `next/image` can resize it, prioritise it and generate the `srcset`, and
 * the `poster` attribute takes a single URL with no way to say which size the
 * layout wants. The still sits underneath as the LCP candidate; the video fades in
 * over it once it can actually paint a frame. The reader never sees a hole, and a
 * reader whose browser refuses the video never sees anything change.
 *
 * ## Reduced motion and data saver
 *
 * Handled in CSS by the caller, which hides this element and leaves the
 * `next/image` still underneath — the photograph *is* the fallback, so there is
 * nothing to reconstruct when the video is switched off. See
 * `evaluatePortraitVideoDecision` for why that decision is made in the domain.
 */
export function PortraitVideo({
  className = "",
  eager = false,
}: {
  className?: string;
  /**
   * `preload="auto"` for the intro, where the video is the first thing that must
   * appear. `metadata` everywhere else: the still is already on screen, so the
   * browser is free to fetch the video at its own pace.
   */
  eager?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video === null) {
      return;
    }

    /*
     * No `IntersectionObserver` means no gate. An old browser that cannot report
     * visibility gets the video playing, which is the same behaviour it would
     * have had with no JavaScript at all — the correct direction to degrade.
     */
    if (typeof IntersectionObserver === "undefined") {
      void video.play().catch(() => undefined);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        }
      },
      /*
       * A margin, so playback starts before the portrait scrolls fully into view
       * and does not stop in the last few pixels on the way out. Frozen slightly
       * early beats a video that stutters at the edge of the screen.
       */
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      width={PORTRAIT_VIDEO.width}
      height={PORTRAIT_VIDEO.height}
      autoPlay
      muted
      playsInline
      loop
      preload={eager ? "auto" : "metadata"}
      /*
        `aria-hidden` because the element is decoration layered over a photograph
        that already carries the alt text. Two representations of the same person
        read out twice is worse than one, and a video with no captions is not a
        thing to announce — the encoder stripped the audio track, which is also why
        the `jsx-a11y/media-has-caption` rule does not apply here.
      */
      aria-hidden="true"
      data-portrait-video="loop"
      data-portrait-video-ms={PORTRAIT_VIDEO.durationMs}
    >
      {/* WebM first, MP4 second: the browser takes the first one it can play. */}
      <source src={PORTRAIT_VIDEO.webm} type="video/webm" />
      <source src={PORTRAIT_VIDEO.mp4} type="video/mp4" />
    </video>
  );
}