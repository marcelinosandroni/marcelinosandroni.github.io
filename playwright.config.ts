import { defineConfig, devices } from "@playwright/test";

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
    baseURL: "http://127.0.0.1:3001",
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

  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3001",
    url: "http://127.0.0.1:3001",
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
