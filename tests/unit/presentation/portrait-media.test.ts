import { existsSync, readFileSync, statSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import { introBootstrapSource } from "@/components/site/intro-bootstrap-script";
import { INTRO_STORAGE_KEY, INTRO_TOTAL_MS } from "@/domain/intro";
import { SUPPORTED_LOCALE_SEGMENTS } from "@/domain/i18n";
import { PORTRAIT_VIDEO } from "@/domain/media/portrait-video";

/**
 * The two halves of "the page starts on the intro, with no flash of site".
 *
 * The component half cannot be tested here — it is a `useEffect` reading
 * `localStorage`, which is a browser. The script half can, because it is a string
 * with the same constants inlined, and a string that drifts from its source is
 * exactly the failure that produces a flash nobody can reproduce.
 */
describe("the pre-paint hold", () => {
  /**
   * It has to be in the layout, not in a component.
   *
   * A `useEffect` anywhere resolves *after* the first paint, which is the bug
   * itself: the reader sees the finished site, then the curtain arrives. The only
   * place early enough is the document head, so this is an assertion about
   * location rather than about behaviour.
   */
  it("is inlined into the locale layout, so it runs before the first paint", () => {
    const layout = readFileSync(
      path.join(process.cwd(), "src", "app", "[locale]", "layout.tsx"),
      "utf8",
    );

    expect(layout).toContain("IntroBootstrapScript");
  });

  it("is not a no-op: it raises an attribute CSS keys off", () => {
    expect(introBootstrapSource).toContain("setAttribute");
    expect(introBootstrapSource).toContain("data-intro-pending");
    expect(introBootstrapSource).toContain("removeAttribute");
  });

  /**
   * The inlined constants have to be the real ones. A hand-written copy of
   * `INTRO_STORAGE_KEY` inside a template literal is the failure mode this project
   * keeps meeting elsewhere: it drifts silently, and the symptom is a replay the
   * reader cannot explain rather than an error anybody can trace.
   */
  it("embeds the same storage key and locale segments the component reads", () => {
    expect(introBootstrapSource).toContain(JSON.stringify(INTRO_STORAGE_KEY));
    expect(introBootstrapSource).toContain(JSON.stringify(SUPPORTED_LOCALE_SEGMENTS));
  });

  /**
   * The fail-safe. A page that shows up late is an embarrassment; a page that never
   * shows up is a bug somebody files. The timer has to outlast the intro it stands
   * in for, or it would cut a six-second sequence short on a slow machine.
   */
  it("gives up on its own if hydration never happens", () => {
    const ceiling = Number(/CEILING=(\d+)/.exec(introBootstrapSource)?.[1]);

    expect(Number.isFinite(ceiling)).toBe(true);
    expect(ceiling).toBeGreaterThan(INTRO_TOTAL_MS);
    expect(ceiling).toBeLessThan(INTRO_TOTAL_MS + 10_000);
  });

  /**
   * The hold hides the whole page body, so applying it to a route with no intro
   * would make a finished document invisible for the length of the ceiling timer.
   * The path check is the only thing standing between this feature and that bug,
   * and the logic behind it is tested in `portrait-video.test.ts`.
   */
  it("checks the route before holding anything back", () => {
    expect(introBootstrapSource).toContain("location.pathname");
    expect(introBootstrapSource).toContain("isHome");
  });

  /**
   * Reduced motion is checked here too, so a reader who asked for none never gets
   * an invisible page even for a frame. Belt to the component's braces, and the
   * CSS backstop is the third.
   */
  it("checks the motion preference before raising the hold", () => {
    const index = introBootstrapSource.indexOf("prefers-reduced-motion");

    expect(index).toBeGreaterThan(-1);
    // It has to come before the `setAttribute`, not merely exist somewhere.
    expect(index).toBeLessThan(introBootstrapSource.indexOf("setAttribute"));
  });
});

/**
 * The shipped bytes.
 *
 * The encoder prints its own budget and the encode script enforces it, but a
 * script only runs when somebody runs it. These files are committed, so the
 * assertion belongs in the suite too.
 */
describe("the shipped portrait media", () => {
  const files = [PORTRAIT_VIDEO.webm, PORTRAIT_VIDEO.mp4, PORTRAIT_VIDEO.poster];

  const onDisk = (file: string): string => path.join(process.cwd(), "public", file.replace(/^\//, ""));

  it("exists where the module says it does", () => {
    for (const file of files) {
      expect(existsSync(onDisk(file)), `${file} is missing — run npm run encode:portrait`).toBe(true);
    }
  });

  /**
   * The reason the encode script exists at all, asserted so it cannot quietly stop
   * being true. 320KB is the sum of the three measured derivatives with slack; the
   * master recording is 2.8MB.
   */
  it("stays inside the size budget", () => {
    const total = files.reduce((sum, file) => sum + statSync(onDisk(file)).size, 0);

    // 360KB, raised from 320KB for the seamless boomerang loop: the seam fix costs
    // 74KB and 306KB against a 320KB ceiling is a tripwire, not a ceiling.
    expect(total, `${(total / 1024).toFixed(1)}KB of portrait media`).toBeLessThan(360 * 1024);
  });

  /**
   * Source order is the mechanism by which a browser picks a file, so it has to
   * lead with the smaller one. If MP4 ever became smaller this would be a real
   * regression rather than a curiosity, which is the point of asserting it.
   */
  it("leads with the smaller of the two videos", () => {
    expect(statSync(onDisk(PORTRAIT_VIDEO.webm)).size).toBeLessThan(
      statSync(onDisk(PORTRAIT_VIDEO.mp4)).size,
    );
  });

  /**
   * The poster is what every reader sees first, including the ones who never get
   * the video at all. At 24KB it is a rounding error against the 135KB it stands in
   * front of, and it is the only paint before a single video byte arrives.
   */
  it("keeps the poster small enough to be free", () => {
    expect(statSync(onDisk(PORTRAIT_VIDEO.poster)).size).toBeLessThan(40 * 1024);
  });

  /**
   * The encoder strips the audio track with `-an`. A video that still carries one
   * is both larger and a question nobody asked: `muted` would suppress the sound,
   * but shipping an audio stream on a portfolio is a decision rather than an
   * accident, and this is not it.
   */
  it("is encoded with the audio track removed", () => {
    const encoder = readFileSync(
      path.join(process.cwd(), "scripts", "encode-portrait-video.ts"),
      "utf8",
    );

    expect(encoder).toContain('"-an"');
  });

  /**
   * `-movflags +faststart` moves the moov atom to the front. Without it the
   * browser cannot begin playing until it has downloaded the entire file, which
   * defeats the exercise on a page whose whole point is that the video arrives
   * before the reader has finished looking at the curtain.
   */
  it("puts the MP4 index at the front so playback can start early", () => {
    const encoder = readFileSync(
      path.join(process.cwd(), "scripts", "encode-portrait-video.ts"),
      "utf8",
    );

    expect(encoder).toContain("+faststart");
  });
});