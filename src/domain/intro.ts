/**
 * The first-visit intro, as a state machine.
 *
 * ## Why the rules live here and not in the component
 *
 * Because the interesting part is not the animation, it is the policy: when the
 * intro may play, when it must not, and how a reader gets out of it. Every one of
 * those is a decision with an edge case, and a decision buried in a `useEffect` is
 * a decision nobody can test. Here it is a pure function of `(visit, now, options)`
 * and the tests can drive a whole afternoon in a millisecond.
 *
 * ## The sequence
 *
 * Four beats, in the order the brief asked for:
 *
 *   connecting → the Matrix handshaking, three seconds
 *   door       → a light opening, the way into it
 *   reveal     → the door pulls back and it is a face inside a frame
 *   enter      → the frame goes, and the site is already there
 *
 * The reveal is the whole point. A boot animation that ends on a logo teaches the
 * reader that the site has a splash screen; one that pulls back to a portrait
 * makes them look twice, and the second look is the site.
 *
 * ## Why the whole thing is skippable, always
 *
 * A first-visit animation is a promise, not a privilege. It plays once, it never
 * plays on a return visit, and a keypress or a click abandons it immediately —
 * including during the three-second handshake, which is the beat people are most
 * likely to be waiting through. `INTRO_PHASES` is exported so the UI can render
 * real progress, and so a test can assert the total is short rather than trusting
 * that nobody made a phase too long.
 */
export type IntroPhase = "connecting" | "door" | "reveal" | "enter";

export type IntroPhaseStep = {
  readonly phase: IntroPhase;
  /** How long this beat holds before the next one begins, in ms. */
  readonly durationMs: number;
};

/**
 * The beats, in order, with their durations.
 *
 * Three seconds of handshake is the brief's number and it is the one duration a
 * reader will actually feel. Everything after it is much shorter: the point of
 * the door and the reveal is that they arrive quickly enough to feel like one
 * movement rather than three.
 *
 * `enter` is the shortest beat and the only one that does not hold — it is the
 * frame leaving, and the site is visible underneath it the entire time.
 */
export const INTRO_PHASES: readonly IntroPhaseStep[] = [
  { phase: "connecting", durationMs: 3_000 },
  { phase: "door", durationMs: 1_100 },
  { phase: "reveal", durationMs: 1_500 },
  { phase: "enter", durationMs: 700 },
];

/** Everything the intro costs in total, for a test to assert against. */
export const INTRO_TOTAL_MS = INTRO_PHASES.reduce((total, step) => total + step.durationMs, 0);

/** Where the "have I seen it" decision lives, and its version. */
export const INTRO_STORAGE_KEY = "msd:intro-seen:v1";

/**
 * How long a tab may be idle before the reader counts as new again.
 *
 * Ten minutes, on the brief. The reasoning is that the intro is an arrival, and
 * somebody who has been away ten minutes is arriving: they closed the tab on their
 * phone, got on a train, and came back. Showing it to somebody who merely
 * refreshed is what makes an intro irritating — so refresh does not reset it, and
 * only genuine absence does.
 */
export const IDLE_RESET_MS = 10 * 60 * 1_000;

export type IntroVisit = {
  /** Epoch ms of the last time the intro was seen, or `null` if never. */
  readonly seenAt: number | null;
  /** Epoch ms of the last time the reader was actually present. */
  readonly lastActiveAt: number | null;
};

export type IntroEligibility =
  | { readonly kind: "play" }
  | { readonly kind: "seen"; readonly sinceMs: number }
  | { readonly kind: "idle"; readonly awayMs: number }
  | { readonly kind: "skip" };

/**
 * Decides whether the intro plays.
 *
 * Storage is read outside and passed in, because this is the rule and the test
 * should be able to state it without a browser.
 */
export function evaluateIntroEligibility(
  visit: IntroVisit,
  now: number,
  options: { readonly reducedMotion?: boolean } = {},
): IntroEligibility {
  // A reader who asked for less motion gets the site and nothing else. The
  // reduced-motion rain is already a calm version of the effect; stacking a
  // full-screen sequence on top of it is not a reduced version of anything.
  if (options.reducedMotion === true) {
    return { kind: "skip" };
  }

  if (visit.seenAt === null) {
    return { kind: "play" };
  }

  const away = now - (visit.lastActiveAt ?? visit.seenAt);

  if (away >= IDLE_RESET_MS) {
    return { kind: "idle", awayMs: away };
  }

  return { kind: "seen", sinceMs: now - visit.seenAt };
}

/** Reads the stored visit. Blocked storage is treated as "never seen". */
export function readIntroVisit(storage: Pick<Storage, "getItem"> | undefined): IntroVisit {
  if (storage === undefined) {
    return { seenAt: null, lastActiveAt: null };
  }

  let raw: string | null;

  try {
    raw = storage.getItem(INTRO_STORAGE_KEY);
  } catch {
    return { seenAt: null, lastActiveAt: null };
  }

  if (raw === null) {
    return { seenAt: null, lastActiveAt: null };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return { seenAt: null, lastActiveAt: null };
    }

    const record = parsed as { seenAt?: unknown; lastActiveAt?: unknown };

    return {
      seenAt: typeof record.seenAt === "number" ? record.seenAt : null,
      lastActiveAt: typeof record.lastActiveAt === "number" ? record.lastActiveAt : null,
    };
  } catch {
    return { seenAt: null, lastActiveAt: null };
  }
}

export function writeIntroVisit(storage: Pick<Storage, "setItem"> | undefined, at: number): void {
  if (storage === undefined) {
    return;
  }

  try {
    storage.setItem(INTRO_STORAGE_KEY, JSON.stringify({ seenAt: at, lastActiveAt: at }));
  } catch {
    // A preference that cannot be saved means the intro plays again next visit.
    // That is the safe direction: slightly repetitive rather than never shown.
  }
}

/** Touches the activity stamp, so an open tab is not treated as an absence. */
export function touchIntroActivity(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  at: number,
): void {
  if (storage === undefined) {
    return;
  }

  const current = readIntroVisit(storage);

  if (current.seenAt === null) {
    return;
  }

  try {
    storage.setItem(
      INTRO_STORAGE_KEY,
      JSON.stringify({ seenAt: current.seenAt, lastActiveAt: at }),
    );
  } catch {
    // Nothing to do; the stamp is an optimisation, not a gate.
  }
}

/**
 * The phase at a point in the timeline, or `null` once it is over.
 *
 * Clamped at both ends rather than returning an out-of-range index, because a
 * timer that fires late is normal and an out-of-range array access is a crash on
 * the first paint a slow phone gives you.
 */
export function introPhaseAt(elapsedMs: number): IntroPhase | null {
  if (elapsedMs < 0) {
    return INTRO_PHASES[0]?.phase ?? null;
  }

  let cursor = 0;

  for (const step of INTRO_PHASES) {
    if (elapsedMs < cursor + step.durationMs) {
      return step.phase;
    }

    cursor += step.durationMs;
  }

  return null;
}

/** How far through the timeline a phase runs, 0 to 1. Drives the CSS easing. */
export function introPhaseProgress(phase: IntroPhase, elapsedMs: number): number {
  let cursor = 0;

  for (const step of INTRO_PHASES) {
    if (step.phase === phase) {
      return Math.min(Math.max((elapsedMs - cursor) / step.durationMs, 0), 1);
    }

    cursor += step.durationMs;
  }

  return 0;
}
