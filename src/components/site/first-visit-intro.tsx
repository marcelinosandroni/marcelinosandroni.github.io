"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { MatrixName } from "@/components/effects/matrix-name";
import { MatrixRain } from "@/components/effects/matrix-rain";
import { releaseIntroHold } from "@/components/site/intro-bootstrap-script";
import {
  INTRO_TOTAL_MS,
  introPhaseAt,
  readIntroVisit,
  touchIntroActivity,
  writeIntroVisit,
} from "@/domain/intro";

/**
 * The arrival, for a reader who has not been here before.
 *
 * ## What it is
 *
 * Three beats, driven by one `requestAnimationFrame` clock. React renders the phase
 * *name* and nothing else; every animation inside a beat is CSS hung off
 * `data-intro-phase`, so a frame in which the phase did not change costs no style
 * work at all:
 *
 *   connecting  the rain is on screen; the name is already falling
 *   locking     the columns resolve into the name
 *   enter       the curtain rises off the top of the screen and the site is there
 *
 * ## Why the name does not wait for `locking`
 *
 * Because the sequence is three seconds and the name is the subject. The columns
 * are mounted from the first frame rather than at the `locking` boundary, so the
 * first letter starts falling while the rain is still establishing itself. Waiting
 * for a phase change would spend the opening 200ms of a three-second arrival on
 * rain nobody asked for.
 *
 * ## Why the terminal log is gone
 *
 * It was six lines of the résumé's own figures, and it was costing 2.4 seconds —
 * more than the rest of the sequence put together — to show text nobody could
 * finish reading. Those figures are the hero's job now: a reader who stops on one
 * gets all of them, and a reader in a hurry gets the name and the site instead.
 *
 * ## Why there is no photograph in it
 *
 * This sequence used to reveal a portrait and then fly that portrait onto the hero's
 * position, measured to the pixel. All of it is gone, and the reasoning is worth
 * keeping because it is the reason this component is smaller:
 *
 * An arrival that ends on a face makes the reader look twice — at the face, and
 * then at the hero, which is the same face. The landing solved the *movement*
 * between the two and left the *duplication* untouched, which is the half that
 * could not be solved by animating harder.
 *
 * A name is not a duplicate of anything. It is about the site rather than about one
 * photograph, and it gives the hand-off nothing to line up: the curtain simply
 * rises, and the hero's portrait was never not there.
 *
 * ## Why the name is a *lock* rather than a type-on
 *
 * A typewriter effect is a queue: it reveals a string left to right. The Matrix
 * columns are not a queue — each one arrives at its own moment, at its own speed,
 * and the reader's name is legible before the last letter has landed. That is why
 * the columns are independent and staggered, and why the stagger runs left to right
 * rather than at random: the name has to be *followable* as it forms.
 *
 * ## Why it is one clock and not a chain of timeouts
 *
 * A chain of `setTimeout`s drifts, cannot be scrubbed, and cannot be reasoned about
 * as a sequence. One `rAF` loop advancing a single elapsed time against
 * `introPhaseAt` means the phase is a *function* of the clock, so a dropped frame
 * shortens nothing and a slow phone plays the same three beats as a fast one.
 *
 * The clock writes nothing per frame any more. It used to write `--intro-progress`
 * every frame for rules that no longer exist; what is left is a comparison against
 * the phase name, so a frame in which nothing changed costs a string compare and no
 * style recalculation.
 *
 * ## Why it must be cheap for a reader who has seen it
 *
 * The gate is resolved in a `useEffect` and the component returns `null` on the
 * first paint for anyone who does not qualify. No rain, no glyphs, no work at all —
 * and the single most common case on a portfolio is the second visit.
 */
export function FirstVisitIntro({
  name,
}: {
  /** The reader's name, set by the caller from the site identity. */
  name: string;
}): React.ReactElement | null {
  const [phase, setPhase] = useState<string | null>(null);
  const frameRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);

  const finish = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    setPhase(null);
    writeIntroVisit(window.localStorage, Date.now());
    releaseIntroHold();
  }, []);

  /* The gate, and the clock. Both only exist if the intro qualified. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      writeIntroVisit(window.localStorage, Date.now());
      releaseIntroHold();
      return;
    }

    const visit = readIntroVisit(window.localStorage);
    const away = visit.lastActiveAt === null ? Number.POSITIVE_INFINITY : Date.now() - visit.lastActiveAt;

    // First visit, or a genuine absence of ten minutes. A refresh is not an absence.
    if (visit.seenAt !== null && away < 10 * 60 * 1_000) {
      releaseIntroHold();
      return;
    }

    /*
      The site has been held back since before the first paint by the bootstrap
      script, and it stays held here on purpose.

      It is released by the phase-keyed layout effect below, once the curtain is
      actually in the document. Releasing it in this effect was the arrival's one
      real bug, and the window was not the frame it looked like: measured at 163ms
      on a development machine, between the pending attribute being cleared and the
      curtain existing. The reasoning belongs on the effect that releases it.
    */

    /*
      No `setPhase` before the loop starts. The phase is set on the first animation
      frame rather than in the effect body, which costs one frame — invisible — and
      keeps the state update inside a callback instead of synchronously in the
      effect, which is what the React Compiler rule is actually about. Setting it
      here produced a cascading render on mount.
    */
    startedAtRef.current = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - startedAtRef.current;
      const next = introPhaseAt(elapsed);

      if (next === null) {
        finish();
        return;
      }

      /*
        The updater returns the identical value when nothing changed, which is the
        only thing keeping this loop off React's render path sixty times a second.
        It is the reason the comparison lives here rather than in a `useState` read.
      */
      setPhase((current) => (current === next ? current : next));
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [finish]);

  /*
    The hand-off, and the only place the hold is lifted for a reader who is getting
    the intro.

    ## Why this is keyed on `phase`, and not a call in the gate above

    Because that ordering was the bug. The gate used to clear `data-intro-pending`
    and *then* schedule the first `setPhase` on a `requestAnimationFrame`. Clearing it
    is what stops `html[data-intro-pending] body { visibility: hidden }` from
    applying, and at that instant `phase` was still `null`, so this component returned
    `null` and there was no curtain in the document at all. The reader saw the
    finished home, and then a black curtain over it.

    Not one frame, either. The gate is a passive effect, so it runs after a paint; the
    `setPhase` waits for the next animation frame, and then for a render and a commit.
    Instrumented against the attribute itself, the gap measured 163ms on a development
    machine. It is a frame only on a phone that is doing nothing else.

    Keying on `phase` closes the window without touching the beats. By the time this
    runs, the commit that set the phase has already put the curtain in the DOM, so
    there is no frame in which the site is paintable without it.

    `useLayoutEffect` rather than `useEffect` because it is the tighter of the two and
    the reason is the same one: a layout effect runs in the same task as the DOM
    mutation and before the browser can paint, while a passive effect is deferred to
    after the next one. Both are safe here — that deferred paint is of a body the hold
    still hides — but the layout effect makes the guarantee structural instead of
    resting on the hold still being up, which is a property of a different file.

    Nothing else regresses. Effects are not throttled the way `requestAnimationFrame`
    is, so the hold still comes down on a tab that was backgrounded at load. Hydration
    that never happens is still answered by the bootstrap script's own ceiling timer,
    which is unchanged.
  */
  useLayoutEffect(() => {
    if (phase !== null) {
      releaseIntroHold();
    }
  }, [phase]);

  /*
    Presence, not interaction.

    The point is that an *open tab* does not count as an absence, so the stamp
    is refreshed on visibility and on a slow interval — not on every mouse move,
    which would be a storage write per pointer event.
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
      data-intro-phase={phase}
      aria-hidden="true"
      className="msd-intro"
      /*
        A hard ceiling on the whole thing. The phases add up to under seven seconds,
        and this is the belt to that pair of braces: a timer that never fires would
        otherwise leave a full-screen layer over the site forever, and the reader's
        only way out would be the skip key.
      */
      style={{ "--intro-max": `${INTRO_TOTAL_MS}ms` } as React.CSSProperties}
    >
      {/*
        The opaque backdrop, as its own element rather than a background on the
        layer.

        The rise has to cut the backdrop and the rain by the same rectangle while
        leaving the edge glow — which rides the boundary — unclipped. A `background`
        on their shared parent cannot be clipped separately from its siblings, which
        is the same bug that once left a black screen at the moment the site was
        supposed to appear.
      */}
      <div className="msd-intro__backdrop" />

      {/*
        The rain, for the whole sequence.

        It does not fade for the name. The columns of the name and the rain behind
        them are the same glyphs from the same generator, and the moment the ambient
        rain thinned for the resolve, the name stopped reading as *made of* the rain
        and started reading as text that happened to be near it.
      */}
      <div className="msd-intro__rain">
        <MatrixRain columnCount={44} seed={777} />
      </div>

      {/*
        The name, mounted from the first frame.

        The columns fall on *insertion*, so the mount is what starts them — and the
        sequence is three seconds long, which is not enough to spend 200ms of its
        opening on rain with nothing in it. Mounting immediately is what makes the
        arrival read as the name arriving rather than as a loading screen clearing.
      */}
      <MatrixName text={name} />

      {/*
        The edge of the rise. One hairline that travels with the boundary the clip
        opens, which is the only thing that makes the curtain read as a *thing
        moving* rather than as an opaque layer being deleted. It is deliberately not
        clipped: a glow on the boundary has to survive the boundary being cut.
      */}
      <div className="msd-intro__edge" />
    </div>
  );
}
