#!/usr/bin/env node

/**
 * Turns the master portrait recording into the three files the site ships.
 *
 * ## Why this is a script and not a committed binary
 *
 * Because the master is 2.8MB and the derivatives are 220KB between them, and
 * because the encode is a *decision* — a crop, a duration, a bitrate, an audio
 * track removed — rather than a conversion. A decision that is not written down
 * gets re-decided differently the next time somebody touches it.
 *
 * ## Why ffmpeg runs in Docker
 *
 * ffmpeg is not on this project's PATH and pinning a host install is somebody's
 * problem six months from now. The repository already leans on Docker for the PDF
 * toolchain (`docker-pdf-compiler.ts`), so the encoder uses the same shape: an
 * `ffmpeg:6-alpine` container, a mounted working directory, and a clear failure if
 * Docker is not running.
 *
 * ## Why the filenames are hashed
 *
 * `next start` serves `public/` without long-lived caching. An unhashed name means
 * every visitor downloads 74KB of video on every single page view, forever, in
 * exchange for a URL that never changes. The hash is of the *output*, so the
 * filename changes exactly when the bytes do, and `PORTRAIT_VIDEO` is rewritten to
 * match. That rewrite is the reason this script prints what it did: a hashed name
 * that nothing points at is a file nothing will ever fetch.
 *
 * Usage:
 *   npm run encode:portrait
 */

import { execFile } from "child_process";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** The 2.8MB, 720x1280, 24fps, with-audio master. Never shipped. */
const SOURCE = join("public", "portrait-action-video.mp4");

const OUTPUT_DIR = join("public", "media");

/**
 * The square crop, in ffmpeg's own arithmetic.
 *
 * `crop=720:720:0:180` takes the middle 720px of the 1280px height, offset 180px
 * down. The alternative framings were checked against real frames: cropping from
 * the top puts the chin at the bottom edge, and centring on the face leaves the
 * forehead and headphone band out of frame. This one keeps the head centred with
 * the shoulders in shot.
 */
const CROP = "crop=720:720:0:180";

/**
 * Why the loop is a boomerang rather than a plain cut.
 *
 * The first version of this file took the first 6 seconds and claimed they would
 * loop cleanly "because the head turn starts and ends on a three-quarter view".
 * That was wrong, and comparing the encoded first and last frames side by side is
 * what proved it: the head is at a strong three-quarter at t=0 and noticeably more
 * frontal at t=6, so the portrait visibly jumped once every six seconds.
 *
 * The master never returns to its opening pose — measured, at t=9.7 it is closer
 * but still not identical — so no single cut of it is seamless.
 *
 * A boomerang is. Playing 0→4.5s and then that same segment reversed means the last
 * frame *is* the first frame by construction rather than by coincidence: the loop
 * closes on the only frame it can close on. Nine seconds at 106KB, against 74KB for
 * the broken six.
 *
 * 4.5 rather than the full 9.7 because the reversed half is the same footage again,
 * and nine seconds of a face turning is already long enough that a reader who
 * watches it twice is not looking at the headline.
 */
const LOOP_HALF_SECONDS = 4.5;

/** 420px is the hero frame's cap (`max-w-md` = 28rem = 448px), minus headroom. */
const SCALE = "scale=420:420:flags=lanczos";

/** Output frame rate. 20 is plenty for a slow head turn and a third of the bytes of 60. */
const OUTPUT_FPS = 20;

/**
 * Exact frame count of the loop.
 *
 * This exists because of a bug the e2e suite caught. The first boomerang encode
 * declared nine seconds and produced a file the browser reported as **8.85s**: two
 * 4.5s segments concatenated at the source's 24fps span 8.958s of timestamps, and
 * the `fps=20` resample emits a frame for every 50ms that has a source frame behind
 * it, so the last partial interval produced nothing.
 *
 * 150ms of drift per cycle. Invisible once, and after twenty loops the CSS marker
 * that fires at the loop boundary is firing somewhere else entirely — which is the
 * exact failure the marker existed to prevent, caused by the fix for the thing the
 * marker was covering up.
 *
 * So the length is pinned rather than approximated: `tpad` guarantees there is
 * enough timeline to sample, and `-frames:v` cuts at exactly the count that
 * duration implies. Verified with ffprobe at 9.000000s.
 */
const LOOP_FRAMES = Math.round(LOOP_HALF_SECONDS * 2 * OUTPUT_FPS);

/**
 * The boomerang, as a filter graph.
 *
 * `reverse` buffers every frame of the segment in memory before emitting it, which
 * is why this is 4.5 seconds rather than the full 9.7: at 720x1280 the whole clip
 * would be a few hundred megabytes of decoded frames held at once.
 *
 * `tpad` clones the final frame backwards, which is what makes the loop's *last*
 * frame the same picture as its first even after the frame-count cut — without it,
 * padding to an exact count could land on a duplicated frame that differs from
 * frame zero.
 */
function boomerang(): string {
  return [
    `[0:v]trim=0:${LOOP_HALF_SECONDS},setpts=PTS-STARTPTS[fwd]`,
    `[0:v]trim=0:${LOOP_HALF_SECONDS},reverse,setpts=PTS-STARTPTS[rev]`,
    `[fwd][rev]concat=n=2:v=1:a=0,${CROP},${SCALE},fps=${OUTPUT_FPS},tpad=stop_mode=clone:stop_duration=0.3[out]`,
  ].join(";");
}

/**
 * Total size budget for the three derivatives.
 *
 * A test asserts the shipped files stay under this, and the reason it exists is
 * that "we optimised this once" decays silently: the next person who re-encodes
 * without reading this script ships 2.8MB and nobody notices until a reader on a
 * train does.
 *
 * Raised from 320KB to 360KB for the boomerang. The seamless loop is 74KB more
 * than the broken one it replaced, and 306KB against a 320KB ceiling is 96% of it —
 * a tripwire rather than a ceiling, which would fail the next encode that moved by
 * a kilobyte. 360KB is still a third of the single MP4 this replaced.
 */
export const PORTRAIT_MEDIA_BUDGET_BYTES = 360 * 1024;

type Encoding = {
  readonly stem: string;
  readonly extension: string;
  readonly args: readonly string[];
  readonly description: string;
};

const ENCODINGS: readonly Encoding[] = [
  {
    stem: "portrait-loop",
    extension: "webm",
    description: "VP9, the codec every target browser gets",
    args: [
      "-c:v",
      "libvpx-vp9",
      // Constant quality with a zero-bitrate cap: CRF decides, the cap only stops
      // a pathological frame from producing a very large file.
      "-crf",
      "42",
      "-b:v",
      "0",
      "-row-mt",
      "1",
      "-deadline",
      "good",
      "-cpu-used",
      "2",
    ],
  },
  {
    stem: "portrait-loop",
    extension: "mp4",
    description: "H.264 baseline, for Safari and anything that skips WebM",
    args: [
      "-c:v",
      "libx264",
      // Baseline profile and level 3.1 is the intersection every browser and
      // every phone decodes. High profile would be smaller; it is not universal.
      "-profile:v",
      "baseline",
      "-level",
      "3.1",
      "-preset",
      "veryslow",
      "-crf",
      "28",
      // Without this the moov atom sits at the end of the file, and the browser
      // cannot start playing until it has downloaded all of it — which defeats the
      // entire exercise.
      "-movflags",
      "+faststart",
    ],
  },
  {
    stem: "portrait-poster",
    extension: "webp",
    description: "the first frame, as the still that paints before any video does",
    args: ["-frames:v", "1", "-c:v", "libwebp", "-quality", "72"],
  },
];

async function isDockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["info"], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Container paths, and the host path to mount as the output directory.
 *
 * Docker Desktop rejects a relative `-v` source outright — it parses the value as
 * a volume *name*, and `public\media` is not a legal one — so the mount has to be
 * absolute. The failure is otherwise baffling: it looks like a permissions problem
 * on the output directory, which is exactly what it is not.
 */
const MOUNT_ROOT = process.cwd();
const OUTPUT_MOUNT = join(MOUNT_ROOT, OUTPUT_DIR);

/**
 * Repo-relative path, rewritten into the container's mount point and always with
 * forward slashes: the container has no idea what `C:\` is, and `-i public\x.mp4`
 * fails there with a bare "No such file or directory" that names neither the
 * missing file nor the real cause.
 */
function inContainer(relative: string): string {
  return `/repo/${relative.split(/[\\/]/).join("/")}`;
}

async function runFfmpeg(inputArgs: readonly string[], output: string): Promise<void> {
  await execFileAsync(
    "docker",
    [
      "run",
      "--rm",
      "--entrypoint",
      "ffmpeg",
      // Read-only for the repository; the output directory is the single write.
      "-v",
      `${MOUNT_ROOT}:/repo:ro`,
      "-v",
      `${OUTPUT_MOUNT}:/out`,
      "-w",
      "/repo",
      "jrottenberg/ffmpeg:6-alpine",
      "-y",
      "-v",
      "error",
      ...inputArgs,
      output,
    ],
    { timeout: 600_000 },
  );
}

/**
 * Runs a filter graph rather than a plain `-vf` chain.
 *
 * The boomerang needs `filter_complex` because it concatenates two separately
 * filtered segments, and ffmpeg refuses a simple `-vf` on a stream that a complex
 * graph already feeds — the two error with "Simple and complex filtering cannot be
 * used together for the same stream", which names neither the cause nor the fix.
 */
async function runFfmpegFilter(
  filterComplex: string,
  output: string,
  codecArgs: readonly string[],
): Promise<void> {
  await execFileAsync(
    "docker",
    [
      "run",
      "--rm",
      "--entrypoint",
      "ffmpeg",
      "-v",
      `${MOUNT_ROOT}:/repo:ro`,
      "-v",
      `${OUTPUT_MOUNT}:/out`,
      "-w",
      "/repo",
      "jrottenberg/ffmpeg:6-alpine",
      "-y",
      "-v",
      "error",
      "-i",
      inContainer(SOURCE),
      "-filter_complex",
      filterComplex,
      "-map",
      "[out]",
      "-an",
      ...codecArgs,
      output,
    ],
    { timeout: 600_000 },
  );
}

async function fileSize(path: string): Promise<number> {
  const stats = await fs.stat(path);
  return stats.size;
}

async function main(): Promise<void> {
  if (!(await fs.stat(SOURCE).catch(() => null))?.isFile()) {
    console.error(`✗ Source not found: ${SOURCE}`);
    console.error("  The master recording is not committed — it is 2.8MB.");
    process.exitCode = 1;
    return;
  }

  if (!(await isDockerAvailable())) {
    console.error("✗ Docker is not running.");
    console.error("  ffmpeg runs in a container so no host install is needed:");
    console.error("    https://docs.docker.com/get-docker/");
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const sourceMb = (await fileSize(SOURCE)) / 1024 / 1024;
  console.log(`▸ Source: ${SOURCE} (${sourceMb.toFixed(2)}MB)`);
  console.log(`▸ Crop:   ${CROP}`);
  console.log(`▸ Loop:   ${LOOP_HALF_SECONDS}s forward + ${LOOP_HALF_SECONDS}s reversed = ${LOOP_HALF_SECONDS * 2}s, seamless`);
  console.log(`▸ Frames: ${LOOP_FRAMES} at ${OUTPUT_FPS}fps — pinned exactly, so the CSS marker cannot drift`);
  console.log(`▸ Scale:  ${SCALE}, no audio track\n`);

  /*
    A stale derivative from a previous run would keep being served by a cached
    HTML document, so the directory is emptied first. Only files this script
    writes live there, and the emptying is scoped to it.
  */
  for (const existing of await fs.readdir(OUTPUT_DIR)) {
    await fs.rm(join(OUTPUT_DIR, existing), { force: true });
  }

  const written: string[] = [];
  let total = 0;

  for (const encoding of ENCODINGS) {
    const isPoster = encoding.stem === "portrait-poster";
    const staged = `/out/${encoding.stem}.${encoding.extension}`;

    if (isPoster) {
      /*
        The poster is frame zero of the master, which the boomerang preserves
        exactly — the reversed half is appended after it, so the first frame is
        unchanged and stays the right still to paint while the video loads. The
        identical poster hash across two different loop encodes is the proof.
      */
      await runFfmpeg(["-i", inContainer(SOURCE), "-frames:v", "1", ...encoding.args], staged);
    } else {
      // `-frames:v` before the codec arguments: it counts output frames, so it has
      // to be applied to the resampled stream rather than the source.
      await runFfmpegFilter(boomerang(), staged, ["-frames:v", String(LOOP_FRAMES), ...encoding.args]);
    }

    const bytes = await fileSize(join(OUTPUT_DIR, `${encoding.stem}.${encoding.extension}`));

    /*
      Hashed from the output bytes, not the input. Two encodes of the same master
      with different settings produce different files and must produce different
      names, and a content hash gets that right without anybody maintaining a
      version string.
    */
    const hash = createHash("sha256").update(await fs.readFile(join(OUTPUT_DIR, `${encoding.stem}.${encoding.extension}`)));
    const digest = hash.digest("hex").slice(0, 8);

    const finalName = `${encoding.stem}.${digest}.${encoding.extension}`;
    await fs.rename(
      join(OUTPUT_DIR, `${encoding.stem}.${encoding.extension}`),
      join(OUTPUT_DIR, finalName),
    );

    written.push(`/media/${finalName}`);
    total += bytes;

    console.log(`  ✓ ${finalName.padEnd(34)} ${(bytes / 1024).toFixed(1).padStart(7)}KB  ${encoding.description}`);
  }

  const ratio = 1 - total / (await fileSize(SOURCE));
  console.log(`\n▸ Total: ${(total / 1024).toFixed(1)}KB of ${sourceMb.toFixed(2)}MB — ${(ratio * 100).toFixed(0)}% smaller`);

  if (total > PORTRAIT_MEDIA_BUDGET_BYTES) {
    console.error(
      `\n✗ Over budget: ${(total / 1024).toFixed(1)}KB exceeds the ${(PORTRAIT_MEDIA_BUDGET_BYTES / 1024).toFixed(0)}KB ceiling.`,
    );
    process.exitCode = 1;
    return;
  }

  /*
    Printed rather than patched into the source. A script that rewrites a module
    someone hand-edited is a script that eventually produces a merge conflict at
    the worst possible moment; the three lines to paste are obvious and the
    decision stays a human one.
  */
  console.log("\nUpdate PORTRAIT_VIDEO in src/domain/media/portrait-video.ts:\n");
  console.log(`  webm:   "${written[0]}",`);
  console.log(`  mp4:    "${written[1]}",`);
  console.log(`  poster: "${written[2]}",`);
}

void main();