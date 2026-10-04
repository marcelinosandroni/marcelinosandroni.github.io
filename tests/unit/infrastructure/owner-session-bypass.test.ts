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
    expect(isAuthBypassed({ ...on, NODE_ENV: "development" })).toBe(true);
    expect(isAuthBypassed({ ...on, NODE_ENV: "development", VERCEL_ENV: "development" })).toBe(true);
  });

  /*
    The hole `.env.local` opened, and the reason the guard needs two checks.

    Next loads `.env.local` over the process environment, and this flag is meant to
    live there. So a laptop with `ADMIN_AUTH_BYPASS=on` in `.env.local` opens the
    admin area under `next build && next start` — a production build — and `VERCEL_ENV`
    is absent on anything that is not a Vercel deployment, so it cannot catch it.
    Measured: identical shell and variables, opposite outcome, decided only by whether
    the file existed.

    Refusing every non-`development` build costs nothing real. `next dev` does not run
    the production build, so this is free on the only surface that needs it, and on
    the platform it is inert because a Vercel build is never `next dev`.
   */
  it("refuses a production build even with no VERCEL_ENV to go on", () => {
    expect(isAuthBypassed({ ...on, NODE_ENV: "production" })).toBe(false);
    expect(isAuthBypassed({ ...on, NODE_ENV: "test" })).toBe(false);
    // And with no NODE_ENV at all, which is what a bare process looks like.
    expect(isAuthBypassed(on)).toBe(false);
  });

  /*
    The reason `NODE_ENV` is checked at all is the reason it was previously ignored:
    the same variable is useless as the *only* check (Next sets it in CI and in `next
    start`) and load-bearing as one of two. Both statements are true and the second
    test here is the one that would catch removing it.
   */
  it("needs NODE_ENV=development, which is what makes next dev the only way in", () => {
    expect(isAuthBypassed({ ...on, NODE_ENV: "development" })).toBe(true);
    expect(isAuthBypassed({ ...on, NODE_ENV: "production" })).toBe(false);
  });

  /*
    The check that matters for the deployed area. A single flag would let a preview
    deployment — reachable by anyone with the URL, and by every Vercel team member —
    publish to the owner's console, and "it is only a preview" is how a real one ships.
   */
  it("refuses itself on a Vercel production or preview, even with the flag set", () => {
    expect(isAuthBypassed({ ...on, NODE_ENV: "development", VERCEL_ENV: "production" })).toBe(false);
    expect(isAuthBypassed({ ...on, NODE_ENV: "development", VERCEL_ENV: "preview" })).toBe(false);
  });

  /*
    `VERCEL_ENV` remains the load-bearing check rather than `NODE_ENV` *alone*: Next
    sets `NODE_ENV=production` for `next start` and in CI, and a guard written only
    against `VERCEL_ENV` would let a laptop open the admin area in a production build.
    The two together close both ends, and this asserts the Vercel half specifically so
    that removing either one is a test failure rather than a deployment.
   */
  it("refuses a preview even when the build claims to be a development server", () => {
    expect(
      isAuthBypassed({ ...on, NODE_ENV: "development", VERCEL_ENV: "preview" }),
      "a preview deployment must never open the owner area",
    ).toBe(false);
  });

  it("accepts the four spellings of yes and refuses everything else", () => {
    /*
      `NODE_ENV=development` on every case, because these tests are about the
      *truthiness* and not about the build check. Leaving it out would mean asserting
      that `on` opens the admin area in a production build, which is false and is the
      thing the guard exists to prevent — a test that passed for the wrong reason.
     */
    for (const value of ["1", "true", "yes", "on", "ON", "True", " on "]) {
      expect(
        isAuthBypassed({ [AUTH_BYPASS_ENV]: value, NODE_ENV: "development" }),
        `"${value}" should be accepted`,
      ).toBe(true);
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
      expect(
        isAuthBypassed({ [AUTH_BYPASS_ENV]: value, NODE_ENV: "development" }),
        `"${value}" should be off`,
      ).toBe(false);
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
    expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: '"on"', NODE_ENV: "development" })).toBe(false);
    expect(isAuthBypassed({ [AUTH_BYPASS_ENV]: "'true'", NODE_ENV: "development" })).toBe(false);
  });

  it("treats a non-string as off rather than as truthy", () => {
    // `process.env` hands out strings, but the function takes an `EnvironmentLike`
    // so a caller can pass a literal — and a test passing `true` here must not get
    // a working bypass by accident.
    const odd = { [AUTH_BYPASS_ENV]: 1 } as unknown as EnvironmentLike;

    expect(isAuthBypassed(odd)).toBe(false);
  });
});