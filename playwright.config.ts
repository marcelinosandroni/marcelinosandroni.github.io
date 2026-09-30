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
     */
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
