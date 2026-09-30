"use client";

import {
  hasSectionArtwork,
  type DrawnSectionArtwork,
  type ResolvedSectionArtwork,
  type SectionArtworkPlacement,
} from "@/domain/artwork/section-artwork";
import { formatMessage } from "@/i18n/format-message";

/**
 * The section artwork layer.
 *
 * ## What this renders, and when it renders nothing at all
 *
 * `resolveSectionArtwork` (`@/domain/artwork/section-artwork`) owns every
 * decision. This file is the drawing of the answer, and it is deliberately the
 * smallest possible one: when the answer is `kind: "none"` it returns `null`,
 * which is the state of every section on the site today and which costs no
 * element, no request and no byte.
 *
 * That is why this is a client island at all — it isn't for interactivity. It is
 * because the layer is *configuration-driven*: a descriptor is data, so the
 * component that renders it takes the resolved value as a prop and never imports
 * a dictionary, a theme id or a section id from the server. The credit template
 * arrives already translated, exactly as `StatusPill`'s labels arrive in
 * `home-view.tsx`. What the browser gets is a few kilobytes of static SVG
 * geometry and no logic.
 *
 * ## Why the generated plate is drawn here rather than shipped as an asset
 *
 * There is no film still to ship. Rather than leave a hole, the fallback is drawn
 * in the site's own visual language, which means:
 *
 *  - **Columns of glyphs, not bars.** The rain is columns of characters with a
 *    bright leading glyph and a dim tail, and at 9% opacity the difference between
 *    "a column of characters" and "a bar" is the difference between a reference
 *    and a progress bar. A dashed `<line>` *is* a column of characters: the
 *    dash pattern gives it gaps, the uneven per-column widths give it texture,
 *    and a short brighter run at the bottom is the head.
 *  - **A perspective grid behind it.** Rails and rays converging above the top
 *    edge, so the plate reads as *somewhere* rather than as a texture swatch.
 *  - **A phosphor bloom, in CSS rather than in a filter.** `rain.css` sets the
 *    precedent in a comment: a bloom over the whole layer, never an image filter
 *    per element, because that is a compositing layer per navigation. One
 *    `radial-gradient` on one element achieves the same read for free.
 *
 * No `data:` URI, no `.svg` file, no binary. The plate is ~34 SVG nodes whose
 * coordinates come from a seeded PRNG — seeded, because this renders on the
 * server as well as the client and `Math.random()` would produce two different
 * plates and a hydration mismatch on every load. Same reasoning, same
 * consequence, as `buildMatrixColumns` in `@/components/effects/matrix-rain`.
 *
 * ## Why it is `aria-hidden` and why the credit is not
 *
 * The layer is decoration. A screen reader announcing a decorative rain column
 * is worse than no rain column, so the whole layer — including the `<img>` when a
 * licensed still is configured — carries `aria-hidden="true"` and
 * `pointer-events: none`, and nothing in it is focusable.
 *
 * The credit line is the deliberate exception and the reason `aria-hidden` stops
 * at the layer's edge. A film still on a portfolio is a use of someone else's
 * copyrighted work; attribution is not decoration and not a detail, so it is
 * rendered as ordinary readable text, in the label size, and it is translated.
 * `alt` is empty rather than the still's description *because* the credit is the
 * text that reaches the reader.
 */

export interface SectionArtworkProps {
  /** A decision from `resolveSectionArtwork`, already narrowed by the caller. */
  artwork: ResolvedSectionArtwork;
  /**
   * Translated attribution template. Only ever read for `kind: "image"`, and
   * only rendered when a credit exists — the generated plate is original artwork
   * and carries no third-party credit.
   */
  creditTemplate: string;
}

/** One dashed run of glyphs, plus the bright glyph that leads it. */
export type ArtworkPlateRun = {
  x: number;
  y1: number;
  y2: number;
  dash: string;
  offset: number;
  opacity: number;
  width: number;
};

export type ArtworkPlateHead = {
  x: number;
  y: number;
  length: number;
  width: number;
};

export type ArtworkPlate = {
  /** Two `d` strings: the perspective grid's rails and its rays. */
  rails: string;
  rays: string;
  columns: ArtworkPlateRun[];
  heads: ArtworkPlateHead[];
};

/** Where the grid's horizon sits, as a fraction of the plate's height above the top edge. */
const HORIZON = -0.32;

/**
 * Where the topmost rail sits, as a fraction of the plate's height.
 *
 * Not zero, and not derived from the horizon: a rail at `y=0` sits exactly on the
 * frame's edge where the mask is already fading it, so it would be the one rail the
 * reader never sees.
 */
const RAIL_START = 0.08;

/** How far the rays spread past the plate's own edges, as a multiple of its width. */
const SPREAD = 0.8;

/**
 * Two decimals, on every number that reaches the DOM.
 *
 * Not tidiness. Full float precision put eighteen-character coordinates in the
 * markup — `x1="14.548937596846372"` — for values the renderer cannot distinguish
 * at any zoom level, and a plate's markup is paid for on every page load, in every
 * section, forever. Rounding also removes float-formatting from the hydration
 * surface entirely: there is no value whose server rendering and client rendering
 * could disagree about a digit.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * mulberry32: a small, fast, well-distributed 32-bit PRNG.
 *
 * The same generator, and for the same reason, as the one in
 * `@/components/effects/matrix-rain`. It is not cryptographic and does not need
 * to be; the only requirement is that the server and the client agree.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Builds the generated plate's geometry.
 *
 * Exported for tests, for the same reason `buildMatrixColumns` is: the picture is
 * not assertable, but its *invariants* are — every column has a dash pattern and a
 * head, the same seed always produces the same plate, two seeds produce two
 * different plates, and nothing lands outside the viewBox.
 */
export function buildArtworkPlate(
  seed: number,
  columns: number,
  rails: number,
  width: number,
  height: number,
): ArtworkPlate {
  const random = createRandom(seed);
  const horizonY = height * HORIZON;
  const runs: ArtworkPlateRun[] = [];
  const heads: ArtworkPlateHead[] = [];

  /*
     The grid. A floor, seen from just above its surface: rails run horizontally with
     gaps that widen downward — perspective compresses what is far away, so the
     near rails are further apart — and rays radiate from a horizon *above* the
     plate's top edge out to a spread wider than the plate itself.

     Two details are load-bearing and both were wrong first:

      - **The rails start inside the frame.** Placed as a pure quadratic from the
        horizon, the first two landed above `y=0` and were clipped away, which threw
        away a third of the grid and left the spacing starting mid-scale. They are
        distributed from `RAIL_START` instead, which is why `RAIL_START` is a named
        constant rather than a `0` buried in the arithmetic.
      - **A rail is as wide as the rays are at its own height.** The rays converge
        linearly, so a rail at `y` spans `reach(y) = (y - horizon) / (height -
        horizon) * width * SPREAD`. Sizing rails independently of that produced a
        grid whose horizontals were wider than its own diagonals, which reads as a
        scribble rather than as a floor at any opacity above about 20%.
  */
  const railGapBase = (height - RAIL_START * height) / ((rails * (rails - 1)) / 2);

  const railPaths: string[] = [];
  for (let index = 0; index < rails; index += 1) {
    const y =
      index === rails - 1
        ? height
        : RAIL_START * height + railGapBase * ((index * (index + 1)) / 2);

    const reach = ((y - horizonY) / (height - horizonY)) * width * SPREAD;

    railPaths.push(`M${round(width / 2 - reach)},${round(y)} H${round(width / 2 + reach)}`);
  }

  const rayPaths: string[] = [];
  for (let index = 0; index <= rails + 2; index += 1) {
    const t = index / (rails + 2);
    const x = width / 2 + (t * 2 - 1) * width * SPREAD;

    rayPaths.push(`M${round(width / 2)},${round(horizonY)} L${round(x)},${height}`);
  }

  /* The rain: one dashed run per column, and a solid brighter head at its foot. */
  const pitch = width / columns;

  for (let index = 0; index < columns; index += 1) {
    const jitter = (random() - 0.5) * pitch * 0.5;
    const runY1 = -height * 0.04 - random() * height * 0.1;
    const runY2 = height + height * 0.04 + random() * height * 0.08;
    const dashUnit = 9 + random() * 7;
    const offsets: number[] = [];
    const segments = 3 + Math.floor(random() * 3);

    for (let segment = 0; segment < segments * 2; segment += 1) {
      offsets.push(Math.round((0.55 + random() * 0.9) * dashUnit));
    }

    runs.push({
      x: round((index + 0.5) * pitch + jitter),
      y1: round(runY1),
      y2: round(runY2),
      dash: offsets.join(" "),
      offset: Math.round(random() * dashUnit * 4),
      opacity: round(0.3 + random() * 0.3),
      width: round(1.7 + random() * 1.4),
    });

    heads.push({
      x: runs[index].x,
      y: round(height * (0.34 + random() * 0.56)),
      length: round(15 + random() * 20),
      width: round(2.8 + random() * 1.8),
    });
  }

  return {
    rails: railPaths.join(" "),
    rays: rayPaths.join(" "),
    columns: runs,
    heads,
  };
}

/** Which vertical edge the plate is anchored to. Drives the mask and the credit. */
function isLeft(placement: SectionArtworkPlacement): boolean {
  return placement.endsWith("-left");
}

export function SectionArtwork({
  artwork,
  creditTemplate,
}: SectionArtworkProps): React.ReactElement | null {
  if (!hasSectionArtwork(artwork)) {
    return null;
  }

  const side = isLeft(artwork.placement) ? "left" : "right";
  const credit =
    artwork.kind === "image"
      ? formatMessage(creditTemplate, { title: artwork.title, rights: artwork.rights })
      : null;

  return (
    <>
      <div
        className="msd-artwork"
        aria-hidden="true"
        data-section-artwork={artwork.section}
        data-artwork-kind={artwork.kind}
        data-artwork-placement={artwork.placement}
        style={
          {
            "--msd-artwork-opacity": artwork.opacity,
          } as React.CSSProperties
        }
      >
        {/*
          The bloom sits behind the strokes rather than around them. A `filter:
          drop-shadow` would mean one compositing layer per plate, which is the
          cost `rain.css` refuses to pay; one radial gradient on one element
          produces the same phosphor read for free.
        */}
        <div className="msd-artwork__bloom" />

{artwork.kind === "image" ? (
          <ArtworkImage artwork={artwork} />
        ) : artwork.kind === "plate" ? (
          <GeneratedPlate artwork={artwork} />
        ) : null}
      </div>

      {credit ? (
        <p
          className="msd-artwork__credit"
          data-artwork-credit={artwork.section}
          data-artwork-side={side}
        >
          {credit}
        </p>
      ) : null}
    </>
  );
}

/**
 * A licensed still, rendered in place of the drawn plate.
 *
 * A plain `<img>`, not `next/image`. Three reasons, all of them about this layer
 * rather than about images in general:
 *
 *  - The layer is masked to ~9% and clipped to a band at the edge of the section,
 *    so the optimiser would re-encode a licensed still into derivatives the reader
 *    never sees at any useful fidelity.
 *  - `next/image` adds its own wrapper element and its own observer, and a
 *    decorative band needs neither.
 *  - The dimensions are declared on the element, which is what actually reserves
 *    the space — and the frame is fixed-size anyway, so there is no reflow to
 *    reserve it against.
 *
 * `alt` is empty rather than the still's description *because* the layer is
 * `aria-hidden` and the credit line, rendered beside it and read by assistive
 * technology, is the text that reaches the reader.
 */
function ArtworkImage({
  artwork,
}: {
  artwork: Extract<DrawnSectionArtwork, { kind: "image" }>;
}): React.ReactElement {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a decorative band masked to 9% and clipped to a margin: an optimiser would re-encode a licensed still into derivatives no reader will ever see at a useful fidelity */}
      <img
        className="msd-artwork__image"
        src={artwork.src}
        alt=""
        loading="lazy"
        decoding="async"
        width={artwork.width}
        height={artwork.height}
      />
    </>
  );
}

/**
 * The drawn plate.
 *
 * Two `<path>`s carry the whole perspective grid, and every column is its own
 * `<line>` because each has its own dash pattern. `preserveAspectRatio="slice"`
 * fills the band whatever its proportions, which is why the geometry above can be
 * authored once in a 320×440 viewBox rather than per breakpoint.
 */
function GeneratedPlate({
  artwork,
}: {
  artwork: Extract<ResolvedSectionArtwork, { kind: "plate" }>;
}): React.ReactElement {
  const plate = buildArtworkPlate(
    artwork.seed,
    artwork.columns,
    artwork.rails,
    artwork.width,
    artwork.height,
  );

  return (
    <svg
      className="msd-artwork__plate"
      viewBox={`0 0 ${artwork.width} ${artwork.height}`}
      preserveAspectRatio="xMidYMid slice"
      /*
         `focusable` is an SVG-1.1 attribute with no effect in any current
         browser, and it is here for one reason: it is the standard way to state
         that a graphic must never enter the tab order, and "never focusable" is
         part of this layer's contract.
      */
      focusable="false"
      data-testid="section-artwork-plate"
    >
      <path className="msd-artwork__grid" d={plate.rays} />
      <path className="msd-artwork__grid" d={plate.rails} />
      {plate.columns.map((column, index) => (
        <line
          // The index is the identity: these are positional, generated, and never
          // reordered, so a stable key from generated geometry would be a long
          // string that changes whenever the seed does.
          key={`column-${index}`}
          className="msd-artwork__column"
          x1={column.x}
          x2={column.x}
          y1={column.y1}
          y2={column.y2}
          strokeDasharray={column.dash}
          strokeDashoffset={column.offset}
          strokeOpacity={column.opacity}
          strokeWidth={column.width}
        />
      ))}
      {plate.heads.map((head, index) => (
        <line
          key={`head-${index}`}
          className="msd-artwork__head"
          x1={head.x}
          x2={head.x}
          y1={head.y}
          y2={round(head.y + head.length)}
          strokeWidth={head.width}
        />
      ))}
    </svg>
  );
}