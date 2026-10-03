import { expect, test } from "@playwright/test";

import { SITE_OWNER } from "../../src/domain/site/site-info";

/**
 * The arrival sequence, end to end, in a browser.
 *
 * The domain tests own the policy and `matrix-name.test.ts` owns the columns; this
 * owns the four things only a browser can answer — that the beats advance, that the
 * name actually resolves on screen rather than only in the DOM, that the curtain
 * rises rather than the layer simply being deleted, and that nothing on the page is
 * unreachable while it is up.
 */
test.describe("First-visit intro", () => {
  test("plays the three beats in order on a first visit, then gets out of the way", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    // Each phase is polled rather than awaited by name, so the test asserts the
    // *order* without hard-coding the millisecond each beat takes.
    const seen: string[] = [];
    const deadline = Date.now() + 12_000;

    while (Date.now() < deadline && seen.length < 3) {
      const phase = await page.locator("[data-intro-phase]").getAttribute("data-intro-phase").catch(() => null);
      if (phase !== null && seen.at(-1) !== phase) {
        seen.push(phase);
      }
      await page.waitForTimeout(80);
    }

    expect(seen).toEqual(["connecting", "locking", "enter"]);

    // And it leaves on its own, without the reader touching anything.
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 4_000 });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  /**
   * The name is the subject, so the test is about the *rendered* name and not about
   * the element existing. A component that renders seventeen cells with the right
   * text and animates nothing is what a DOM-only assertion would happily pass.
   */
  test("resolves the reader's name out of the falling glyphs", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "locking",
      null,
      { timeout: 12_000 },
    );

    const name = page.getByTestId("matrix-name");
    await expect(name).toBeVisible({ timeout: 8_000 });

    // One cell per character, including the gap.
    const cells = name.locator(".msd-intro__name-cell");
    await expect(cells).toHaveCount(SITE_OWNER.introName.length);
    await expect(name.locator('[data-gap="true"]')).toHaveCount(1);

    // The letters are the site's own name, read back off the screen.
    await expect
      .poll(
        () => name.locator(".msd-intro__name-lock").allTextContents().then((letters) => letters.join("")),
        { timeout: 8_000 },
      )
      .toBe(SITE_OWNER.introName.replaceAll(" ", ""));
  });

  /**
   * The letters have to *arrive*, and they arrive by falling.
   *
   * Asserted by geometry over time rather than by watching: a cell's `translateY`
   * starts far above the viewport, covers hundreds of pixels on the way down, and
   * comes to rest at zero. A name that was simply rendered in place would be at zero
   * the whole time and cover no distance at all.
   */
  test("the columns fall into place rather than being rendered in place", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "locking",
      null,
      { timeout: 12_000 },
    );

    const firstCell = page.locator(".msd-intro__name-cell").first();

    /*
      Sampled as fast as the first column can be caught. It leaves almost
      immediately (its stagger is its jitter, under 38ms) and lands in about a
      second, so anything later would only ever read the settled value.

      A sample whose `transform` is still `none` is *dropped* rather than recorded as
      zero. `DOMMatrixReadOnly("none")` parses as an all-zero matrix — uniform scale
      of zero — so the `m42` it yields is 0, which is the same number as the column's
      resting position. Recording it would put a spurious "arrived" reading at the
      front of the series and quietly invert every conclusion drawn from it. `none`
      is not a position; it is the animation not being registered yet.
    */
    const offsets = await firstCell.evaluate(
      (element) =>
        new Promise<number[]>((resolve) => {
          const samples: number[] = [];
          const startedAt = performance.now();

          const sample = (): void => {
            const { transform } = getComputedStyle(element);

            if (transform !== "none") {
              samples.push(Math.round(new DOMMatrixReadOnly(transform).m42));
            }

            if (performance.now() - startedAt > 1_400) {
              resolve(samples);
              return;
            }

            requestAnimationFrame(sample);
          };

          requestAnimationFrame(sample);
        }),
    );

    expect(offsets.length, "the column never produced a sample").toBeGreaterThan(10);

    /*
      Everything below is written in *altitude* — pixels above the column's resting
      row — and that is not a rename for tidiness. `translateY` is negative above the
      row and rises to zero at it, so a column falling toward its resting place makes
      the raw value *increase*. Reading direction off `translateY` therefore inverts
      every comparison, which is exactly the bug this block had on its first
      version: `descended` came out at 0px for a fall that covered 862px.
    */
    const altitude = offsets.map((offset) => -offset);

    // Started high above its resting row, and came down to it. `toBeCloseTo` rather
    // than `toBe` because a settled `matrix(1,0,0,1,0,0)` serialises its last row as
    // `-0`, and `Object.is(-0, 0)` is false.
    expect(Math.max(...altitude), "the column never left the top of the screen").toBeGreaterThan(600);
    expect(Math.abs(altitude.at(-1) ?? 1), "the column never reached its resting row").toBeLessThanOrEqual(1);

    /*
      Total upward travel, against total downward travel.

      This is the invariant that survived two rewrites, and the reason it is written
      this way is worth recording. Per-frame monotonicity looked like the obvious
      check and is not one: the easing is `cubic-bezier(0.42, 0, 0.65, 1)`, a
      smoothstep, provably monotone, so the animation cannot reverse — but
      `getComputedStyle` on a running transform animation reads the main thread's
      view of a compositor-driven animation, and consecutive `requestAnimationFrame`
      callbacks are not guaranteed to see consecutive animation ticks. Isolated
      inversions of 1px, 2px, 3px and then 26px were all observed while writing it,
      a different one on every run. A per-frame check needs a slack wide enough to
      absorb a missed tick, and at that width a genuine bounce walks straight
      through. A windowed version failed the same way, for the same reason.

      Distance rather than direction is scale-free and lag-tolerant at once. A clean
      run measures 0px of ascent against 862px of descent; a run that drops a few
      animation ticks measures tens of pixels against hundreds. A fall that actually
      reversed would sit near 50%, and no amount of tick-dropping gets there — so 5%
      separates the two cases by an order of magnitude rather than by a judgement
      call about how noisy the sampler is today.
    */
    let descended = 0;
    let ascended = 0;

    for (let index = 1; index < altitude.length; index += 1) {
      const delta = (altitude[index - 1] ?? 0) - (altitude[index] ?? 0);

      if (delta > 0) {
        descended += delta;
      } else {
        ascended += -delta;
      }
    }

    expect(descended, "the column never covered any distance").toBeGreaterThan(600);
    expect(
      ascended / descended,
      `the column climbed ${ascended.toFixed(0)}px against ${descended.toFixed(0)}px of descent`,
    ).toBeLessThan(0.05);

    /*
      And it travelled *through* the screen rather than jumping: a column snapped from
      off-screen to its resting row in one frame would produce two or three distinct
      positions, not the sixty-odd a real fall does.
    */
    const distinct = new Set(altitude).size;
    expect(distinct, `only ${distinct} distinct positions across ${altitude.length} samples`).toBeGreaterThan(15);
  });

  /**
   * The whole point of the lock: every letter is on the same baseline.
   *
   * This is the property that a name made of independent columns can easily get
   * wrong, and it is invisible in a DOM assertion — the letters are in the document
   * either way. It is also the one that makes the word legible rather than a
   * scatter of characters.
   */
  test("locks every letter onto one baseline, in the middle of the screen", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "locking",
      null,
      { timeout: 14_000 },
    );

    /*
      Measured during `locking`, not `enter`, and the reason is the measurement rather
      than the beat: `enter` applies a lift and a scale to the whole name, so a reading
      taken there is the resting row plus a deliberate offset.

      Polled until the row is flat *and* on screen. Flatness on its own is satisfied
      on the very first frame — every column is held at the top of its fall by the same
      `translateY(-120vh)`, so they are all level with each other while not one of them
      is anywhere near the name. A name that never fell at all passes that too.
    */
    const rowIsSettled = async (): Promise<boolean> =>
      page.locator(".msd-intro__name-lock").evaluateAll((nodes) => {
        const tops = nodes.map((node) => Math.round(node.getBoundingClientRect().top));

        return nodes.length > 0 && Math.max(...tops) - Math.min(...tops) <= 1 && Math.max(...tops) > 0;
      });

    await expect.poll(rowIsSettled, { timeout: 8_000, intervals: [60] }).toBe(true);

    const letters = await page.locator(".msd-intro__name-lock").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: Math.round(rect.top), height: Math.round(rect.height) };
      }),
    );

    expect(letters.length).toBe(SITE_OWNER.introName.replaceAll(" ", "").length);

    /*
      And the row of letters is the row the screen centres.

      This is the assertion that catches the trail being in flow. Nine lines of noise
      above each letter made every strip ten lines tall, and a container centring
      that box put the letters — the *last* line of each strip — at 87% down the
      screen. The name was still perfectly aligned and perfectly correct; it was just
      near the floor, which no DOM assertion would ever have noticed.
    */
    const centre = (letters[0]?.top ?? 0) + (letters[0]?.height ?? 0) / 2;
    const viewportCentre = await page.evaluate(() => window.innerHeight / 2);

    expect(
      Math.abs(centre - viewportCentre),
      `the letters are centred at ${centre.toFixed(0)}px in a ${(viewportCentre * 2).toFixed(0)}px screen`,
    ).toBeLessThan(4);
  });

  /**
   * The name has to fit. Seventeen columns of one `ch` plus tracking is the
   * constraint, and a phone is where it fails — at 9vw the name came to 393px inside
   * a 390px viewport.
   */
  test("fits the width of the narrowest supported phone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "enter",
      null,
      { timeout: 14_000 },
    );

    const box = await page
      .getByTestId("matrix-name")
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });

    expect(box.left, "the name runs off the left edge").toBeGreaterThanOrEqual(0);
    expect(box.right, "the name runs off the right edge").toBeLessThanOrEqual(320);
  });

  /**
   * The rise, and the part that is easy to get backwards.
   *
   * The hand-off used to be React unmounting the layer, which is indistinguishable
   * from a reveal only if you never look. What proves it is a reveal is a frame in
   * the middle of `enter` where the curtain covers the top of the screen and the site
   * is already visible at the bottom — an unmounted layer has no such frame, and a
   * fade has no such hard edge.
   *
   * Read off the live `clip-path`, and not by hit-testing. `elementFromPoint` is the
   * obvious instrument and it is the wrong one: `.msd-intro` itself is a full-viewport,
   * transparent, *unclipped* layer, so it is the topmost hit at every pixel of the
   * screen and answers "curtain" whether or not a curtain is there. The clip is the
   * only thing in the effect actually doing the revealing, so it is the only thing
   * worth measuring.
   */
  test("the curtain rises from the bottom rather than the layer being deleted", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "enter",
      null,
      { timeout: 14_000 },
    );

    const midway = await page.evaluate(
      () =>
        new Promise<{ mounted: boolean; phase: string | null; clip: string; height: number }>((resolve) => {
          // Inside the beat's 300ms hold plus a little over half of its 1150ms rise.
          window.setTimeout(() => {
            const layer = document.querySelector<HTMLElement>(".msd-intro");
            const backdrop = document.querySelector<HTMLElement>(".msd-intro__backdrop");

            if (backdrop === null) {
              resolve({ mounted: false, phase: null, clip: "", height: 0 });
              return;
            }

            resolve({
              mounted: true,
              phase: layer?.getAttribute("data-intro-phase") ?? null,
              clip: getComputedStyle(backdrop).clipPath,
              height: backdrop.getBoundingClientRect().height,
            });
          }, 850);
        }),
    );

    // Still mounted and still naming its beat, so this is not the layer having gone.
    expect(midway.mounted, "the layer was gone at the midpoint, so this was a cut").toBe(true);
    expect(midway.phase).toBe("enter");
    expect(midway.clip).toMatch(/inset\(/);

    /*
      `inset()` serialises with three or four values depending on the browser. In the
      four-value form the bottom is index 2; in the three-value form — and in the
      two-value form, which is top/bottom — it is the last. Anything shorter than four
      falls through to the last slot.
    */
    const parts = midway.clip.match(/inset\(([^)]*)\)/)?.[1]?.trim().split(/\s+/) ?? [];
    const bottomInset = Number.parseFloat(parts.length >= 4 ? (parts[2] ?? "") : (parts.at(-1) ?? ""));

    // Part-way: neither whole nor empty, so this is a frame of the rise rather than
    // the layer having been deleted or a fade having been started.
    expect(Number.isNaN(bottomInset), `clip-path "${midway.clip}" has no bottom inset`).toBe(false);
    expect(bottomInset, `clip-path "${midway.clip}" is already empty at the midpoint`).toBeGreaterThan(4);
    expect(bottomInset, `clip-path "${midway.clip}" is already empty at the midpoint`).toBeLessThan(96);

    /*
      And the revealed region is the *bottom* of the screen — the direction of the
      rise, and the thing a mirrored clip gets wrong while still looking plausible at
      the single frame where the two coincide.
    */
    const boundary = midway.height * (1 - bottomInset / 100);
    expect(
      boundary,
      `the revealed region ends at ${boundary.toFixed(0)}px of a ${midway.height.toFixed(0)}px screen`,
    ).toBeGreaterThan(midway.height / 2);

    // Then it leaves on its own.
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 4_000 });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  /**
   * The glow rides the boundary, which is the whole reason it exists.
   *
   * It was on the wrong half of the screen for the entire beat and only crossed the
   * real edge at the exact midpoint — the one instant where a mirrored animation
   * looks correct. Comparing the two positions is what catches it; comparing the two
   * `animation-duration` values, which is the obvious check, does not: they were
   * identical while the effect was wrong.
   */
  test("the edge glow sits on the boundary the clip is opening", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "enter",
      null,
      { timeout: 14_000 },
    );

    const samples = await page.evaluate(
      () =>
        new Promise<Array<{ boundary: number; edge: number }>>((resolve) => {
          const readings: Array<{ boundary: number; edge: number }> = [];

          /*
            `inset(0 0 B% 0)` keeps everything above the bottom inset, so the kept
            region ends at `height × (1 − B/100)`. The shorthand serialises with
            three or four values depending on the browser; in both the *last* value
            is the bottom only for the three-value form, so the four-value form is
            indexed explicitly and everything shorter falls back to the last slot.
          */
          const sample = (): void => {
            const backdrop = document.querySelector<HTMLElement>(".msd-intro__backdrop");
            const edge = document.querySelector<HTMLElement>(".msd-intro__edge");

            if (backdrop === null || edge === null) {
              resolve(readings);
              return;
            }

            const clip = getComputedStyle(backdrop).clipPath;
            const parts = clip.match(/inset\(([^)]*)\)/)?.[1]?.trim().split(/\s+/) ?? [];
            const rawBottom = parts.length >= 4 ? parts[2] : parts.at(-1);
            const bottom = Number.parseFloat(rawBottom ?? "");

            if (Number.isNaN(bottom)) {
              resolve(readings);
              return;
            }

            const height = backdrop.getBoundingClientRect().height;
            readings.push({
              boundary: height * (1 - bottom / 100),
              edge: edge.getBoundingClientRect().top,
            });
          };

          let frames = 0;
          const tick = (): void => {
            sample();
            frames += 1;
            if (frames > 50) {
              resolve(readings);
              return;
            }
            requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }),
    );

    // Sampled across the rise, and skipped while the 300ms hold is still showing a
    // curtain that covers everything — before the beat starts both edges sit at the
    // top of the screen and agree for the wrong reason.
    const midRise = samples.filter((read) => read.boundary > 40 && read.boundary < 860);
    expect(midRise.length, "the rise was never sampled mid-flight").toBeGreaterThan(5);

    for (const read of midRise) {
      expect(
        Math.abs(read.edge - read.boundary),
        `the glow is at ${read.edge.toFixed(0)}px and the boundary is at ${read.boundary.toFixed(0)}px`,
      ).toBeLessThan(12);
    }
  });

  /**
   * The two animations share their timing, which is a contract between two rules
   * rather than an accident — and the geometric check above is what proves the
   * contract was honoured rather than merely declared.
   */
  test("the edge glow is animated in step with the clip it rides", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]")?.getAttribute("data-intro-phase") === "enter",
      null,
      { timeout: 14_000 },
    );

    const timings = await page.evaluate(() => {
      const read = (selector: string): { duration: string; delay: string; easing: string } | null => {
        const element = document.querySelector(selector);
        if (element === null) {
          return null;
        }
        const style = getComputedStyle(element);
        return {
          duration: style.animationDuration,
          delay: style.animationDelay,
          easing: style.animationTimingFunction,
        };
      };

      return {
        clip: read(".msd-intro__backdrop"),
        edge: read(".msd-intro__edge"),
      };
    });

    expect(timings.clip).not.toBeNull();
    expect(timings.edge).not.toBeNull();
    expect(timings.edge?.duration).toBe(timings.clip?.duration);
    expect(timings.edge?.delay).toBe(timings.clip?.delay);
    expect(timings.edge?.easing).toBe(timings.clip?.easing);
  });

  /**
   * The photograph is gone from the arrival, and this asserts it as an absence.
   *
   * It used to be the subject of the sequence: revealed in a frame, flown onto the
   * hero's position to the pixel, and handed over. An arrival that ends on a face
   * makes the reader look twice — at the face, then at the hero, which is the same
   * face — and the landing solved the movement between them while leaving the
   * duplication untouched.
   */
  test("shows no portrait at any point, so the hero is not a duplicate of the intro", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    /*
      Sampled across the whole sequence rather than once, because "at no point" is the
      claim and the portrait used to appear only on the third beat.

      Read with a bare `page.evaluate` rather than `locator.evaluate`, and that is
      load-bearing rather than a style preference. A locator auto-waits for its
      element, and before hydration there is no `.msd-intro` yet — so the very first
      sample of the loop waited for the layer to appear, this project's `actionTimeout`
      does not bound it, and the test sat there until the 45s test timeout killed the
      page out from under the assertion. A `.catch(() => 0)` does not rescue that; the
      promise never rejects, it just takes longer than the test lives.
    */
    /*
      Wait for the layer before sampling it. At `domcontentloaded` hydration has not
      run, the intro has not mounted, and a loop that treats "not there yet" as "gone"
      breaks on its first iteration — which is a passing assertion about a sequence
      that never played, and is why the sample count is asserted afterwards.
    */
    await page.waitForFunction(
      () => document.querySelector("[data-intro-phase]") !== null,
      null,
      { timeout: 12_000 },
    );

    const deadline = Date.now() + 12_000;
    const phases = new Set<string>();
    let samples = 0;

    while (Date.now() < deadline) {
      const state = await page.evaluate(() => {
        const layer = document.querySelector(".msd-intro");

        return {
          mounted: layer !== null,
          media: layer?.querySelectorAll("img, video").length ?? 0,
          phase: layer?.getAttribute("data-intro-phase") ?? null,
        };
      });

      expect(state.media, `a photograph or a video was inside the intro (phase ${state.phase})`).toBe(0);

      if (!state.mounted) {
        break;
      }

      phases.add(state.phase ?? "");
      samples += 1;
      await page.waitForTimeout(100);
    }

    // The loop has to have caught the whole sequence rather than run out of patience,
    // or "no portrait" is a statement about a layer that was barely on screen.
    expect(samples, "the intro was never sampled while it was up").toBeGreaterThan(20);
    expect([...phases].sort(), `only sampled these beats: ${[...phases].join(", ")}`).toEqual([
      "connecting",
      "enter",
      "locking",
    ]);

    // The name is what took its place, and the hero still has its own portrait.
    await expect(page.locator("[data-portrait-anchor='hero']")).toHaveCount(1);
  });

  /**
   * The bug the pre-paint hold exists to kill, asserted at the instant it is decided.
   *
   * Before it, a first visit painted the finished site and *then* covered it with the
   * curtain. The window was one frame on a fast machine and long enough to notice on a
   * slow one, and it read as a glitch rather than as an arrival.
   *
   * ## Why this version instruments instead of sampling
   *
   * The version this replaced sampled `header`'s computed `visibility` right after
   * `waitUntil: "commit"` and skipped the assertion whenever the header had not been
   * parsed yet — which on a local run is most of the time. So it asserted the hold was
   * up at an instant where the hold is up by construction, and it never looked at the
   * frame that actually broke: the one *after* the hold came down. The bug it is named
   * after was live behind a green test.
   *
   * `data-intro-pending` is removed exactly once, and that removal is the precise
   * instant at which the site becomes paintable — which makes it the right thing to
   * watch rather than any property of any element. A `MutationObserver` on that
   * attribute answers the question with no sampling gap at all: the callback runs in
   * the microtask after the mutation and before the browser can paint, so if the
   * curtain is not in the document *at that moment* there is provably a frame in which
   * the finished site is painted without it.
   *
   * A `requestAnimationFrame` sampler could not make this claim, because the paint
   * being detected is free to happen between two of its own samples.
   */
  test("never paints the site before the curtain is up", async ({ page }) => {
    await page.addInitScript(() => {
      type Trace = Window & {
        msdPaintedBeforeCurtain?: boolean;
        msdHoldEvents?: number;
      };

      const trace = window as Trace;

      trace.msdPaintedBeforeCurtain = false;
      trace.msdHoldEvents = 0;

      /*
        Observed on `document`, never on `document.documentElement`.

        `addInitScript` runs after the Document object exists but before the parser
        has produced the root element, so `documentElement` is still `null` here and
        `observe(null)` throws — which aborts the rest of the init script and leaves
        this test asserting nothing while reporting green. It is the same class of bug
        as the test it replaces: a check that cannot fail. The Document node always
        exists, and the root element is in its subtree.
      */
      new MutationObserver(() => {
        const pending = document.documentElement.hasAttribute("data-intro-pending");

        trace.msdHoldEvents = (trace.msdHoldEvents ?? 0) + 1;

        if (pending) {
          return;
        }

        if (document.querySelector(".msd-intro") === null) {
          trace.msdPaintedBeforeCurtain = true;
        }
      }).observe(document, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-intro-pending"],
      });
    });

    await page.goto("/en-us", { waitUntil: "commit" });

    await expect(page.locator("html")).toHaveAttribute("data-intro-pending", "", {
      timeout: 5_000,
    });

    /*
      Read while the curtain is *up*. If the flag has already flipped by here, the
      site was paintable before the curtain existed — which is the bug, not a
      variation of it.
    */
    await expect(page.locator(".msd-intro")).toHaveCount(1, { timeout: 8_000 });

    /*
      Self-check, and the reason this test cannot be green for free again: the
      observer has to have actually seen the attribute change. If the instrumentation
      silently failed to install, the flag is `false` because nothing ran — and a test
      that reports success when its own probe is dead is worse than no test.
    */
    expect(
      await page.evaluate(() => (window as Window & { msdHoldEvents?: number }).msdHoldEvents ?? 0),
      "the observer never saw the hold change, so the assertion below proved nothing",
    ).toBeGreaterThanOrEqual(2);

    expect(
      await page.evaluate(() => (window as Window & { msdPaintedBeforeCurtain?: boolean }).msdPaintedBeforeCurtain),
      "the site became paintable before the curtain was in the document",
    ).toBe(false);
  });

  /**
   * The hold must not outlive the intro it exists for, or the reader watches a
   * finished sequence through an invisible page and then gets it again.
   */
  test("releases the hold once the intro has played", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 12_000 });
    await expect(page.locator("html")).not.toHaveAttribute("data-intro-pending", "", {
      timeout: 2_000,
    });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  /**
   * A reader who deep-links to the résumé has no curtain coming. If the hold
   * applied there it would make an already-finished document invisible for the
   * length of the ceiling timer, which is the worst version of this feature.
   */
  test("does not hold a route that has no intro", async ({ page }) => {
    await page.goto("/en-us/resume", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);

    await expect(page.locator("html")).not.toHaveAttribute("data-intro-pending", "", {
      timeout: 3_000,
    });
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("is abandoned by a single keypress, at any point", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    // During the handshake, which is the beat people are most likely to be
    // waiting through. A first-visit animation is a promise, not a prison.
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");

    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 2_000 });
  });

  test("does not play again on a return visit", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);

    // A refresh is not an absence. This is the assertion that stops the arrival
    // from becoming the thing a reader sees every time they hit reload.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);

    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("an open tab is not an absence", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_200);
    await page.keyboard.press("Escape");

    // The activity stamp refreshes on an interval while the tab is open, so
    // coming back to a tab left open is not "arriving again".
    const stored = await page.evaluate(() => window.localStorage.getItem("msd:intro-seen:v1"));
    expect(stored, "the visit was never recorded").not.toBeNull();
    expect(JSON.parse(stored ?? "{}").lastActiveAt).toBeGreaterThan(0);
  });

  test("never runs under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(2_500);

    // Not "shorter". The sequence is a stack of full-screen animation, and a
    // reduced version of it is still a stack of full-screen animation.
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("is not announced, focusable, or able to trap a keyboard reader", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    const intro = page.locator(".msd-intro");
    await expect(intro).toHaveAttribute("aria-hidden", "true");

    const roles = await intro.evaluate(
      (element) => element.querySelectorAll("[role], [aria-live], [aria-modal], [tabindex]").length,
    );
    expect(roles, "the intro exposed focusable or announced structure").toBe(0);

    // Tabbing must reach the page underneath, not bounce inside the overlay.
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press("Tab");
    }
    const inside = await page.evaluate(() => document.activeElement?.closest(".msd-intro") !== null);
    expect(inside, "focus was trapped inside the intro").toBe(false);
  });

  test("does not cover the site once it has played", async ({ page }) => {
    await page.goto("/en-us", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-intro-phase]")).toHaveCount(0, { timeout: 12_000 });

    // The site was painted and interactive the whole time; the intro is a
    // curtain over it, not a load.
    await expect(page.getByRole("link", { name: /resume/i }).first()).toBeVisible();
  });
});