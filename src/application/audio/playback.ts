/**
 * Playing a dropped-in audio file, and stopping whatever is currently playing.
 *
 * Split out of the toggle so both the file adapter and the synth adapter go
 * through one `stopPlayback`, and so the two never disagree about what "stopped"
 * means — an `HTMLAudioElement` and a `MatrixSoundtrack` have nothing in common
 * except that both need to be silenced.
 */
import { MatrixSoundtrack } from "@/application/audio/matrix-soundtrack";

/** Either adapter, discriminated so `stopPlayback` knows what to call. */
export type ActivePlayback = MatrixSoundtrack | HTMLAudioElement | null;

/**
 * Which adapter a slot holds.
 *
 * Exported so the caller can narrow the union rather than casting. A `start()`
 * that only the synth has and a `pause()` that only the element has means the
 * toggle needs to know which one it is holding, and a type guard says that once
 * instead of the two adapters each asserting it.
 */
export function isSynthPlayback(value: ActivePlayback): value is MatrixSoundtrack {
  return value !== null && typeof (value as MatrixSoundtrack).start === "function";
}

function isAudioElement(value: ActivePlayback): value is HTMLAudioElement {
  return value !== null && typeof (value as HTMLAudioElement).pause === "function";
}

/**
 * Starts a file, and resolves only when it is genuinely playing.
 *
 * Resolving on `play` alone is not enough: a browser that refuses to decode
 * still fires `play` and then errors, so the promise would resolve and the reader
 * would get silence with a button claiming otherwise. `canplay` is the event that
 * means there is audio to play, and a failure rejects so the caller can fall back
 * rather than lie.
 */
export function startFilePlayback(
  path: string,
  loop: boolean,
  into: { current: ActivePlayback },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const element = new Audio();

    element.src = path;
    element.loop = loop;
    element.preload = "auto";
    // A soundtrack under a page being read, at the level a soundtrack should be.
    element.volume = 0.35;

    const onReady = (): void => {
      cleanup();
      void element.play().then(resolve).catch(reject);
    };

    const onError = (): void => {
      cleanup();
      reject(new Error(`soundtrack: ${path} could not be played`));
    };

    const cleanup = (): void => {
      element.removeEventListener("canplay", onReady);
      element.removeEventListener("error", onError);
    };

    element.addEventListener("canplay", onReady, { once: true });
    element.addEventListener("error", onError, { once: true });

    into.current = element;
    element.load();
  });
}

/** Silences whichever adapter is active, and clears the slot. */
export async function stopPlayback(play: { current: ActivePlayback }): Promise<void> {
  const current = play.current;

  play.current = null;

  if (isAudioElement(current)) {
    current.pause();
    current.currentTime = 0;
    return;
  }

  await current?.stop();
}
