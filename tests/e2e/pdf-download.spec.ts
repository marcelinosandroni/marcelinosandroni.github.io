import { test, expect } from "@playwright/test";

test.describe("PDF Download", () => {
  test("should download PDF when clicking download button", async ({ page }) => {
    await page.goto("/");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    expect(downloadButton).toBeDefined();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
    expect(download.suggestedFilename()).toContain("resume-marcelino-sandroni");
  });

  test("should display loading state during PDF generation", async ({ page }) => {
    await page.goto("/");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });

    downloadButton.click();

    const busyButton = page.getByRole("button", { name: /gerando/i });
    await expect(busyButton).toBeVisible({ timeout: 1000 });
  });

  test("should have accessible download button", async ({ page }) => {
    await page.goto("/");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    expect(downloadButton).toBeDefined();

    await expect(downloadButton).toBeEnabled();
    await expect(downloadButton).toBeVisible();
  });
});
