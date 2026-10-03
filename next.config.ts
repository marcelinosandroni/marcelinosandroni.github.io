import type { NextConfig } from "next";

/**
 * A human-readable stamp for the build that is happening right now.
 *
 * ## Why this is here and not read from an environment variable
 *
 * Because none of the ones Vercel provides is one. The full list of system
 * environment variables contains deployment, git, region, project and URL
 * variables, and not a single build timestamp — `VERCEL_HASH_SALT` is a rotating
 * salt for content-addressed filenames and its value happens to look like a Unix
 * time, which is exactly the kind of coincidence that produces a bug report six
 * months later.
 *
 * ## Why the commit SHA is not the build either
 *
 * Because it is not one. One commit can be deployed any number of times: a
 * preview, then production, then a rebuild after a configuration change, then
 * another rebuild when a preview was still warm. All four are different builds
 * and all four report the same SHA, so a version readout keyed on it answers
 * "which code" and silently fails to answer "which build".
 *
 * So the build identity here is the timestamp, and the canonical identifier —
 * `VERCEL_DEPLOYMENT_ID`, unique per deployment — is carried alongside it for
 * bug reports. The stamp is what a human reads; the deployment id is what Vercel
 * support asks for.
 *
 * ## Why UTC, and why the trailing `Z`
 *
 * The build log a reader is comparing against is UTC, and a bare `1204` on a
 * footer invites a timezone argument. The `Z` is not decoration; it is the only
 * thing that makes the number unambiguous.
 *
 * ## Why it is computed once, at module scope
 *
 * Two consumers need it — `generateBuildId` below and the `env` block — and they
 * have to agree. Evaluating `new Date()` twice would give Next's own build
 * manifest one timestamp and the page another. One value, two consumers.
 */
function buildStamp(): string {
  const override = process.env.MSD_BUILD_STAMP?.trim();

  if (override !== undefined && override.length > 0) {
    return override;
  }

  const now = new Date();

  return [
    now.toISOString().slice(0, 10).replaceAll("-", ""),
    now.toISOString().slice(11, 16).replaceAll(":", ""),
  ].join("-").concat("Z");
}

const stamp = buildStamp();

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  /*
    Next's own build id, set to the same stamp so the value in
    `.next/BUILD_ID` and the value a reader sees are the same string.
  */
  generateBuildId: () => stamp,
  /*
    `NEXT_PUBLIC_` because the readout renders in the footer bar, and because the
    value is not a secret — it is the build's own name.

    Anything else available at build time is server-only, and a value that only
    exists on the server cannot be printed on a page whose whole point is that it
    renders on the client. That trade is the right way round for a build stamp: it
    leaks no capability, and a deployment id is already in the response headers of
    any request that reaches the platform.
  */
  env: {
    NEXT_PUBLIC_BUILD_STAMP: stamp,
  },
  experimental: {
    // The root layout lives under the `[locale]` dynamic segment, so a global
    // 404 is the only way to render a consistent "page not found" page for
    // URLs that match no locale at all.
    globalNotFound: true,
  },
};

export default nextConfig;