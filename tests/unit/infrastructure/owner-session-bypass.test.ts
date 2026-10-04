import { describe, expect, it } from "vitest";

import { AUTH_BYPASS_ENV, isAuthBypassed } from "@/infrastructure/auth/owner-session";
import type { EnvironmentLike } from "@/infrastructure/supabase/server";

/**
 * The bypass guard.
 *
 * This is the one control on the site that can publish, reply to a visitor and
 * read a transcript, and the switch that disables its only boundary is an
 * environment variable. So the property worth testing is not "does it work" —
 * it is "can it be on when it must not be", and the ways of getting there are
 * enumerable: the wrong build, a truthy value that means something else, a
 * preview deployment, a half-typed line.
 *
 * Every case below is a value an operator can actually produce.
 */

const on = { [AUTH_BYPASS_ENV]: "on" };

describe("the owner-area bypass", () => {
  it("is off unless the variable is set at all", () => {
    // The default matters more than the happy path: a deployment that never heard
    // of this variable must be exactly as protected as it was before it existed.
    expect(isAuthBypassed({})).toBe(false);
  });

  it("is on for a local development build", () => {
    // No VERCEL_ENV at all is what `next dev` looks like, and it is the case this
    // exists for.
    expect(isAuthBypassed(on)).toBe(true);
    expect(isAuthBypassed({ ...on, NODE_ENV: "development" })).toBe(true);
  });

  /*
    The whole reason this is not one variable. A single flag would let a preview
    deployment — reachable by anyone with the URL, and by every Vercel team
    member — publish to the owner's console, and "it is only a preview" is how a
    real one ships.
   */
  it("refuses itself on a Vercel production or preview, even with the flag set", () => {
    expect(isAuthBypassed({ ...on, VERCEL_ENV: "production" })).toBe(false);
    expect(isAuthBypassed({ ...on, VERCEL_ENV: "preview" })).toBe(false);
  });

  /*
    `NODE_ENV` is deliberately not the build check, and this is the test that says
    so. Next sets it to `production` for `next start` and in CI, so a guard written
    against it would refuse the bypass on a laptop running a production build and in
    CI — the two places it most needs to be readable.
   */
  it("ignores NODE_ENV, so a local production build and CI still allow it", () => {
    expect(isAuthBypassed({ ...on, NODE_ENV: "production" })).toBe(true);
  });

  it("accepts the four spellings of yes and refuses everything else", () => {
    for (const value of ["1", "true", "yes", "on", "ON", "True", " on "]) {
      expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: value }), `"${value}" should be accepted`).toBe(true);
    }
  });

  /*
    Anything that is not one of those four reads as off. A value that opens an
    admin area must fail toward closed, so a typo, a leftover `0`, a `true` a
    shell already consumed, or a comment that ended up on the same line cannot
    open anything.
   */
  it("treats a misspelt or falsy value as off", () => {
    for (const value of ["0", "false", "no", "off", "enabled", "true-ish", "sim", ""]) {
      expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: value }), `"${value}" should be off`).toBe(false);
    }
  });

  /*
    The quote trap, and the reason the truthiness check runs on the raw string
    rather than on a boolean cast. A loader that does not strip quotes hands the
    process `"on"` — including the quote characters — and `Boolean("\"on\"")` is
    true, so a boolean cast would open the area on a file written by a perfectly
    reasonable script. Refusing it is both safer and more honest: the developer
    sees the sign-in form and learns the flag did not take.
   */
  it("refuses a value that still carries its surrounding quotes", () => {
    expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: '"on"' })).toBe(false);
    expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: "'true'" })).toBe(false);
  });

  it("treats a non-string as off rather than as truthy", () => {
    // `process.env` hands out strings, but the function takes an `EnvironmentLike`
    // so a caller can pass a literal — and a test passing `true` here must not get
    // a working bypass by accident.
    const odd = { [AUTH_BYPASS_ENV]: 1 } as unknown as EnvironmentLike;

    expect(isAuthBypassed(odd)).toBe(false);
  });
});