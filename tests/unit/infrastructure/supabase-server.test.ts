import { describe, expect, it } from "vitest";

import {
  SUPABASE_PUBLISHABLE_KEY_ENV,
  SUPABASE_SECRET_KEY_ENV,
  SUPABASE_URL_ENV,
  isSupabaseConfigured,
  isSupabaseContentConfigured,
  requireSupabaseConfig,
  requireSupabaseReadConfig,
  supabaseConfigFromEnv,
  supabaseReadConfigFromEnv,
} from "@/infrastructure/supabase/server";
import { getSiteOrigin } from "@/infrastructure/supabase/site-origin";

/**
 * The Supabase configuration is read in three places — owner auth, the click
 * aggregate, and the content repositories — and they have to agree on what
 * "configured" means. When they did not, the failure mode was a client built
 * from one variable with no other, which throws from inside the library instead
 * of degrading. These tests pin the one definition, and the deliberate split
 * between the two kinds of key.
 */

const URL_VALUE = "https://abcdefgh.supabase.co";
const SECRET_VALUE = "sb_secret_a-real-looking-value";
const PUBLISHABLE_VALUE = "sb_publishable_a-real-looking-value";

describe("supabase configuration", () => {
  it("reads the SUPABASE_ prefixed pair, not the NEXT_PUBLIC_ one", () => {
    /*
     * The Vercel integration sets both. Reading the `NEXT_PUBLIC_` pair would
     * work too, and would quietly put a credential in the client bundle's
     * reach for no reason: nothing in this codebase calls Supabase from a
     * browser. The names are asserted so switching back is a deliberate edit.
     */
    const config = supabaseConfigFromEnv({
      [SUPABASE_URL_ENV]: URL_VALUE,
      [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE,
    });

    expect(config).toEqual({ configured: true, url: URL_VALUE, secretKey: SECRET_VALUE });
    expect(SUPABASE_URL_ENV).toBe("SUPABASE_URL");
    expect(SUPABASE_SECRET_KEY_ENV).toBe("SUPABASE_SECRET_KEY");
    expect(SUPABASE_PUBLISHABLE_KEY_ENV).toBe("SUPABASE_PUBLISHABLE_KEY");
  });

  it("keeps content reads on the publishable key, so RLS still applies", () => {
    /*
     * The important separation. Content reads must not use the secret key,
     * because the secret key bypasses row level security — and the migration
     * grants the anonymous role read access on purpose, so a bad query returns
     * nothing instead of returning a draft.
     *
     * Both keys are named `SUPABASE_` on Vercel and sit side by side in the
     * dashboard, so swapping them compiles cleanly. That is why this is
     * asserted rather than left to review.
     */
    const read = supabaseReadConfigFromEnv({
      [SUPABASE_URL_ENV]: URL_VALUE,
      [SUPABASE_PUBLISHABLE_KEY_ENV]: PUBLISHABLE_VALUE,
      [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE,
    });

    expect(read).toEqual({ configured: true, url: URL_VALUE, publishableKey: PUBLISHABLE_VALUE });
    expect(read).not.toHaveProperty("secretKey");

    expect(
      supabaseReadConfigFromEnv({
        [SUPABASE_URL_ENV]: URL_VALUE,
        [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE,
      }),
    ).toEqual({ configured: false });
  });

  it("does not let a publishable key stand in for the secret one", () => {
    expect(
      supabaseConfigFromEnv({
        [SUPABASE_URL_ENV]: URL_VALUE,
        [SUPABASE_PUBLISHABLE_KEY_ENV]: PUBLISHABLE_VALUE,
      }),
    ).toEqual({ configured: false });
  });

  it("answers the two probes independently, because they are different questions", () => {
    /*
     * A deployment can serve the whole site from the versioned content catalog
     * with no database at all, and a deployment can have owner auth without
     * one. Conflating them makes one of those two look broken.
     */
    const contentOnly = {
      [SUPABASE_URL_ENV]: URL_VALUE,
      [SUPABASE_PUBLISHABLE_KEY_ENV]: PUBLISHABLE_VALUE,
    };
    const authOnly = { [SUPABASE_URL_ENV]: URL_VALUE, [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE };

    expect(isSupabaseContentConfigured(contentOnly)).toBe(true);
    expect(isSupabaseConfigured(contentOnly)).toBe(false);

    expect(isSupabaseConfigured(authOnly)).toBe(true);
    expect(isSupabaseContentConfigured(authOnly)).toBe(false);

    expect(isSupabaseContentConfigured({})).toBe(false);
    expect(isSupabaseConfigured({})).toBe(false);
  });

  it("ignores the NEXT_PUBLIC_ duplicates", () => {
    /*
     * A deployment that only has the public pair is a deployment without a
     * secret key. Treating the publishable key as sufficient would let a
     * client be built with a browser-safe credential and then fail every
     * privileged call at runtime instead of at boot.
     */
    const config = supabaseConfigFromEnv({
      NEXT_PUBLIC_SUPABASE_URL: URL_VALUE,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_VALUE,
    });

    expect(config).toEqual({ configured: false });
    expect(isSupabaseConfigured({ NEXT_PUBLIC_SUPABASE_URL: URL_VALUE })).toBe(false);
  });

  it.each([
    ["both absent", {}],
    ["url only", { [SUPABASE_URL_ENV]: URL_VALUE }],
    ["secret only", { [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE }],
    ["empty url", { [SUPABASE_URL_ENV]: "   ", [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE }],
    ["empty secret", { [SUPABASE_URL_ENV]: URL_VALUE, [SUPABASE_SECRET_KEY_ENV]: "" }],
    ["whitespace secret", { [SUPABASE_URL_ENV]: URL_VALUE, [SUPABASE_SECRET_KEY_ENV]: "  " }],
  ])("reports %s as not configured", (_label, env) => {
    expect(supabaseConfigFromEnv(env)).toEqual({ configured: false });
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("trims surrounding whitespace, which an env file commonly carries", () => {
    const config = supabaseConfigFromEnv({
      [SUPABASE_URL_ENV]: `  ${URL_VALUE}  `,
      [SUPABASE_SECRET_KEY_ENV]: `\t${SECRET_VALUE}\n`,
    });

    expect(config).toEqual({ configured: true, url: URL_VALUE, secretKey: SECRET_VALUE });
  });

  it("throws from the strict accessors only when unconfigured", () => {
    expect(
      requireSupabaseConfig({ [SUPABASE_URL_ENV]: URL_VALUE, [SUPABASE_SECRET_KEY_ENV]: SECRET_VALUE }),
    ).toEqual({ url: URL_VALUE, secretKey: SECRET_VALUE });

    expect(
      requireSupabaseReadConfig({
        [SUPABASE_URL_ENV]: URL_VALUE,
        [SUPABASE_PUBLISHABLE_KEY_ENV]: PUBLISHABLE_VALUE,
      }),
    ).toEqual({ url: URL_VALUE, publishableKey: PUBLISHABLE_VALUE });

    expect(() => requireSupabaseConfig({})).toThrow(/SUPABASE_URL/);
    expect(() => requireSupabaseConfig({})).toThrow(/SUPABASE_SECRET_KEY/);
    expect(() => requireSupabaseReadConfig({})).toThrow(/SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe("supabase redirect origin", () => {
  it("prefers the configured application URL", () => {
    expect(getSiteOrigin(undefined, { NEXT_PUBLIC_APP_URL: "https://marcelinosandroni.com" })).toBe(
      "https://marcelinosandroni.com",
    );
  });

  it("strips a trailing slash so the redirect path does not double up", () => {
    expect(getSiteOrigin(undefined, { NEXT_PUBLIC_APP_URL: "https://example.test///" })).toBe(
      "https://example.test",
    );
  });

  it("falls back to the request origin, so preview deployments work", () => {
    /*
     * Hardcoding the apex would break every preview build, and preview builds
     * are where a broken redirect gets noticed first — after it has already
     * failed.
     */
    const request = new Request("https://preview-abc.vercel.app/api/auth/magic-link");

    expect(getSiteOrigin(request, {})).toBe("https://preview-abc.vercel.app");
  });

  it("ignores an empty configured value rather than returning an empty origin", () => {
    const request = new Request("https://fallback.test/api/auth/magic-link");

    expect(getSiteOrigin(request, { NEXT_PUBLIC_APP_URL: "  " })).toBe("https://fallback.test");
  });

  it("never returns a value with a trailing slash", () => {
    const origins = [
      getSiteOrigin(undefined, { NEXT_PUBLIC_APP_URL: "https://a.test/" }),
      getSiteOrigin(new Request("https://b.test/x"), {}),
      getSiteOrigin(undefined, {}),
    ];

    for (const origin of origins) {
      expect(origin.endsWith("/")).toBe(false);
    }
  });
});
