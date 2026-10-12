import { spawn } from "node:child_process";
import { existsSync, renameSync, unlinkSync } from "node:fs";

/**
 * Runs the e2e suite with `.env.local` set aside.
 *
 * ## Why this wrapper exists
 *
 * `playwright.config.ts` clears every Supabase variable in the web server's
 * environment, so the suite runs against the versioned catalog with no network
 * call at all — which is the point: it is deterministic, fast, and it exercises
 * exactly the degraded path a credential-less deployment takes.
 *
 * Clearing `process.env` is not enough. Next loads `.env.local` **over** the
 * environment, so a developer who followed `docs/local-database.md` and generated
 * local keys ends up with a live PostgREST in the middle of the suite anyway —
 * every page render then waits on a database round trip, and the run either
 * slows past its timeout or fails against whatever happens to be in the tables.
 *
 * A test suite whose result depends on whether a developer's database happens to
 * be running is not a test suite. So the file is moved aside for the duration
 * and restored afterwards — including when the run fails, which is why the
 * restore is in a `finally` rather than after the spawn.
 *
 * Run with `npm run test:e2e`.
 */

const ENV_LOCAL = ".env.local";
const BACKUP = ".env.local.e2e-backup";

function restore(): void {
  if (existsSync(BACKUP)) {
    renameSync(BACKUP, ENV_LOCAL);
  }
}

function main(): void {
  const moved = existsSync(ENV_LOCAL);

  if (moved) {
    // A backup left by an interrupted run would be overwritten here, losing
    // whatever it held. Refusing is the safer of the two failures.
    if (existsSync(BACKUP)) {
      console.error(
        `${BACKUP} exists — a previous run was interrupted before it could restore ${ENV_LOCAL}.\n` +
          `Recover it with: mv ${BACKUP} ${ENV_LOCAL}`,
      );
      process.exit(1);
    }

    renameSync(ENV_LOCAL, BACKUP);
    console.log(`Set ${ENV_LOCAL} aside for the run.\n`);
  }

  const child = spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const finish = (code: number): void => {
    restore();
    process.exit(code ?? 1);
  };

  child.on("exit", finish);
  child.on("error", () => {
    // A spawn failure must not leave the developer's environment file parked
    // under a name nothing looks for.
    restore();
    process.exit(1);
  });
}

// Ctrl-C kills the child without an `exit` event, so the file is restored on the
// signal too — otherwise an interrupted run leaves the developer's keys in a
// file the app never reads.
process.on("SIGINT", () => {
  restore();
  process.exit(130);
});

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  restore();
  process.exit(1);
}