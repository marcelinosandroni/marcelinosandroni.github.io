import { expect, test } from "@playwright/test";

/**
 * The `T` shortcut and the header control that advertises it.
 *
 * The guards are the point of this file. A global `T` listener that repaints the
 * page when someone is typing is the failure mode that makes shortcuts get
 * removed, and this site has a real text field to break: the terminal copilot.
 */
test.describe("Theme shortcut", () => {
  test("cycles all three themes with T and wraps", async ({ page }) => {
    await page.goto("/en-us");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "carbon");

    await page.keyboard.press("t");
    await expect(html).toHaveAttribute("data-theme", "paper");

    await page.keyboard.press("T");
    await expect(html).toHaveAttribute("data-theme", "matrix");

    await page.keyboard.press("t");
    await expect(html).toHaveAttribute("data-theme", "carbon");
  });

  test("does not fire while typing in the terminal", async ({ page }) => {
    await page.goto("/en-us");

    await page.getByRole("button", { name: /open the resume terminal/i }).click();

    const prompt = page.getByRole("textbox");
    await expect(prompt).toBeVisible();

    // A question about technologies, typed one character at a time.
    await prompt.click();
    await prompt.pressSequentially("What is your TypeScript experience?");

    // The `T` in "TypeScript" must not have advanced the theme.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "carbon");
    await expect(prompt).toHaveValue("What is your TypeScript experience?");
  });

  test("leaves browser-reserved combinations alone", async ({ page }) => {
    await page.goto("/en-us");

    await page.keyboard.press("Control+t");
    await page.keyboard.press("Alt+t");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "carbon");
  });

  test("shows the shortcut in the header, with a dark/light glyph", async ({ page }) => {
    await page.goto("/en-us");

    const control = page.getByRole("button", { name: /change theme/i });
    await expect(control).toBeVisible();

    // The `kbd` is rendered, not hidden in a tooltip, so it is discoverable.
    await expect(control.locator("kbd")).toHaveText("T");

    // Hollow on the light theme, filled on the dark one.
    await expect(control.locator("span").first()).toHaveText("●");
    await page.keyboard.press("t");
    await expect(control.locator("span").first()).toHaveText("○");
  });

  test("the header button advances the theme the same way T does", async ({ page }) => {
    await page.goto("/en-us");

    const control = page.getByRole("button", { name: /change theme/i });
    await control.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");

    await control.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "matrix");
  });

  test("keeps the browser chrome in step with the theme", async ({ page }) => {
    await page.goto("/en-us");

    const before = await page.locator('meta[name="theme-color"]').getAttribute("content");

    await page.keyboard.press("t");
    await page.keyboard.press("t"); // matrix

    // `themeColorFor` returns hex, and the matrix surface is pure black. A stale
    // address-bar colour after a keyboard switch reads as a rendering bug.
    const after = await page.locator('meta[name="theme-color"]').getAttribute("content");
    expect(after?.toLowerCase()).toBe("#000000");
    expect(after).not.toBe(before);
  });

  test("the full picker is still reachable from the header", async ({ page }) => {
    await page.goto("/en-us");

    // A specific theme in one tap, rather than cycling to it.
    await page.locator('[data-theme-option="matrix"]').first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "matrix");
  });

  test("survives a corrupt stored preference", async ({ page }) => {
    await page.goto("/en-us");

    await page.evaluate(() => window.localStorage.setItem("msd:theme:v1", "not-a-theme"));
    await page.reload();

    // Normalised to the default, and the shortcut still moves.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "carbon");
    await page.keyboard.press("t");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
  });
});
