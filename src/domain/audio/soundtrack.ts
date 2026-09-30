/**
 * Whether the soundtrack is playing, and how that choice is remembered.
 *
 * ## Why this is a domain file and not a `useState`
 *
 * Because the rule that matters is not "is it playing" but "what is the most
 * defensible thing to do with a preference that is missing, stale, corrupt or
 * hostile". That decision belongs beside the theme preference, which already
 * answers the same question, and it is the part that has to be testable without a
 * browser.
 *
 * ## Why the default is off, loudly
 *
 * Sound on a portfolio is not an enhancement, it is an interruption, and browsers
 * block autoplay precisely because sites get this wrong. The Matrix original
 * score is Don Davis's and cannot be shipped here, so the loop is synthesised in
 * the Web Audio API — which means it is ours, and ours does not get to ambush a
 * visitor. Nothing makes a sound until they ask for one, and the answer is
 * remembered so nobody has to ask twice.
 */

/** The two states. A boolean would invite `undefined` into the UI. */
export type SoundtrackState = "on" | "off";

export const DEFAULT_SOUNDTRACK_STATE: SoundtrackState = "off";

/**
 * Where the choice is stored.
 *
 * Versioned in the key, so a future change to what "on" means cannot read a
 * value written under the old scheme and start playing at a volume nobody chose.
 */
export const SOUNDTRACK_STORAGE_KEY = "msd:soundtrack:v1";

/** Type guard. Deliberately narrow. */
export function isSoundtrackState(value: unknown): value is SoundtrackState {
  return value === "on" || value === "off";
}

/** Coerces anything to a usable state. Always returns a valid state. */
export function normalizeSoundtrackState(value: unknown): SoundtrackState {
  return isSoundtrackState(value) ? value : DEFAULT_SOUNDTRACK_STATE;
}

/**
 * Resolves what to do on load.
 *
 * Returns `false` for absent, stale or hostile stored values, which is the whole
 * point: an unreadable preference means silence, never sound.
 */
export function resolveSoundtrack(stored: unknown): boolean {
  return normalizeSoundtrackState(stored) === "on";
}

/**
 * Reads the stored choice.
 *
 * Takes storage rather than reaching for `localStorage` so it is testable, and
 * swallows every failure because a blocked storage API must not take the page
 * down over background audio.
 */
export function readSoundtrackPreference(storage: Pick<Storage, "getItem"> | undefined): SoundtrackState | null {
  if (storage === undefined) {
    return null;
  }

  let value: string | null;

  try {
    value = storage.getItem(SOUNDTRACK_STORAGE_KEY);
  } catch {
    return null;
  }

  return isSoundtrackState(value) ? value : null;
}
