import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ARTWORK_IMAGE_DIR,
  ARTWORK_IMAGE_EXTENSIONS,
  ARTWORK_OPACITY_DEFAULT,
  ARTWORK_OPACITY_MAX,
  ARTWORK_OPACITY_MIN,
  ARTWORK_PLATE_COLUMNS,
  ARTWORK_PLATE_HEIGHT,
  ARTWORK_PLATE_RAILS,
  ARTWORK_PLATE_SEED,
  ARTWORK_PLATE_WIDTH,
  DEFAULT_SECTION_ARTWORK,
  HOME_SECTION_IDS,
  RECOMMENDED_ARTWORK_PLACEMENT,
  SECTION_ARTWORK_IDS,
  SECTION_ARTWORK_PLACEMENTS,
  artworkImageSrc,
  clampArtworkOpacity,
  hasSectionArtwork,
  isArtworkImageSrc,
  isRenderableArtworkImage,
  isSectionArtworkId,
  isSectionArtworkPlacement,
  resolveSectionArtwork,
  type SectionArtworkDescriptor,
} from "@/domain/artwork/section-artwork";
import { THEME_IDS, type ThemeId } from "@/domain/theme/theme";

/**
 * The artwork slot's policy.
 *
 * Three things are being protected here, and they are protected by tests rather
 * than by review because all three decay the same way — one reasonable commit at
 * a time:
 *
 *  1. **The layer stays a detail.** Asserted as a measurable ceiling rather than
 *    as an intention: the numbers in the contrast block below are computed from
 *    the themes' real tokens, so `ARTWORK_OPACITY_MAX` cannot be raised past the
 *    point where it starts costing legibility without a test failing.
 *  2. **The empty state stays free.** `DEFAULT_SECTION_ARTWORK` is empty, every
 *    section resolves to `kind: "none"`, and the two sections that may never carry
 *    art stay outside the vocabulary.
 *  3. **A licensed still cannot ship without a credit and a path that matches the
 *    naming rule**, and a bad one degrades to the drawn plate rather than to a
 *    broken image.
 *
 * The palette is read out of `globals.css` rather than restated here. Restating it
 * would make this test a second, invisible copy of the tokens: it would keep
 * passing after a theme changed, which is exactly the failure this is meant to
 * catch.
 */

const root = resolve(__dirname, "../../..");
const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

type Rgb = [number, number, number];

/** The `[data-theme="..."]` blocks, keyed by theme id. */
function themeBlocks(): Map<string, string> {
  const blocks = new Map<string, string>();
  const pattern = /\[data-theme="([a-z0-9-]+)"\]\s*\{([^}]*)\}/g;

  for (const match of css.matchAll(pattern)) {
    blocks.set(match[1], match[2]);
  }

  return blocks;
}

/** One token's value from a theme block. Throws rather than guessing. */
function token(theme: ThemeId, name: string): string {
  const block = themeBlocks().get(theme) ?? "";
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(block);

  if (match === null) {
    throw new Error(`theme "${theme}" does not define ${name}; the test cannot prove anything`);
  }

  return match[1].trim();
}

function parseHex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/i.exec(value);

  if (match === null) {
    throw new Error(`expected a 6-digit hex, got "${value}"`);
  }

  const packed = Number.parseInt(match[1], 16);

  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

/** WCAG 2.x relative luminance. */
function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255;

    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * What the plate's brightest pixel actually is.
 *
 * Alpha compositing in sRGB, which is what a browser does for a plain `opacity` on
 * a non-isolated layer and therefore what the reader sees. The brightest pixel is
 * the accent token at the layer's own alpha — the rain heads carry no
 * `stroke-opacity`, so they composite at full strength inside the layer.
 */
function platePixel(theme: ThemeId, alpha: number): Rgb {
  const accent = parseHex(token(theme, "--color-primary-container"));
  const surface = parseHex(token(theme, "--color-surface-base"));

  return [0, 1, 2].map((index) =>
    Math.round(accent[index] * alpha + surface[index] * (1 - alpha)),
  ) as Rgb;
}

/** A descriptor that draws, for the section under test. */
function descriptor(
  section: SectionArtworkDescriptor["section"],
  overrides: Partial<SectionArtworkDescriptor> = {},
): SectionArtworkDescriptor {
  return { section, placement: "corner-top-left", ...overrides };
}

/** An image that satisfies every rule, so a test only names the one thing it breaks. */
function image(section: SectionArtworkDescriptor["section"]): SectionArtworkDescriptor["image"] {
  return {
    src: artworkImageSrc(section, "webp"),
    width: 1280,
    height: 720,
    title: "the Nebuchadnezzar interior",
    rights: "Warner Bros. — licensed for this site",
  };
}

/** The skip reason, for the assertions that are only about *why* nothing was drawn. */
function reasonOf(resolved: ReturnType<typeof resolveSectionArtwork>): string | undefined {
  return resolved.kind === "none" ? resolved.reason : undefined;
}

/* ==========================================================================
   WHICH SECTIONS MAY CARRY ART
   ========================================================================== */

describe("which sections may carry art", () => {
  it("is a closed vocabulary", () => {
    expect(SECTION_ARTWORK_IDS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(SECTION_ARTWORK_IDS).size).toBe(SECTION_ARTWORK_IDS.length);
  });

  it("covers every home section except the hero and the footer", () => {
    // The two absences are decisions with reasons in the module header, and this
    // assertion is what stops a new section being added to one list and not the
    // other. `top` is the arrival and already carries the portrait and two
    // diffused backdrops; `footer` is a link tree with no reading axis.
    expect([...HOME_SECTION_IDS]).toEqual(["top", ...SECTION_ARTWORK_IDS, "footer"]);
    expect(SECTION_ARTWORK_IDS).not.toContain("top");
    expect(SECTION_ARTWORK_IDS).not.toContain("footer");
  });

  it("is in page order, so the recommended placements read top to bottom", () => {
    const order = HOME_SECTION_IDS.filter((id) => SECTION_ARTWORK_IDS.includes(id as never));

    expect(order).toEqual([...SECTION_ARTWORK_IDS]);
  });

  it("accepts exactly the catalogue", () => {
    for (const id of SECTION_ARTWORK_IDS) {
      expect(isSectionArtworkId(id), id).toBe(true);
    }

    for (const hostile of ["", "TOP", "kpis ", "kpi", "", null, undefined, 0, {}, ["kpis"]]) {
      expect(isSectionArtworkId(hostile), JSON.stringify(hostile)).toBe(false);
    }
  });

  it("offers four corners and nothing else", () => {
    // Corners only, never the middle of the band: a centre placement is the one
    // shape that puts art behind body copy, and a closed vocabulary means that
    // cannot be reached by typing a string into a stylesheet.
    expect([...SECTION_ARTWORK_PLACEMENTS]).toEqual([
      "corner-top-left",
      "corner-top-right",
      "corner-bottom-left",
      "corner-bottom-right",
    ]);

    for (const placement of SECTION_ARTWORK_PLACEMENTS) {
      expect(isSectionArtworkPlacement(placement), placement).toBe(true);
      expect(placement, `${placement} must name an axis`).toMatch(
        /^corner-(top|bottom)-(left|right)$/,
      );
    }

    for (const hostile of ["middle", "top-left", "CENTER", "", null, 42, {}]) {
      expect(isSectionArtworkPlacement(hostile), JSON.stringify(hostile)).toBe(false);
    }
  });

  it("gives every section a recommendation, and every recommendation a real corner", () => {
    for (const id of SECTION_ARTWORK_IDS) {
      expect(Object.keys(RECOMMENDED_ARTWORK_PLACEMENT), id).toContain(id);
      expect(isSectionArtworkPlacement(RECOMMENDED_ARTWORK_PLACEMENT[id]), id).toBe(true);
    }
  });

  /*
     The recommendation table is a rhythm, and a rhythm is only a rhythm if it
     alternates. Without this the natural drift is "put it top-left everywhere",
     which is not five details — it is one detail repeated, and the page looks
     like it has a left border.
  */
  it("never puts two neighbouring sections in the same corner row", () => {
    const rows = SECTION_ARTWORK_IDS.map(
      (id) => RECOMMENDED_ARTWORK_PLACEMENT[id].startsWith("corner-top") ? "top" : "bottom",
    );

    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index], `${SECTION_ARTWORK_IDS[index - 1]} and ${SECTION_ARTWORK_IDS[index]}`).not.toBe(
        rows[index - 1],
      );
    }
  });

  it("keeps `kpis` and `experience` off the top corners, where SectionHeading's note sits", () => {
    // `SectionHeading` puts its note in the right column at md and up
    // (`src/components/ui/primitives.tsx:55`), so a top-corner plate on those two
    // would sit behind the section's own prose.
    for (const id of ["kpis", "experience"] as const) {
      expect(RECOMMENDED_ARTWORK_PLACEMENT[id].startsWith("corner-top"), id).toBe(false);
    }
  });
});

/* ==========================================================================
   THE OPACITY BOUNDS
   ========================================================================== */

describe("the opacity bounds", () => {
  it("is a range a reader cannot notice the plate for", () => {
    // The whole feature is a detail, and the ceiling is the number that decides
    // whether it stays one. 0.14 is where AA on the themes' real body text becomes
    // the binding constraint, so the next step up would be a decision about text
    // colour rather than about artwork.
    expect(ARTWORK_OPACITY_MAX).toBeLessThanOrEqual(0.15);
    expect(ARTWORK_OPACITY_MAX).toBeGreaterThanOrEqual(ARTWORK_OPACITY_MIN);
  });

  it("defaults to the middle of the range", () => {
    expect(ARTWORK_OPACITY_DEFAULT).toBeGreaterThan(ARTWORK_OPACITY_MIN);
    expect(ARTWORK_OPACITY_DEFAULT).toBeLessThan(ARTWORK_OPACITY_MAX);
  });

  it("is narrower than the site's own spread of decorative tints", () => {
    /*
       The layer must not be a wider dial than the decorations already on the
       page. The site ships `/5` diffused blooms and one `/10` tint
       (`contact-gateway.tsx:55`); a range wider than the gap between those two is
       a range whose top end is a feature.
    */
    expect(ARTWORK_OPACITY_MAX - ARTWORK_OPACITY_MIN).toBeLessThan(0.1);
  });

  it("cannot be configured to nothing", () => {
    /*
       "Make it invisible" is not expressible. The only way to turn the artwork off
       is to delete the descriptor, which is visible in a diff — whereas an opacity
       of 0 is a quiet commit that a later commit will double.
    */
    expect(clampArtworkOpacity(0)).toBe(ARTWORK_OPACITY_MIN);
    expect(ARTWORK_OPACITY_MIN).toBeGreaterThan(0);
  });

  it("clamps a value above the ceiling rather than refusing the layer", () => {
    // A typo costs a slightly wrong tint, not a missing decoration.
    expect(clampArtworkOpacity(0.9)).toBe(ARTWORK_OPACITY_MAX);
    expect(clampArtworkOpacity(0.15)).toBe(ARTWORK_OPACITY_MAX);
  });

  it("clamps a value below the floor rather than rendering a hidden layer", () => {
    expect(clampArtworkOpacity(0.01)).toBe(ARTWORK_OPACITY_MIN);
    expect(clampArtworkOpacity(-3)).toBe(ARTWORK_OPACITY_MIN);
  });

  it("passes a legal value through untouched", () => {
    for (const value of [ARTWORK_OPACITY_MIN, ARTWORK_OPACITY_DEFAULT, ARTWORK_OPACITY_MAX, 0.1]) {
      expect(clampArtworkOpacity(value), String(value)).toBe(value);
    }
  });

  it("reads a missing or unparseable opacity as no opinion, not as faint as possible", () => {
    // `Number(undefined)` and a hand-edited config both produce NaN, and both mean
    // "nobody chose". Falling back to the floor would make the default the
    // invisible one.
    for (const value of [undefined, null, Number.NaN, "0.09", {}, []]) {
      expect(clampArtworkOpacity(value), JSON.stringify(value)).toBe(ARTWORK_OPACITY_DEFAULT);
    }
  });

  it("survives an infinity in either direction", () => {
    // An unbounded opacity is the one input that could make the layer opaque, so
    // it has to land on the ceiling like any other too-large value.
    expect(clampArtworkOpacity(Number.POSITIVE_INFINITY)).toBe(ARTWORK_OPACITY_MAX);
    expect(clampArtworkOpacity(Number.NEGATIVE_INFINITY)).toBe(ARTWORK_OPACITY_MIN);
  });
});

/*
   The reason `ARTWORK_OPACITY_MAX` is 0.14, as arithmetic rather than as an
   intention. The plate never sits under text *by design* — the mask is what keeps
   it clear — but a design is not a guarantee, so the ceiling is also the number at
   which it would start costing legibility if the mask ever regressed.
*/
describe("legibility, measured against the real theme tokens", () => {
  it.each(THEME_IDS)("theme %s: body text still clears AA over the brightest plate pixel", (theme) => {
    const pixel = platePixel(theme, ARTWORK_OPACITY_MAX);

    for (const textToken of ["--color-text-secondary", "--color-text-primary"] as const) {
      const ratio = contrastRatio(parseHex(token(theme, textToken)), pixel);

      expect(
        ratio,
        `${theme}: ${textToken} is ${ratio.toFixed(2)}:1 over the plate at the ${ARTWORK_OPACITY_MAX} ceiling`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has margin at the ceiling, not exactly the floor", () => {
    /*
       A bound that lands on 4.5:1 is a bound that fails the next time a theme is
       nudged, and it fails in the direction nobody re-checks. The measured worst
       case is 5.61:1 (carbon, secondary text over the plate's brightest pixel),
       against 7.59:1 for the same text on the bare surface — so the plate costs
       about a quarter of the contrast budget and still clears AA.
    */
    const worst = Math.min(
      ...THEME_IDS.map((theme) =>
        contrastRatio(
          parseHex(token(theme, "--color-text-secondary")),
          platePixel(theme, ARTWORK_OPACITY_MAX),
        ),
      ),
    );

    expect(worst).toBeGreaterThanOrEqual(5);
  });

  it("is comfortable at the value a descriptor gets by default", () => {
    const worst = Math.min(
      ...THEME_IDS.map((theme) =>
        contrastRatio(
          parseHex(token(theme, "--color-text-secondary")),
          platePixel(theme, ARTWORK_OPACITY_DEFAULT),
        ),
      ),
    );

    expect(worst).toBeGreaterThanOrEqual(6);
  });

  it("stays a tint on every theme, rather than a tint on two and a smear on one", () => {
    /*
       The paper theme is the one that breaks: its accent is a dark olive, so an
       accent-at-9% plate is a *dark* mark on cream. That is the right direction —
       it is a shadow, not a stain — but only while the composited pixel is still
       close to the surface. If it were allowed to darken the ground appreciably it
       would read as dirt on the paper.
    */
    for (const theme of THEME_IDS) {
      const pixel = platePixel(theme, ARTWORK_OPACITY_DEFAULT);
      const surface = parseHex(token(theme, "--color-surface-base"));
      const shift = Math.max(...[0, 1, 2].map((index) => Math.abs(pixel[index] - surface[index])));

      expect(shift, `${theme}: the plate shifts the ground by ${shift}/255`).toBeLessThanOrEqual(24);
    }
  });
});

/* ==========================================================================
   THE RESOLUTION RULE
   ========================================================================== */

describe("the resolution rule", () => {
  it("resolves to nothing at all for every eligible section, because nothing is configured", () => {
    /*
       This is the state of the site right now, and it is the state the e2e proves
       costs zero requests and zero bytes. If this test ever needs editing because
       someone added a descriptor, the visual change has been made on purpose —
       which is exactly the moment this test should be read rather than updated.
    */
    expect(DEFAULT_SECTION_ARTWORK).toEqual([]);

    for (const id of SECTION_ARTWORK_IDS) {
      const resolved = resolveSectionArtwork(id);

      expect(resolved).toEqual({ kind: "none", section: id, reason: "not-configured" });
      expect(hasSectionArtwork(resolved)).toBe(false);
    }
  });

  it("resolves the two ineligible sections to nothing as well", () => {
    // A different reason, because they are refused before configuration is even
    // consulted — and it is the reason worth surfacing when someone asks why the
    // hero has no artwork.
    for (const id of ["top", "footer"]) {
      expect(resolveSectionArtwork(id)).toEqual({ kind: "none", section: id, reason: "not-decorative" });
    }
  });

  it("refuses a section that may not carry art, before it looks for configuration", () => {
    for (const id of ["top", "footer"]) {
      const resolved = resolveSectionArtwork(id, [descriptor("kpis")]);

      expect(resolved).toEqual({ kind: "none", section: id, reason: "not-decorative" });
    }
  });

  it("refuses a section id that is not a section", () => {
    for (const id of ["", "nope", "Kpis", null as unknown as string, undefined as unknown as string]) {
      expect(resolveSectionArtwork(id).kind).toBe("none");
    }

    expect(reasonOf(resolveSectionArtwork(undefined as unknown as string))).toBe("not-decorative");
  });

  it("refuses a placement outside the vocabulary rather than guessing one", () => {
    const resolved = resolveSectionArtwork("kpis", [
      descriptor("kpis", { placement: "middle" as never }),
    ]);

    expect(resolved).toEqual({ kind: "none", section: "kpis", reason: "invalid-placement" });
  });

  it("reports the most permanent reason first, when everything is wrong at once", () => {
    // An unrecognised section is a statement about the page, and it is still true
    // after the configuration is fixed — so it is the reason worth surfacing.
    expect(reasonOf(resolveSectionArtwork("footer", [descriptor("kpis")]))).toBe("not-decorative");
    expect(reasonOf(resolveSectionArtwork("blog"))).toBe("not-configured");
    expect(
      reasonOf(resolveSectionArtwork("blog", [descriptor("blog", { placement: "middle" as never })])),
    ).toBe("invalid-placement");
  });

  it("draws the generated plate when a section asks for artwork and names no image", () => {
    const resolved = resolveSectionArtwork("arsenal", [descriptor("arsenal")]);

    expect(resolved).toEqual({
      kind: "plate",
      section: "arsenal",
      placement: "corner-top-left",
      opacity: ARTWORK_OPACITY_DEFAULT,
      seed: ARTWORK_PLATE_SEED,
      width: ARTWORK_PLATE_WIDTH,
      height: ARTWORK_PLATE_HEIGHT,
      columns: ARTWORK_PLATE_COLUMNS,
      rails: ARTWORK_PLATE_RAILS,
      rejectedImage: null,
    });
    expect(hasSectionArtwork(resolved)).toBe(true);
  });

  it("treats an explicit null image as the same as naming none", () => {
    expect(resolveSectionArtwork("blog", [descriptor("blog", { image: null })]).kind).toBe("plate");
  });

  it("renders a licensed still when it satisfies every rule", () => {
    const resolved = resolveSectionArtwork("contact", [
      descriptor("contact", { placement: "corner-bottom-left", opacity: 0.12, image: image("contact") }),
    ]);

    expect(resolved).toEqual({
      kind: "image",
      section: "contact",
      placement: "corner-bottom-left",
      opacity: 0.12,
      src: "/artwork/section-contact.webp",
      width: 1280,
      height: 720,
      title: "the Nebuchadnezzar interior",
      rights: "Warner Bros. — licensed for this site",
    });
  });

  it("passes a clamped opacity through to the resolution, so the layer cannot be overdriven", () => {
    const loud = resolveSectionArtwork("kpis", [descriptor("kpis", { opacity: 1 })]);
    const absent = resolveSectionArtwork("kpis", [descriptor("kpis", { opacity: 0 })]);

    expect(loud.kind === "plate" && loud.opacity).toBe(ARTWORK_OPACITY_MAX);
    expect(absent.kind === "plate" && absent.opacity).toBe(ARTWORK_OPACITY_MIN);
  });

  it("uses the last entry for a repeated section id rather than the first", () => {
    // A configuration read twice should behave like an override, not silently
    // render whichever entry happened to be declared first.
    const resolved = resolveSectionArtwork("kpis", [
      descriptor("kpis", { placement: "corner-top-left" }),
      descriptor("kpis", { placement: "corner-bottom-right" }),
    ]);

    expect(resolved.kind === "none" || resolved.placement).toBe("corner-bottom-right");
  });

  it("is total: it never throws, whatever it is handed", () => {
    const hostile: unknown[] = [
      null,
      undefined,
      42,
      "descriptors",
      {},
      // The single most likely mistake: one descriptor where a list was expected.
      descriptor("kpis"),
      [null],
      [{}],
      [{ section: "kpis" }],
      [{ section: "kpis", placement: "corner-top-left", image: 42 }],
      [{ section: "kpis", placement: "corner-top-left", image: {} }],
      [descriptor("kpis", { opacity: Number.NaN })],
    ];

    for (const descriptors of hostile) {
      const resolve = (): ReturnType<typeof resolveSectionArtwork> =>
        resolveSectionArtwork("kpis", descriptors as readonly SectionArtworkDescriptor[]);

      expect(() => resolve(), JSON.stringify(descriptors) ?? "undefined").not.toThrow();
      expect(resolve().kind, JSON.stringify(descriptors) ?? "undefined").not.toBe(undefined);
    }

    // And specifically: a single descriptor renders no artwork rather than
    // iterating an object's properties.
    expect(reasonOf(resolveSectionArtwork("kpis", descriptor("kpis") as never))).toBe(
      "not-configured",
    );
  });
});

/* ==========================================================================
   A LICENSED STILL
   ========================================================================== */

describe("the drop-in path for a real image", () => {
  it("has exactly one path per section, derived rather than written", () => {
    // The naming rule is the function, so there is no second and looser way for a
    // path to be valid, and a typo is a failing assertion rather than a broken
    // image found on a phone.
    for (const id of SECTION_ARTWORK_IDS) {
      for (const extension of ARTWORK_IMAGE_EXTENSIONS) {
        expect(artworkImageSrc(id, extension)).toBe(`${ARTWORK_IMAGE_DIR}section-${id}.${extension}`);
      }
    }
  });

  it("accepts only the derived path for that section", () => {
    expect(isArtworkImageSrc("kpis", "/artwork/section-kpis.webp")).toBe(true);
    expect(isArtworkImageSrc("kpis", "/artwork/section-kpis.jpg")).toBe(true);

    for (const src of [
      // Another section's file: a shared still is still two sections' worth of
      // credit to write, so one file per section is the rule.
      "/artwork/section-blog.webp",
      "/artwork/kpis.webp",
      "/artwork/section-kpis.gif",
      "/artwork/section-kpis",
      // Outside the directory, including the two shapes that would resolve to
      // something on disk.
      "artwork/section-kpis.webp",
      "/public/artwork/section-kpis.webp",
      // Absolute and protocol-relative URLs would send the reader's request to a
      // third party from a decorative layer.
      "https://example.com/section-kpis.webp",
      "//example.com/section-kpis.webp",
      "",
      null,
      42,
    ]) {
      expect(isArtworkImageSrc("kpis", src), String(src)).toBe(false);
    }
  });

  it("requires intrinsic dimensions, so nothing can shift when the still decodes", () => {
    const base = image("kpis") as NonNullable<SectionArtworkDescriptor["image"]>;

    expect(isRenderableArtworkImage("kpis", base)).toBe(true);

    for (const size of [0, -1280, 1280.5, Number.NaN, "1280", null, undefined]) {
      expect(isRenderableArtworkImage("kpis", { ...base, width: size }), `width ${String(size)}`).toBe(
        false,
      );
      expect(isRenderableArtworkImage("kpis", { ...base, height: size }), `height ${String(size)}`).toBe(
        false,
      );
    }
  });

  it("requires a credit with both halves filled in", () => {
    const base = image("kpis") as NonNullable<SectionArtworkDescriptor["image"]>;

    for (const half of [
      { title: "", rights: "Warner Bros." },
      { title: "   ", rights: "Warner Bros." },
      { title: "the Nebuchadnezzar interior", rights: "" },
      { title: "the Nebuchadnezzar interior", rights: "  " },
      { title: undefined, rights: "Warner Bros." },
      { title: 42, rights: "Warner Bros." },
    ]) {
      expect(
        isRenderableArtworkImage("kpis", { ...base, ...half }),
        JSON.stringify(half),
      ).toBe(false);
    }

    // A missing half is refused the same way as an empty one, which is what a
    // half-written descriptor looks like.
    expect(isRenderableArtworkImage("kpis", { src: base.src, width: base.width, height: base.height })).toBe(
      false,
    );
    expect(
      isRenderableArtworkImage("kpis", { ...base, rights: undefined }),
    ).toBe(false);
  });

  it("falls back to the drawn plate when the still is unusable, and says which path it refused", () => {
    /*
       Not a throw. A decorative layer that can 500 a page is a decorative layer
       that eventually will, and the reader's experience of a wrong `src` should be
       a page that looks finished.
    */
    const resolved = resolveSectionArtwork("experience", [
      descriptor("experience", { image: { ...(image("experience") as object), src: "/artwork/nope.png" } as never }),
    ]);

    expect(resolved.kind).toBe("plate");
    expect(resolved.kind === "plate" && resolved.rejectedImage).toBe("/artwork/nope.png");
  });

  it("falls back for an image object that is not an object at all", () => {
    for (const bad of [42, "section-kpis.webp", true, []]) {
      const resolved = resolveSectionArtwork("kpis", [
        descriptor("kpis", { image: bad as never }),
      ]);

      expect(resolved.kind, String(bad)).toBe("plate");
      expect(resolved.kind === "plate" && resolved.rejectedImage).toBeNull();
    }
  });
});