import { describe, expect, it } from "vitest";

import { assertResumeDownloadEnabled } from "@/application/publication/assert-resume-download-enabled";
import { NotFoundError } from "@/domain/errors";
import { FEATURE_FLAG_VARIABLES } from "@/domain/feature-flags/feature-flags";

/**
 * The download gate, tested as policy rather than through the route.
 *
 * The behaviour this file describes used to be a single `if` inside
 * `app/api/resume/[locale]/pdf/route.ts`, and could not be tested from here at all:
 * that module pulls in `next/root-params`, a placeholder the Next compiler is
 * expected to replace, and importing it outside the build throws. Moving the
 * decision into the application layer is what makes any of this assertable.
 *
 * What is worth pinning is the *direction* of the default. Every case below is an
 * input that must not publish a personal document, and one case that must.
 */
describe("assertResumeDownloadEnabled", () => {
  it("refuses when nothing is configured, which is the shipped default", () => {
    expect(() => assertResumeDownloadEnabled({})).toThrow(NotFoundError);
  });

  it.each(["", " ", "off", "no", "0", "false", "nope", "2"])(
    "refuses when the variable is %o",
    (value) => {
      expect(() =>
        assertResumeDownloadEnabled({ [FEATURE_FLAG_VARIABLES.resumeDownload]: value }),
      ).toThrow(NotFoundError);
    },
  );

  it.each(["1", "true", "yes", "on", "ON"])("allows when the variable is %o", (value) => {
    expect(() =>
      assertResumeDownloadEnabled({ [FEATURE_FLAG_VARIABLES.resumeDownload]: value }),
    ).not.toThrow();
  });

  it("answers 404, not 403", () => {
    // The feature is off, not the caller unauthorised. A 403 would tell a reader
    // probing the route that something is behind it.
    try {
      assertResumeDownloadEnabled({});
      expect.unreachable("the guard should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).statusCode).toBe(404);
    }
  });

  it("does not mention the phone number, the flag, or the deployment", () => {
    // An error body is rendered by the shared handler and can end up in a log or a
    // response. "disabled in this environment" tells the owner what happened
    // without telling a reader which knob to turn.
    try {
      assertResumeDownloadEnabled({});
      expect.unreachable("the guard should have thrown");
    } catch (error) {
      const message = (error as Error).message;

      expect(message).not.toMatch(/flag|env|variable/i);
      expect(message).not.toMatch(/phone|whatsapp/i);
    }
  });

  it("is independent of the WhatsApp flag", () => {
    // Two separate decisions. Turning one on must never publish the other.
    expect(() =>
      assertResumeDownloadEnabled({ [FEATURE_FLAG_VARIABLES.whatsapp]: "on" }),
    ).toThrow(NotFoundError);
  });
});