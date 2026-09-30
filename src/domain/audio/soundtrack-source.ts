/**
 * The soundtrack, and where its audio comes from.
 *
 * ## Why there is a port at all
 *
 * Because the recording is not ours. The film's score is Don Davis's, so it cannot
 * be fetched into this repository, and a synthesised approximation is a different
 * thing from the recording somebody asked for. Rather than pretend the synth is
 * the answer, the delivery is a port with two adapters — the same shape as the
 * email and the CMS seams — so dropping a licensed file in `public/audio/` and
 * naming it is a one-line change rather than a refactor.
 *
 * ## Why the synth is not thrown away
 *
 * It is the default, and it is the only one that works with no asset, no network
 * and no licensing question. Removing it would leave a feature that does nothing
 * on a fresh clone. What changes is the *preference*: a file wins when one is
 * named, and the synth is the floor.
 *
 * ## What this file deliberately does not do
 *
 * It does not know how to download anything, and it does not carry a URL. A port
 * that fetched a remote recording would be a hard dependency on a host that could
 * disappear, on a CORS policy, and on somebody else's uptime — for background
 * audio on a résumé.
 */
export type SoundtrackSourceId = "synth" | "file";

export const SOUNDTRACK_SOURCE_IDS = ["file", "synth"] as const satisfies readonly SoundtrackSourceId[];

export const DEFAULT_SOUNDTRACK_SOURCE: SoundtrackSourceId = "synth";

/** Where a dropped-in file is looked for. Public, same-origin, cacheable. */
export const SOUNDTRACK_DIRECTORY = "/audio";

export type SoundtrackConfig =
  | { readonly source: "synth" }
  | { readonly source: "file"; readonly path: string; readonly loop: boolean };

export function isSoundtrackSourceId(value: unknown): value is SoundtrackSourceId {
  return typeof value === "string" && (SOUNDTRACK_SOURCE_IDS as readonly string[]).includes(value);
}

/**
 * The audio extensions a browser can decode without a server helping.
 *
 * `ogg` first because it is the only one that plays a full-length loop on every
 * browser this site supports, and because a Vorbis loop of a minute or two is
 * smaller than the same audio as AAC. The others are there so the person dropping
 * the file in is not told their `.m4a` is wrong when it is not.
 */
const DECODABLE = [".ogg", ".oga", ".mp3", ".m4a", ".mp4", ".wav", ".flac", ".aac", ".opus"] as const;

/**
 * Resolves the configuration from one environment value.
 *
 * A bare filename is the common case — `soundtrack.ogg` — and it is expanded to
 * the public directory, because writing the whole path in an env var invites a
 * leading slash to be forgotten. A value that is already a path is left alone.
 *
 * Returns the synth for anything unusable rather than throwing: a typo in a
 * background-audio preference should cost the recording, not the page.
 */
export function resolveSoundtrackConfig(
  env: { get(name: string): string | undefined } | undefined,
): SoundtrackConfig {
  const raw = env?.get("SOUNDTRACK_FILE")?.trim();

  if (raw === undefined || raw === "") {
    return { source: "synth" };
  }

  const hasExtension = DECODABLE.some((extension) => raw.toLowerCase().endsWith(extension));

  if (!hasExtension) {
    // A path with no audio extension is almost certainly a mistake, and guessing
    // an extension would be worse than not playing.
    return { source: "synth" };
  }

  return {
    source: "file",
    path: raw.startsWith("/") ? raw : `${SOUNDTRACK_DIRECTORY}/${raw}`,
    // A loop, not a track with an end. `music.mp3` in the name is an opt-out.
    loop: !/\.(no-?loop|once)\./i.test(raw),
  };
}
