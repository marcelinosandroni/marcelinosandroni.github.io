import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOUNDTRACK_SOURCE,
  SOUNDTRACK_DIRECTORY,
  isSoundtrackSourceId,
  resolveSoundtrackConfig,
} from "@/domain/audio/soundtrack-source";

/**
 * Which adapter plays, and what happens when the preference is wrong.
 *
 * The default is the synthesised loop, and the reason it stays the default is that
 * it works on a fresh clone with no asset, no licence and no network. Everything
 * here is about the other path: naming a file and having it actually work.
 */
const env = (value: string | undefined) => ({ get: () => value });

describe("soundtrack source", () => {
  it("defaults to the synthesised loop", () => {
    expect(DEFAULT_SOUNDTRACK_SOURCE).toBe("synth");
    expect(resolveSoundtrackConfig(env(undefined))).toEqual({ source: "synth" });
    expect(resolveSoundtrackConfig(env(""))).toEqual({ source: "synth" });
    expect(resolveSoundtrackConfig(env("   "))).toEqual({ source: "synth" });
  });

  it("resolves a bare filename into the public audio directory", () => {
    // The common case, and the one that should be impossible to get wrong: no
    // leading slash to forget.
    expect(resolveSoundtrackConfig(env("soundtrack.ogg"))).toEqual({
      source: "file",
      path: "/audio/soundtrack.ogg",
      loop: true,
    });
  });

  it("leaves a path that already has one alone", () => {
    expect(resolveSoundtrackConfig(env("/assets/theme.mp3"))).toEqual({
      source: "file",
      path: "/assets/theme.mp3",
      loop: true,
    });
  });

  it("accepts every extension a browser can decode", () => {
    for (const extension of ["ogg", "oga", "mp3", "m4a", "mp4", "wav", "flac", "aac", "opus"]) {
      expect(resolveSoundtrackConfig(env(`track.${extension}`)).source, extension).toBe("file");
    }

    // Case must not decide, because a filesystem will happily hand back `.OGG`.
    expect(resolveSoundtrackConfig(env("TRACK.OGG")).source).toBe("file");
  });

  it("falls back to the synth rather than guessing an extension", () => {
    // A value with no audio extension is a typo. Guessing one would produce a
    // request for a file that does not exist and an error the reader cannot act on.
    for (const bad of ["soundtrack", "soundtrack.txt", "/audio/track"]) {
      expect(resolveSoundtrackConfig(env(bad)), bad).toEqual({ source: "synth" });
    }
  });

  it("honours a no-loop opt-out in the filename", () => {
    const loopOf = (name: string): boolean | undefined => {
      const config = resolveSoundtrackConfig(env(name));
      return config.source === "file" ? config.loop : undefined;
    };

    expect(loopOf("intro.no-loop.mp3")).toBe(false);
    expect(loopOf("intro.once.mp3")).toBe(false);
    expect(loopOf("intro.mp3")).toBe(true);
  });

  it("survives an absent environment entirely", () => {
    // The browser has no `process.env` in a bundle this way, and the toggle must
    // still work.
    expect(resolveSoundtrackConfig(undefined)).toEqual({ source: "synth" });
  });

  it("looks in one place", () => {
    // Every path this can produce is same-origin and under a known directory,
    // so there is no remote host a preference can be pointed at.
    expect(SOUNDTRACK_DIRECTORY).toBe("/audio");
    expect(SOUNDTRACK_DIRECTORY).toMatch(/^\//);
  });

  it("names only the two adapters that exist", () => {
    expect(isSoundtrackSourceId("file")).toBe(true);
    expect(isSoundtrackSourceId("synth")).toBe(true);
    expect(isSoundtrackSourceId("spotify")).toBe(false);
  });
});
