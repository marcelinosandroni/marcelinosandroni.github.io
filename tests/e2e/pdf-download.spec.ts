import { test, expect } from "@playwright/test";

test.describe("Bilingual Resume & PDF Download", () => {
  test("should render Portuguese resume by default and download PT-BR PDF", async ({ page }) => {
    await page.goto("/");

    // Verify PT-BR content
    await expect(page.locator("h1")).toContainText("Marcelino Sandroni Dias");
    await expect(page.locator(".hero-title")).toContainText("Engenheiro de Software Sênior");
    await expect(page.locator("#experiencia h2")).toContainText("Experiência");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
    expect(download.suggestedFilename()).toContain("resume-marcelino-sandroni-pt-BR");
  });

  test("should switch locale to English and download EN-US PDF", async ({ page }) => {
    await page.goto("/");

    // Click locale switch button to EN
    const switchButton = page.getByRole("button", { name: /alternar idioma para inglês/i });
    await expect(switchButton).toBeVisible();
    await switchButton.click();

    // Verify EN-US content
    await expect(page.locator(".hero-title")).toContainText("Senior Software Engineer");
    await expect(page.locator("#experiencia h2")).toContainText("Experience");

    const downloadButton = page.getByRole("button", { name: /download pdf/i });
    await expect(downloadButton).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
    expect(download.suggestedFilename()).toContain("resume-marcelino-sandroni-en-US");
  });

  test("should display loading state during PDF generation", async ({ page }) => {
    await page.goto("/");

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    downloadButton.click();

    const busyButton = page.getByRole("button", { name: /gerando/i });
    await expect(busyButton).toBeVisible({ timeout: 1000 });
  });

  test("should have accessible navigation and buttons", async ({ page }) => {
    await page.goto("/");

    const brand = page.getByLabel(/voltar ao início/i);
    await expect(brand).toBeVisible();

    const downloadButton = page.getByRole("button", { name: /baixar pdf/i });
    await expect(downloadButton).toBeEnabled();
    await expect(downloadButton).toBeVisible();
  });
});
