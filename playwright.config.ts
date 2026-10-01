import { defineConfig, devices } from "@playwright/test";

/**
 * The port the suite runs against.
 *
 * Configurable because a hardcoded port fails in a way that looks like an
 * application bug. Something else on the machine — a Docker backend, a dev
 * server from another checkout — can hold 3001, and `reuseExistingServer` below
 * will happily reuse it, so Playwright navigates a stranger's server for the
 * whole run. That produced 95 failures against 20 passes in 34 minutes, all of
 * them timeouts and "element not found", with the build green the entire time.
 */
const port = process.env.E2E_PORT ?? "3001";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  /**
   * The default-flag suite runs against a *different build*, so it must not be
   * collected here.
   *
   * Leaving it in produced the most confusing possible failure: this run builds
   * with both flags on, so the spec's six "nothing is published" assertions ran
   * against a page that had everything published, and six tests failed for the
   * one reason that was never the code's fault. `npm run test:e2e:default-flags`
   * is where that file belongs.
   */
  testIgnore: /feature-flags-off\.spec\.ts/,
  /**
   * Serialised on purpose.
   *
   * The suite runs against `next dev`, which compiles a route on first request
   * and holds its caches in `.next`. Parallel workers make the dev server
   * recompile the same routes concurrently and intermittently corrupt that cache
   * (`SyntaxError: Unexpected non-whitespace character after JSON`), which
   * produces failures that have nothing to do with the code under test. One
   * worker with a warm dev server runs the whole suite faster than a flapping
   * parallel one.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  /**
   * `next dev` compiles a route on first request, so the default 30s is tight for
   * the first navigation to each new route in a cold run.
   */
  timeout: 45_000,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /**
   * Runs against the production build, not `next dev`.
   *
   * This is a fix, not a preference. `next dev` compiles with Turbopack, whose
   * `next/font/google` transform emits CSS referencing
   * `@vercel/turbopack-next/internal/font/google/font` — a module that does not
   * exist in the published `next` package. Every route importing a Google font
   * then fails to compile, and the e2e job dies on the first page load.
   *
   * It was invisible locally because the dev server was usually already running
   * and `reuseExistingServer` skipped starting a second one. The `verify` job
   * always passed, because `next build` does not use that transform — so the
   * failure only ever appeared in the one job that ran on a clean machine.
   *
   * Testing the built output is also the more honest suite: it is the artefact
   * that gets deployed, it starts in seconds rather than compiling a route per
   * test, and the 30s `webServer` timeout below stops being tight.
   */
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    /**
     * Only in local runs, and only because a warm server saves a rebuild. CI
     * always starts its own, so a collision there fails loudly on the port bind
     * instead of silently testing a stranger's process.
     */
    reuseExistingServer: !process.env.CI,
    /**
     * Supabase is deliberately left unconfigured for the e2e run.
     *
     * The composition root then serves the versioned article catalog directly,
     * with no network call at all. That makes the suite deterministic and fast,
     * and it exercises exactly the degraded path a credential-less build takes —
     * which is the path most likely to break silently. A project that *does* have
     * credentials can run the same suite by exporting the variables, and
     * `FallbackArticleRepository` will prefer the database.
     *
     * The server-side names have to be cleared explicitly. `next start` loads
     * `.env`, and `isSupabaseConfigured()` reads `SUPABASE_URL` and
     * `SUPABASE_SECRET_KEY` — not the `NEXT_PUBLIC_` pair this list used to clear.
     * So on a machine with a real `.env` the auth route saw a configured
     * deployment, answered 200, and two tests asserting the 503 unconfigured
     * contract failed for reasons that had nothing to do with the code under test.
     */
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      ADMIN_EMAIL: "",

      /*
       * Both feature flags are ON here, and that is the opposite of the shipped
       * default on purpose.
       *
       * `NEXT_PUBLIC_FEATURE_WHATSAPP` and `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD` are off unless set, so a
       * server started with no configuration hides every `wa.me` link and answers
       * 404 on the PDF route. That is the behaviour production runs in.
       *
       * This suite deliberately runs the other configuration. It is the only place
       * the *enabled* paths get real coverage, and the PDF one cannot be faked: it
       * clicks a button and expects a compiled file with the right name. Running
       * the suite against the default would delete the only test proving the
       * download works at all, in exchange for asserting an absence that the unit
       * tests already assert directly.
       *
       * So: enabled paths here, disabled paths in `tests/unit/` — where the
       * environment is a parameter rather than a process, which is the only reason
       * that half is testable at all.
       */
      NEXT_PUBLIC_FEATURE_WHATSAPP: "on",
      NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD: "on",
    },
  },
});
