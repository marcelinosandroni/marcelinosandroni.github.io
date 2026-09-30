"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  MatrixSoundtrack,
  type AudioContextLike,
} from "@/application/audio/matrix-soundtrack";
import {
  SOUNDTRACK_STORAGE_KEY,
  readSoundtrackPreference,
  type SoundtrackState,
} from "@/domain/audio/soundtrack";

/**
 * The soundtrack, off until it is asked for.
 *
 * ## Why nothing plays on load
 *
 * Every browser blocks autoplay with sound, and that is not a limitation to work
 * around — it is the correct outcome. Sound on a portfolio is an interruption,
 * not an enhancement, and a site that plays ambience at someone who came to read
 * about a career is making a statement about the person running it.
 *
 * So the choice is explicit, it lives in the footer next to the theme picker
 * where the other site-level preferences already are, and it is remembered so
 * nobody has to make the same decision on every page.
 *
 * ## Two pieces of state, and why
 *
 * `isOn` is what is actually audible. The stored preference is read through
 * `useSyncExternalStore` rather than copied into state on mount: the server has
 * no `localStorage`, so the server snapshot is always "off", and hydrating to a
 * different value would be a mismatch. It also means returning to the page never
 * starts sound — the button shows what was chosen and stays silent until pressed,
 * which is the only honest reading of "remembered".
 */
function subscribe(onChange: () => void): () => void {
  // Fires in every tab, so a choice made in one is reflected in the others.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getStoredSnapshot(): SoundtrackState {
  try {
    return readSoundtrackPreference(window.localStorage) ?? "off";
  } catch {
    return "off";
  }
}

function getServerSnapshot(): SoundtrackState {
  return "off";
}

export function SoundtrackToggle({ labels }: { labels: SoundtrackToggleLabels }): React.ReactElement {
  // Subscribed so a choice made in another tab is reflected here, and so the store
  // stays in step with what was persisted. Deliberately not rendered: the button
  // reports what is audible, and coming back to the page must not start sound.
  useSyncExternalStore(subscribe, getStoredSnapshot, getServerSnapshot);
  const [isOn, setIsOn] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const trackRef = useRef<MatrixSoundtrack | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Leaving a loop running after the island unmounts is a tone that never
      // stops, so it is stopped here rather than trusted to be torn down.
      void trackRef.current?.stop();
    };
  }, []);

  const toggle = useCallback(async () => {
    setIsWorking(true);

    try {
      if (trackRef.current === null) {
        /*
         * Created inside the click, not lazily on mount. A context created
         * outside a user gesture starts suspended and the failure is silent: the
         * button flips to "on" and no sound ever comes out.
         *
         * The cast is at this one seam on purpose. `AudioContextLike` describes
         * only the nodes this module actually touches, and the unit tests pin that
         * surface by exercising the implementation against a fake — so the
         * assertion that the two agree is behavioural, not a type-level promise.
         */
        const context = new AudioContext() as unknown as AudioContextLike;
        trackRef.current = new MatrixSoundtrack(context);
      }

      if (isOn) {
        await trackRef.current.stop();
        trackRef.current = null;

        if (mountedRef.current) {
          setIsOn(false);
          persist("off");
        }
      } else {
        await trackRef.current.start();

        if (mountedRef.current) {
          setIsOn(true);
          persist("on");
        }
      }
    } catch {
      /*
       * No AudioContext, a blocked gesture, a device with no output. Ambient
       * sound is not worth an error dialog, and the button going back to "off"
       * is an honest report that nothing is playing — so the preference is left
       * untouched rather than written as "on" for a loop that never sounded.
       */
      if (mountedRef.current) {
        setIsOn(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsWorking(false);
      }
    }
  }, [isOn]);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={isWorking}
      aria-pressed={isOn}
      data-click={isOn ? "soundtrack-off" : "soundtrack-on"}
      title={isOn ? labels.stop : labels.start}
      className="header-control gap-space-xs disabled:opacity-60"
    >
      {/*
        Two different notes rather than a speaker with and without its waves.

        A speaker built from `(` and `.` was tried first and read as a filled dot
        followed by two brackets at this size — there is no way to draw a speaker in
        ASCII at 16px and have it survive. A note is unambiguous about the domain
        (a soundtrack, not a phone call), and using a *different* note for the two
        states means the current state is legible without relying on colour.
      */}
      <span aria-hidden="true">{isOn ? "♫" : "♪"}</span>
      <span className="sr-only">{isOn ? labels.stop : labels.start}</span>
    </button>
  );
}

/** A preference that cannot be saved is still a preference that worked. */
function persist(state: SoundtrackState): void {
  try {
    window.localStorage.setItem(SOUNDTRACK_STORAGE_KEY, state);
  } catch {
    // Nothing to do: the sound is playing either way.
  }
}

export interface SoundtrackToggleLabels {
  /** e.g. "PLAY SOUNDTRACK". */
  start: string;
  /** e.g. "STOP SOUNDTRACK". */
  stop: string;
}
