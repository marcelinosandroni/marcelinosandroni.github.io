import Image from "next/image";

import { PortraitLoopGlitch } from "@/components/effects/portrait-loop-glitch";
import { PortraitVideoGate } from "@/components/effects/portrait-video-gate";
import { Icon } from "@/components/ui/icon";
import type { HomePortrait } from "@/domain/portfolio";

export interface PortraitFrameProps {
  portrait: HomePortrait;
}

/**
 * Hero portrait frame (DESIGN.md §6 Tier 2, §8.8).
 *
 * `portrait.src` is optional by design. Until a photograph is configured the
 * frame renders a deliberate monogram panel — a designed asset, not a broken
 * image and not a stock photo of a stranger. Pointing `src` at a file in `public`
 * (for example `"/portrait.jpg"`) is the only change needed to switch to a real
 * photograph; `next/image` then handles sizing and avoids layout shift.
 */
export function PortraitFrame({ portrait }: PortraitFrameProps) {
  const [topLeft, topRight, bottomLeft, bottomRight] = portrait.cornerMarks;

  return (
    <div className="group relative flex w-full max-w-md justify-center">
      {/* Atmospheric depth: a diffused lime bloom, never a hard-edged gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-primary-container/5 blur-3xl"
      />

      <div className="relative w-full overflow-hidden rounded-2xl bg-surface-raised p-space-md shadow-2xl">
        {/*
          The measurement anchor for the first-visit intro.

          The intro's face is drawn in the centre of the screen and the hero's face
          is here, so without this the hand-off moves the portrait sideways at the
          exact moment the reader starts reading. The intro measures this box and
          lands its own portrait on it, which is why the attribute is on the
          outermost media box rather than on the whole frame: the card's padding
          and the telemetry strip below are not part of the picture.
        */}
        <div
          data-portrait-anchor="hero"
          className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-base"
        >
          {/*
           * The mark sits on the photograph, so it carries the same scrim as the
           * status badge. Without it, a busy background swallows a 9px label and
           * the telemetry becomes decorative noise (DESIGN.md §10).
           */}
          <span className="absolute left-3 top-3 z-10 rounded bg-surface-base/80 px-1.5 py-0.5 font-label-mono text-[9px] text-primary-container/90 backdrop-blur-sm">
            {topLeft}
          </span>

          {portrait.src ? (
            <>
              {/*
                The jitter target, and deliberately a child rather than the anchor
                itself. The anchor is what the first-visit intro measures to decide
                where its own portrait lands, and `getBoundingClientRect` returns the
                *transformed* box — so animating the anchor would make the landing
                target move during the four frames the glitch is active, and the
                portrait would arrive a few pixels off. A child carries the jitter
                and the measured box stays still.
              */}
              <div className="msd-portrait-media">
                {/*
                  The still is the element that exists. It is the LCP candidate, it is
                  server-rendered with a srcset the browser can act on before any
                  JavaScript runs, and it is the fallback for every reader who does not
                  get the loop — reduced motion, a metered connection, or a browser that
                  declines to play it.

                  The video sits on top of it and fades in once it can paint a frame,
                  so the reader never sees a hole and a reader who never sees the video
                  at all sees no difference from a site that has none.
                */}
                <Image
                  src={portrait.src}
                  alt={portrait.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-cover grayscale contrast-125 transition-transform duration-700 group-hover:scale-105"
                />
                <PortraitVideoGate className="msd-portrait-video absolute inset-0 h-full w-full object-cover grayscale contrast-125" />
                <PortraitLoopGlitch />
              </div>
            </>
          ) : (
            <Monogram alt={portrait.alt} />
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-surface-base via-transparent to-transparent opacity-75"
          />

          <span className="absolute right-4 top-4 flex items-center gap-1 rounded bg-surface-base/90 px-space-sm py-1 font-label-mono text-label-mono text-primary-container shadow-md backdrop-blur-md">
            <span className="msd-pulse h-1.5 w-1.5 rounded-full bg-primary-container" />
            {portrait.badge}
          </span>

          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-lg bg-surface-raised/95 p-space-sm shadow-xl backdrop-blur-md">
            <div>
              <p className="font-label-mono text-label-mono font-bold uppercase tracking-wider text-text-primary">
                {portrait.caption}
              </p>
              <p className="font-code-inline text-code-inline text-text-muted">
                {portrait.captionMeta}
              </p>
            </div>
            <Icon name="cpu" size={24} className="text-secondary" />
          </div>
        </div>

        {/*
         * Telemetry strip: an instrument readout of every remaining value, three
         * label/value pairs.
         *
         * The reference positions all four corner marks absolutely on the card,
         * which makes them collide with each other and with the status badge at
         * some widths. Laying them out as a readout keeps every value legible at
         * every width, and the frame stays a frame instead of a pile of overlays.
         */}
        <dl className="mt-space-sm space-y-space-xs pt-space-xs font-label-mono text-[10px] text-text-muted">
          <Readout left={topRight} right={null} />
          <Readout left={bottomLeft} right={bottomRight} />
          <Readout left={portrait.ticker[0]} right={portrait.ticker[1]} />
        </dl>
      </div>
    </div>
  );
}

function Readout({ left, right }: { left: string; right: string | null }) {
  return (
    <div className="flex items-center justify-between gap-space-sm">
      <dt className="truncate">{left}</dt>
      {right ? <dd className="shrink-0 font-semibold text-primary-container">{right}</dd> : null}
    </div>
  );
}

/**
 * Instrument-panel monogram. Rendered on the same aspect box as the photograph
 * it replaces, so swapping in an image causes no layout shift.
 */
function Monogram({ alt }: { alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(186,243,54,0.08),transparent_65%)]"
    >
      <div className="text-center">
        <span className="block font-metric-stat text-metric-stat font-extrabold tracking-tight text-text-primary/90">
          MSD
        </span>
        <span className="mt-space-sm block font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
          Architect // Tech Lead
        </span>
      </div>
    </div>
  );
}
