/**
 * What is currently deployed, as one fact.
 *
 * ## Why this is a domain function and not a `process.env` read in a component
 *
 * Because the interesting part is not the values, it is the *precedence*, and
 * precedence is where a build readout turns into a lie. Every branch below is a
 * claim about which platform this code is running on, and every one of them is
 * testable without a deployment.
 *
 * ## Why `NODE_ENV` is not consulted at all
 *
 * Because on Vercel it is `production` for preview deployments too. A footer
 * reading `NODE_ENV` would print `production` on a preview, which is a false
 * claim about the thing a reader is most likely to want to know when they are
 * looking at a preview. `VERCEL_ENV` is the only variable that distinguishes
 * them, and its absence is itself the answer: nothing here is a Vercel build.
 *
 * ## Why the environment is a bare string union and not a branded type
 *
 * Because it is displayed, not branched on. Four displayable words, one source,
 * and the caller decides how to present them.
 */

export type DeploymentEnvironment = "production" | "preview" | "development" | "local";

export interface BuildInfo {
  /**
   * Which platform surface this is.
   *
   * `local` is a first-class value and not an error case: it is what every
   * `npm run dev` and every `npm run start` on a laptop should say, because
   * neither of them is a production build of anything.
   */
  readonly environment: DeploymentEnvironment;
  /**
   * The semantic version from `package.json`.
   *
   * Passed in rather than imported so this module stays free of both the
   * filesystem and the release automation, and so the caller decides where the
   * number comes from — `SITE_VERSION` in `site-info.ts`, which is the one place
   * allowed to read `package.json`.
   */
  readonly release: string;
  /**
   * When this build ran, `20261003-1204Z`, or `null` where the build produced no
   * stamp.
   *
   * `null` rather than a fabricated value: the rule in this codebase is to never
   * print a number the site has no way to know.
   */
  readonly stamp: string | null;
  /**
   * Vercel's own per-deployment identifier, `dpl_...`, or `null` off Vercel.
   *
   * Kept because it is the identifier Vercel support asks for in a bug report,
   * and it is the only thing that distinguishes two builds of the same commit.
   */
  readonly deploymentId: string | null;
}

/** The subset of the process environment this module reads. */
export interface BuildEnvironment {
  readonly VERCEL?: string;
  readonly VERCEL_ENV?: string;
  readonly VERCEL_DEPLOYMENT_ID?: string;
  readonly NEXT_PUBLIC_BUILD_STAMP?: string;
}

/**
 * Which Vercel surface this is, or `local` when there is no Vercel.
 *
 * `VERCEL` is checked before `VERCEL_ENV` rather than trusted on its own: the
 * docs say system variables stop being populated when access to them is turned
 * off for the project, and in that case `VERCEL_ENV` may be absent from a
 * machine that is very much on Vercel. `VERCEL=1` is the indicator that says the
 * variables were actually exposed, so it is the more reliable of the two.
 */
export function resolveDeploymentEnvironment(env: BuildEnvironment): DeploymentEnvironment {
  if (env.VERCEL === undefined || env.VERCEL_ENV === undefined) {
    return "local";
  }

  switch (env.VERCEL_ENV) {
    case "production":
    case "preview":
    case "development":
      return env.VERCEL_ENV;
    default:
      /*
        A value outside the documented set. `local` is the honest answer — it says
        "this is not a surface I recognise", which is what is true, instead of
        guessing a word that could be wrong in the one place a reader would act
        on it.
      */
      return "local";
  }
}

/**
 * The one place a missing value stays missing.
 *
 * `trim()` first and emptiness after, because every environment source has a
 * different idea of what "not set" means: `dpl_` when a deployment id is absent
 * from a build that still runs, `""` when a variable is declared and left blank
 * in the dashboard. Both must produce the same answer, which is `null`, and the
 * caller omits the segment rather than printing an empty one.
 */
function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : null;
}

export function resolveBuildInfo(env: BuildEnvironment, release: string): BuildInfo {
  return {
    environment: resolveDeploymentEnvironment(env),
    release,
    stamp: orNull(env.NEXT_PUBLIC_BUILD_STAMP),
    deploymentId: orNull(env.VERCEL_DEPLOYMENT_ID),
  };
}