import { expect, test, devices } from "@playwright/test";

/**
 * Mobile is not a smaller desktop, it is the primary way a large share of
 * visitors arrive. These checks exist because a real survey of the site at phone
 * widths found two defects that no amount of desktop review would have caught:
 *
 *  1. **Horizontal overflow on every phone width.** A 24rem decorative blur blob
 *     anchored at `left-1/4` landed at 481px inside a 390px viewport and pushed
 *     the whole document 92px wider, producing a horizontal scrollbar from 320px
 *     to 480px. The boot overlay had the same problem independently: a
 *     51-character status sentence in a monospaced face, inside a flex child
 *     that could not shrink.
 *
 *  2. **29 tap targets under 44px**, from 16px navigation labels to a 30px
 *     floating control. All technically clickable, all practically missable.
 */
const PHONE_WIDTHS = [320, 360, 390, 414, 480];
const ROUTES = ["/en-us", "/en-us/resume", "/en-us/blog"];

test.describe("Mobile responsiveness", () => {
  for (const width of PHONE_WIDTHS) {
    test(`has no horizontal overflow at ${width}px`, async ({ browser }) => {
      const context = await browser.newContext({
        ...devices["Desktop Chrome"],
        viewport: { width, height: 800 },
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();

      for (const route of ROUTES) {
        await page.goto(route, { waitUntil: "networkidle" });
        // Let the first-visit overlay settle so the page beneath is measured too.
        await page.waitForTimeout(1500);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(scrollWidth, `${route} at ${width}px must not scroll sideways`).toBeLessThanOrEqual(clientWidth);
      }

      await context.close();
    });
  }

  test("keeps tap targets at or above the 44px floor on a phone", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("msd:boot-seen:v1", "1");
      } catch {
        /* private mode */
      }
    });
    await page.goto("/en-us", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const tooSmall = await page.evaluate(() => {
      const offenders: string[] = [];

      for (const el of Array.from(document.querySelectorAll<HTMLElement>("a[href], button, [role=button]"))) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        // The skip link is visually hidden until focused and expands to a full
        // 153x44 target on focus, which is the correct pattern rather than a
        // defect, so it is exempt here and asserted separately.
        if (el.classList.contains("sr-only")) continue;

        if (rect.height < 44 || rect.width < 44) {
          const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
          offenders.push(`${label.slice(0, 40)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
      }

      return offenders;
    });

    expect(tooSmall, `tap targets under 44px:\n${tooSmall.join("\n")}`).toEqual([]);
    await context.close();
  });

  test("keeps the navigation reachable rather than truncated", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/en-us", { waitUntil: "networkidle" });

    const nav = page.getByRole("navigation", { name: /main navigation/i });
    await expect(nav).toBeVisible();

    // The nav gets its own row on a phone, so the majority of the labels are
    // actually on screen rather than hidden behind a horizontal scroll.
    const navBox = await nav.boundingBox();
    const headerBox = await page.locator("header").boundingBox();

    expect(navBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    if (navBox && headerBox) {
      // A second row means the nav is taller than the brand row alone.
      expect(navBox.y).toBeGreaterThan(headerBox.y + 20);
      // And it spans the full width rather than a squeezed column.
      expect(navBox.width).toBeGreaterThan(280);
    }

    // Every label must still be present in the accessibility tree, whether or
    // not it is within the visible width.
    await expect(nav.getByRole("link")).toHaveCount(6);

    await context.close();
  });

  test("expands the skip link to a usable target when focused", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/en-us", { waitUntil: "networkidle" });

    await page.keyboard.press("Tab");

    const skip = page.locator('a[href="#main"]');
    const box = await skip.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    await context.close();
  });

  test("keeps floating controls clear of running text", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("msd:boot-seen:v1", "1");
      } catch {
        /* private mode */
      }
    });
    await page.goto("/en-us", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // No element may be pinned over the copy. The engagement control was moved
    // into the footer for exactly this reason.
    const covered = await page.evaluate(() => {
      const offenders: string[] = [];

      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        if (getComputedStyle(el).position !== "fixed") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        // The telemetry bar is meant to sit at the edge of the document.
        if (el.tagName === "ASIDE") continue;

        for (const node of Array.from(document.querySelectorAll<HTMLElement>("p, h1, h2, li"))) {
          const n = node.getBoundingClientRect();
          if (n.width === 0 || n.height === 0) continue;
          const overlaps = r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top;
          if (overlaps) {
            offenders.push(`${el.tagName} covers "${(node.textContent || "").trim().slice(0, 30)}"`);
            break;
          }
        }
      }

      return offenders;
    });

    expect(covered, `floating controls over text:\n${covered.join("\n")}`).toEqual([]);
    await context.close();
  });
});
