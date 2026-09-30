import { ImageResponse } from "next/og";

/**
 * The site icon, generated rather than shipped as a file.
 *
 * ## How one favicon serves three themes
 *
 * The site has three themes with very different grounds — carbon `#0a0d12`,
 * paper `#faf8f3` and matrix `#000000` — and a favicon cannot participate in
 * them. There is no CSS cascade at the tab strip, no `data-theme` on the browser
 * chrome, and no `@media (prefers-color-scheme)` in an `<img>`-shaped document.
 * A single icon therefore has to be legible against *all three* grounds at once,
 * which rules out the obvious approach of tinting the mark with the theme accent:
 * the carbon lime `#baf336` is 16:1 against carbon and 1.3:1 against paper, so a
 * lime-only mark disappears on the light theme.
 *
 * What is used instead is a mark with two opposing edges rather than one:
 *
 * - a **lime plate** (`#baf336`, `--color-primary-container`) that carries the
 *   icon's mass and is high contrast against the two dark grounds;
 * - a **carbon keyline** (`#0a0d12`, `--color-surface-base`) drawn around that
 *   plate, which is ~18:1 against paper, so the light theme still gets a hard,
 *   unmistakable edge even though the plate itself all but vanishes into it;
 * - a **deep green glyph** (`#253600`, `--color-on-primary-container`) inside the
 *   plate at ~10:1 against the lime, so the letterform is legible on any of the
 *   three grounds because it never depends on the ground at all.
 *
 * Whichever ground it lands on, at least one of the two edges is doing the work.
 * The same three values are reused by `apple-icon.tsx` — the geometry helper is
 * exported from here so the home-screen icon cannot drift from the tab icon.
 *
 * ## Why there are three sizes
 *
 * `MSD` is the monogram, but three letters do not survive a 16x16 downscale: they
 * land about five pixels tall and read as a smudge. So the smallest icon carries
 * the initial only — the one glyph that is still a letterform at that size — and
 * the full monogram appears from 32px up, where it is legible. A favicon is the
 * one place in the product where the right answer differs by output size, so the
 * three variants are generated from one function and one palette.
 */
export const contentType = "image/png";

/** One entry per size, so the browser can pick instead of downscaling. */
export function generateImageMetadata() {
  return [
    { id: "16", size: { width: 16, height: 16 } },
    { id: "32", size: { width: 32, height: 32 } },
    { id: "48", size: { width: 48, height: 48 } },
  ];
}

/** Palette, mirrored from the carbon tokens in `src/app/globals.css`. */
const PLATE = "#baf336"; // --color-primary-container
const KEYLINE = "#0a0d12"; // --color-surface-base
const GLYPH = "#253600"; // --color-on-primary-container

export type FaviconMark = {
  size: { width: number; height: number };
  plate: number;
  keyline: number;
  radius: number;
  glyph: string;
  fontSize: number;
};

/**
 * Derives the geometry of the mark at a given output size.
 *
 * Exported rather than inlined so `apple-icon.tsx` draws the same mark at 180px
 * with the same numbers. The ratios are what matter: the keyline is always about
 * a twenty-fourth of the icon, the corner radius about a fifth, and the glyph is
 * sized to the *plate* rather than the canvas so the keyline never eats into it.
 */
export function faviconMark(size: number): FaviconMark {
  const keyline = Math.max(1, Math.round(size / 24));
  const plate = size - keyline * 2;
  const glyph = size <= 16 ? "M" : "MSD";

  /*
   * `1.05` is the width of a capital M and `2.35` the width of `MSD` in the
   * bundled sans face, so the glyph fills the plate edge to edge at any size
   * without overflowing it. Derived rather than tabulated so a fourth size, if
   * one is ever added, cannot be wrong.
   */
  return {
    size: { width: size, height: size },
    plate,
    keyline,
    radius: Math.round(size * 0.2),
    glyph,
    fontSize: Math.round(plate / (glyph === "M" ? 1.05 : 2.35)),
  };
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const mark = faviconMark(Number(await id));

  return new ImageResponse(<IconArtwork mark={mark} />, { ...mark.size });
}

export function IconArtwork({ mark }: { mark: FaviconMark }) {
  return (
    /*
     * The outer box is the keyline and the inner box is the plate. Nesting rather
     * than drawing a border keeps the geometry identical in every renderer, and
     * avoids relying on a CSS `border` being rasterised with a rounded corner.
     */
    <div
      style={{
        width: `${mark.size.width}px`,
        height: `${mark.size.height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: KEYLINE,
        borderRadius: `${mark.radius}px`,
      }}
    >
      <div
        style={{
          width: `${mark.plate}px`,
          height: `${mark.plate}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: PLATE,
          borderRadius: `${Math.max(1, mark.radius - mark.keyline)}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: `${mark.fontSize}px`,
            lineHeight: 1,
            letterSpacing: mark.glyph === "M" ? 0 : -0.5,
            color: GLYPH,
          }}
        >
          {mark.glyph}
        </div>
      </div>
    </div>
  );
}
