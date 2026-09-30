import { describe, expect, it } from "vitest";

import {
  IDLE_RESET_MS,
  INTRO_PHASES,
  INTRO_STORAGE_KEY,
  INTRO_TOTAL_MS,
  evaluateIntroEligibility,
  introPhaseAt,
  introPhaseProgress,
  readIntroVisit,
  touchIntroActivity,
  writeIntroVisit,
} from "@/domain/intro";

/**
 * The intro's *policy*, which is the part that can be wrong.
 *
 * The animation is not asserted here — it is a matter of taste and belongs in a
 * browser. What belongs here is when the intro is allowed to interrupt somebody,
 * which is a decision with edge cases, and a first-visit animation that fires on
 * the wrong visit is worse than no animation at all.
 */
describe("the intro timeline", () => {
  it("is one second per beat plus the three-second handshake", () => {
    expect(INTRO_PHASES.map((step) => step.phase)).toEqual([
      "connecting",
      "door",
      "reveal",
      "enter",
    ]);

    /*
      A floor, not a ceiling. The whole sequence is the price of a first
      impression, and a reader who has already decided to stay should not have to
      wait through an argument for it. If a phase is ever lengthened this is the
      assertion that notices.
    */
    expect(INTRO_TOTAL_MS).toBeLessThan(7_000);
    // The handshake is the beat that costs the most attention, so it is the one
    // with a stated number rather than an emergent one.
    expect(INTRO_PHASES[0]?.durationMs).toBe(3_000);
  });

  it("names the phase at any point, and nothing after the end", () => {
    expect(introPhaseAt(0)).toBe("connecting");
    expect(introPhaseAt(2_999)).toBe("connecting");
    expect(introPhaseAt(3_000)).toBe("door");
    expect(introPhaseAt(INTRO_TOTAL_MS)).toBeNull();
    expect(introPhaseAt(INTRO_TOTAL_MS * 10)).toBeNull();
  });

  it("clamps a clock that runs backwards rather than indexing out of range", () => {
    // A `performance.now()` that goes backwards, or a negative elapsed after a
    // visibility change, must not crash on the first paint.
    expect(introPhaseAt(-500)).toBe("connecting");
  });

  it("reports progress within its own phase, clamped at both ends", () => {
    expect(introPhaseProgress("door", 3_000)).toBe(0);
    expect(introPhaseProgress("connecting", 1_500)).toBeCloseTo(0.5, 2);
    expect(introPhaseProgress("door", 3_000 + 99_999)).toBe(1);
  });
});

describe("who gets the intro", () => {
  it("plays it for somebody who has never been here", () => {
    expect(evaluateIntroEligibility({ seenAt: null, lastActiveAt: null }, 1_000)).toEqual({ kind: "play" });
  });

  it("does not play it again on a refresh", () => {
    const now = 1_000_000;
    const result = evaluateIntroEligibility({ seenAt: now - 4_000, lastActiveAt: now - 4_000 }, now);

    // The whole point: refreshing must not re-run the arrival.
    expect(result.kind).toBe("seen");
  });

  it("does not play it again ten minutes later either", () => {
    const now = 1_000_000;
    const nineMinutes = evaluateIntroEligibility(
      { seenAt: now - IDLE_RESET_MS + 1_000, lastActiveAt: now - IDLE_RESET_MS + 1_000 },
      now,
    );

    expect(nineMinutes.kind).toBe("seen");
  });

  it("plays it again after a genuine ten-minute absence", () => {
    const now = 1_000_000;
    const away = evaluateIntroEligibility(
      { seenAt: now - IDLE_RESET_MS - 1_000, lastActiveAt: now - IDLE_RESET_MS - 1_000 },
      now,
    );

    // Somebody who closed the tab, got on a train and came back is arriving.
    expect(away.kind).toBe("idle");
  });

  it("does not play it for a reader who asked for less motion", () => {
    // Reduced motion is not a softer intro. It is no intro, and the site.
    const result = evaluateIntroEligibility(
      { seenAt: null, lastActiveAt: null },
      1_000,
      { reducedMotion: true },
    );

    expect(result.kind).toBe("skip");
  });

  it("prefers the reduced-motion answer even for a first visit", () => {
    // The gate is checked before the visit, so nothing below it can be relied on.
    expect(evaluateIntroEligibility({ seenAt: null, lastActiveAt: null }, 0, { reducedMotion: true }).kind).toBe(
      "skip",
    );
  });
});

describe("the stored visit", () => {
  it("round-trips", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };

    expect(readIntroVisit(storage)).toEqual({ seenAt: null, lastActiveAt: null });

    writeIntroVisit(storage, 1_700_000_000_000);
    expect(readIntroVisit(storage).seenAt).toBe(1_700_000_000_000);
  });

  it("treats blocked storage as never seen, so the intro plays", () => {
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
    };

    expect(readIntroVisit(hostile)).toEqual({ seenAt: null, lastActiveAt: null });
    expect(readIntroVisit(undefined)).toEqual({ seenAt: null, lastActiveAt: null });
  });

  it("survives a corrupt value instead of throwing", () => {
    for (const raw of ["not json", "{}", "[]", "null", '{"seenAt":"soon"}', "12345"]) {
      expect(readIntroVisit({ getItem: () => raw }), `${raw} must not throw`).toEqual({
        seenAt: null,
        lastActiveAt: null,
      });
    }
  });

  it("only touches the activity stamp, never the seen stamp", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };

    writeIntroVisit(storage, 1_000);
    touchIntroActivity(storage, 9_000);

    const visit = readIntroVisit(storage);
    // Rewriting `seenAt` on activity would reset the arrival on every mouse move.
    expect(visit.seenAt).toBe(1_000);
    expect(visit.lastActiveAt).toBe(9_000);
  });

  it("does not invent a visit when only activity is stamped", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };

    touchIntroActivity(storage, 9_000);
    expect(readIntroVisit(storage).seenAt).toBeNull();
  });

  it("versions its key", () => {
    // A change to what "seen" means must not be read out of an old record.
    expect(INTRO_STORAGE_KEY).toMatch(/:v\d+$/);
  });
});
