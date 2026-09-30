import { expect, test, type Page } from "@playwright/test";

/**
 * The Matrix easter eggs, and — more of the file than anything else — the
 * claims that nothing happens.
 *
 * ## The test seam
 *
 * `?easter-egg=<id>` forces one named egg immediately. It exists because almost
 * every assertion worth making here is an absence claim, and an absence claim
 * cannot be asserted against something that cannot be made to occur. It is
 * documented at length on `EASTER_EGG_TEST_PARAM` in `@/domain/easter-egg`, and
 * it is bounded: it does **not** bypass the theme gate, the reduced-motion gate,
 * the dialog check or the session budget — and those four are asserted right
 * here, through the seam, which is the only way they could be.
 *
 * It does skip the timing rules — the 45-second page age, the random schedule
 * and the seven-minute interaction cooldown — because a test cannot wait seven
 * minutes for a reader to stop touching the page. Those have unit tests of their
 * own; this file is not what stands behind them.
 *
 * ## What the tests are actually for
 *
 * The rules live in `@/domain/easter-egg` and are tested there. What cannot be
 * tested there is whether the thing that gets *rendered* obeys them. So the file
 * is deliberately full of negative assertions: nothing appears, nothing is
 * announced, nothing is focusable, focus never moves, the tab order does not
 * change, the page underneath stays clickable.
 */

const EGG = "[data-easter-egg]";
const DISMISS = "[data-testid='easter-egg-dismiss']";

/** Every id in the catalogue, so a renamed egg fails here rather than silently. */
const EGG_IDS = ["decode-glitch", "white-pill", "reversed-rain", "glyph-freeze", "wake-up"] as const;

/** Each egg and how long it is allowed to hold, from the domain catalogue. */
const EGG_LIFETIMES: ReadonlyArray<readonly [string, number]> = [
  ["decode-glitch", 2_500],
  ["glyph-freeze", 2_500],
  ["white-pill", 5_000],
  ["wake-up", 5_500],
  ["reversed-rain", 7_000],
];

/**
 * Puts the page in `theme` at `path`, with the first-visit intro already seen
 * and this session's egg record cleared.
 *
 * Two deliberate wrinkles, both of them the site's rules rather than test
 * conveniences:
 *
 *  - **Storage is seeded and then the page is reloaded**, not seeded with
 *    `addInitScript`, because an init script also runs in `about:blank` on the
 *    way to the site and writes to a different origin's store
 *    (`theme.spec.ts:63` says the same thing). It also means this helper can be
 *    called several times in one test without competing scripts fighting over
 *    the key.
 *  - **The session record is cleared**, because `MAX_EGGS_PER_SESSION` is 1 and a
 *    loop over the catalogue has to give each egg a session to happen in. That is
 *    the budget working, not being worked around: the test that asserts the
 *    budget holds uses `visit` instead of this, precisely so the record
 *    survives.
 *
 * The boot flag is set for the same reason the rest of the suite sets it: it
 * covers the viewport, and a test about what is on top of the page cannot have
 * two candidates.
 */
async function openAt(page: Page, path: string, theme: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });

  await page.evaluate((value) => {
    try {
      window.localStorage.setItem("msd:theme:v1", value);
      window.localStorage.setItem("msd:boot-seen:v1", "1");
      window.sessionStorage.removeItem("msd:easter-egg:v1");
    } catch {
      /* private mode */
    }
  }, theme);

  // The reload keeps the query string, so the seam survives being reseeded.
  await page.reload({ waitUntil: "networkidle" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/** The common case: a public page in the one theme these belong to. */
function openInMatrix(page: Page, path = "/en-us"): Promise<void> {
  return openAt(page, path, "matrix");
}

/**
 * Navigates and touches nothing.
 *
 * Used by the tests that are *about* the session record, where clearing it
 * between visits would destroy the thing being tested.
 */
function visit(page: Page, url: string): Promise<void> {
  return page.goto(url, { waitUntil: "networkidle" }).then(() => undefined);
}

/**
 * The identities of everything a keyboard can Tab to, in order.
 *
 * Read through the lens the browser uses — `tabindex`, then content, then the
 * DOM — so an element that merely *looks* focusable does not pass.
 */
function tabOrder(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const focusable = document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]',
    );

    return [...focusable]
      .filter((element) => element.tabIndex >= 0)
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}:${(element.textContent ?? "").trim().slice(0, 24)}`,
      );
  });
}

/* ==========================================================================
   THE ABSENCE CLAIMS
   ========================================================================== */

test.describe("an egg on a normal visit", () => {
  test("does not happen, in any of the three themes", async ({ page }) => {
    for (const theme of ["matrix", "carbon", "paper"]) {
      await openAt(page, "/en-us", theme);

      // The domain's whole window opens at 45 seconds, so nothing in the next
      // few can be anything but the gates working. The honest claim being
      // tested is "a reader who lands and reads does not get one", and this is
      // the part of that claim a test can reach in seconds.
      await page.waitForTimeout(2_500);

      await expect(page.locator(EGG), `an egg fired on a normal ${theme} visit`).toHaveCount(0);
      await expect(page.locator(DISMISS)).toHaveCount(0);
    }
  });

  test("does not happen on a second page either", async ({ page }) => {
    await openInMatrix(page);
    await page.getByRole("link", { name: /^writing$/i }).first().click();
    await page.waitForTimeout(2_000);

    // A client-side navigation keeps the layout — and therefore this island —
    // mounted, so nothing is re-armed and nothing re-fires.
    await expect(page.locator(EGG)).toHaveCount(0);
  });

  test("cannot be summoned by any key or click", async ({ page }) => {
    await openInMatrix(page);

    for (const key of ["e", "m", "x", "Enter", " ", "Escape"]) {
      await page.keyboard.press(key);
    }

    await page.mouse.click(400, 300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1_500);

    // Every one of those is a `keydown`, a `pointerdown` or a `scroll`, all of
    // which the domain counts as deliberate interaction — so they push the egg
    // *out* of reach rather than bringing it on. There is no key that does the
    // opposite, and the assertion is that none of these did.
    await expect(page.locator(EGG), "an egg was triggered by input").toHaveCount(0);
  });

  test("leaves nothing in the page at all before it fires", async ({ page }) => {
    await openInMatrix(page);

    // Not "not visible" — absent. An egg that is hidden with CSS is still in
    // the accessibility tree for a reader to find.
    await expect(page.locator(EGG)).toHaveCount(0);
    await expect(page.locator(DISMISS)).toHaveCount(0);
    await expect(page.locator(".msd-egg, .msd-egg__layer")).toHaveCount(0);
  });
});

/* ==========================================================================
   THE THEME GATE
   ========================================================================== */

test.describe("the theme gate", () => {
  test("shows the egg in the matrix theme", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=decode-glitch");

    await expect(page.locator(EGG)).toHaveAttribute("data-easter-egg", "decode-glitch");
  });

  test("refuses in carbon and paper, even when the egg is named", async ({ page }) => {
    for (const theme of ["carbon", "paper"]) {
      await openAt(page, "/en-us?easter-egg=white-pill", theme);
      await page.waitForTimeout(1_500);

      // A Matrix easter egg in the paper theme is a joke nobody is in on, and
      // the seam does not get to skip this one.
      await expect(page.locator(EGG), `an egg fired in ${theme}`).toHaveCount(0);
    }
  });

  test("reads the rendered theme, so switching into matrix opens the gate live", async ({ page }) => {
    await openAt(page, "/en-us?easter-egg=decode-glitch", "carbon");
    await page.waitForTimeout(1_500);
    await expect(page.locator(EGG)).toHaveCount(0);

    // The attribute, not storage: this is exactly what the header control does
    // (`theme-script.tsx:71` and the event it dispatches), so the gate follows
    // the same source the CSS follows.
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "matrix");
      window.dispatchEvent(new Event("msd:themechange"));
    });

    await expect(page.locator(EGG)).toHaveAttribute("data-easter-egg", "decode-glitch");
  });
});

/* ==========================================================================
   REDUCED MOTION
   ========================================================================== */

test.describe("reduced motion", () => {
  test("renders no egg at all, even when one is named", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await page.waitForTimeout(1_500);

    // Not a static frame, not a shorter one: nothing. `rain.css:189` makes the
    // same call about the loading rain, because a wall of characters frozen
    // mid-fall is a wall of text over the reader's content and the request was
    // "do not put that there".
    await expect(page.locator(EGG)).toHaveCount(0);
    await expect(page.locator(DISMISS)).toHaveCount(0);
  });

  test("renders none of the catalogue", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const id of EGG_IDS) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);
      await page.waitForTimeout(700);

      await expect(page.locator(EGG), `${id} rendered under reduced motion`).toHaveCount(0);
    }
  });

  test("is a belt-and-braces pair: the CSS backstop refuses on its own", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openInMatrix(page, "/en-us?easter-egg=white-pill");

    // If the JavaScript gate ever failed to run, the stylesheet must still hide
    // it. So the element is forced into the DOM by hand and the computed style
    // is what is asserted.
    await page.evaluate(() => {
      const egg = document.createElement("div");
      egg.className = "msd-egg fixed inset-0 z-100";
      egg.setAttribute("data-easter-egg", "white-pill");
      document.body.appendChild(egg);
    });

    const display = await page.locator(EGG).evaluate((element) => getComputedStyle(element).display);
    expect(display, "the reduced-motion backstop did not hide a forced egg").toBe("none");
  });
});

/* ==========================================================================
   NOTHING IS ANNOUNCED
   ========================================================================== */

test.describe("nothing is announced", () => {
  test("the visual layer is hidden from assistive technology", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");

    // `.msd-egg__layer` rather than `[aria-hidden="true"]`, because `MatrixRain`
    // carries its own `aria-hidden` on its root and the loose selector matches
    // both.
    const layer = page.locator(`${EGG} .msd-egg__layer`);
    await expect(layer).toHaveAttribute("aria-hidden", "true");

    // Not merely marked — genuinely outside the tree. The assertion is that every
    // piece of text inside the egg sits under an `aria-hidden="true"` ancestor,
    // so an `aria-hidden="false"` anywhere in the path, or a text node that
    // escaped the wrapper, fails here.
    const exposed = await page.locator(EGG).evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];

      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? "").trim();

        if (text.length === 0 || node.parentElement?.closest('[aria-hidden="true"]') !== null) {
          continue;
        }

        texts.push(text);
      }

      return texts;
    });

    // The one piece of text in here that is *meant* to be exposed is the dismiss
    // control's own label: it is a real button with a real accessible name,
    // deliberately outside the hidden layer. The status line, the takeover
    // sentence, the quiet line and every glyph of the rain must not be.
    const dismissLabel = ((await page.getByTestId("easter-egg-dismiss").textContent()) ?? "").trim();

    expect(exposed, "text inside the egg is reachable by a screen reader").toEqual([dismissLabel]);
  });

  test("no live region, no dialog role, no announcing attribute", async ({ page }) => {
    for (const id of EGG_IDS) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      const surface = await page.locator(EGG).evaluate((element) =>
        [element, ...element.querySelectorAll("*")]
          .map((node) => [
            node.getAttribute("role") ?? "",
            node.getAttribute("aria-live") ?? "",
            node.getAttribute("aria-atomic") ?? "",
            node.getAttribute("aria-busy") ?? "",
            node.getAttribute("aria-modal") ?? "",
          ])
          .filter((entry) => entry.some((value) => value !== "")),
      );

      // An empty list is the assertion. Anything that can announce, or that
      // promises to be a modal, fails here — which is also the assertion that
      // there is no focus trap to keep.
      expect(surface, `${id} exposes an announcing or dialog surface`).toEqual([]);
    }
  });

  test("the dismiss control has a real name and sits outside the hidden layer", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=wake-up");

    const dismiss = page.getByTestId("easter-egg-dismiss");
    await expect(dismiss).toBeVisible();
    await expect(dismiss).toHaveAccessibleName(/dismiss/i);

    // A focusable element inside `aria-hidden` is the keyboard trap
    // `boot-sequence.tsx:29` already documents. Asserted rather than assumed,
    // because it is one wrapper element of drift away.
    const insideHidden = await page.evaluate(() => {
      const control = document.querySelector("[data-testid='easter-egg-dismiss']");
      const hidden = control?.closest('[aria-hidden="true"]');

      return hidden !== null && hidden !== undefined;
    });

    expect(insideHidden, "the dismiss control is inside the aria-hidden layer").toBe(false);
  });
});

/* ==========================================================================
   NOTHING IS FOCUSABLE
   ========================================================================== */

test.describe("nothing is focusable", () => {
  test("the tab order is what it was before the egg appeared", async ({ page }) => {
    await openInMatrix(page);
    const before = await tabOrder(page);

    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.locator(EGG)).toBeVisible();
    const during = await tabOrder(page);

    // Same page, same session, egg up. If the egg inserted anything into the
    // tab order, this is where it shows.
    expect(during.filter((entry) => !before.includes(entry))).toEqual([]);
    expect(during.length).toBe(before.length);
  });

  test("the dismiss control is out of the tab order", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");

    const tabIndex = await page
      .getByTestId("easter-egg-dismiss")
      .evaluate((element) => (element as HTMLElement).tabIndex);
    expect(tabIndex, "the dismiss control joined the tab order").toBe(-1);
  });

  test("a keyboard reader tabbing the whole page never lands on the egg", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.locator(EGG)).toBeVisible();

    let escaped = false;

    for (let step = 0; step < 60 && !escaped; step += 1) {
      await page.keyboard.press("Tab");

      escaped = await page.evaluate(
        () => document.activeElement?.closest("[data-easter-egg]") !== null,
      );
    }

    expect(escaped, "Tab reached something inside the egg").toBe(false);
  });

  test("focus is nowhere near the egg when it appears", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.locator(EGG)).toBeVisible();

    // Nothing called `focus()`, so the document's focus is still where a fresh
    // load leaves it. If the island ever moved focus to its own control, this is
    // the assertion that would catch it.
    const focused = await page.evaluate(() => {
      const active = document.activeElement;

      return {
        tag: active?.tagName ?? "",
        insideEgg: active?.closest("[data-easter-egg]") !== null,
      };
    });

    expect(focused.insideEgg, "the egg took focus").toBe(false);
    expect(focused.tag).toBe("BODY");
  });

  test("the visual layer contains nothing focusable at all", async ({ page }) => {
    for (const id of EGG_IDS) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      const focusables = await page
        .locator(`${EGG} .msd-egg__layer`)
        .evaluate(
          (layer) =>
            layer.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').length,
        );

      expect(focusables, `${id} put something focusable inside the hidden layer`).toBe(0);
    }
  });
});

/* ==========================================================================
   THE SEAM
   ========================================================================== */

test.describe("the test seam", () => {
  test("shows the egg that was named, and names it in the DOM", async ({ page }) => {
    for (const id of EGG_IDS) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      await expect(page.locator(EGG), `${id} did not render`).toHaveAttribute(
        "data-easter-egg",
        id,
      );
    }
  });

  test("ignores an id that is not in the catalogue", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=nonsense");
    await page.waitForTimeout(1_000);

    await expect(page.locator(EGG)).toHaveCount(0);
  });

  test("still refuses while a modal is open", async ({ page }) => {
    /*
     The gate reads `[aria-modal="true"]`, which is what both real modals render
     while open (`resume-copilot.tsx:272`, `visitor-chat.tsx:445`), so a planted
     element is the same thing from the gate's point of view. It is planted
     before the island's first effect, which is the only moment the seam and an
     already-open modal can be brought together.
    */
    await page.addInitScript(() => {
      const plant = (): void => {
        const modal = document.createElement("div");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("data-testid", "planted-modal");
        document.body.appendChild(modal);
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", plant, { once: true });
        return;
      }

      plant();
    });

    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.getByTestId("planted-modal")).toBeAttached();

    // Long past the seam's own one-second dialog retry, which is what makes
    // this an assertion about a gate rather than about timing.
    await page.waitForTimeout(3_000);
    await expect(page.locator(EGG), "an egg fired over an open modal").toHaveCount(0);
  });

  test("spends the session's one egg, so the seam cannot buy a second", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=decode-glitch");
    await expect(page.locator(EGG)).toBeVisible();
    await expect(page.locator(EGG), "the first egg never ended").toHaveCount(0);

    // Same session, same tab, and nothing cleared — that is what `visit` is for.
    // Playwright gives each *test* a fresh context, which is exactly why this
    // has to happen inside one test.
    await visit(page, "/en-us?easter-egg=white-pill");
    await page.waitForTimeout(1_500);

    await expect(page.locator(EGG), "the session budget did not hold").toHaveCount(0);
  });

  test("remembers the draw across a reload, so the window cannot be re-rolled", async ({ page }) => {
    await openInMatrix(page);

    const drawn = await page
      .evaluate(() => window.sessionStorage.getItem("msd:easter-egg:v1"))
      .catch(() => null);

    // Read through a poll rather than a bare call, because the schedule is
    // written from an effect and the read can win the race.
    const stored = await expect
      .poll(async () => page.evaluate(() => window.sessionStorage.getItem("msd:easter-egg:v1")))
      .not.toBeNull()
      .then(() => page.evaluate(() => window.sessionStorage.getItem("msd:easter-egg:v1")));

    expect(typeof drawn).toBe("string");
    expect(stored).toBe(drawn);

    const dueAt = (JSON.parse(stored ?? "{}") as { dueAt?: number }).dueAt;
    expect(typeof dueAt, "no schedule was written").toBe("number");

    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.evaluate(() => window.sessionStorage.getItem("msd:easter-egg:v1"));
    expect(afterReload, "the schedule was re-rolled by a reload").toBe(stored);
  });
});

/* ==========================================================================
   THE EFFECT ITSELF
   ========================================================================== */

test.describe("each egg", () => {
  test("covers the viewport and takes no clicks but the dismiss control", async ({ page }) => {
    for (const id of ["decode-glitch", "white-pill", "reversed-rain", "glyph-freeze"]) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      const container = page.locator(EGG);
      await expect(container).toBeVisible();

      const box = await container.boundingBox();
      const size = page.viewportSize();
      expect(
        box?.width,
        `${id} does not fill the viewport`,
      ).toBeGreaterThanOrEqual((size?.width ?? 0) - 1);

      // The layer is decoration and takes nothing; the control is the one
      // sanctioned way out.
      const layerEvents = await page
        .locator(`${EGG} .msd-egg__layer`)
        .evaluate((element) => getComputedStyle(element).pointerEvents);
      expect(layerEvents, `${id} intercepts pointer input`).toBe("none");

      // ...and so does the container, which covers the whole viewport. A
      // transparent fixed div is a hit target whether or not it paints.
      const containerEvents = await page
        .locator(EGG)
        .evaluate((element) => getComputedStyle(element).pointerEvents);
      expect(containerEvents, `${id} intercepts pointer input`).toBe("none");

      const dismissEvents = await page
        .getByTestId("easter-egg-dismiss")
        .evaluate((element) => getComputedStyle(element).pointerEvents);
      expect(dismissEvents, `${id} left no way to dismiss`).not.toBe("none");
    }
  });

  test("leaves the page underneath clickable while it is up", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.locator(EGG)).toBeVisible();

    // The takeover covers the whole viewport, so this is the question that
    // matters: what does the browser think is under the pointer at the middle
    // of the screen? Not the overlay.
    const underThePointer = await page.evaluate(() => {
      const node = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return node?.closest("[data-easter-egg]") === null;
    });

    expect(underThePointer, "the overlay is eating clicks at the centre of the viewport").toBe(true);
  });

  test("is dismissible by Escape, with nothing focused", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    await expect(page.locator(EGG)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(EGG)).toHaveCount(0);
  });

  test("is dismissible by one click on the control", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=wake-up");
    await expect(page.locator(EGG)).toBeVisible();

    await page.getByTestId("easter-egg-dismiss").click();
    await expect(page.locator(EGG)).toHaveCount(0);
  });

  test("goes away on its own, without being dismissed", async ({ page }) => {
    for (const [id, ms] of EGG_LIFETIMES) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);
      await expect(page.locator(EGG)).toBeVisible();

      // An effect that outstays its welcome stops being a joke, and the reader
      // has no reason to keep paying attention to a page they came to read.
      await expect(page.locator(EGG), `${id} outstayed its duration`).toHaveCount(0, {
        timeout: ms,
      });
    }
  });

  test("declares a distinct kind, so none is a recolour of another", async ({ page }) => {
    const kinds: string[] = [];

    for (const id of EGG_IDS) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);
      const kind = await page.locator(`${EGG} [data-egg-kind]`).getAttribute("data-egg-kind");
      kinds.push(kind ?? "");
    }

    expect(new Set(kinds).size, `duplicate kind across ${kinds.join(", ")}`).toBe(kinds.length);
  });

  test("the rain eggs reuse the component rather than a second implementation", async ({ page }) => {
    for (const id of ["reversed-rain", "glyph-freeze"]) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      // The same `data-testid` the loading rain and the navigation overlay use,
      // and the same column class. Not a lookalike.
      await expect(page.locator(`${EGG} [data-testid="matrix-rain"]`)).toBeAttached();
      expect(await page.locator(`${EGG} .msd-rain__column`).count()).toBeGreaterThan(20);
    }
  });

  test("the reversed rain runs the existing animation backwards", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=reversed-rain");

    const direction = await page
      .locator(`${EGG} .msd-rain__column`)
      .first()
      .evaluate((element) => getComputedStyle(element).animationDirection);
    expect(direction).toBe("reverse");
  });

  test("the frozen rain is paused mid-fall, not parked at the top", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=glyph-freeze");

    const column = page.locator(`${EGG} .msd-rain__column`).first();
    const playState = await column.evaluate(
      (element) => getComputedStyle(element).animationPlayState,
    );
    expect(playState).toBe("paused");

    // A paused column keeps the transform its own negative delay put it at,
    // which is the whole difference between a held frame and a row of glyph tops.
    const transform = await column.evaluate((element) => getComputedStyle(element).transform);
    expect(transform).not.toBe("none");
  });

  test("the two rain eggs are transparent, so the résumé stays visible behind them", async ({ page }) => {
    for (const id of ["reversed-rain", "glyph-freeze"]) {
      await openInMatrix(page, `/en-us?easter-egg=${id}`);

      const background = await page
        .locator(`${EGG} [data-testid="matrix-rain"]`)
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(background, `${id} is opaque and hides the page`).toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("the glitch tears the page underneath rather than copying it", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=decode-glitch");

    // `backdrop-filter` on two narrow bands is the implementation. What matters
    // is that the effect moves and does not duplicate the page's DOM to do it.
    const filter = await page
      .locator(`${EGG} .msd-egg__tear`)
      .evaluate((element) => getComputedStyle(element).backdropFilter);
    expect(filter).not.toBe("none");

    const duplicates = await page
      .locator(EGG)
      .evaluate((element) => element.querySelectorAll("main, article, h1, h2").length);
    expect(duplicates, "the glitch copied the page's content").toBe(0);
  });

  test("the takeover is the only opaque one", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");

    const background = await page
      .locator(`${EGG} .msd-egg__takeover`)
      .evaluate((element) => getComputedStyle(element).backgroundColor);

    // `matrix` is `#000000`, and this is where that token is read rather than
    // written: an egg that hardcoded its own black would render on any theme.
    expect(background).toBe("rgb(0, 0, 0)");
  });

  test("says its line in the site's own voice rather than quoting a film", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=wake-up");
    await expect(page.locator(".msd-egg__line-text")).toBeVisible();

    const english = ((await page.locator(".msd-egg__line-text").textContent()) ?? "").trim();
    expect(english.length).toBeGreaterThan(0);
    expect(english, "the egg is not speaking in the site's own voice").toContain("résumé");
  });

  test("is translated rather than hard-coded", async ({ page }) => {
    await openInMatrix(page, "/en-us?easter-egg=white-pill");
    const english = ((await page.locator(".msd-egg__pill-line").textContent()) ?? "").trim();

    await openInMatrix(page, "/pt-br?easter-egg=white-pill");
    await expect(page.locator(".msd-egg__pill-line")).toBeVisible();
    const portuguese = ((await page.locator(".msd-egg__pill-line").textContent()) ?? "").trim();

    expect(portuguese.length).toBeGreaterThan(0);
    expect(portuguese, "the pt-BR catalog is not being used").not.toBe(english);
    expect(portuguese, "the Portuguese text is not Portuguese").toMatch(/[áéíóúâêôãõç]/i);
  });
});