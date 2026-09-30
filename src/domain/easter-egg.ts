/**
 * The occasional Matrix easter eggs.
 *
 * ## The product decision this file exists to protect
 *
 * An easter egg that a reader can summon is a feature, and this site is not
 * offering one. The joke only works if it lands on someone who is not looking
 * for it: on the reader who chose the matrix theme, is reading, and suddenly the
 * page does something that it has no button for. So the rule is that a reader
 * cannot cause an egg, cannot predict one, and cannot get a second one — and
 * every one of those three rules has to be checkable in a unit test, which is
 * why the policy lives here and not as `setTimeout` calls in a component.
 *
 * Five numbers do all the work:
 *
 *  - `MAX_EGGS_PER_SESSION` — one. Not "a few". A page that does this twice
 *    starts to feel broken, and a page that does it every reload becomes a
 *    gimmick that people explain to other people, at which point the reader is
 *    performing the joke rather than finding it.
 *  - `FIRST_EGG_EARLIEST_MS` — the page has to be old. Someone who lands, reads
 *    one paragraph and leaves never sees one, which is most traffic, and the
 *    point is that the effect is spent on readers who are actually reading.
 *  - `FIRST_EGG_LATEST_MS` — the window closes, so the egg is *scheduled at a
 *    random moment inside a window* rather than at a fixed delay. A fixed delay
 *    is learnable: wait 45 seconds, press anything, and you have your egg. This
 *    is what makes "cannot be triggered on purpose" true even for someone who
 *    reads the source.
 *  - `MIN_GAP_MS` — the floor between two eggs. Already unreachable at one egg
 *    per session, and here anyway because a budget with no gap rule is one
 *    careless commit away from handing a reader two.
 *  - `INTERACTION_COOLDOWN_MS` — much longer than that, and much longer after
 *    the reader has touched anything. This is the anti-nag rule and it is the
 *    one that matters most. An effect that interrupts a scroll or a click is not
 *    a joke, it is a misfire, and the reader has no way to tell the difference
 *    in advance.
 *
 * The shape to notice: every rule is a *refusal*. There is no rule anywhere in
 * this file that makes an egg more likely.
 *
 * ## Why the reduced-motion gate is an absolute, not a softer variant
 *
 * Under `prefers-reduced-motion: reduce` there is no egg at all — not a static
 * one, not a shorter one. The existing rain solves the same problem the same
 * way (`rain.css:189`): a wall of characters frozen mid-fall is not a calmer
 * version of the effect, it is a wall of text sitting over the reader's
 * content, and the request is asking us not to put that there. The one effect
 * that survives without animation is the single line of type, and it does not
 * survive here either, because "no animated effect at all" is the rule that
 * was actually written down.
 *
 * ## Why the theme gate is not a preference
 *
 * `matrix` is the only theme these belong to. A Matrix easter egg in the paper
 * theme is a joke nobody is in on — it is a dark-screen effect on a
 * daylight screen, in a theme chosen because the site is readable. The gate
 * reads the attribute the CSS reads, not `localStorage`, so a reader whose
 * stored value and rendered theme disagree gets the effect that matches what
 * they can actually see.
 */

/**
 * The ids, in the order the picker would roll them.
 *
 * Ids are part of the contract twice over: they appear in the `data-` attribute
 * the e2e suite asserts on, and in the test seam below. Renaming one silently
 * breaks both, so the seam's value list is derived from this one rather than
 * retyped.
 */
export const EASTER_EGG_IDS = [
  "decode-glitch",
  "white-pill",
  "reversed-rain",
  "glyph-freeze",
  "wake-up",
] as const;

export type EasterEggId = (typeof EASTER_EGG_IDS)[number];

/**
 * What kind of thing each egg is.
 *
 * This exists to be asserted. "A small catalogue of distinct eggs" is not
 * checkable from the outside — the only way a catalogue decays into five
 * colour variations of one thing is slowly, each addition looking reasonable on
 * its own. So every egg declares a `kind`, and the test asserts the kinds are
 * pairwise distinct, which means the sixth colour variation cannot be added
 * without either relabelling an existing egg or admitting in the diff that it
 * is another one of the same thing.
 *
 * The five kinds are deliberately spread across the dimensions that actually
 * make an effect feel different, rather than across the catalogue's length:
 *
 *  - `distortion` — the reader's own page is the subject; nothing new appears.
 *  - `takeover` — the page is replaced, briefly, by something that is over it.
 *  - `inverted-motion` — the site's own effect, running the other way.
 *  - `suspended-motion` — the site's own effect, stopped in place.
 *  - `quiet-type` — one line of words, and nothing moving at all.
 */
export const EASTER_EGG_KINDS = [
  "distortion",
  "takeover",
  "inverted-motion",
  "suspended-motion",
  "quiet-type",
] as const;

export type EasterEggKind = (typeof EASTER_EGG_KINDS)[number];

export type EasterEgg = {
  readonly id: EasterEggId;
  readonly kind: EasterEggKind;
  /**
   * How long it holds before it goes away on its own.
   *
   * The upper bound is a product decision, not a technical one: an effect that
   * outstays its welcome stops being a joke, and the reader has no reason to
   * keep paying attention to a page they came to read a résumé from.
   */
  readonly durationMs: number;
};

/**
 * The catalogue.
 *
 * Every duration is under `MAX_EGG_DURATION_MS` and the two rain-based entries
 * reuse `MatrixRain` rather than reimplementing it. The test asserts both.
 */
export const EASTER_EGGS: readonly EasterEgg[] = [
  {
    id: "decode-glitch",
    kind: "distortion",
    // Short. It is a single hard stutter in the frame, and a stutter that
    // repeats reads as a rendering fault rather than as a joke.
    durationMs: 1_400,
  },
  {
    id: "white-pill",
    kind: "takeover",
    // The longest, because it is the only one that hides the page, and the
    // reader needs a beat to read the line before it goes.
    durationMs: 3_200,
  },
  {
    id: "reversed-rain",
    kind: "inverted-motion",
    // Long enough to register as the rain going the other way. Reversal that
    // flickers is not a reversal, it is a stutter again.
    durationMs: 5_200,
  },
  {
    id: "glyph-freeze",
    kind: "suspended-motion",
    // The shortest of all. It is a held frame and then nothing.
    durationMs: 1_100,
  },
  {
    id: "wake-up",
    kind: "quiet-type",
    durationMs: 3_600,
  },
];

/** Type guard. Deliberately narrow: an unrecognised id is not an egg. */
export function isEasterEggId(value: unknown): value is EasterEggId {
  return typeof value === "string" && (EASTER_EGG_IDS as readonly string[]).includes(value);
}

/** The catalogue keyed by id. Used by the renderer, never by the rules. */
export const EASTER_EGG_BY_ID: Readonly<Record<EasterEggId, EasterEgg>> = Object.fromEntries(
  EASTER_EGGS.map((egg) => [egg.id, egg]),
) as Record<EasterEggId, EasterEgg>;

/**
 * The only theme these belong to.
 *
 * `THEME_IDS` is deliberately *not* used to enumerate anything here. The
 * question "which themes have eggs" has the answer "one, and it is the last one
 * in the list" — the joke theme, which `theme-cycle.test.ts` already fixes to
 * last — and that is a product statement, not a consequence of the theme
 * module's ordering. The test asserts the two agree.
 */
export const EASTER_EGG_THEME = "matrix";

/** The theme gate. The check reads what CSS reads, so it cannot drift. */
export function isEasterEggTheme(theme: unknown): boolean {
  return theme === EASTER_EGG_THEME;
}

/* ==========================================================================
   THE BUDGET
   ========================================================================== */

/**
 * How many eggs one session gets. One.
 *
 * `sessionStorage` and not `localStorage`: a session is the unit in which the
 * reader experiences the site, and "one per visit" is the promise. Persisting
 * across visits would eventually make the effect something a reader waits for
 * rather than something that happens to them.
 */
export const MAX_EGGS_PER_SESSION = 1;

/**
 * The page has to be this old before an egg may fire.
 *
 * 45s is roughly a paragraph of a résumé read slowly, or a scroll of the home
 * page. It is long enough to exclude the bounce — the reader who arrives, sees
 * it in their history and goes — and short enough that the effect still exists
 * for a reader who is genuinely reading.
 */
export const FIRST_EGG_EARLIEST_MS = 45_000;

/**
 * The window closes here. An egg is scheduled at a random moment *inside*
 * `[FIRST_EGG_EARLIEST_MS, FIRST_EGG_LATEST_MS)`, never at the boundary.
 *
 * A single fixed delay would be a documented, learnable trigger. This is 150s
 * of possible moments, drawn once and remembered for the session, so there is
 * no number to learn.
 */
export const FIRST_EGG_LATEST_MS = 195_000;

/**
 * The minimum gap between two eggs in one session.
 *
 * The session budget of one already makes a second impossible, so this is
 * belt-and-braces — and it is here anyway because it is the rule that would
 * still hold if the budget were ever relaxed, and because a budget with no gap
 * rule is one careless commit away from a reader getting two of these.
 */
export const MIN_GAP_MS = 180_000;

/**
 * How long the reader has to be left alone before an egg may fire.
 *
 * Deliberately interaction-triggered rather than page-triggered: an egg that
 * interrupts a click is not an easter egg, it is a bug that fires once. 420s is
 * 2.3× `MIN_GAP_MS` and more than seven minutes of a reader not touching
 * anything — on a site with a sticky header, four controls, a terminal and a
 * PDF button, that means the effect is available only to somebody reading
 * rather than operating, which is precisely the reader it is for.
 */
export const INTERACTION_COOLDOWN_MS = 420_000;

/**
 * The long ceiling on how long an egg may hold.
 *
 * Not enforced as a rule — the catalogue's durations are asserted against it —
 * but it is the number that would change if the longest entry did.
 */
export const MAX_EGG_DURATION_MS = 6_000;

/**
 * How the session is remembered.
 *
 * Versioned in the key, as with every other stored preference in this codebase
 * (`theme.ts:42`, `soundtrack.ts:33`): a future change to what a record means
 * must not read a value written under the old shape.
 */
export const EASTER_EGG_STORAGE_KEY = "msd:easter-egg:v1";

export type EasterEggHistory = {
  /**
   * When the one egg was scheduled for, epoch ms. `null` before it is drawn.
   *
   * Stored rather than recomputed on every mount, and that is the whole reason
   * it lives here: a client-side navigation remounts the island, and a schedule
   * redrawn on each mount resets the clock forever — so on a reader who uses
   * the navigation the way a reader uses navigation, the egg could never arrive.
   * One draw, once per session.
   */
  readonly dueAt: number | null;
  /** Which eggs have already fired this session, in order. */
  readonly firedIds: readonly EasterEggId[];
  /** When the last one fired, epoch ms. `null` when none has. */
  readonly lastFiredAt: number | null;
};

/** A session that has spent nothing yet. */
export const EMPTY_EASTER_EGG_HISTORY: EasterEggHistory = {
  dueAt: null,
  firedIds: [],
  lastFiredAt: null,
};

/** The events that count as "the reader is doing something". */
export const DELIBERATE_INTERACTION_EVENTS = ["pointerdown", "keydown", "wheel", "scroll"] as const;

/**
 * The slice of the storage API these functions take.
 *
 * Passed in rather than reached for, so the rules are testable without a
 * browser and so a server render can pass nothing.
 */
export type EasterEggStorage = Pick<globalThis.Storage, "getItem" | "setItem"> | undefined;

/**
 * Reads the session record.
 *
 * Three answers, and the middle one is the interesting one:
 *
 *  - `null` — nothing stored. A fresh session, which may have its one egg.
 *  - `SPENT` — a record exists but is not one this can read. The shape is
 *    checked, not just the JSON: a record with `firedIds` as a string, or a
 *    timestamp of `1e999`, or a missing key is a record that some future change
 *    to the shape could make mean something else. Treating it as spent because
 *    the failure mode of wrongly refusing is a missing joke and the failure
 *    mode of wrongly allowing is a page that has lost the reader's trust.
 *  - a history — the honest reading.
 *
 * Ids that are merely *retired* are dropped rather than trusted, and that is the
 * one forgiving case on purpose: a record naming an egg this build no longer has
 * is a record from an older one, and refusing it because of a name would turn
 * every catalogue change into a silent permanent mute.
 */
export const SPENT_EASTER_EGG_HISTORY: EasterEggHistory = {
  dueAt: null,
  firedIds: EASTER_EGG_IDS,
  lastFiredAt: Number.POSITIVE_INFINITY,
};

export function readEasterEggHistory(storage: EasterEggStorage): EasterEggHistory | null {
  if (storage === undefined) {
    return null;
  }

  let raw: string | null;

  try {
    raw = storage.getItem(EASTER_EGG_STORAGE_KEY);
  } catch {
    // Blocked storage. The page works; the reader simply gets the one egg.
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return SPENT_EASTER_EGG_HISTORY;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return SPENT_EASTER_EGG_HISTORY;
  }

  const record = parsed as Record<string, unknown>;

  if (!Array.isArray(record.firedIds)) {
    return SPENT_EASTER_EGG_HISTORY;
  }

  const dueAt = readTimestamp(record.dueAt);
  const lastFiredAt = readTimestamp(record.lastFiredAt);

  if (dueAt === UNREADABLE || lastFiredAt === UNREADABLE) {
    return SPENT_EASTER_EGG_HISTORY;
  }

  return {
    dueAt,
    firedIds: record.firedIds.filter(isEasterEggId),
    lastFiredAt,
  };
}

/** Three answers for one stored timestamp: absent, present, or not one. */
const UNREADABLE = Symbol("unreadable");

function readTimestamp(value: unknown): number | null | typeof UNREADABLE {
  if (value === null) {
    return null;
  }

  /*
     `Infinity` is rejected explicitly, and that rejection is load-bearing:
     `SPENT_EASTER_EGG_HISTORY` uses it as its own sentinel, so accepting it from
     storage would mean one hand-edited character — `1e999` parses to it — could
     suppress every egg for the rest of the session, quietly, with no error
     anywhere to notice.
  */
  return typeof value === "number" && Number.isFinite(value) ? value : UNREADABLE;
}

/**
 * Records that an egg fired.
 *
 * Appends rather than overwrites, so the record stays an honest history even
 * while the budget keeps the list at one entry, and carries `dueAt` forward so
 * writing the outcome cannot erase the schedule that produced it. A storage
 * failure is swallowed: the egg has already happened, and losing the note means
 * the reader may get another one next session, which is a far better outcome
 * than a joke that throws.
 */
export function writeEasterEggFired(
  storage: EasterEggStorage,
  history: EasterEggHistory,
  id: EasterEggId,
  at: number,
): EasterEggHistory {
  const next: EasterEggHistory = {
    dueAt: history.dueAt,
    firedIds: [...history.firedIds, id],
    lastFiredAt: at,
  };

  saveHistory(storage, next);

  return next;
}

/**
 * Records the schedule, once, the first time it is drawn.
 *
 * Written *before* the egg fires rather than after, so a reader who reloads in
 * the middle of the window keeps the moment they were given instead of being
 * handed a fresh draw — otherwise reload-until-you-win is exactly the trick the
 * window exists to prevent.
 */
export function writeEasterEggDueAt(
  storage: EasterEggStorage,
  history: EasterEggHistory,
  dueAt: number,
): EasterEggHistory {
  const next: EasterEggHistory = { ...history, dueAt };

  saveHistory(storage, next);

  return next;
}

/** One place where the session record is written, so nothing forgets the try. */
function saveHistory(storage: EasterEggStorage, history: EasterEggHistory): void {
  try {
    storage?.setItem(EASTER_EGG_STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* Non-fatal: the reader may see another egg next session. */
  }
}

/* ==========================================================================
   SCHEDULING
   ========================================================================== */

/**
 * Clamps anything to the unit interval, with `NaN` treated as `0`.
 *
 * `Math.min(Math.max(NaN, 0), 1)` is `NaN`, and a `NaN` index is an
 * `undefined` egg: the two functions below would return `NaN` out of a caller
 * that cannot tell it apart from a number, and a schedule of `NaN` is a timer
 * of `NaN`, which fires immediately. A hostile or broken random source has to
 * land inside the window, not outside it.
 */
function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 1);
}

/**
 * The moment the one egg may land: a random point inside the window.
 *
 * Takes the random source so the rule is testable, and so the domain never
 * reaches for `Math.random()` at a point where a test cannot see it.
 */
export function firstEggDueAt(random: () => number = Math.random): number {
  const span = FIRST_EGG_LATEST_MS - FIRST_EGG_EARLIEST_MS;

  return FIRST_EGG_EARLIEST_MS + clampUnit(random()) * span;
}

/**
 * The test seam: a query parameter that names the egg to show.
 *
 * ## What this is, and what it is not
 *
 * It exists because an easter egg whose whole contract is "you did not choose
 * this" cannot otherwise be tested — and the things worth testing here are
 * exactly the absence claims: that nothing appears on a normal visit, that
 * nothing is announced, that nothing is focusable, that nothing is rendered
 * under reduced motion. None of those can be asserted against an effect that
 * cannot be made to happen.
 *
 * It is a deliberate, documented exception to "never on demand", and it is
 * bounded as tightly as a seam can be. It does **not** bypass:
 *
 *  - the theme gate — `?easter-egg=white-pill` on the carbon theme renders
 *    nothing, because the test for the gate has to be able to reach it;
 *  - the reduced-motion gate — likewise;
 *  - the dialog check — an egg will not appear over an open modal;
 *  - the session budget — a seam visit consumes the one egg, so a test that
 *    visits normally and then with the seam in the same session sees nothing on
 *    the second navigation. Playwright gives each test a fresh context, so this
 *    does not bite in practice.
 *
 * What it *does* bypass is the timing: `FIRST_EGG_EARLIEST_MS`, the random
 * window and `INTERACTION_COOLDOWN_MS` are skipped, because a test cannot wait
 * seven minutes for a reader to stop touching the page. Those are the rules
 * about *when*, and they are the rules with their own unit tests — so the e2e
 * suite is not the thing standing behind them.
 *
 * Use: `/en-us?easter-egg=white-pill`. Values are validated against the
 * catalogue, so a typo is ignored rather than rendered as nothing-in-particular.
 */
export const EASTER_EGG_TEST_PARAM = "easter-egg";

/**
 * Reads the seam out of a query string.
 *
 * Takes the string rather than `window.location` so it is testable, and takes
 * the *first* value of a repeated parameter, which is what the browser's own
 * `URLSearchParams.get` does — so a hand-typed `?easter-egg=a&easter-egg=b`
 * behaves identically here and there.
 *
 * No `try`/`catch`. `URLSearchParams` parses a malformed query string by the
 * letter of the spec and does not throw on any input, and the guard above has
 * already established that this is a string — so a `catch` here would be a
 * branch that can never be taken, implying a failure mode that does not exist.
 * The test asserts that hostile strings return `null` rather than throwing.
 */
export function readForcedEasterEggId(search: string): EasterEggId | null {
  if (typeof search !== "string" || search.length === 0) {
    return null;
  }

  const raw = new URLSearchParams(search).get(EASTER_EGG_TEST_PARAM);

  return isEasterEggId(raw) ? raw : null;
}

/* ==========================================================================
   ELIGIBILITY
   ========================================================================== */

/**
 * Why an egg did not fire.
 *
 * Every value is a decision a reader could be told about, which is the test for
 * whether a block reason is worth having: if there is nothing to say, it should
 * not be a reason.
 */
export type EasterEggBlockReason =
  /** The page is not in the theme these belong to. */
  | "wrong-theme"
  /** The reader has asked for no animation. */
  | "reduced-motion"
  /** A dialog is open. An effect over a modal is a visual collision. */
  | "dialog-open"
  /** The session has already had its egg. */
  | "session-budget-spent"
  /** The page is not old enough, or not since the last egg, or not since the last interaction. */
  | "too-soon"
  /** The scheduled moment has not arrived. */
  | "not-due-yet";

export type EasterEggDecision =
  | { readonly allowed: true; readonly id: EasterEggId }
  | { readonly allowed: false; readonly reason: EasterEggBlockReason };

export type EasterEggContext = {
  /** The rendered theme — the `data-theme` attribute, not storage. */
  readonly theme: unknown;
  readonly prefersReducedMotion: boolean;
  readonly history: EasterEggHistory;
  /** Epoch ms, passed in so the rule is a function of time and not of a clock. */
  readonly now: number;
  /**
   * When this page was opened, epoch ms.
   *
   * The page age is measured from here rather than from `now`, which matters
   * the moment the clock is read a second time: a timer re-armed after an
   * interaction three minutes in would otherwise compute a fresh 45-second
   * page age and hold the egg back on a page that has been open for ages.
   */
  readonly sessionStartedAt: number;
  /** When the reader last did something deliberate, or `null` if never. */
  readonly lastInteractionAt: number | null;
  /** Whether a dialog is open right now. */
  readonly dialogOpen: boolean;
  /** When the one egg was scheduled for, or `null` if not scheduled yet. */
  readonly dueAt: number | null;
  /** The seam. Bypasses timing only. */
  readonly forcedId: EasterEggId | null;
};

/**
 * Decides whether an egg may fire, and which one.
 *
 * ## The order of the gates is the order of how permanent they are
 *
 * Theme, then motion, then dialog, then budget, then timing. A permanent
 * condition is checked before a transient one so that the reason reported is
 * the reason that will still be true in a second — and so that a reader who
 * has asked for reduced motion is told so once rather than being re-evaluated
 * against a moving clock that will never agree.
 *
 * The interaction check is deliberately *not* a reason of its own: "the reader
 * was reading, not operating" is the condition for the effect, not an
 * exception to it, and lumping it in with the page age as `too-soon` keeps the
 * timing rules as one rule.
 *
 * `forcedId` is checked after the budget and before any timing, which is what
 * makes the seam a seam: it skips the page age, the gap since the last egg, the
 * interaction cooldown and the schedule, and skips *nothing* else. It is
 * documented at length on `EASTER_EGG_TEST_PARAM`, and it is the reason that
 * rule cannot be stated as "an egg can never fire without a test seam" — only
 * as "an egg a normal reader gets was not asked for by that reader".
 */
export function evaluateEasterEgg(context: EasterEggContext): EasterEggDecision {
  const {
    theme,
    prefersReducedMotion,
    history,
    now,
    sessionStartedAt,
    lastInteractionAt,
    dialogOpen,
    dueAt,
  } = context;

  if (!isEasterEggTheme(theme)) {
    return { allowed: false, reason: "wrong-theme" };
  }

  if (prefersReducedMotion) {
    return { allowed: false, reason: "reduced-motion" };
  }

  if (dialogOpen) {
    return { allowed: false, reason: "dialog-open" };
  }

  if (history.firedIds.length >= MAX_EGGS_PER_SESSION) {
    return { allowed: false, reason: "session-budget-spent" };
  }

  if (context.forcedId !== null) {
    return { allowed: true, id: context.forcedId };
  }

  if (history.lastFiredAt !== null && now - history.lastFiredAt < MIN_GAP_MS) {
    return { allowed: false, reason: "too-soon" };
  }

  if (lastInteractionAt !== null && now - lastInteractionAt < INTERACTION_COOLDOWN_MS) {
    return { allowed: false, reason: "too-soon" };
  }

  if (now - sessionStartedAt < FIRST_EGG_EARLIEST_MS) {
    return { allowed: false, reason: "too-soon" };
  }

  if (dueAt === null || now < dueAt) {
    return { allowed: false, reason: "not-due-yet" };
  }

  return { allowed: true, id: pickEasterEgg(history, Math.random) };
}

/**
 * Picks an egg that has not been seen this session.
 *
 * Uniform over what is left, not a round-robin: a round-robin makes the *next*
 * egg predictable from the last one, and predictability is the whole thing
 * being avoided. With a budget of one this matters only once the budget moves,
 * but a catalogue rule that is wrong as soon as it is relaxed is not a rule.
 */
export function pickEasterEgg(
  history: EasterEggHistory,
  random: () => number = Math.random,
): EasterEggId {
  const unseen = EASTER_EGG_IDS.filter((id) => !history.firedIds.includes(id));
  const pool = unseen.length > 0 ? unseen : EASTER_EGG_IDS;

  const index = Math.floor(clampUnit(random()) * pool.length);

  return pool[Math.min(index, pool.length - 1)] as EasterEggId;
}

/**
 * How long to wait before looking again when a dialog is in the way.
 *
 * A dialog is a transient block, so it must not be a permanent one — but the
 * page must not poll for it either. One timer, re-armed once a second, is
 * cheap and only exists while a modal is open and an egg is armed.
 */
export const DIALOG_RETRY_MS = 1_000;

/**
 * The earliest moment an egg is *worth looking for*, or `null` when there is
 * nothing to look for.
 *
 * The complement to `evaluateEasterEgg`, and deliberately not the same
 * question. `evaluate` answers "may this fire right now", which is the wrong
 * question for arming a timer: the answer is `not-due-yet` for the next three
 * minutes, and re-polling every second to learn that is how a page ends up
 * feeling like it is having a seizure. This returns the instant worth waking
 * up for, so the caller arms one timer and does nothing until then.
 *
 * `null` means *do not arm*, and it covers two different situations that look
 * the same from here:
 *
 *  - a **permanent** condition — the theme is wrong, the reader has asked for
 *    no animation, or the session has spent its egg. Nothing about waiting
 *    changes any of them, so the caller has to re-read a source for them.
 *  - **no schedule has been drawn**. Waiting for `Infinity` is not the same as
 *    having nothing to wait for: a caller that passed `Infinity` to
 *    `setTimeout` would get a delay past the 32-bit maximum, which browsers
 *    overflow to "fire immediately".
 *
 * Everything else is a wait:
 *
 *  - the page age, the gap since the last egg, the gap since the last
 *    interaction and the scheduled moment are independent, so the answer is the
 *    latest of them. A reader who starts interacting mid-window pushes the egg
 *    out, which is the point: the effect is for someone reading, not for
 *    someone operating the page.
 *  - an open dialog contributes a short retry rather than a refusal, because a
 *    modal is temporary and the egg is still owed after it closes.
 */
export function earliestEasterEggAt(context: EasterEggContext): number | null {
  if (!isEasterEggTheme(context.theme)) {
    return null;
  }

  if (context.prefersReducedMotion) {
    return null;
  }

  if (context.history.firedIds.length >= MAX_EGGS_PER_SESSION) {
    return null;
  }

  const { now, sessionStartedAt, lastInteractionAt, dueAt, forcedId } = context;

  /*
     The seam bypasses every wait, not just the schedule — the same set
     `evaluateEasterEgg` skips below it. Arming a test visit behind a 45-second
     page age would mean the seam is not actually a seam.
  */
  if (forcedId !== null) {
    return context.dialogOpen ? now + DIALOG_RETRY_MS : now;
  }

  if (dueAt === null) {
    return null;
  }

  const waits: number[] = [sessionStartedAt + FIRST_EGG_EARLIEST_MS - now];

  if (context.history.lastFiredAt !== null) {
    waits.push(context.history.lastFiredAt + MIN_GAP_MS - now);
  }

  if (lastInteractionAt !== null) {
    waits.push(lastInteractionAt + INTERACTION_COOLDOWN_MS - now);
  }

  if (context.dialogOpen) {
    waits.push(DIALOG_RETRY_MS);
  }

  waits.push(dueAt - now);

  return now + Math.max(0, ...waits);
}