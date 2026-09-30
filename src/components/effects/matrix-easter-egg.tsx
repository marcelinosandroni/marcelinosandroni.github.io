"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { MatrixRain } from "@/components/effects/matrix-rain";
import {
  DELIBERATE_INTERACTION_EVENTS,
  EASTER_EGG_BY_ID,
  earliestEasterEggAt,
  evaluateEasterEgg,
  firstEggDueAt,
  pickEasterEgg,
  readEasterEggHistory,
  readForcedEasterEggId,
  writeEasterEggDueAt,
  writeEasterEggFired,
  type EasterEgg,
  type EasterEggHistory,
  type EasterEggId,
} from "@/domain/easter-egg";
import { THEME_ATTRIBUTE, type ThemeId } from "@/domain/theme/theme";

/**
 * Occasional Matrix easter eggs.
 *
 * Everything that decides *whether* an egg happens lives in
 * `@/domain/easter-egg` and is unit-tested there. This file is the part that
 * needs a browser: one timer, one subscription to the theme, one listener for
 * deliberate interaction, and the rendering.
 *
 * ## Why this is a client island
 *
 * It reads three things that only exist after paint — the `data-theme`
 * attribute the CSS reads, the `prefers-reduced-motion` media query, and
 * `location.search` — so it cannot be a Server Component. But it renders `null`
 * on the server and in the first client pass, which means it costs one island
 * and nothing on the server-rendered page.
 *
 * `location.search` rather than `useSearchParams()` on purpose: the hook opts
 * the whole segment out of static rendering unless it is wrapped in a
 * `<Suspense>` boundary, and the honest fix for a test seam is not to deopt
 * every page in the tree to read a parameter that is almost always absent.
 *
 * ## The accessibility contract, and why each half is there
 *
 * An easter egg that can steal focus, trap a keyboard reader or interrupt a
 * screen reader is not a joke, it is a bug with a sense of humour. So:
 *
 *  - **Nothing is announced.** The visual layer is `aria-hidden="true"` — not
 *    `role="presentation"`, not a live region. A wall of glyphs or a line of
 *    type read out unprompted is the failure mode, and an `aria-live` anywhere
 *    in here would announce the effect *and* its disappearance, which is two
 *    interruptions instead of none.
 *  - **Focus never moves.** The island never calls `focus()`, and the dismiss
 *    control is `tabIndex={-1}`, so the tab order on the page is byte-for-byte
 *    what it was before the egg appeared. A keyboard reader tabbing through the
 *    site cannot stumble into a joke.
 *  - **Exactly one click target.** `pointer-events: none` on the visual layer
 *    and `pointer-events: auto` on the dismiss control — the carve-out the
 *    brief asks for. `white-pill` covers the viewport; the reader underneath it
 *    stays fully clickable and the control is the way out.
 *  - **Escape always works**, from anywhere, whether or not the reader has
 *    found the control.
 *  - **Nothing while a dialog is open.** The two modals in this codebase
 *    (`resume-copilot.tsx:271`, `visitor-chat.tsx:444`) both render
 *    `role="dialog" aria-modal="true"` only while open, so one selector covers
 *    them. An effect over a modal is a visual collision with a screen reader
 *    already inside that modal.
 *  - **Nothing at all under `prefers-reduced-motion`.** Read through
 *    `useSyncExternalStore` with a `false` server snapshot, so the decision is
 *    made before the timer is armed rather than after something has already
 *    flashed — and reinforced in CSS, because a JS-side reading of the media
 *    query is one failure away from being the only thing between a reader who
 *    asked for no animation and a full-screen one.
 *
 * All copy arrives as props from the Server Component, so this island holds no
 * dictionary and nothing it imports can pull page content into the browser
 * bundle (`boot-sequence.tsx:34`).
 */

/** Labels this island needs. Everything else about it is drawn, not said. */
export interface MatrixEasterEggLabels {
  /** Visible text on the dismiss control, and its accessible name. */
  readonly dismiss: string;
  /** The status line on the glitch. */
  readonly glitchStatus: string;
  /** The single line on the takeover. */
  readonly whitePill: string;
  /** The key hint under it. */
  readonly whitePillHint: string;
  /** The single quiet line. */
  readonly wakeUp: string;
}

/**
 * How long after the last deliberate interaction the timer is re-armed.
 *
 * The re-arm exists because the interaction cooldown is a *live* rule: a reader
 * who scrolls for the first ninety seconds has to not get the egg at the
 * hundred-and-twentieth, and a timer armed before the scroll would have done
 * exactly that. Re-arming per event would be a `clearTimeout` plus a
 * `setTimeout` on every `scroll` frame, so it is debounced instead — 400ms is
 * long enough to collapse a scroll gesture into one re-arm and short enough
 * that the reader is not still waiting seven minutes after they stopped.
 */
const REARM_DEBOUNCE_MS = 400;

/**
 * Reads the theme the CSS is actually using.
 *
 * The attribute, not storage — the same reasoning as
 * `header-theme-control.tsx:108`. A reader whose stored value and rendered
 * theme disagree must get an effect that matches what they can see.
 *
 * The cast is deliberate and unlike the one next door: this does *not* validate
 * or normalise the attribute. `normalizeThemeId` would turn an absent or
 * hostile value into `carbon`, which is the right thing for rendering and the
 * wrong thing for a gate — a rule that can't tell "carbon" from "I don't know
 * what this is" cannot be reasoned about. The gate does the comparing.
 */
function readRenderedTheme(): ThemeId | null {
  const attribute = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return typeof attribute === "string" ? (attribute as ThemeId) : null;
}

function readThemeOnServer(): ThemeId | null {
  return null;
}

/** The same event `applyTheme` dispatches, so a theme switch re-reads the gate. */
const THEME_CHANGE_EVENT = "msd:themechange";

function subscribeToTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

/**
 * Reduced motion, read once per page load.
 *
 * No subscription: the value cannot change without a reload in any browser this
 * has to work in, and a `matchMedia` listener would add a code path for a case
 * that does not occur. `boot-sequence.tsx:56` makes the same call.
 */
const NO_SUBSCRIPTION = () => () => {};
const SERVER_SNAPSHOT_FALSE = () => false;

function readPrefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Whether a dialog is open.
 *
 * `[aria-modal="true"]` rather than `[role="dialog"]`: a non-modal dialog is not
 * a reason to suppress an effect, and the two dialogs in this codebase are both
 * genuinely modal.
 */
function readDialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"], dialog[open]') !== null;
}

/** A session-storage handle, or `undefined` where storage is unavailable. */
function sessionStore(): Storage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    // Blocked partitioning. The egg still works; it just cannot remember.
    return undefined;
  }
}

/** The one query-parameter value, read from `location` rather than from React. */
function readForcedId(): EasterEggId | null {
  return readForcedEasterEggId(window.location.search);
}

export function MatrixEasterEgg({
  labels,
}: {
  labels: MatrixEasterEggLabels;
}): React.ReactElement | null {
  const theme = useSyncExternalStore(subscribeToTheme, readRenderedTheme, readThemeOnServer);
  const prefersReducedMotion = useSyncExternalStore(
    NO_SUBSCRIPTION,
    readPrefersReducedMotion,
    SERVER_SNAPSHOT_FALSE,
  );

  const [activeId, setActiveId] = useState<EasterEggId | null>(null);

  /*
     The live inputs of the rule, in refs rather than state.

     The effect that arms the timer has to re-run when the theme changes and
     after every deliberate interaction, and interactions arrive as a stream.
     Holding the timestamp in state would re-render the island on every
     `pointerdown` and every scroll frame; a ref plus an explicit re-arm keeps
     the render count at zero until an egg is actually on screen.
  */
  const lastInteractionAt = useRef<number | null>(null);
  const historyRef = useRef<EasterEggHistory | null>(null);
  const firedRef = useRef(false);
  const forcedIdRef = useRef<EasterEggId | null>(null);

  /*
     When this page was opened.

     Set from an effect rather than from a ref's initialiser or a render-phase
     assignment, because both of those run `Date.now()` inside render — which
     makes the render impure and, worse, would mean a server-rendered
     timestamp could reach the rule. The arming effect below is declared after
     this one, so it always sees the value this set.
  */
  const sessionStartedAt = useRef<number>(0);

  useEffect(() => {
    sessionStartedAt.current = Date.now();
  }, []);

  /** At most one timer exists: the armed egg, and the one that puts it away. */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The current `arm`, so `look` can re-arm without a forward reference.
   *
   * The indirection exists for one reason: a dialog is the only refusal that
   * changes on its own, and the way to wait for it is to re-arm — which is a
   * call from `look` into a function declared below it. A ref is the shape that
   * says "re-enter this later" without either a forward declaration or a second
   * timer.
   */
  const armRef = useRef<() => void>(() => {});

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** The session record, read once per mount and then mutated in place. */
  const history = useCallback((): EasterEggHistory => {
    if (historyRef.current === null) {
      historyRef.current = readEasterEggHistory(sessionStore()) ?? {
        dueAt: null,
        firedIds: [],
        lastFiredAt: null,
      };
    }

    return historyRef.current;
  }, []);

  const dismiss = useCallback((): void => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setActiveId(null);
  }, []);

  /**
   * Looks, and either fires or comes back later.
   *
   * The decision is delegated whole: this function does not know why it is
   * allowed or refused, and it re-reads every input at the moment it fires
   * rather than trusting the values that armed the timer. A reader who opened a
   * modal in the minutes between arming and firing gets nothing, which is the
   * outcome that gate exists for.
   */
  const look = useCallback((): void => {
    const now = Date.now();
    const current = history();

    const decision = evaluateEasterEgg({
      theme,
      prefersReducedMotion,
      history: current,
      now,
      sessionStartedAt: sessionStartedAt.current,
      lastInteractionAt: lastInteractionAt.current,
      dialogOpen: readDialogOpen(),
      dueAt: current.dueAt,
      forcedId: forcedIdRef.current,
    });

    if (!decision.allowed) {
      /*
         A dialog is the only refusal expected to change on its own, so it is
         the only one worth a second look — and the domain already says how long
         to wait for it (`earliestEasterEggAt` returns a short retry rather than
         a refusal), so re-arming is enough and no timer is needed here. Every
         other reason is a property of the page or the session, and the effect
         below re-reads those.
      */
      if (decision.reason === "dialog-open") {
        armRef.current();
      }

      return;
    }

    const id = forcedIdRef.current ?? pickEasterEgg(current);

    historyRef.current = writeEasterEggFired(sessionStore(), current, id, now);
    firedRef.current = true;
    setActiveId(id);

    hideTimerRef.current = setTimeout(() => {
      setActiveId(null);
      hideTimerRef.current = null;
    }, EASTER_EGG_BY_ID[id].durationMs);
  }, [history, prefersReducedMotion, theme]);

  /**
   * Arms one timer for the moment the domain says is worth looking.
   *
   * `null` from `earliestEasterEggAt` means there is nothing to wait for: a
   * permanent refusal — wrong theme, reduced motion, budget spent — or a
   * schedule that has not been drawn. The schedule is drawn here, first, because
   * a rule that can be told "there is no number to wait for" and get back "do
   * not arm" is much harder to misuse than one that substitutes a default.
   */
  const arm = useCallback((): void => {
    clearTimer();

    if (firedRef.current) {
      return;
    }

    const now = Date.now();

    /*
       The schedule is drawn once per session and written down *before* it is
       read, so a reload inside the window cannot re-roll it. See
       `writeEasterEggDueAt`.
    */
    const seeded =
      history().dueAt === null
        ? (historyRef.current = writeEasterEggDueAt(
            sessionStore(),
            history(),
            now + firstEggDueAt(),
          ))
        : history();

    const at = earliestEasterEggAt({
      theme,
      prefersReducedMotion,
      history: seeded,
      now,
      sessionStartedAt: sessionStartedAt.current,
      lastInteractionAt: lastInteractionAt.current,
      dialogOpen: readDialogOpen(),
      dueAt: seeded.dueAt,
      forcedId: forcedIdRef.current,
    });

    if (at === null) {
      return;
    }

    // Coerced to `>= 0`: a schedule drawn a moment ago can resolve into the past.
    timerRef.current = setTimeout(look, Math.max(0, at - Date.now()));
  }, [clearTimer, history, look, prefersReducedMotion, theme]);

  /* The seam, read once per mount: it is a property of the URL, not of state. */
  useEffect(() => {
    armRef.current = arm;
    forcedIdRef.current = readForcedId();
    arm();
  }, [arm]);

  /*
     Deliberate interaction.

     `DELIBERATE_INTERACTION_EVENTS` is the domain's list, not a local one, so
     the set of things that count as "the reader is operating the page" is
     asserted in the unit tests next to the cooldown it feeds.
  */
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const onInteraction = (): void => {
      lastInteractionAt.current = Date.now();

      if (firedRef.current) {
        return;
      }

      if (debounce !== null) {
        clearTimeout(debounce);
      }

      debounce = setTimeout(() => {
        debounce = null;
        arm();
      }, REARM_DEBOUNCE_MS);
    };

    for (const event of DELIBERATE_INTERACTION_EVENTS) {
      window.addEventListener(event, onInteraction, { passive: true });
    }

    return () => {
      for (const event of DELIBERATE_INTERACTION_EVENTS) {
        window.removeEventListener(event, onInteraction);
      }

      if (debounce !== null) {
        clearTimeout(debounce);
      }
    };
  }, [arm]);

  /* Escape, from anywhere, always. The one key that does not need the control. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  /* Both timers belong to this island and nothing else. */
  useEffect(
    () => () => {
      clearTimer();

      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    },
    [clearTimer],
  );

  /* Nothing under reduced motion, decided before anything is armed. */
  if (activeId === null || prefersReducedMotion) {
    return null;
  }

  const egg = EASTER_EGG_BY_ID[activeId] as EasterEgg;

  return (
    <div
      /*
         `data-easter-egg` is the hook the e2e suite asserts on, and it is also
         the honest description of the thing: one attribute carrying the id of
         the effect, on a fixed container that covers the viewport.

         `pointer-events-none` on the *container*, not only on the layer inside
         it. A transparent fixed div over the whole viewport is still a hit
         target — hit testing does not need a background — so without this the
         takeover swallows every click on the page underneath it. The control
         below opts back in, which is the same arrangement `boot-sequence.tsx`
         uses for the identical problem.
      */
      data-easter-egg={egg.id}
      data-testid="easter-egg"
      className="msd-egg pointer-events-none fixed inset-0 z-100"
    >
      {/*
        The whole visual layer, and only this, is `aria-hidden`. The dismiss
        control is deliberately *outside* it: a focusable element inside
        `aria-hidden` is the keyboard trap this codebase already documented at
        `boot-sequence.tsx:29`.
      */}
      <div
        aria-hidden="true"
        data-egg-kind={egg.kind}
        className="msd-egg__layer pointer-events-none absolute inset-0"
      >
        <EggBody egg={egg} labels={labels} />
      </div>

      {/*
        The single interaction the brief allows.

        `tabIndex={-1}` because "dismissible by a single key or click" and
        "nothing focusable" are two requirements at once, and this is the only
        shape that satisfies both: a real button with a real accessible name,
        clickable with a pointer, reachable by a screen reader in browse mode,
        and absent from the tab order so a keyboard reader cannot land on it by
        accident.

        `.header-control` rather than an ad-hoc chain, because every other
        control on the site already shares that appearance and this one is
        drawn on top of the page it is covering.
      */}
      <button
        type="button"
        tabIndex={-1}
        onClick={dismiss}
        data-testid="easter-egg-dismiss"
        className="header-control pointer-events-auto absolute bottom-4 right-4 px-3"
      >
        {labels.dismiss}
      </button>
    </div>
  );
}

/**
 * The bodies.
 *
 * Each is a different *kind* of effect rather than a different colour, and the
 * catalogue's `kind` field is what asserts that. Two of them reuse `MatrixRain`
 * rather than reimplementing it: the rain is already the site's loading
 * language, and a second implementation of it would be a second thing to keep in
 * step with the first.
 */
function EggBody({
  egg,
  labels,
}: {
  egg: EasterEgg;
  labels: MatrixEasterEggLabels;
}): React.ReactElement {
  switch (egg.id) {
    /*
       The whole frame, and nothing added to it.

       There is no duplicate of the page in the DOM: copying the page to shift
       its channels is what a CSS-only RGB split always ends up doing, and it
       doubles the layout cost to deliver a joke. `backdrop-filter` on a few
       narrow bands shifts what is already painted, so the reader's own content
       tears and lands back in place.
    */
    case "decode-glitch":
      return (
        <>
          <div className="msd-egg__scanlines" />
          <div className="msd-egg__tear" />
          <p className="msd-egg__status">{labels.glitchStatus}</p>
        </>
      );

    /*
       The only one that hides the page, and therefore the only one where the
       reader might reasonably be annoyed: an opaque ground, one line of the
       site's own display serif, and the key that ends it. It also dismisses on
       its own, so a reader who walks away does not come back to it.
    */
    case "white-pill":
      return (
        <div className="msd-egg__takeover">
          <p className="msd-egg__pill-line">{labels.whitePill}</p>
          <p className="msd-egg__pill-hint">{labels.whitePillHint}</p>
        </div>
      );

    /*
       The site's own rain, running upward. Same component, same seeded glyphs,
       same `ch`-measured columns — `animation-direction: reverse` is the whole
       implementation, which is the argument for reusing it.
    */
    case "reversed-rain":
      return (
        <MatrixRain columnCount={64} className="msd-rain--viewport msd-egg__rain msd-rain--reverse" />
      );

    /*
       The rain stopped in place. The per-column negative delay means each one
       parks at a different point of its fall, so the wall keeps its staggered
       depth instead of flattening into a row of glyph tops.
    */
    case "glyph-freeze":
      return (
        <MatrixRain columnCount={110} className="msd-rain--viewport msd-egg__rain msd-rain--frozen" />
      );

    /*
       The quietest one: a line of the site's mono label type at the bottom of
       the viewport, clipped on like a terminal rather than stepped per
       character — a per-character reveal would have to know the length of the
       string, which is a number that changes with the locale. One caret, no
       other motion.
    */
    case "wake-up":
      return (
        <div className="msd-egg__line">
          <span className="msd-egg__line-text">{labels.wakeUp}</span>
        </div>
      );
  }
}