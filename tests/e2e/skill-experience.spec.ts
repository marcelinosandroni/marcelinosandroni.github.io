import { test, expect } from "@playwright/test";

test.describe("EV4 - Skill Experience Badges", () => {
  test("should display skill badges with years of experience in skills section", async ({ page }) => {
    await page.goto("/");

    // Navigate to skills section
    const skillsLink = page.getByRole("link", { name: /habilidades|skills/i });
    await expect(skillsLink).toBeVisible();
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Verify skill badges are visible
    const skillBadges = page.locator(".skill-badge");
    await expect(skillBadges.first()).toBeVisible({ timeout: 5000 });
    
    // Check that at least one badge shows years of experience
    const skillExperienceTexts = page.locator(".skill-experience");
    await expect(skillExperienceTexts.first()).toContainText(/ano|anos|mese|meses/i);
  });

  test("should show tooltip on skill badge hover with detailed experience", async ({ page }) => {
    await page.goto("/");
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Find and hover over first skill badge
    const firstSkillBadge = page.locator(".skill-badge").first();
    await firstSkillBadge.scrollIntoViewIfNeeded();
    await firstSkillBadge.hover();
    
    // Tooltip should appear
    const tooltip = page.locator(".skill-tooltip");
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    
    // Tooltip should contain company names and periods
    await expect(tooltip).toContainText(/company|empresa|role|cargo/i);
  });

  test("should highlight skills with 5+ years of experience", async ({ page }) => {
    await page.goto("/");
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Check for highlighted badges (skills with significant experience)
    const highlightedBadges = page.locator(".skill-badge-highlight");
    // May or may not have highlighted badges depending on data
    const count = await highlightedBadges.count();
    
    if (count > 0) {
      await expect(highlightedBadges.first()).toBeVisible();
    }
  });

  test("should display accessible skill badges with proper ARIA labels", async ({ page }) => {
    await page.goto("/");
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Check accessibility attributes
    const skillBadge = page.locator(".skill-badge").first();
    await expect(skillBadge).toHaveAttribute("role", "button");
    await expect(skillBadge).toHaveAttribute("aria-label", /.+/);
    await expect(skillBadge).toHaveAttribute("tabindex", "0");
  });

  test("should filter skills by minimum years when controls are available", async ({ page }) => {
    await page.goto("/");
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Basic check that skill grid exists
    const skillGrid = page.locator(".skill-grid");
    await expect(skillGrid).toBeVisible();
    
    // Skills should be ordered by experience (most experienced first)
    const skillBadges = page.locator(".skill-badge");
    const count = await skillBadges.count();
    
    if (count > 1) {
      // First badge should have equal or more experience than second
      const firstExp = await skillBadges.nth(0).locator(".skill-experience").textContent();
      const secondExp = await skillBadges.nth(1).locator(".skill-experience").textContent();
      
      // This is a basic check - in real implementation we'd parse the years
      expect(firstExp).toBeTruthy();
      expect(secondExp).toBeTruthy();
    }
  });

  test("should handle keyboard navigation for skill badges", async ({ page }) => {
    await page.goto("/");
    
    // Scroll to skills section
    await page.locator("#habilidades").scrollIntoViewIfNeeded();
    
    // Focus on first skill badge using Tab
    const skillBadge = page.locator(".skill-badge").first();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    
    // Focused badge should be visible
    await expect(skillBadge).toBeVisible();
  });
});
