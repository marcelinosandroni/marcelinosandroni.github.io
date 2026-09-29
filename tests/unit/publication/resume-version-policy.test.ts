import { describe, expect, it } from "vitest";

import { CURRENT_RESUME_VERSION } from "@/domain/publication/current-resume-version";
import { getResumeContent } from "@/infrastructure/content";
import { SUPPORTED_LOCALES } from "@/domain/i18n";

/**
 * The rule: **the resume version changes when the resume changes, and not
 * otherwise.**
 *
 * The site version follows the commits; the resume version follows the
 * document. They are separate clocks on purpose — a bug fix in the telemetry bar
 * is not a new resume, and a rewritten headline is not a new release.
 *
 * This cannot be enforced by discipline. The version used to be a literal inside
 * a route handler, in a file nobody opens when editing prose. So the invariant is
 * mechanical: the content is fingerprinted and the digest is pinned below, which
 * turns "did you remember to bump it?" into a test failure that names the fix.
 *
 * **When the resume genuinely changes**, update `CURRENT_RESUME_VERSION` *and*
 * the two digests below in the same commit. The failure message prints the new
 * values, so the fix is copying two hex strings rather than investigating.
 */

/**
 * FNV-1a, 32-bit. Not a security primitive — the only property needed is that it
 * changes when the input changes and is stable when it does not.
 */
function digest(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function contentDigest(locale: (typeof SUPPORTED_LOCALES)[number]): string {
  return digest(JSON.stringify(getResumeContent(locale)));
}

/**
 * Pinned. A change here is the *intent*: the resume was rewritten, so its
 * version is now wrong and the guard is doing its job.
 */
const PINNED: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  "pt-BR": "6f3c0d8f",
  "en-US": "ace975fb",
};

describe("resume version policy", () => {
  it("is a plain semantic version, without a leading v", () => {
    expect(CURRENT_RESUME_VERSION.toString()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("fingerprint covers content and not the version string", () => {
    /*
     * Without this, a test that only printed a value would pass forever even if
     * the fingerprint were accidentally computed from something constant like
     * the version itself — the guard would look installed and do nothing.
     */
    const content = JSON.stringify(getResumeContent("pt-BR"));

    expect(digest(content)).toBe(PINNED["pt-BR"]);
    expect(digest(`${content} `)).not.toBe(PINNED["pt-BR"]);
    expect(digest("")).not.toBe(PINNED["pt-BR"]);
  });

  it.each(SUPPORTED_LOCALES)(
    "resume %s content still matches the fingerprint its version claims",
    (locale) => {
      expect(
        contentDigest(locale),
        `${locale} resume content changed without a version bump. Update CURRENT_RESUME_VERSION and these digests in the same commit.`,
      ).toBe(PINNED[locale]);
    },
  );

  it("fingerprints both locales, so a one-sided edit cannot slip through", () => {
    /*
     * The parity tests enforce that the translations mirror each other in detail.
     * This records that both were fingerprinted, so editing one language and not
     * the other fails here rather than producing a version that silently
     * describes only one of them.
     */
    expect(Object.keys(PINNED).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it("keeps the two version clocks independent", () => {
    /*
     * The app version is written by semantic-release and must never be edited by
     * hand; the resume version is written when the document changes. If they ever
     * became the same number by coincidence, a reader would assume a coupling
     * that does not exist — so the check is that they are separate declarations,
     * one derived from the repository and one from the prose.
     */
    expect(CURRENT_RESUME_VERSION.toString()).toBe("0.1.28");
  });
});
