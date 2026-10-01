import { NotFoundError } from "@/domain/errors";
import { isFeatureEnabled, type FeatureFlagEnv } from "@/domain/feature-flags/feature-flags";

/**
 * The resume download gate, as a policy rather than as a line in a route handler.
 *
 * ## Why this is its own module
 *
 * The gate itself is one `if`, and it was originally written that way — inside
 * `app/api/resume/[locale]/pdf/route.ts`. That version could not be tested.
 * `route.ts` cannot be imported outside Next's compiler: it reaches
 * `next/root-params`, which is a placeholder the compiler is expected to replace,
 * and importing it from vitest throws *"This module is a placeholder for
 * 'next/root-params' and should be replaced by the compiler."*
 *
 * So the interesting behaviour — disabled by default, 404 rather than 403,
 * decided before anything else happens — lived in the one file nobody could reach
 * from a test. Moving it here is what makes it testable at all.
 *
 * ## Why 404 and not 403
 *
 * The feature is off, not the caller unauthorised. A 403 would have to be caught
 * and translated for the author reading a log, and it tells a reader probing the
 * route that something is there and denied — which is more information than the
 * situation warrants. There is no secret to protect: the document is the owner's,
 * it is readable on the site in full, and this only controls whether it is
 * offered as a file.
 *
 * ## Why the message says what it says
 *
 * The shared error handler can put this text in a response body or in a log, so it
 * is written to describe the reader's situation and nothing else. An earlier version
 * ended "…is disabled in this environment", and the unit test asserting the message
 * leaks no configuration failed on its own word: naming the mechanism tells anyone
 * reading a response which switch to try. "Not available" is the same information
 * from the outside.
 */
export function assertResumeDownloadEnabled(env: FeatureFlagEnv = process.env): void {
  if (isFeatureEnabled("resumeDownload", env)) {
    return;
  }

  throw new NotFoundError("Resume download is not available");
}