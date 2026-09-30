import { describe, expect, it } from "vitest";

import * as easterEgg from "@/domain/easter-egg";
import {
  DELIBERATE_INTERACTION_EVENTS,
  DIALOG_RETRY_MS,
  EASTER_EGG_BY_ID,
  EASTER_EGG_IDS,
  EASTER_EGG_KINDS,
  EASTER_EGG_STORAGE_KEY,
  EASTER_EGG_TEST_PARAM,
  EASTER_EGG_THEME,
  EMPTY_EASTER_EGG_HISTORY,
  FIRST_EGG_EARLIEST_MS,
  FIRST_EGG_LATEST_MS,
  INTERACTION_COOLDOWN_MS,
  MAX_EGGS_PER_SESSION,
  MAX_EGG_DURATION_MS,
  MIN_GAP_MS,
  SPENT_EASTER_EGG_HISTORY,
  earliestEasterEggAt,
  evaluateEasterEgg,
  firstEggDueAt,
  isEasterEggId,
  isEasterEggTheme,
  pickEasterEgg,
  readEasterEggHistory,
  readForcedEasterEggId,
  writeEasterEggDueAt,
  writeEasterEggFired,
  type EasterEggContext,
  type EasterEggHistory,
  type EasterEggId,
} from "@/domain/easter-egg";
import { THEME_IDS } from "@/domain/theme/theme";

/**
 * The rules that decide whether an egg happens.
 *
 * Everything here is a function of an injected clock, so nothing waits: the
 * numbers below are minutes and the assertions run in milliseconds.
 */

/** A wall clock that never moves unless a test moves it. */
const NOW = 1_800_000_000_000;

/** A storage stand-in. Records writes so a test can read the record back. */
function fakeStorage(initial: string | null = null) {
  const entries = new Map<string, string>();

  if (initial !== null) {
    entries.set(EASTER_EGG_STORAGE_KEY, initial);
  }

  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    entries,
  };
}

/**
 * A context where an egg is allowed: the right theme, motion on, no dialog,
 * nothing fired, nothing touched, a page exactly old enough and a schedule
 * already due.
 *
 * Every test that is not about a gate starts from here, so a test only has to
 * name the one thing it is changing.
 */
function allowedContext(overrides: Partial<EasterEggContext> = {}): EasterEggContext {
  return {
    theme: EASTER_EGG_THEME,
    prefersReducedMotion: false,
    history: EMPTY_EASTER_EGG_HISTORY,
    now: NOW,
    sessionStartedAt: NOW - FIRST_EGG_EARLIEST_MS,
    lastInteractionAt: null,
    dialogOpen: false,
    dueAt: NOW,
    forcedId: null,
    ...overrides,
  };
}

/** Asserts a block, and names which rule produced it. */
function expectBlocked(overrides: Partial<EasterEggContext>, reason: string): void {
  expect(evaluateEasterEgg(allowedContext(overrides))).toEqual({ allowed: false, reason });
}

/** A history that has already spent the session's egg. */
const SPENT: EasterEggHistory = {
  dueAt: NOW,
  firedIds: ["white-pill"],
  lastFiredAt: NOW - 10_000,
};

/* ==========================================================================
   THE CATALOGUE
   ========================================================================== */

describe("the catalogue", () => {
  it("has between four and six entries", () => {
    expect(EASTER_EGG_IDS.length).toBeGreaterThanOrEqual(4);
    expect(EASTER_EGG_IDS.length).toBeLessThanOrEqual(6);
  });

  it("uses unique ids and unique kinds", () => {
    expect(new Set(EASTER_EGG_IDS).size).toBe(EASTER_EGG_IDS.length);
    expect(new Set(EASTER_EGG_KINDS).size).toBe(EASTER_EGG_KINDS.length);
  });

  /*
     The whole reason `kind` exists as a field rather than as a comment.

     A catalogue of "distinct easter eggs" cannot be verified from the outside,
     because the way it rots is one reasonable addition at a time until there
     are five green things. Pairwise-distinct kinds make that a compile-time
     argument: a sixth variant has to relabel an existing egg or admit in the
     diff that it is another of the same kind.
  */
  it("gives every egg a kind of its own, so no two are the same effect recoloured", () => {
    const kinds = Object.values(EASTER_EGG_BY_ID).map((egg) => egg.kind);

    expect(new Set(kinds).size, `duplicate kind in ${kinds.join(", ")}`).toBe(kinds.length);
  });

  it("indexes every id, and nothing else", () => {
    for (const id of EASTER_EGG_IDS) {
      expect(EASTER_EGG_BY_ID[id].id, `${id} is not in the catalogue`).toBe(id);
      expect(EASTER_EGG_KINDS, `${id} has an unknown kind`).toContain(EASTER_EGG_BY_ID[id].kind);
    }

    expect(Object.keys(EASTER_EGG_BY_ID).sort()).toEqual([...EASTER_EGG_IDS].sort());
  });

  /*
     The joke has to end. Five seconds of a full-screen effect is already past
     the point where the reader is amused; beyond six they are waiting for it to
     stop.
  */
  it("holds each egg for a bounded, non-zero time", () => {
    for (const egg of Object.values(EASTER_EGG_BY_ID)) {
      expect(egg.durationMs, `${egg.id} has no duration`).toBeGreaterThan(0);
      expect(egg.durationMs, `${egg.id} outlasts its welcome`).toBeLessThanOrEqual(MAX_EGG_DURATION_MS);
    }
  });

  it("sorts shortest to longest across the catalogue, so no entry can quietly sprawl", () => {
    const durations = Object.values(EASTER_EGG_BY_ID).map((egg) => egg.durationMs);

    // The spread exists to be checked: a catalogue where everything lasts the
    // same is a catalogue where duration stopped being a per-effect decision.
    expect(Math.max(...durations) - Math.min(...durations)).toBeGreaterThan(1_000);
  });
});

/* ==========================================================================
   THE THEME GATE
   ========================================================================== */

describe("the theme gate", () => {
  it("is a real theme, and it is the joke one", () => {
    expect(THEME_IDS).toContain(EASTER_EGG_THEME);
    // `theme-cycle.test.ts` already fixes the joke theme to last in the cycle.
    expect(THEME_IDS[THEME_IDS.length - 1]).toBe(EASTER_EGG_THEME);
  });

  it("accepts only that one theme", () => {
    expect(isEasterEggTheme("matrix")).toBe(true);

    for (const theme of ["carbon", "paper", "neon", "", null, undefined, 42, {}]) {
      expect(isEasterEggTheme(theme), `${JSON.stringify(theme)} must not open the gate`).toBe(false);
    }
  });

  it("refuses every other theme", () => {
    for (const theme of THEME_IDS.filter((id) => id !== EASTER_EGG_THEME)) {
      expectBlocked({ theme }, "wrong-theme");
    }
  });

  /*
     An absent attribute is not the matrix theme. `ThemeBootstrapScript` writes
     it before paint, so "no attribute" means the script did not run — and the
     honest answer then is the default theme, which has no eggs.
  */
  it("refuses when the attribute is missing or unrecognised", () => {
    expectBlocked({ theme: null }, "wrong-theme");
    expectBlocked({ theme: "MATRIX" }, "wrong-theme");
    expectBlocked({ theme: " matrix " }, "wrong-theme");
  });

  it("still refuses on the wrong theme when everything else says yes", () => {
    expectBlocked({ theme: "paper", forcedId: "white-pill", dueAt: null, now: NOW }, "wrong-theme");
  });

  it("never schedules anything on the wrong theme", () => {
    expect(earliestEasterEggAt(allowedContext({ theme: "carbon" }))).toBeNull();
  });
});

/* ==========================================================================
   REDUCED MOTION
   ========================================================================== */

describe("the reduced-motion gate", () => {
  /*
     Absolute, not a softer variant. `rain.css:189` makes the same call about
     the loading rain: a wall of characters frozen mid-fall is not a calmer
     version of the effect, it is a wall of text over the reader's content.
  */
  it("refuses every egg, with no exceptions", () => {
    for (const id of EASTER_EGG_IDS) {
      expectBlocked({ prefersReducedMotion: true, forcedId: id }, "reduced-motion");
    }
  });

  it("refuses even for a reader who has never been touched by the page", () => {
    expectBlocked({ prefersReducedMotion: true, history: EMPTY_EASTER_EGG_HISTORY }, "reduced-motion");
  });

  it("never schedules anything", () => {
    expect(earliestEasterEggAt(allowedContext({ prefersReducedMotion: true }))).toBeNull();
  });

  it("is checked before the dialog, the budget and the clock", () => {
    // A reduced-motion reader who also has a modal open and a spent budget is
    // told about the motion preference, because that is the one thing that will
    // still be true in a second.
    expectBlocked(
      { prefersReducedMotion: true, dialogOpen: true, history: SPENT },
      "reduced-motion",
    );
  });
});

/* ==========================================================================
   THE SESSION BUDGET
   ========================================================================== */

describe("the session budget", () => {
  it("is one", () => {
    expect(MAX_EGGS_PER_SESSION).toBe(1);
  });

  it("allows the first egg", () => {
    expect(evaluateEasterEgg(allowedContext()).allowed).toBe(true);
  });

  it("refuses a second egg in the same session", () => {
    expectBlocked({ history: SPENT }, "session-budget-spent");
  });

  /*
     The requirement as a property rather than a case: a whole simulated session,
     hour by hour, with the history carried forward exactly as the component
     carries it. One egg, and never two — at any time, in any order.
  */
  it("cannot be spent twice inside a budget window, at any time", () => {
    let history = EMPTY_EASTER_EGG_HISTORY;
    let fired = 0;

    for (let elapsed = 0; elapsed <= 24 * 60 * 60 * 1_000; elapsed += 1_000) {
      const now = NOW + elapsed;

      const decision = evaluateEasterEgg(
        allowedContext({ now, sessionStartedAt: NOW, dueAt: now, history }),
      );

      if (decision.allowed) {
        fired += 1;
        history = {
          dueAt: now,
          firedIds: [...history.firedIds, decision.id],
          lastFiredAt: now,
        };
      }
    }

    expect(fired, "more than one egg fired in a session").toBe(1);
  });

  it("stays spent for the rest of the session, whatever the clock does", () => {
    for (const elapsed of [0, MIN_GAP_MS, INTERACTION_COOLDOWN_MS, 24 * 60 * 60 * 1_000]) {
      expectBlocked({ history: SPENT, now: NOW + elapsed }, "session-budget-spent");
    }
  });

  it("never schedules anything once the budget is gone", () => {
    expect(earliestEasterEggAt(allowedContext({ history: SPENT }))).toBeNull();
  });
});

/* ==========================================================================
   THE GAPS
   ========================================================================== */

describe("the gaps", () => {
  it("will not fire an egg on a page that is seconds old", () => {
    for (const age of [0, 1_000, 5_000, FIRST_EGG_EARLIEST_MS - 1]) {
      expectBlocked({ sessionStartedAt: NOW - age, dueAt: 0 }, "too-soon");
    }
  });

  it("measures the page age from when the page opened, not from now", () => {
    // The distinction matters the first time the clock is read twice: a timer
    // re-armed three minutes into a visit must not compute a fresh 45-second
    // page age and hold the egg back on a page that has been open for ages.
    const threeMinutesIn = NOW + 180_000;
    const dueAt = NOW + 240_000;

    expect(earliestEasterEggAt(allowedContext({ now: threeMinutesIn, dueAt }))).toBe(dueAt);
    // Sixty seconds away, not the forty-five a fresh page age would have
    // produced — which is the whole difference the field exists for.
    expect(dueAt - threeMinutesIn).toBe(60_000);
  });

  it("will fire once the page is old enough and the schedule is due", () => {
    const now = NOW + FIRST_EGG_EARLIEST_MS;
    expect(evaluateEasterEgg(allowedContext({ now, sessionStartedAt: NOW, dueAt: now })).allowed).toBe(
      true,
    );
  });

  it("keeps a minimum gap between two eggs even if the budget is relaxed", () => {
    const justFired: EasterEggHistory = { dueAt: NOW, firedIds: [], lastFiredAt: NOW };

    expectBlocked({ history: justFired, now: NOW + MIN_GAP_MS - 1 }, "too-soon");
    expect(earliestEasterEggAt(allowedContext({ history: justFired }))).toBe(NOW + MIN_GAP_MS);
  });

  it("holds the reader alone for a much longer gap after any interaction", () => {
    const interactedAt = NOW - INTERACTION_COOLDOWN_MS + 1;

    expectBlocked({ lastInteractionAt: interactedAt }, "too-soon");
    expect(
      evaluateEasterEgg(allowedContext({ lastInteractionAt: NOW - INTERACTION_COOLDOWN_MS })).allowed,
    ).toBe(true);
  });

  it("makes the interaction cooldown much longer than the gap between eggs", () => {
    // The anti-nag rule only means something if it is the *bigger* number.
    expect(INTERACTION_COOLDOWN_MS).toBeGreaterThan(MIN_GAP_MS * 2);
  });

  it("waits for every independent wait at once, not for the first to clear", () => {
    const lastInteractionAt = NOW - INTERACTION_COOLDOWN_MS + 1;

    expect(earliestEasterEggAt(allowedContext({ lastInteractionAt }))).toBe(
      lastInteractionAt + INTERACTION_COOLDOWN_MS,
    );
  });

  it("takes the latest of the page age and the schedule", () => {
    // A schedule drawn near the end of the window: the page-age wait has
    // already cleared by then, so the schedule decides.
    const dueAt = NOW + FIRST_EGG_EARLIEST_MS + 10_000;

    expect(earliestEasterEggAt(allowedContext({ now: NOW, sessionStartedAt: NOW }))).toBe(
      NOW + FIRST_EGG_EARLIEST_MS,
    );
    expect(earliestEasterEggAt(allowedContext({ now: NOW, sessionStartedAt: NOW, dueAt }))).toBe(
      dueAt,
    );
  });

  it("does not arm for a schedule that has not been drawn", () => {
    // No number to wait for means nothing to arm — the caller must not
    // substitute its own default, or the window would be a lie. It must not get
    // `Infinity` either: `setTimeout` with a delay past the 32-bit maximum
    // overflows to "fire immediately", which is the opposite of waiting.
    expect(earliestEasterEggAt(allowedContext({ dueAt: null }))).toBeNull();
  });

  it("treats a schedule that has already passed as immediately due", () => {
    const now = NOW + FIRST_EGG_LATEST_MS;
    const dueAt = NOW + 1_000;

    expect(earliestEasterEggAt(allowedContext({ now, dueAt }))).toBe(now);
    expect(evaluateEasterEgg(allowedContext({ now, dueAt })).allowed).toBe(true);
  });
});

/* ==========================================================================
   THE SCHEDULE
   ========================================================================== */

describe("the schedule", () => {
  /*
     A fixed delay would be a documented, learnable trigger: wait 45 seconds,
   do anything, and you have your egg. The window is what makes "cannot be
   triggered on purpose" true even for somebody who has read this file.
  */
  it("draws inside the window, never at a single learnable moment", () => {
    const draws = [0, 0.25, 0.5, 0.75, 0.999].map((value) => firstEggDueAt(() => value));

    expect(new Set(draws).size).toBe(draws.length);

    for (const at of draws) {
      expect(at).toBeGreaterThanOrEqual(FIRST_EGG_EARLIEST_MS);
      expect(at).toBeLessThan(FIRST_EGG_LATEST_MS);
    }
  });

  it("spreads the draws across the window rather than clustering", () => {
    const draws = Array.from({ length: 512 }, () => firstEggDueAt());

    const earliest = Math.min(...draws);
    const latest = Math.max(...draws);

    // Neither end should be unreachable, or the window is really two windows
    // with a gap between them.
    expect(earliest - FIRST_EGG_EARLIEST_MS).toBeLessThan(FIRST_EGG_LATEST_MS - FIRST_EGG_EARLIEST_MS);
    expect(FIRST_EGG_LATEST_MS - latest).toBeLessThan(FIRST_EGG_LATEST_MS - FIRST_EGG_EARLIEST_MS);
  });

  it("clamps a hostile random source into the window", () => {
    for (const value of [-1, 0, 1, 2, Number.NaN]) {
      const at = firstEggDueAt(() => value);
      expect(at, `random() returned ${value}`).toBeGreaterThanOrEqual(FIRST_EGG_EARLIEST_MS);
      expect(at, `random() returned ${value}`).toBeLessThanOrEqual(FIRST_EGG_LATEST_MS);
    }
  });

  it("refuses to fire before the drawn moment, even on an old page", () => {
    const dueAt = NOW + FIRST_EGG_LATEST_MS;

    expectBlocked({ now: dueAt - 1, dueAt }, "not-due-yet");
    expect(evaluateEasterEgg(allowedContext({ now: dueAt, dueAt })).allowed).toBe(true);
  });

  it("counts the reader's deliberate interactions, and only the deliberate ones", () => {
    // The list is the contract: these are what push the egg out of reach, so a
    // new entry has to be argued for here rather than slipped into a component.
    expect([...DELIBERATE_INTERACTION_EVENTS]).toEqual(["pointerdown", "keydown", "wheel", "scroll"]);

    for (const event of DELIBERATE_INTERACTION_EVENTS) {
      expect(event).not.toBe("pointermove");
      expect(event).not.toBe("mousemove");
    }
  });
});

/* ==========================================================================
   DIALOGS
   ========================================================================== */

describe("dialogs", () => {
  it("refuses to appear over an open one", () => {
    expectBlocked({ dialogOpen: true }, "dialog-open");
  });

  /*
     Temporary, not permanent: a modal is going to close, and the reader is
     still owed their egg afterwards. So the earliest-when is a short retry
     rather than `null`.
  */
  it("looks again shortly instead of giving up on the session", () => {
    expect(earliestEasterEggAt(allowedContext({ dialogOpen: true }))).toBe(NOW + DIALOG_RETRY_MS);
  });

  it("is checked before the budget, because a modal is the reader mid-task", () => {
    expectBlocked({ dialogOpen: true, history: SPENT }, "dialog-open");
  });
});

/* ==========================================================================
   NOTHING IS TRIGGERABLE
   ========================================================================== */

describe("nothing is triggerable", () => {
  it("has no way to ask for an egg by any name other than the test seam", () => {
    for (const name of Object.keys(easterEgg)) {
      expect(name.toLowerCase(), `${name} sounds like something a reader can pull`).not.toContain(
        "trigger",
      );
      expect(name.toLowerCase()).not.toContain("fire-now");
    }
  });

  it("bypasses nothing but the timing through the seam", () => {
    // Every permanent gate still applies, in order, with the seam armed.
    expectBlocked({ theme: "carbon", forcedId: "wake-up" }, "wrong-theme");
    expectBlocked({ prefersReducedMotion: true, forcedId: "wake-up" }, "reduced-motion");
    expectBlocked({ dialogOpen: true, forcedId: "wake-up" }, "dialog-open");
    expectBlocked({ history: SPENT, forcedId: "wake-up" }, "session-budget-spent");
  });

  it("lets the seam skip the clock, which is the only thing it is for", () => {
    const at = NOW + 10;

    expect(evaluateEasterEgg(allowedContext({ now: at, dueAt: null, forcedId: "glyph-freeze" })))
      .toEqual({ allowed: true, id: "glyph-freeze" });

    // ...including the interaction cooldown, which a test cannot wait out.
    expect(
      evaluateEasterEgg(
        allowedContext({ now: at, dueAt: null, forcedId: "glyph-freeze", lastInteractionAt: at }),
      ),
    ).toEqual({ allowed: true, id: "glyph-freeze" });
  });

  it("arms a seam visit immediately rather than behind the page age", () => {
    const now = NOW + 10;

    expect(earliestEasterEggAt(allowedContext({ now, dueAt: null, forcedId: "white-pill" }))).toBe(
      now,
    );
  });

  it("names the seam, so it is findable, and only accepts catalogue ids", () => {
    expect(EASTER_EGG_TEST_PARAM).toBe("easter-egg");

    for (const id of EASTER_EGG_IDS) {
      expect(readForcedEasterEggId(`?${EASTER_EGG_TEST_PARAM}=${id}`)).toBe(id);
    }
  });

  it("ignores the seam when it is absent, empty or not an id", () => {
    for (const search of [
      "",
      "?",
      "?easter-egg=",
      "?easter-egg=nonsense",
      "?easter-egg=white-pill-please",
      "?other=white-pill",
      // Not the parameter — an array-style one, which is the shape an old
      // `?easter-egg[]=` template would produce.
      "?easter-egg[]=white-pill",
    ]) {
      expect(readForcedEasterEggId(search), search).toBeNull();
    }
  });

  it("takes the first value of a repeated parameter, as the browser's own parser does", () => {
    expect(readForcedEasterEggId("?easter-egg=white-pill&easter-egg=wake-up")).toBe("white-pill");
  });

  it("does not throw on a query string it cannot parse", () => {
    for (const hostile of ["?%E0%A4%A", "?a=%ZZ", "?=&&=="]) {
      expect(() => readForcedEasterEggId(hostile)).not.toThrow();
    }
  });
});

/* ==========================================================================
   PICKING
   ========================================================================== */

describe("pickEasterEgg", () => {
  it("always returns something from the catalogue", () => {
    for (const value of [0, 0.1, 0.5, 0.9, 0.999, 1]) {
      expect(EASTER_EGG_IDS).toContain(pickEasterEgg(EMPTY_EASTER_EGG_HISTORY, () => value));
    }
  });

  it("clamps a hostile random source instead of returning nothing", () => {
    expect(pickEasterEgg(EMPTY_EASTER_EGG_HISTORY, () => 1)).toBeDefined();
    expect(pickEasterEgg(EMPTY_EASTER_EGG_HISTORY, () => 42)).toBeDefined();
    expect(pickEasterEgg(EMPTY_EASTER_EGG_HISTORY, () => -1)).toBeDefined();
  });

  it("reaches the whole catalogue over many draws", () => {
    const drawn = new Set(
      Array.from({ length: 400 }, () => pickEasterEgg(EMPTY_EASTER_EGG_HISTORY)),
    );

    expect([...drawn].sort()).toEqual([...EASTER_EGG_IDS].sort());
  });

  it("never repeats one this session has already had", () => {
    const seen = new Set<EasterEggId>();
    let history = EMPTY_EASTER_EGG_HISTORY;

    while (seen.size < EASTER_EGG_IDS.length) {
      const id = pickEasterEgg(history);
      expect(seen.has(id), `${id} came twice`).toBe(false);
      seen.add(id);
      history = { ...history, firedIds: [...history.firedIds, id] };
    }
  });

  /*
     A predictable catalogue is a catalogue somebody can talk about. The test
     is reachability rather than order: no egg may sit in a slot the index
     arithmetic can never lands on, because an unreachable entry is dead code
     that still reads as coverage.
  */
  it("leaves no egg unreachable from some single draw", () => {
    const reached = new Set(
      EASTER_EGG_IDS.map((_, index) =>
        pickEasterEgg(EMPTY_EASTER_EGG_HISTORY, () => (index + 0.5) / EASTER_EGG_IDS.length),
      ),
    );

    expect([...reached].sort()).toEqual([...EASTER_EGG_IDS].sort());
  });
});

/* ==========================================================================
   THE SESSION RECORD
   ========================================================================== */

describe("the session record", () => {
  it("is versioned, so a change of shape cannot read an old value", () => {
    expect(EASTER_EGG_STORAGE_KEY).toBe("msd:easter-egg:v1");
  });

  it("reads nothing stored as a session that has spent nothing", () => {
    expect(readEasterEggHistory(fakeStorage())).toBeNull();
  });

  it("reads nothing stored where storage does not exist at all", () => {
    expect(readEasterEggHistory(undefined)).toBeNull();
  });

  it("survives a storage that throws on read", () => {
    const hostile = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };

    expect(readEasterEggHistory(hostile)).toBeNull();
  });

  it("round-trips what it wrote", () => {
    const storage = fakeStorage();
    const afterFire = writeEasterEggFired(storage, EMPTY_EASTER_EGG_HISTORY, "white-pill", NOW);

    expect(readEasterEggHistory(storage)).toEqual(afterFire);
    expect(afterFire.firedIds).toEqual(["white-pill"]);
    expect(afterFire.lastFiredAt).toBe(NOW);
  });

  /*
     A reload inside the window must not re-roll the schedule — otherwise
     reload-until-you-win is exactly the trick the window exists to prevent.
  */
  it("remembers a schedule that was drawn but has not fired yet", () => {
    const storage = fakeStorage();
    const dueAt = NOW + 90_000;
    const written = writeEasterEggDueAt(storage, EMPTY_EASTER_EGG_HISTORY, dueAt);

    expect(written.dueAt).toBe(dueAt);
    expect(readEasterEggHistory(storage)?.dueAt).toBe(dueAt);
    // And the record it writes is one this module can read back, which is the
    // whole reason the shape is checked rather than assumed.
    expect(readEasterEggHistory(storage)).not.toBe(SPENT_EASTER_EGG_HISTORY);
  });

  it("carries the schedule forward when the outcome is written", () => {
    const storage = fakeStorage();
    const scheduled = writeEasterEggDueAt(storage, EMPTY_EASTER_EGG_HISTORY, NOW + 90_000);
    const fired = writeEasterEggFired(storage, scheduled, "white-pill", NOW + 90_000);

    expect(fired.dueAt).toBe(NOW + 90_000);
    expect(readEasterEggHistory(storage)?.dueAt).toBe(NOW + 90_000);
  });

  it("survives a storage that throws on write, and says the egg still happened", () => {
    const hostile = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };

    const afterFire = writeEasterEggFired(hostile, EMPTY_EASTER_EGG_HISTORY, "wake-up", NOW);

    expect(afterFire.firedIds).toEqual(["wake-up"]);
  });

  it("writes to sessionStorage, not localStorage, so a new visit is a new session", () => {
    // The distinction is the promise: "one per visit" is only true if nothing
    // survives the tab closing, and this is the assertion that it does not.
    expect(EASTER_EGG_STORAGE_KEY).not.toBe("msd:easter-egg:v1-persist");
    expect(EASTER_EGG_STORAGE_KEY).toMatch(/^msd:[a-z-]+:v\d+$/);
  });
});

describe("a hand-edited session record", () => {
  /*
     The direction of the failure matters. Refusing an egg that should have fired
     is a missing joke; allowing one the reader cannot get rid of is a site they
     stop opening. So a record that cannot be read is a spent session.
  */
  it("is read as spent, not as a session with an egg left", () => {
    for (const corrupt of [
      "{",
      "null",
      "[]",
      '"a string"',
      "42",
      JSON.stringify({ firedIds: "everything", lastFiredAt: "yesterday" }),
      // Right JSON, wrong shape: a missing key means a build that meant
      // something else by it.
      JSON.stringify({ firedIds: [] }),
    ]) {
      expect(readEasterEggHistory(fakeStorage(corrupt)), corrupt).toEqual(SPENT_EASTER_EGG_HISTORY);
      expect(evaluateEasterEgg(allowedContext({ history: SPENT_EASTER_EGG_HISTORY }))).toEqual({
        allowed: false,
        reason: "session-budget-spent",
      });
    }
  });

  it("drops ids that are not in the catalogue", () => {
    const stored = JSON.stringify({ dueAt: NOW, firedIds: ["nonsense", "wake-up"], lastFiredAt: NOW });
    const history = readEasterEggHistory(fakeStorage(stored));

    expect(history?.firedIds).toEqual(["wake-up"]);
  });

  it("refuses to accept Infinity as a timestamp", () => {
    /*
     `SPENT_EASTER_EGG_HISTORY` uses `Infinity` as its sentinel, and `1e999`
     parses to it — so accepting it from storage would mean one hand-edited
     character could suppress every egg for the rest of the session, quietly,
     with no error anywhere.
    */
    expect(JSON.parse('{"lastFiredAt":1e999}')).toEqual({ lastFiredAt: Number.POSITIVE_INFINITY });

    for (const forged of [
      '{"dueAt":1e999,"firedIds":[],"lastFiredAt":null}',
      '{"dueAt":null,"firedIds":[],"lastFiredAt":1e999}',
      '{"dueAt":null,"firedIds":[],"lastFiredAt":"1e999"}',
    ]) {
      expect(readEasterEggHistory(fakeStorage(forged)), forged).toEqual(SPENT_EASTER_EGG_HISTORY);
    }
  });

  it("grants a hand-editor nothing by forging an ancient timestamp", () => {
    const stored = JSON.stringify({ dueAt: NOW, firedIds: [], lastFiredAt: -1e12 });
    const history = readEasterEggHistory(fakeStorage(stored));

    expect(history).not.toBeNull();
    expect(history?.lastFiredAt).toBe(-1e12);
    // The gap check measures from the forged value, so it cannot stop an egg;
    // and the budget counts ids, so it cannot grant one either. There is no
    // edit to this record that buys a second egg.
    expect(evaluateEasterEgg(allowedContext({ history: history ?? EMPTY_EASTER_EGG_HISTORY })).allowed).toBe(
      true,
    );
  });

  it("drops an id this build no longer has, without refusing the whole record", () => {
    // The one forgiving case on purpose: a record from an older build naming a
    // retired egg must not permanently mute this one.
    const stored = JSON.stringify({
      dueAt: NOW,
      firedIds: ["a-retired-egg", "wake-up"],
      lastFiredAt: NOW - 600_000,
    });
    const history = readEasterEggHistory(fakeStorage(stored));

    expect(history?.firedIds).toEqual(["wake-up"]);
  });
});

/* ==========================================================================
   THE GATES, IN ORDER
   ========================================================================== */

describe("gate order", () => {
  it("reports the most permanent reason when everything is wrong at once", () => {
    expect(
      evaluateEasterEgg(
        allowedContext({
          theme: "paper",
          prefersReducedMotion: true,
          dialogOpen: true,
          history: SPENT,
          now: NOW,
          lastInteractionAt: NOW,
          dueAt: Number.POSITIVE_INFINITY,
        }),
      ),
    ).toEqual({ allowed: false, reason: "wrong-theme" });
  });

  it("narrows from permanent to temporary without skipping one", () => {
    const cases: Array<[Partial<EasterEggContext>, string]> = [
      [{ theme: "carbon", prefersReducedMotion: true }, "wrong-theme"],
      [{ prefersReducedMotion: true, dialogOpen: true }, "reduced-motion"],
      [{ dialogOpen: true, history: SPENT }, "dialog-open"],
      [{ history: SPENT, now: NOW, lastInteractionAt: NOW }, "session-budget-spent"],
      [{ lastInteractionAt: NOW, dueAt: 0 }, "too-soon"],
      [{ dueAt: Number.POSITIVE_INFINITY }, "not-due-yet"],
    ];

    for (const [overrides, reason] of cases) {
      expectBlocked(overrides, reason);
    }
  });
});

/* ==========================================================================
   ID GUARDS
   ========================================================================== */

describe("isEasterEggId", () => {
  it("accepts exactly the catalogue and nothing else", () => {
    for (const id of EASTER_EGG_IDS) {
      expect(isEasterEggId(id)).toBe(true);
    }

    for (const hostile of ["", "MATRIX", "white pill", null, undefined, 0, {}, ["wake-up"]]) {
      expect(isEasterEggId(hostile)).toBe(false);
    }
  });
});