import { describe, expect, it } from "vitest";

import {
  SUPABASE_PUBLISHABLE_KEY_ENV,
  SUPABASE_REST_URL_ENV,
  SUPABASE_URL_ENV,
  supabaseRestBase,
  supabaseReadConfigFromEnv,
} from "@/infrastructure/supabase/server";

/**
 * Which URL a PostgREST read uses.
 *
 * ## Why these tests exist at all
 *
 * Because the two deployments were each configured correctly for the reader
 * they exercised and silently wrong for the other, and nothing reported either
 * state:
 *
 * - **hosted**, `SUPABASE_URL=https://x.supabase.co` — `supabase-js` derived
 *   `/rest/v1`, `/auth/v1`, `/realtime/v1` correctly, so the blog and the admin
 *   worked. A direct `fetch` to `<url>/<table>` 404s, so the résumé served the
 *   versioned catalog and the page looked perfect.
 * - **local**, `SUPABASE_URL=http://127.0.0.1:54330` — PostgREST is published at
 *   the **root** of that port, so a direct `fetch` worked. `supabase-js` appended
 *   `/rest/v1` and 404s, so the blog and the status panel reported unreachable.
 *
 * Same code, same variable name, opposite outcomes, and no error anywhere. The
 * whole point of the derivation is that this decision now lives in one function
 * that can be pinned by a test — so the assertions below are deliberately
 * exhaustive about shapes rather than examples, because an untested URL rule is
 * just the old bug with better comments.
 */
describe("the PostgREST base", () => {
  it("appends /rest/v1 to a hosted project URL", () => {
    expect(supabaseRestBase("https://abcdefgh.supabase.co")).toBe(
      "https://abcdefgh.supabase.co/rest/v1",
    );
  });

  it("leaves the local stack at its root, where PostgREST is published", () => {
    expect(supabaseRestBase("http://127.0.0.1:54330")).toBe("http://127.0.0.1:54330");
    expect(supabaseRestBase("http://localhost:54330")).toBe("http://localhost:54330");
  });

  it("does not double the path on a URL that already carries it", () => {
    /*
      The failure this prevents is `https://x.supabase.co/rest/rest/v1`, which is
      what both a hand-edited variable and an unnormalised append produce. It is
      a 404 like any other, so without this test the deployment would look
      exactly as healthy as the ones that are not.
    */
    expect(supabaseRestBase("https://abcdefgh.supabase.co/rest/v1")).toBe(
      "https://abcdefgh.supabase.co/rest/v1",
    );
  });

  it("tolerates a trailing slash, which env files acquire by hand", () => {
    expect(supabaseRestBase("https://abcdefgh.supabase.co/")).toBe(
      "https://abcdefgh.supabase.co/rest/v1",
    );
    expect(supabaseRestBase("https://abcdefgh.supabase.co/rest/v1/")).toBe(
      "https://abcdefgh.supabase.co/rest/v1",
    );
    expect(supabaseRestBase("http://127.0.0.1:54330/")).toBe("http://127.0.0.1:54330");
  });

  it("assumes a hosted project for https on a port other than 443", () => {
    /*
      A loopback host over http is the local stack. Anything else is treated as a
      hosted project, because a self-hosted Supabase genuinely does mount
      PostgREST at `/rest/v1` and guessing the other way would break it.
    */
    expect(supabaseRestBase("https://db.internal.example")).toBe(
      "https://db.internal.example/rest/v1",
    );
  });
});

describe("the read configuration's REST base", () => {
  const base = {
    [SUPABASE_URL_ENV]: "https://abcdefgh.supabase.co",
    [SUPABASE_PUBLISHABLE_KEY_ENV]: "sb_publishable_value",
  };

  it("derives the REST base from the project URL", () => {
    const config = supabaseReadConfigFromEnv(base);

    expect(config.configured).toBe(true);
    expect(config.configured && config.restUrl).toBe("https://abcdefgh.supabase.co/rest/v1");
    // The project base stays untouched, because auth and realtime still need it.
    expect(config.configured && config.url).toBe("https://abcdefgh.supabase.co");
  });

  it("lets an explicit override win, for a deployment the rule cannot describe", () => {
    const config = supabaseReadConfigFromEnv({
      ...base,
      [SUPABASE_REST_URL_ENV]: "https://proxy.example/api/postgrest",
    });

    expect(config.configured && config.restUrl).toBe("https://proxy.example/api/postgrest");
    // The override answers only for PostgREST. Reusing it as the project base
    // would send auth to the proxy too.
    expect(config.configured && config.url).toBe("https://abcdefgh.supabase.co");
  });

  it("uses an override verbatim, because that is what an override is for", () => {
    /*
      Not run through the derivation. Appending `/rest/v1` to an explicit answer
      would make the variable useless for the deployment it exists to serve — one
      that mounts PostgREST somewhere the rule cannot guess — and would fail as a
      silent 404 rather than as an error.
    */
    const config = supabaseReadConfigFromEnv({
      ...base,
      [SUPABASE_REST_URL_ENV]: "https://proxy.example/rest/v1",
    });

    expect(config.configured && config.restUrl).toBe("https://proxy.example/rest/v1");
  });

  it("reports absent configuration without inventing a base", () => {
    const config = supabaseReadConfigFromEnv({
      [SUPABASE_URL_ENV]: "https://abcdefgh.supabase.co",
    });

    expect(config).toEqual({ configured: false });
  });
});