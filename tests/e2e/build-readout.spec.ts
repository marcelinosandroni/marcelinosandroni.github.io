import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";


import { buildLabel } from "../../src/components/telemetry/telemetry-bar";
import { version } from "../../package.json";

/**
 * The build readout at the right of the load-metrics bar.
 *
 * Asserted against rendered output rather than against `resolveBuildInfo`, which the
 * unit tests own. What only a browser can answer is whether the three resolved facts
 * reach the page at all, whether the readout stays on the right when the bar wraps,
 * and whether it is absent from the one route that deliberately has no bar.
 *
 * Local runs are `local`, and that is the only environment the suite can produce —
 * `VERCEL_ENV` is not settable per test. So the interesting assertion here is not
 * "it says production"; it is that the component reads the environment off the prop
 * it was given rather than off anything of its own.
 */
/*
 * The bar itself, addressed through the readout's parent rather than by tag.
 *
 * `page.locator("aside")` is the obvious way to reach it and it timed out: the
 * element is there, but `aside` also matches the engagement panel in the footer and
 * the analytics strip, and `.first()` on a locator that resolves to several elements
 * picks the one furthest up the document — which on the home page is not the bar. The
 * readout's own `parentElement` is unambiguous by construction, and it cannot drift
 * away from the element under test.
 */
function barLocator(page: Page): Locator {
  return page.getByTestId("build-readout").locator("xpath=..");
}
/**
 * Pixels between the readout's right edge and its container's content edge.
 *
 * The content edge rather than the bar's outer edge, because the outer edge is 48px
 * further left than where anything can actually be placed — that is what
 * `px-margin` is. Comparing against it and then widening the allowance until the test
 * went green would have measured the padding and called it a layout margin.
 */
function rightEdgeGap(page: Page): Promise<number> {
  return page.getByTestId("build-readout").evaluate((node) => {
    const parent = node.parentElement;

    if (parent === null) {
      return Number.NaN;
    }

    const readout = node.getBoundingClientRect();
    const container = parent.getBoundingClientRect();
    const padding = Number.parseFloat(getComputedStyle(parent).paddingRight);

    return container.right - padding - (readout.right);
  });
}
test.describe("Build readout", () => {
  test("shows the release from package.json, with the environment on a non-production build", async ({
    page,
  }) => {
    await page.goto("/en-us");

    const readout = page.getByTestId("build-readout");
    await expect(readout).toBeVisible();
    await expect(readout).toContainText(`v${version}`);

    // No Vercel variables in a local run, so it must say so rather than staying blank.
    await expect(readout).toContainText("local");

    /*
      Asserted against the attribute rather than against the text, because the whole
      rule is "production omits the environment" — a substring check would still pass
      if the word appeared somewhere else in the label, and would pass on a component
      that had ignored the environment entirely and hard-coded `local`.
     */
    await expect(readout).toHaveAttribute("data-environment", "local");
  });

  /*
  * The production shape, asserted here rather than only in the unit tests.
  *
  * The unit tests call `buildLabel` directly, which is the right place for the rule.
  * This one exists to prove the *component* uses that function for its text — a
  * component that rendered its own hard-coded label would pass every unit test in the
  * repo and print the wrong thing in production. So it checks the rendered string of
  * the real local build against the same rule applied to a production `BuildInfo`,
  * which is the only way a local run can observe the branch it cannot reach.
  */
test("would print one word less in production, and never two words more", async ({ page }) => {
    await page.goto("/en-us");

    const readout = page.getByTestId("build-readout");
    await expect(readout).toBeVisible();

    const local = (await readout.textContent()) ?? "";

    /*
      `buildLabel` is exported from the client component precisely so this comparison
      can be made against the same code the page runs. The alternative — asserting the
      shape with a regex and trusting that the component's formatting happens to match
      — would go stale silently the first time someone added a separator.
     */
    const stamp = await readout.getAttribute("data-stamp");

    const asProduction = buildLabel({
      environment: "production",
      release: version,
      stamp: stamp ?? null,
      deploymentId: null,
    });
    const asLocal = buildLabel({
      environment: "local",
      release: version,
      stamp: stamp ?? null,
      deploymentId: null,
    });

    expect(local).toBe(asLocal);
    expect(asProduction).not.toContain("production");
    expect(asProduction).not.toContain("local");
    expect(asProduction.startsWith("v")).toBe(true);
    expect(asProduction).toContain(`v${version}`);

    // One word, exactly: the whole point of the rule.
    expect(asLocal.split(" ").length - asProduction.split(" ").length).toBe(1);
  });

  test("carries the build stamp, and the deployment id only when there is one", async ({ page }) => {
    await page.goto("/en-us");

    const readout = page.getByTestId("build-readout");
    const stamp = await readout.getAttribute("data-stamp");

    /*
      A local build does get a stamp — `next.config.ts` computes one for every build,
      laptop included — and it has to be the `YYYYMMDD-HHMMZ` shape. Asserting the
      shape rather than the value: the value changes every build, so asserting it
      would make this test wrong by construction within a day.
     */
    expect(stamp, "no build stamp in the readout").toMatch(/^\d{8}-\d{4}Z$/);

    // Off Vercel there is no deployment id, so the tooltip is the caption alone.
    const title = await readout.getAttribute("title");

    expect(title).not.toContain("dpl_");
  });

  test("sits on the right of the bar, and stays on the right when the bar wraps", async ({ page }) => {
    /*
      Both widths in one test, because the two layouts fail for different reasons. At
      1440 the three metrics and the readout share a line and `ml-auto` has to beat
      the gap between them; at 390 the metrics wrap onto their own line and the readout
      has to end at the *end* of the last one. `justify-between` on the container would
      pass the first and fail the second.

      Measured against the container's *content* edge rather than its border box, and
      that correction is not a tolerance that grew until it passed. The first version
      compared the readout against the bar's outer edge with a 48px allowance, and the
      measurement came back at exactly 48 — because `px-margin`/`lg:px-margin-desktop`
      *is* 48px, so the readout was flush with the content edge and perfectly aligned.
      The test was measuring the padding and calling it a margin.
     */
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/en-us");

    const readout = page.getByTestId("build-readout");
    await expect(readout).toBeVisible();

    expect(await rightEdgeGap(page)).toBeLessThanOrEqual(2);

    // Clear of the metrics to its left, so the two never touch.
    const ttfb = await barLocator(page).getByText("TTFB").first().boundingBox();
    const wide = await readout.boundingBox();

    if (ttfb !== null && wide !== null) {
      expect(ttfb.x + ttfb.width, "the readout overlaps the last measurement").toBeLessThan(wide.x);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);

    expect(await rightEdgeGap(page)).toBeLessThanOrEqual(2);

    /*
      And never pushed past the content edge, which is what a longer stamp would do —
      `whitespace-nowrap` stops the text wrapping but nothing stops it overflowing, and
      the stamp is the only part of this readout whose length varies.
     */
    const narrow = await readout.boundingBox();
    const inner = await readout.evaluate((node) => {
      const parent = node.parentElement;

      if (parent === null) {
        throw new Error("the readout is not in a container");
      }

      const box = parent.getBoundingClientRect();
      const padding = Number.parseFloat(getComputedStyle(parent).paddingRight);

      return { contentRight: box.right - padding, boxRight: box.right };
    });

    if (narrow === null) {
      throw new Error("the readout lost its box at 390px");
    }

    expect(narrow.x + narrow.width).toBeLessThanOrEqual(inner.contentRight + 1);
    expect(narrow.x + narrow.width).toBeLessThanOrEqual(inner.boxRight);
  });

  test("does not appear on the admin layout, which has no telemetry bar at all", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForTimeout(800);

    // The decision is documented in `admin/layout.tsx`; this is the assertion on it.
    await expect(page.getByTestId("build-readout")).toHaveCount(0);
  });

  test("appears on the résumé too, because the bar is in the locale layout", async ({ page }) => {
    await page.goto("/en-us/resume");

    const readout = page.getByTestId("build-readout");
    await expect(readout).toBeVisible();
    await expect(readout).toContainText(`v${version}`);
  });
});


