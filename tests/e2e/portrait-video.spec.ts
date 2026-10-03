import { expect, test } from "@playwright/test";

import { PORTRAIT_VIDEO } from "@/domain/media/portrait-video";

/**
 * The moving portrait, end to end, in a browser.
 *
 * The domain tests own the policy — reduced motion, metered connections, which
 * routes have a curtain. This owns the things only a browser can answer: that the
 * video decodes, that it plays, that it stops, and that the loop marker lands on
 * the seam.
 *
 * The hero is the only surface the portrait appears on. The intro shows the same
 * video during its reveal and then lands it on the hero; the résumé deliberately
 * has none, because it is a document of record rather than a landing page.
 */
test.describe("The portrait loop", () => {
  test("plays in the hero, and keeps playing while the hero is on screen", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const video = page.locator(".msd-portrait-video");
    await expect(video).toBeAttached({ timeout: 10_000 });

    // Decoded, not merely present. A `<video>` pointing at a missing file looks
    // exactly like one that is working until you ask it for a frame.
    await expect
      .poll(() => video.evaluate((element) => (element as HTMLVideoElement).readyState), {
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(2);

    await expect(video).toHaveJSProperty("paused", false);

    // And it is genuinely advancing, which is the difference between "playing"
    // and "a paused element with autoplay set".
    const first = await video.evaluate((element) => (element as HTMLVideoElement).currentTime);
    await page.waitForTimeout(700);
    const second = await video.evaluate((element) => (element as HTMLVideoElement).currentTime);

    expect(second, "the loop was not advancing").toBeGreaterThan(first);
  });

  /**
   * The freeze. Scrolled past, the loop pauses — not fades, pauses, which releases
   * the decoder rather than compositing a frame nobody is looking at sixty times a
   * second.
   */
  test("freezes when the hero scrolls out of the viewport, and resumes on return", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const video = page.locator(".msd-portrait-video");
    await expect(video).toBeAttached({ timeout: 10_000 });

    // Well past the observer's 120px margin, so the pause cannot be a race with
    // the threshold.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3));
    await expect(video).toHaveJSProperty("paused", true, { timeout: 5_000 });

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(video).toHaveJSProperty("paused", false, { timeout: 5_000 });
  });

  /**
   * The hero is the only place the portrait appears.
   *
   * It used to be on the résumé too, and the argument against it is not
   * aesthetic: the résumé is a document of record that a recruiter prints and reads
   * linearly, and a face turning its head above the fold is neither what that page
   * is for nor something a printed copy can reproduce. The portrait is the hero's
   * job and stays there.
   *
   * Asserted as an absence, because that is the requirement: if someone adds it
   * back for symmetry, this fails.
   */
  test("appears on the hero only, never on the résumé", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us/resume", { waitUntil: "domcontentloaded" });

    // Nothing on the document route: not the video, not the loop marker, not the
    // jitter wrapper, and no portrait image borrowed from the home configuration.
    await expect(page.locator(".msd-portrait-video")).toHaveCount(0);
    await expect(page.locator(".msd-portrait-glitch")).toHaveCount(0);
    await expect(page.locator(".msd-portrait-media")).toHaveCount(0);
    await expect(page.locator("[data-portrait-anchor]")).toHaveCount(0);

    // And the document itself is untouched by the removal.
    await expect(page.locator("h1")).toContainText("Marcelino Sandroni Dias");
    await expect(page.locator("#experience article")).toHaveCount(5);

    // The hero still has it, so this is "only the hero" rather than "nowhere".
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".msd-portrait-video")).toBeAttached({ timeout: 10_000 });
  });

  /**
   * The photograph is the floor. A reader who asked for less motion gets the still
   * and nothing is downloaded — asserted on the element being absent, because a
   * video that is present but hidden has still cost the bytes.
   */
  test("gives a reduced-motion reader the photograph and no video at all", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);

    await expect(page.locator(".msd-portrait-video")).toHaveCount(0);

    // And the still is there, because "no video" must not have become "no face".
    await expect(page.locator("main img").first()).toBeVisible();
  });

  /**
   * The loop marker, on the surface that actually loops.
   *
   * Two things are asserted. First that it exists on the hero — it is the whole
   * point of the element. Second that its period is the video's own duration,
   * because a marker that fires away from the seam it marks is worse than no marker,
   * and it is invisible in a screenshot.
   *
   * The intro is deliberately *not* checked for this: it shows the portrait for
   * about two seconds of a nine-second loop and then unmounts it, so it never
   * reaches a boundary and the marker would never fire there.
   */
  test("marks the loop boundary, timed to the video's own duration", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const glitch = page.locator(".msd-portrait-glitch");
    await expect(glitch).toBeAttached({ timeout: 10_000 });
    await expect(glitch).toHaveAttribute("aria-hidden", "true");

    // `video.duration` is NaN until the browser has the metadata, so the comparison
    // below is only meaningful once HAVE_METADATA. Reading it earlier produces a
    // test that fails for the wrong reason.
    const video = page.locator(".msd-portrait-video");
    await expect
      .poll(
        () =>
          video.evaluate((element) => {
            const media = element as HTMLVideoElement;
            return Number.isFinite(media.duration) ? media.duration : 0;
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);

    // Idle for 96.8% of the cycle is the design: a marker on every frame would be
    // an animation, not a marker.
    const idle = await glitch.evaluate((element) => Number(getComputedStyle(element).opacity));
    expect(idle).toBeLessThan(0.05);

    const timings = await page.evaluate(() => {
      const overlay = document.querySelector<HTMLElement>(".msd-portrait-glitch");
      const media = document.querySelector<HTMLElement>(".msd-portrait-media");
      const video = document.querySelector<HTMLVideoElement>(".msd-portrait-video");

      return {
        overlayPeriod: overlay === null ? null : getComputedStyle(overlay).animationDuration,
        overlayTiming: overlay === null ? null : getComputedStyle(overlay).animationTimingFunction,
        mediaPeriod: media === null ? null : getComputedStyle(media).animationDuration,
        mediaTiming: media === null ? null : getComputedStyle(media).animationTimingFunction,
        videoDuration: video === null ? null : video.duration,
        tearBars: overlay?.querySelectorAll(".msd-portrait-glitch__bar").length ?? 0,
      };
    });

    /*
      The marker is timed from the *declared* duration; the video's own duration is
      what it has to agree with. The first boomerang encode declared 9s and shipped
      8.85s, which drifted the marker 150ms per cycle until it was marking a seam
      that no longer existed. Comparing the two is what catches that.
    */
    expect(timings.videoDuration).toBeCloseTo(PORTRAIT_VIDEO.durationMs / 1000, 3);

    // CSS normalises `9000ms` to `9s`, so the comparison is against the browser's
    // own serialisation rather than a hand-written string.
    const expected = `${PORTRAIT_VIDEO.durationMs / 1000}s`;
    expect(timings.overlayPeriod).toBe(expected);
    expect(timings.mediaPeriod).toBe(expected);

    // `steps(1, end)` is what makes it digital. An eased version reads as a camera
    // move rather than a signal failure.
    expect(timings.overlayTiming).toContain("steps");
    expect(timings.mediaTiming).toContain("steps");

    expect(timings.tearBars).toBe(2);
  });

  /**
   * The jitter must not be on the element the intro measures.
   *
   * `getBoundingClientRect` returns the *transformed* box, so an animated transform
   * on the anchor would make the landing target move for the four frames the glitch
   * is active — and the intro's portrait would arrive a few pixels off its measured
   * destination. The e2e landing test asserts 2px, and this is what protects it.
   */
  test("jitters a child, never the box the intro measures", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const measured = await page.evaluate(() => {
      const anchor = document.querySelector<HTMLElement>("[data-portrait-anchor='hero']");
      const media = document.querySelector<HTMLElement>(".msd-portrait-media");

      return {
        anchorAnimation: anchor === null ? null : getComputedStyle(anchor).animationName,
        anchorHasTransform: anchor === null ? null : getComputedStyle(anchor).transform,
        mediaAnimation: media === null ? null : getComputedStyle(media).animationName,
      };
    });

    expect(measured.anchorAnimation).toBe("none");
    expect(measured.anchorHasTransform).toBe("none");
    expect(measured.mediaAnimation).toBe("msd-portrait-jitter");
  });

  /**
   * Reduced motion gets no marker either. The video is not rendered at all, so there
   * is no loop and no seam — and an overlay that keeps animating for a reader who
   * asked for none is the thing this site has spent the whole intro avoiding.
   */
  test("does not animate the marker under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const state = await page.evaluate(() => {
      const overlay = document.querySelector<HTMLElement>(".msd-portrait-glitch");
      const media = document.querySelector<HTMLElement>(".msd-portrait-media");

      return {
        overlay: overlay === null ? "absent" : getComputedStyle(overlay).display,
        mediaAnimation: media === null ? null : getComputedStyle(media).animationName,
      };
    });

    expect(state.overlay).toBe("none");
    expect(state.mediaAnimation).toBe("none");
  });

  test("is not announced twice: the video is decoration over a photograph", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("msd:intro-seen:v1", JSON.stringify({ seenAt: Date.now(), lastActiveAt: Date.now() })));
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    const video = page.locator(".msd-portrait-video");
    await expect(video).toBeAttached({ timeout: 10_000 });
    await expect(video).toHaveAttribute("aria-hidden", "true");

    // The alt text lives on the still, so there is exactly one description of the
    // person rather than two.
    const alts = await page.locator("main img").evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("alt") ?? ""),
    );
    const described = alts.filter((alt) => alt.trim().length > 0);

    expect(described.length).toBeGreaterThan(0);
    for (const alt of described) {
      expect(alt.toLowerCase()).toContain("marcelino");
    }
  });
});