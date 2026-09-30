import { expect, test } from "@playwright/test";

/**
 * The boot rain on opening the terminal.
 *
 * Asserted on the property that matters and is checkable: it is gone shortly after
 * opening, so it cannot become something permanently drawn over the prompt.
 * Asserting that glyphs are visibly falling would be a screenshot comparison,
 * which is not a test.
 */
test.describe("Terminal boot rain", () => {
  test("plays on open and then removes itself", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();

    // Present immediately: the effect is part of opening, not a later flourish.
    await expect(page.locator(".msd-boot-rain")).toBeAttached();

    // And gone well before anyone could call it stuck.
    await expect(page.locator(".msd-boot-rain")).toHaveCount(0, { timeout: 4_000 });
  });

  test("never blocks the prompt while it plays", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();

    // The dialog is interactive during the animation, which is the whole reason
    // the rain is drawn on top rather than the dialog waiting for it.
    const prompt = page.getByRole("textbox");
    await expect(prompt).toBeVisible();
    await prompt.click();
    await expect(prompt).toBeFocused();
  });

  test("is hidden from assistive technology and from pointer events", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();

    const rain = page.locator(".msd-boot-rain");
    await expect(rain).toHaveAttribute("aria-hidden", "true");

    const pointerEvents = await rain.evaluate((element) => getComputedStyle(element).pointerEvents);
    expect(pointerEvents).toBe("none");
  });

  test("is not drawn at all with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();

    // The dialog appears immediately, with no rain to sit through.
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".msd-boot-rain")).toHaveCount(0);
  });

  test("does replay on each opening of the terminal", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();
    await expect(page.locator(".msd-boot-rain")).toHaveCount(0, { timeout: 4_000 });

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Reopening replays it, because the boot is per session with the terminal.
    await page.getByRole("button", { name: /open the resume terminal/i }).click();
    await expect(page.locator(".msd-boot-rain")).toBeAttached();
  });
});
