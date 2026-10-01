import { defineConfig, devices } from "@playwright/test";

/**
 * The e2e suite for the *default* feature-flag configuration.
 *
 * A separate config file, and a separate build, for a reason that is easy to miss.
 * The pages in this project are prerendered: `next build` renders `/pt-br/` and
 * `/pt-br/resume` to HTML, so a feature flag is evaluated **on the build machine**.
 * The main suite (`playwright.config.ts`) therefore builds with both flags on, and
 * nothing running against that artefact can prove the absence case — the HTML
 * already contains the links.
 *
 * So the default is tested against its own build, produced by leaving the two
 * variables unset. `ci.yml` runs this as a second step in the same job, after the
 * main suite, because both cannot share one `.next`.
 *
 * Deliberately not parameterised out of the main config: the difference between
 * the two runs is the whole point, and making it a flag on one file is how the two
 * configurations silently become the same one.
 */
const port = process.env.E2E_PORT ?? "3101";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /feature-flags-off\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    /*
     * Not `reuseExistingServer: !CI`, unlike the main config. A developer's warm
     * server is almost always one started from an earlier *flagged* build, and
     * reusing it would turn every assertion about the default into an assertion
     * about the enabled configuration — passing for the wrong reason, which is the
     * specific failure this second build exists to rule out.
     */
    reuseExistingServer: false,
    env: {
      // Empty, not "off". The point is to exercise the unset case, which is what a
      // fresh checkout with no `.env` actually produces.
      NEXT_PUBLIC_FEATURE_WHATSAPP: "",
      NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      ADMIN_EMAIL: "",
    },
  },
});