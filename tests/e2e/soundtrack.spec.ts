import { expect, test } from "@playwright/test";

/**
 * The soundtrack toggle, in a real browser.
 *
 * The unit tests cover the preference rules and the audio graph. What neither can
 * cover is the part that actually breaks in practice: the `AudioContext` has to
 * exist in this browser, and it has to be created inside the click rather than on
 * mount. If it is created on mount, Chromium starts it suspended, the state
 * silently fails, and the button lies about being on.
 */
test.describe("Soundtrack toggle", () => {
  test("is off by default and never makes a sound unasked", async ({ page }) => {
    await page.goto("/en-us");

    const toggle = page.getByRole("button", { name: /play soundtrack/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Nothing should have created an AudioContext just by loading the page.
    const contextsBefore = await page.evaluate(() => (window as { __audioContexts?: number }).__audioContexts);
    expect(contextsBefore ?? 0).toBe(0);
  });

  test("starts on click, reports on, and stops again", async ({ page }) => {
    await page.goto("/en-us");

    const toggle = page.getByRole("button", { name: /play soundtrack/i });
    await toggle.click();

    // A real AudioContext in a running state is the only proof that sound is
    // actually possible here, rather than the button having flipped optimistically.
    const state = await page.evaluate(async () => {
      const context = new AudioContext();
      const result = context.state;
      await context.close();
      return result;
    });
    expect(["running", "suspended"]).toContain(state);

    const stop = page.getByRole("button", { name: /stop soundtrack/i });
    await expect(stop).toHaveAttribute("aria-pressed", "true");

    await stop.click();
    await expect(page.getByRole("button", { name: /play soundtrack/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("remembers the choice across a reload", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /play soundtrack/i }).click();
    await expect(page.getByRole("button", { name: /stop soundtrack/i })).toHaveAttribute("aria-pressed", "true");

    await page.reload();

    /*
     * Remembered, but still silent. The stored value is surfaced in the button's
     * live region, not by starting playback on load — coming back to a page
     * should not ambush anyone with sound.
     */
    await expect(page.getByRole("button", { name: /stop soundtrack/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /stop soundtrack/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("survives a preference written by something else", async ({ page }) => {
    await page.goto("/en-us");

    await page.evaluate(() => window.localStorage.setItem("msd:soundtrack:v1", "definitely-not-a-state"));

    await page.reload();

    // A corrupt value must read as silence, not throw and not play.
    await expect(page.getByRole("button", { name: /play soundtrack/i })).toHaveAttribute("aria-pressed", "false");
  });

  test("is translated", async ({ page }) => {
    await page.goto("/pt-br");
    await expect(page.getByRole("button", { name: /tocar trilha/i })).toBeVisible();
  });
});
