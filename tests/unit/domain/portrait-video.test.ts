import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { PortraitLoopGlitch } from "@/components/effects/portrait-loop-glitch";
import {
  PORTRAIT_VIDEO,
  evaluatePortraitVideoDecision,
  isHomePathname,
} from "@/domain/media/portrait-video";

/**
 * The portrait loop's policy: who gets the video, and which route has a curtain.
 *
 * Neither question is visible, and both have a wrong answer that only shows up on
 * somebody else's device — a reader who asked for reduced motion getting 74KB of
 * moving image, or the intro holding a page that has no intro.
 */
describe("who gets the moving portrait", () => {
  it("plays it for a reader with no objection", () => {
    expect(evaluatePortraitVideoDecision({})).toEqual({ kind: "video" });
  });

  it("gives the photograph to a reader who asked for reduced motion", () => {
    // Not a slower or smaller loop. The still. The reason is in the domain file.
    expect(evaluatePortraitVideoDecision({ reducedMotion: true })).toEqual({
      kind: "still",
      reason: "reduced-motion",
    });
  });

  it("spends nothing on a metered connection", () => {
    expect(evaluatePortraitVideoDecision({ saveData: true })).toEqual({
      kind: "still",
      reason: "data-saver",
    });
  });

  /**
   * Reduced motion wins over data saver, and the order is the point: a reader who
   * asked for neither motion nor bytes should be told which reason applies, and
   * "you asked for less motion" is the one that is about the person rather than
   * their connection.
   */
  it("reports reduced motion ahead of data saver", () => {
    expect(evaluatePortraitVideoDecision({ reducedMotion: true, saveData: true })).toEqual({
      kind: "still",
      reason: "reduced-motion",
    });
  });

  /**
   * `navigator.connection` does not exist in Safari or Firefox, so the value
   * arrives as `undefined` on the majority of Safari traffic. Treating that as
   * "not saving data" is the only safe reading: the alternative is a permanent
   * still on every browser that did not implement a non-standard property.
   */
  it("plays on a browser that does not report a connection", () => {
    expect(evaluatePortraitVideoDecision({ saveData: undefined })).toEqual({ kind: "video" });
  });
});

describe("the portrait video files", () => {
  it("offers WebM before MP4, and both are local", () => {
    /*
      Order is the whole mechanism: a browser takes the first `<source>` it can
      play. MP4 first would mean every browser that could have had the 74KB file
      downloaded the 132KB one instead.
    */
    expect(PORTRAIT_VIDEO.webm).toMatch(/^\/media\/portrait-loop\.[0-9a-f]{8}\.webm$/);
    expect(PORTRAIT_VIDEO.mp4).toMatch(/^\/media\/portrait-loop\.[0-9a-f]{8}\.mp4$/);
    expect(PORTRAIT_VIDEO.poster).toMatch(/^\/media\/portrait-poster\.[0-9a-f]{8}\.webp$/);
  });

  /**
   * `next start` serves `public/` without long-lived caching, so a stable filename
   * means every visitor re-downloads the video on every page view forever. The
   * hash is the fix and this is the test that notices it being undone.
   */
  it("carries a content hash in every filename", () => {
    for (const path of [PORTRAIT_VIDEO.webm, PORTRAIT_VIDEO.mp4, PORTRAIT_VIDEO.poster]) {
      expect(path, path).toMatch(/\.[0-9a-f]{8}\./);
    }
  });

  it("is square and matches the declared intrinsic size", () => {
    // A video whose declared size disagrees with its pixels shifts the layout the
    // moment it loads, which on the hero is the LCP element moving.
    expect(PORTRAIT_VIDEO.width).toBe(PORTRAIT_VIDEO.height);
    expect(PORTRAIT_VIDEO.width).toBe(420);
  });

  /**
   * The loop is a boomerang: the first 4.5 seconds forwards, then the same segment
   * reversed, so the last frame *is* the first frame.
   *
   * This is asserted against the encoder rather than trusted, because the original
   * 6-second cut also *looked* like it should loop — it ended on a three-quarter
   * view, just not the same one it started on, and the portrait jumped once every
   * six seconds.
   */
  it("is encoded as a boomerang, so the loop closes on its own first frame", () => {
    const encoder = readFileSync(
      path.join(process.cwd(), "scripts", "encode-portrait-video.ts"),
      "utf8",
    );

    // Forward then reversed, concatenated.
    expect(encoder).toContain("reverse");
    expect(encoder).toContain("concat=n=2:v=1:a=0");

    // And the declared duration is exactly twice the half-length it cuts.
    const half = Number(/LOOP_HALF_SECONDS = ([\d.]+)/.exec(encoder)?.[1]);
    expect(Number.isFinite(half)).toBe(true);
    expect(PORTRAIT_VIDEO.durationMs).toBe(half * 2 * 1000);
  });

  it("declares a nine-second loop", () => {
    expect(PORTRAIT_VIDEO.durationMs).toBe(9_000);
  });

  /**
   * The glitch is timed from the loop length, so the two cannot drift apart. A
   * marker that fires 400ms away from the seam it marks is worse than no marker,
   * and nothing but this assertion would notice.
   */
  it("times the loop marker from the same number the encoder used", () => {
    // Called directly rather than rendered: the component has no hooks and no state,
    // so its output is a plain element and the inline style is readable off it.
    const element = PortraitLoopGlitch() as React.ReactElement<{ style: Record<string, string> }>;

    expect(element.props.style["--portrait-loop"]).toBe(`${PORTRAIT_VIDEO.durationMs}ms`);
  });
});

describe("which routes have a curtain", () => {
  const segments = ["en-us", "pt-br"] as const;

  it("holds a home route, in every form it can be written", () => {
    for (const path of ["/", "/en-us", "/pt-br", "/en-us/", "/pt-br/"]) {
      expect(isHomePathname(path, segments), path).toBe(true);
    }
  });

  /**
   * The bug this prevents is specific: the pre-paint script holds the whole page
   * body invisible, and the intro only exists on the home route. A reader who
   * deep-links to the résumé would get an invisible document for the length of the
   * ceiling timer.
   */
  it("does not hold the résumé, the blog or an article", () => {
    for (const path of [
      "/en-us/resume",
      "/pt-br/resume",
      "/en-us/blog",
      "/en-us/blog/some-slug",
      "/eastereggs",
      "/loading",
    ]) {
      expect(isHomePathname(path, segments), path).toBe(false);
    }
  });

  it("does not mistake an unsupported first segment for a locale", () => {
    // `/whatever` is a 404, and holding a 404 invisible helps nobody.
    expect(isHomePathname("/whatever", segments)).toBe(false);
  });

  it("ignores a query string or fragment", () => {
    // The script reads `location.pathname`, which never has one — this asserts the
    // helper is robust if it is ever handed a full URL.
    expect(isHomePathname("/en-us?utm_source=x", segments)).toBe(true);
    expect(isHomePathname("/en-us#top", segments)).toBe(true);
    expect(isHomePathname("/en-us/resume?x=1", segments)).toBe(false);
  });
});