"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MatrixRain } from "@/components/effects/matrix-rain";
import {
  INTRO_TOTAL_MS,
  introPhaseAt,
  introPhaseProgress,
  readIntroVisit,
  touchIntroActivity,
  writeIntroVisit,
} from "@/domain/intro";

/**
 * The arrival, for a reader who has not been here before.
 *
 * ## What it is
 *
 * Four beats, driven by one `requestAnimationFrame` clock and rendered as CSS
 * custom properties rather than as React state per frame:
 *
 *   connecting  the Matrix handshaking, three seconds
 *   door        a light opening
 *   reveal      the door pulls back, and there is a face inside a frame
 *   enter       the frame goes, and the site is already there
 *
 * The reveal is the beat the whole thing is built around. A boot animation that
 * ends on a wordmark has taught the reader that the site has a splash screen; one
 * that pulls back to a portrait makes them look twice, and the second look is the
 * résumé.
 *
 * ## Why it is one clock and not a chain of timeouts
 *
 * A chain of `setTimeout`s drifts, cannot be scrubbed, and cannot be reasoned
 * about as a sequence. One `rAF` loop advancing a single elapsed time against
 * `introPhaseAt` means the phase is a *function* of the clock, so a dropped frame
 * shortens nothing and a slow phone plays the same four beats as a fast one.
 *
 * The custom properties are written straight to the element's style. Routing
 * 60fps through React state would re-render the tree sixty times a second to move
 * a transform, which is the expensive way to do something the compositor does for
 * free.
 *
 * ## Why it must be cheap for a reader who has seen it
 *
 * The gate is resolved in a `useEffect` and the component returns `null` on the
 * first paint for anyone who does not qualify. No rain, no image request, no
 * work at all — the single most common case on a portfolio is the second visit.
 */
export function FirstVisitIntro({
  portrait,
  logLines,
}: {
  portrait: string;
  /** The résumé''s own facts, already translated by the caller. */
  logLines: readonly string[];
}): React.ReactElement | null {
  const [phase, setPhase] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const finish = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    setPhase(null);
    writeIntroVisit(window.localStorage, Date.now());
  }, []);

  /* The gate, and the clock. Both only exist if the intro qualified. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      writeIntroVisit(window.localStorage, Date.now());
      return;
    }

    const visit = readIntroVisit(window.localStorage);
    const away = visit.lastActiveAt === null ? Number.POSITIVE_INFINITY : Date.now() - visit.lastActiveAt;

    // First visit, or a genuine absence of ten minutes. A refresh is not an absence.
    if (visit.seenAt !== null && away < 10 * 60 * 1_000) {
      return;
    }

    /*
      No `setPhase` before the loop starts. The phase is set on the first
      animation frame rather than in the effect body, which costs one frame —
      invisible — and keeps the state update inside a callback instead of
      synchronously in the effect, which is what the React Compiler rule is
      actually about. Setting it here produced a cascading render on mount.
    */
    startedAtRef.current = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - startedAtRef.current;
      elapsedRef.current = elapsed;

      const next = introPhaseAt(elapsed);

      if (next === null) {
        finish();
        return;
      }

      const layer = layerRef.current;

      if (layer !== null) {
        const progress = introPhaseProgress(next, elapsed);
        layer.style.setProperty("--intro-progress", progress.toFixed(4));
        layer.style.setProperty("--intro-elapsed", `${elapsed}ms`);
      }

      setPhase((current) => (current === next ? current : next));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [finish]);

  /*
   * Presence, not interaction.
   *
   * The point is that an *open tab* does not count as an absence, so the stamp
   * is refreshed on visibility and on a slow interval — not on every mouse move,
   * which would be a storage write per pointer event.
   */
  useEffect(() => {
    const stamp = (): void => touchIntroActivity(window.localStorage, Date.now());

    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        stamp();
      }
    };

    const interval = window.setInterval(stamp, 60_000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* Any key or click abandons it. A promise, not a prison. */
  useEffect(() => {
    if (phase === null) {
      return;
    }

    const abandon = (): void => finish();

    window.addEventListener("keydown", abandon, { once: true });
    window.addEventListener("pointerdown", abandon, { once: true });

    return () => {
      window.removeEventListener("keydown", abandon);
      window.removeEventListener("pointerdown", abandon);
    };
  }, [phase, finish]);

  if (phase === null) {
    return null;
  }

  return (
    <div
      ref={layerRef}
      data-intro-phase={phase}
      aria-hidden="true"
      className="msd-intro"
      /*
        A hard ceiling on the whole thing. The phases add up to under six and a
        half seconds, and this is the belt to that pair of braces: a timer that
        never fires would otherwise leave a full-screen layer over the site
        forever, and the reader's only way out would be the skip key.
      */
      style={{ "--intro-max": `${INTRO_TOTAL_MS}ms` } as React.CSSProperties}
    >
      {/*
        The rain, in front of everything for the whole sequence.

        It used to fade out at the reveal, on the reasoning that the portrait was
        the subject. That was backwards: the rain is not a backdrop for the shot,
        it is the place the shot is set. Fading it is what left the reveal looking
        like a portrait on a dark background instead of a face inside the Matrix.
        It leaves with the `enter` beat, with everything else.
      */}
      <div className="msd-intro__rain" data-visible={phase !== "enter"}>
        <MatrixRain columnCount={44} seed={777} />
      </div>

      {/* The door: a light in the dark that widens. */}
      <div className="msd-intro__door" data-visible={phase === "door" || phase === "reveal" || phase === "enter"} />

      {/*
        The portrait, inside a frame, inside the door.

        `decoding="async"` and an explicit width/height: the image is a 105KB webp
        that should never be on the critical path of the page behind it, and
        without intrinsic dimensions it shifts the whole layer when it lands.
      */}
      <div className="msd-intro__portrait" data-visible={phase === "reveal" || phase === "enter"}>
        <div className="msd-intro__frame">
          {/* eslint-disable-next-line @next/next/no-img-element -- art direction, and a plain <img> is the only way to keep the browser from lazy-loading a frame that is already the whole viewport */}
          <img
            src={portrait}
            alt=""
            width={640}
            height={640}
            decoding="async"
            className="msd-intro__image"
          />
          <div className="msd-intro__scan" />
        </div>
      </div>

      {/*
        The log. These are the résumé's own checkable facts, carried over from the
        boot sequence this replaced — the arithmetic and the platform list are the
        most useful things a reader can learn in the first three seconds, and
        inventing new terminal copy for an intro would have been strictly worse.
      */}
      <div className="msd-intro__log" data-visible={phase === "connecting" || phase === "door"}>
        {phase === "door" ? <p>&gt; opening</p> : logLines.map((line) => <p key={line}>{line}</p>)}
      </div>
    </div>
  );
}
