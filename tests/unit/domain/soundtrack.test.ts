import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOUNDTRACK_STATE,
  SOUNDTRACK_STORAGE_KEY,
  isSoundtrackState,
  normalizeSoundtrackState,
  readSoundtrackPreference,
  resolveSoundtrack,
} from "@/domain/audio/soundtrack";

/**
 * The rule that matters here is not "is it playing" but what to do with a
 * preference that is missing, stale or hostile. Silence is the only safe answer
 * in every one of those cases, because the failure mode of guessing wrong is a
 * site that makes noise at someone who never asked.
 */
describe("soundtrack preference", () => {
  it("defaults to off", () => {
    expect(DEFAULT_SOUNDTRACK_STATE).toBe("off");
    expect(normalizeSoundtrackState(undefined)).toBe("off");
    expect(normalizeSoundtrackState(null)).toBe("off");
  });

  it("coerces anything unrecognised to off rather than to a guess", () => {
    for (const hostile of [true, 1, "on ", "ON", "yes", "", {}, [], "true"]) {
      expect(normalizeSoundtrackState(hostile), `${JSON.stringify(hostile)} must not enable sound`).toBe("off");
    }
  });

  it("accepts only the two states", () => {
    expect(isSoundtrackState("on")).toBe(true);
    expect(isSoundtrackState("off")).toBe(true);
    expect(isSoundtrackState("on ")).toBe(false);
    expect(isSoundtrackState(true)).toBe(false);
  });

  it("treats a missing or corrupt stored value as silence", () => {
    expect(resolveSoundtrack(null)).toBe(false);
    expect(resolveSoundtrack(undefined)).toBe(false);
    expect(resolveSoundtrack("nonsense")).toBe(false);
    expect(resolveSoundtrack("on")).toBe(true);
  });

  it("reads a stored choice, ignoring anything that is not one", () => {
    const storage = (value: string | null) => ({ getItem: () => value });

    expect(readSoundtrackPreference(storage("on"))).toBe("on");
    expect(readSoundtrackPreference(storage("off"))).toBe("off");
    expect(readSoundtrackPreference(storage("maybe"))).toBeNull();
    expect(readSoundtrackPreference(storage(null))).toBeNull();
  });

  it("survives storage that throws, which private browsing does", () => {
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
    };

    expect(readSoundtrackPreference(hostile)).toBeNull();
    expect(readSoundtrackPreference(undefined)).toBeNull();
  });

  it("versions its key so a future format cannot read an old value", () => {
    expect(SOUNDTRACK_STORAGE_KEY).toMatch(/:v\d+$/);
  });
});
