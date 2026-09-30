import { expect, test, type Page } from "@playwright/test";

/**
 * The copilot is a terminal, so it has to behave like one: it opens over the
 * page, it takes the keyboard, and every way a user with terminal muscle
 * memory tries to leave has to work.
 */
const OPEN = /open the resume terminal/i;

/**
 * The boot overlay is an intro shown once per visitor and it covers the page
 * while it runs. These tests are about the terminal, not the intro, so the flag
 * is set before the first paint and the overlay never appears.
 */
async function openHome(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("msd:boot-seen:v1", "1");
    } catch {
      /* private mode */
    }
  });
  await page.goto("/en-us");
  await page.getByRole("button", { name: OPEN }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("Copilot terminal", () => {
  test("is closed until it is asked for", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("msd:boot-seen:v1", "1");
      } catch {
        /* private mode */
      }
    });
    await page.goto("/en-us");

    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: OPEN }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("stays on screen until the user closes it", async ({ page }) => {
    await openHome(page);

    // Scrolling and clicking inside must not dismiss it. A terminal is modal.
    await page.mouse.wheel(0, 600);
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /close the terminal/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("closes on Escape", async ({ page }) => {
    await openHome(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("closes on a click outside the panel", async ({ page }) => {
    await openHome(page);

    // The overlay, not the panel: the first click must not land on the panel.
    await page.mouse.click(4, 4);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  /**
   * The three chords a keyboard user reaches for to interrupt a process. If any
   * of them did nothing, the only way out would be reaching for the mouse.
   */
  for (const chord of ["Control+c", "Control+d", "Control+z"]) {
    test(`closes on ${chord}`, async ({ page }) => {
      await openHome(page);
      await page.keyboard.press(chord);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });
  }

  test("closes when the user types exit", async ({ page }) => {
    await openHome(page);

    const input = page.getByRole("textbox");
    await input.fill("exit");
    await input.press("Enter");

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the exit hint names every way out", async ({ page }) => {
    await openHome(page);

    const hint = page.getByText(/exit, Esc, or Ctrl\+C to close/i);
    await expect(hint).toBeVisible();
  });

  test("takes the focus on open and holds it while open", async ({ page }) => {
    await openHome(page);

    await expect(page.getByRole("textbox")).toBeFocused();

    await page.keyboard.type("ClickHouse");
    await expect(page.getByRole("textbox")).toHaveValue("ClickHouse");
  });

  test("locks the page behind the panel", async ({ page }) => {
    await openHome(page);

    const locked = await page.evaluate(() => document.body.style.overflow);
    expect(locked).toBe("hidden");

    await page.keyboard.press("Escape");
    const restored = await page.evaluate(() => document.body.style.overflow);
    expect(restored).not.toBe("hidden");
  });

  test("offers the example questions before anything is asked", async ({ page }) => {
    await openHome(page);

    await expect(page.getByRole("button", { name: /Tell me about ClickHouse/i })).toBeVisible();
  });

  test("shows the question it was asked, above the answer", async ({ page }) => {
    await openHome(page);

    await page.getByRole("button", { name: /Tell me about ClickHouse/i }).click();

    // Echoed, prefixed as a terminal line, so the transcript reads in order.
    const log = page.getByRole("log");
    await expect(log).toContainText("> Tell me about ClickHouse");
  });
});
