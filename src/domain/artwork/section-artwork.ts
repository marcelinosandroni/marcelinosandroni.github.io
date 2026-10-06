/**
 * The per-section artwork slot.
 *
 * ## What this file is for
 *
 * The site owner asked for "images of the most striking scenes from the Matrix
 * film in each section, or some as backgrounds at the sides, in a minimalist
 * modern way ... not calling attention to itself directly but being a detail".
 * Film stills cannot be committed to this repository, so what is actually
 * valuable here is the *slot*: a rule set that says which sections may carry art,
 * how strong it may be, where it may sit, and what happens when there is nothing
 * to show. The picture itself is configuration; everything below is policy.
 *
 * Two consequences shaped the shape of this module:
 *
 *  1. **The current state has no artwork at all**, and that state must cost zero
 *     requests and zero bytes. So `DEFAULT_SECTION_ARTWORK` is empty, and
 *     `resolveSectionArtwork` returns `{ kind: "none" }` for every section on
 *     every page until an entry is added. Nothing here may "helpfully" fall back
 *     to a default picture.
 *  2. **No film still can ship**, so the fallback treatment is drawn in code —
 *     see `buildArtworkPlate` in `@/components/artwork/section-artwork`. A
 *     missing image must look *designed*, because that is the state the site is
 *     in right now.
 *
 * ## The one number that decides whether this feature is a detail or a feature
 *
 * `ARTWORK_OPACITY_MAX = 0.14`. The owner's requirement was that "a reader who
 * never notices it has still had a good experience", which is a constraint on
 * the *worst* case rather than on the intended one — so the number is a ceiling,
 * and the ceiling is the number worth arguing about. Three arguments:
 *
 *  - **It is provably legible.** The plate's brightest pixel is the accent token
 *    at the layer's own alpha, composited over the section surface. Measured
 *    against the themes' real tokens (see the contrast assertions in
 *    `tests/unit/domain/section-artwork.test.ts`, which read `globals.css`
 *    rather than trusting these comments), body text at `--color-text-secondary`
 *    still clears **5.6:1** over that pixel on all three themes — 5.61 on carbon,
 *    6.38 on paper, 6.90 on matrix — against the 4.5:1 WCAG AA floor. So 0.14 is
 *    not "low enough that we hope nobody notices": it is the point at which AA is
 *    the *binding* constraint, and the next increment up would be a decision
 *    about text colour instead of about artwork.
 *
 *  - **It sits inside the site's own vocabulary.** The strongest decorative tint
 *    the site already ships is `bg-primary-container/10` on the contact card
 *    (`src/components/home/contact-gateway.tsx:55`); the diffused backdrops
 *    elsewhere are `/5`. The plate is not a blur — it has line structure, so it
 *    reads with more weight at the same alpha than a bloom does — which is why
 *    0.14 and not 0.10, and why it is still a hard stop rather than a default.
 *
 *  - **Zero is not expressible.** `clampArtworkOpacity` floors at
 *    `ARTWORK_OPACITY_MIN`, so "make it invisible" is not a thing a descriptor
 *    can do. The only way to turn the artwork off is to delete the descriptor,
 *    which is a visible act in a diff. A layer you can dial to nothing is a
 *    layer that will be dialled up again by whoever thinks the page looks empty.
 *
 * `ARTWORK_OPACITY_DEFAULT = 0.09` is the middle of the range and the value a
 * descriptor gets by not naming one.
 *
 * ## Why every rule here is a refusal
 *
 * The shape mirrors `@/domain/easter-egg`: the resolver is a chain of ways to
 * decline to draw. A wrong section id, a missing descriptor, a placement that is
 * not in the vocabulary and an image that breaks the naming rule each produce
 * *nothing*, never a guess. The generated plate is not a "best effort" — it is
 * an explicit choice, made only when the caller has asked for artwork and the
 * only image available is the drawn one.
 *
 * Pure module: no React, no DOM, no CSS, no framework. Everything here is a
 * value or a total function over values, which is what makes the policy
 * testable without a browser.
 */

/**
 * The sections that may carry art, in page order.
 *
 * A closed vocabulary rather than "any section that wants some", because the
 * failure mode of an open set is six identical decorations nobody chose. Two
 * sections are deliberately absent and both absences are decisions:
 *
 *  - **`top` (the hero).** It is the arrival, it carries the LCP, and it already
 *    carries two diffused radial backdrops and the portrait frame. A third
 *    decorative layer competes with the `<h1>` for the first second a reader
 *    spends on the page, and "detail" is the opposite of that.
 *  - **`footer`.** A five-column link tree plus the legal note, with no reading
 *    axis to sit beside. Art at the edge of a footer reads as an advert for the
 *    footer, and the last impression of a portfolio should be its links.
 */
export const SECTION_ARTWORK_IDS = ["kpis", "arsenal", "experience", "blog", "contact"] as const;

export type SectionArtworkId = (typeof SECTION_ARTWORK_IDS)[number];

/** Every home section id, including the two that may not carry art. */
export const HOME_SECTION_IDS = ["top", ...SECTION_ARTWORK_IDS, "footer"] as const;

/**
 * Where in the section the plate sits.
 *
 * Corners only, never the middle of the band: a centre placement is the one
 * shape that puts art behind body copy, and the vocabulary exists so that
 * placement cannot be chosen by typing a string into a stylesheet.
 */
export const SECTION_ARTWORK_PLACEMENTS = [
  "corner-top-left",
  "corner-top-right",
  "corner-bottom-left",
  "corner-bottom-right",
] as const;

export type SectionArtworkPlacement = (typeof SECTION_ARTWORK_PLACEMENTS)[number];

/**
 * The recommended corner per section.
 *
 * Two rules produced this table and both are worth keeping:
 *
 *  1. **Not under a heading.** `kpis` and `experience` render `SectionHeading`,
 *     which places its note in the *right* column at `md` and up
 *     (`src/components/ui/primitives.tsx:55`), so both are given bottom corners.
 *     `blog`'s top row carries the section's CTA link on the right, so it is
 *     given the top-left. Only `arsenal` and `contact`, whose headers are a
 *     single left-aligned block, get a top corner.
 *  2. **Alternating sides down the page.** Left, right, right, left, left is not
 *     a pattern; what matters is that no two *neighbouring* sections put art in
 *     the same corner row, so scrolling reads as a rhythm instead of a stack of
 *     decorations.
 *
 * This is a recommendation, not a default: an unconfigured section renders
 * nothing, and the resolver never consults this table on its own.
 */
export const RECOMMENDED_ARTWORK_PLACEMENT: Readonly<
  Record<SectionArtworkId, SectionArtworkPlacement>
> = {
  kpis: "corner-bottom-left",
  arsenal: "corner-top-right",
  experience: "corner-bottom-right",
  blog: "corner-top-left",
  contact: "corner-bottom-left",
};

/**
 * Intensity bounds. See the module header for why `0.14` is the number and why
 * zero is unreachable.
 */
export const ARTWORK_OPACITY_MIN = 0.05;
export const ARTWORK_OPACITY_MAX = 0.14;
export const ARTWORK_OPACITY_DEFAULT = 0.09;

/**
 * The plate's intrinsic box, in user units.
 *
 * Also written to the DOM as `width`/`height` on the `<img>` branch's sibling
 * frame, which is what lets the generated treatment reserve space before it
 * paints instead of after.
 */
export const ARTWORK_PLATE_WIDTH = 320;
export const ARTWORK_PLATE_HEIGHT = 440;

/**
 * The generated plate's seed.
 *
 * Fixed, like `buildMatrixColumns`' default in `@/components/effects/matrix-rain`
 * and for the same reason: this renders on the server as well as the client, so
 * `Math.random()` would produce two different plates and React would report a
 * hydration mismatch on every load. 1999-14 is the year of the reference; the
 * value only has to be stable.
 */
export const ARTWORK_PLATE_SEED = 1_999_014;

/** Rain columns drawn in the generated plate. */
export const ARTWORK_PLATE_COLUMNS = 16;

/** Horizontal rails in the generated plate's perspective grid. */
export const ARTWORK_PLATE_RAILS = 6;

/**
 * Where licensed stills live.
 *
 * One file per section, named for the section, in `public/`. The rule is
 * mechanical on purpose: `src` is always derivable from the section id and the
 * extension, so a mistyped path is a failing assertion rather than a broken image
 * discovered on a phone. See `docs/section-artwork.md` for the licence and the
 * credit requirement.
 */
export const ARTWORK_IMAGE_DIR = "/artwork/";

export const ARTWORK_IMAGE_EXTENSIONS = ["avif", "webp", "jpg", "png"] as const;

export type ArtworkImageExtension = (typeof ARTWORK_IMAGE_EXTENSIONS)[number];

/**
 * A licensed still, and the attribution that must travel with it.
 *
 * `title` and `rights` are required rather than optional. A film still on a
 * portfolio is a use of someone else's copyrighted work, and the only part of
 * attribution that is hard to add later is the part that was never typed. Making
 * them required means the compiler asks for the credit at the same time it asks
 * for the path.
 */
export type SectionArtworkImage = {
  /** Must equal `artworkImageSrc(section, extension)`. */
  readonly src: string;
  /** Intrinsic pixels. Declared so nothing can shift when the image decodes. */
  readonly width: number;
  readonly height: number;
  /** What the frame depicts, e.g. `the Nebuchadnezzar interior`. */
  readonly title: string;
  /** Who holds the rights and under what licence. */
  readonly rights: string;
};

export type SectionArtworkDescriptor = {
  readonly section: SectionArtworkId;
  readonly placement: SectionArtworkPlacement;
  /** Omitted means `ARTWORK_OPACITY_DEFAULT`; out of range is clamped, not refused. */
  readonly opacity?: number;
  /** `null`/`undefined` means "draw the generated plate". */
  readonly image?: SectionArtworkImage | null;
};

/**
 * Why nothing was drawn.
 *
 * Every value is permanent: a wrong configuration renders nothing rather than
 * something plausible, so these are the strings to grep for when a section
 * mysteriously has no art.
 */
export type SectionArtworkSkipReason =
  /** The id is not a section at all, or is one of the two that may not carry art. */
  | "not-decorative"
  /** No descriptor exists for this section. This is today's state on every section. */
  | "not-configured"
  /** The placement is not in `SECTION_ARTWORK_PLACEMENTS`. */
  | "invalid-placement";

export type ResolvedSectionArtworkNone = {
  readonly kind: "none";
  readonly section: string;
  readonly reason: SectionArtworkSkipReason;
};

export type ResolvedSectionArtworkPlate = {
  readonly kind: "plate";
  readonly section: SectionArtworkId;
  readonly placement: SectionArtworkPlacement;
  readonly opacity: number;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly rails: number;
  /**
   * The `src` that was refused, when a descriptor named an image and it did not
   * satisfy the naming or credit rule. `null` when no image was named.
   *
   * Reported rather than thrown: the correct outcome for a bad path is a page
   * that looks finished, not a 500 from a decorative layer.
   */
  readonly rejectedImage: string | null;
};

export type ResolvedSectionArtworkImage = {
  readonly kind: "image";
  readonly section: SectionArtworkId;
  readonly placement: SectionArtworkPlacement;
  readonly opacity: number;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly rights: string;
};

/** The two resolutions that actually draw something. */
export type DrawnSectionArtwork = ResolvedSectionArtworkPlate | ResolvedSectionArtworkImage;

export type ResolvedSectionArtwork =
  | ResolvedSectionArtworkNone
  | ResolvedSectionArtworkPlate
  | ResolvedSectionArtworkImage;

/**
 * The shipped configuration: **empty**.
 *
 * Not an oversight and not a placeholder to be filled in before review. Adding an
 * entry here is what makes a section carry art, and that is a visual change the
 * owner should make on purpose — see `docs/section-artwork.md` and the
 * recommended placements above.
 */
export const DEFAULT_SECTION_ARTWORK: readonly SectionArtworkDescriptor[] = [];

/** Narrow guard. Deliberately narrow: an unrecognised id is not a section. */
export function isSectionArtworkId(value: unknown): value is SectionArtworkId {
  return typeof value === "string" && (SECTION_ARTWORK_IDS as readonly string[]).includes(value);
}

/** Narrow guard for the placement vocabulary. */
export function isSectionArtworkPlacement(value: unknown): value is SectionArtworkPlacement {
  return (
    typeof value === "string" && (SECTION_ARTWORK_PLACEMENTS as readonly string[]).includes(value)
  );
}

/**
 * Forces an opacity into the legal range.
 *
 * Clamps rather than refuses, because a number outside the range is a typo and
 * a typo should cost a slightly wrong tint rather than a missing layer. `NaN`
 * becomes the default rather than the floor, since `NaN` is what a
 * `Number(undefined)` or a parse of a hand-edited config produces and it means
 * "no opinion", not "as faint as possible".
 */
export function clampArtworkOpacity(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return ARTWORK_OPACITY_DEFAULT;
  }

  if (!Number.isFinite(value)) {
    return value > 0 ? ARTWORK_OPACITY_MAX : ARTWORK_OPACITY_MIN;
  }

  return Math.min(ARTWORK_OPACITY_MAX, Math.max(ARTWORK_OPACITY_MIN, value));
}

/** The one path a section's image is allowed to have. */
export function artworkImageSrc(
  section: SectionArtworkId,
  extension: ArtworkImageExtension,
): string {
  return `${ARTWORK_IMAGE_DIR}section-${section}.${extension}`;
}

/**
 * Whether `src` is the path this section's image is required to have.
 *
 * Compared against the derived value rather than pattern-matched, so the check
 * *is* the naming rule: there is no second, looser way for a path to be valid.
 */
export function isArtworkImageSrc(section: SectionArtworkId, src: unknown): boolean {
  if (typeof src !== "string") {
    return false;
  }

  for (const extension of ARTWORK_IMAGE_EXTENSIONS) {
    if (src === artworkImageSrc(section, extension)) {
      return true;
    }
  }

  return false;
}

/** A positive integer number of pixels, and nothing else. */
function isPixelSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** A credit is two non-empty strings. An empty credit is not a credit. */
function isAttribution(value: unknown): value is { title: string; rights: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { title, rights } = value as { title?: unknown; rights?: unknown };

  return (
    typeof title === "string" && title.trim().length > 0 &&
    typeof rights === "string" && rights.trim().length > 0
  );
}

/**
 * Whether an `image` field may be rendered, rather than falling back to the
 * generated plate.
 *
 * Four separate reasons to refuse, all of which have shipped as real mistakes in
 * one codebase or another: a path that breaks the naming rule, dimensions that
 * were never measured, and a credit with an empty half.
 */
export function isRenderableArtworkImage(section: SectionArtworkId, image: unknown): boolean {
  if (typeof image !== "object" || image === null) {
    return false;
  }

  const candidate = image as Partial<SectionArtworkImage>;

  return (
    isArtworkImageSrc(section, candidate.src) &&
    isPixelSize(candidate.width) &&
    isPixelSize(candidate.height) &&
    isAttribution({ title: candidate.title, rights: candidate.rights })
  );
}

/**
 * Finds the descriptor for a section, or `undefined`.
 *
 * Last entry wins for a repeated section id, matching how a configuration read
 * twice should behave rather than silently rendering whichever came first.
 */
function findDescriptor(
  section: SectionArtworkId,
  descriptors: readonly SectionArtworkDescriptor[],
): SectionArtworkDescriptor | undefined {
  let found: SectionArtworkDescriptor | undefined;

  for (const descriptor of descriptors) {
    if (descriptor?.section === section) {
      found = descriptor;
    }
  }

  return found;
}

/**
 * The resolution rule: section id plus configuration in, one decision out.
 *
 * Total. Every input — including `undefined`, a wrong type, a descriptor from a
 * future version of this file — produces a value, because the caller is a
 * Server Component rendering a page and there is nothing useful it could do with
 * an exception.
 *
 * The order is the most permanent reason first, so the reported `reason` is the
 * one that would still be true after the others were fixed:
 *
 *  1. **The section may not carry art.** Permanent: it is a statement about the
 *     page, not about configuration.
 *  2. **No descriptor.** This is the shipped state for every section, and the
 *     reason the whole feature costs nothing today.
 *  3. **The placement is not in the vocabulary.** Refused rather than defaulted,
 *     because a defaulted placement is art in a place nobody chose, and the two
 *     horizontal options that remain are exactly the ones that put art behind the
 *     heading.
 *
 * `descriptors` is checked for being an array rather than trusted: a caller that
 * passes a single object instead of a list gets a page with no artwork, not a
 * `TypeError` from a decorative layer.
 */
export function resolveSectionArtwork(
  section: string,
  descriptors: readonly SectionArtworkDescriptor[] = DEFAULT_SECTION_ARTWORK,
): ResolvedSectionArtwork {
  if (!isSectionArtworkId(section)) {
    return { kind: "none", section: String(section), reason: "not-decorative" };
  }

  const descriptor = findDescriptor(section, Array.isArray(descriptors) ? descriptors : []);

  if (descriptor === undefined) {
    return { kind: "none", section, reason: "not-configured" };
  }

  if (!isSectionArtworkPlacement(descriptor.placement)) {
    return { kind: "none", section, reason: "invalid-placement" };
  }

  const opacity = clampArtworkOpacity(descriptor.opacity);
  const image = descriptor.image;

  if (image !== undefined && image !== null && isRenderableArtworkImage(section, image)) {
    return {
      kind: "image",
      section,
      placement: descriptor.placement,
      opacity,
      src: image.src,
      width: image.width,
      height: image.height,
      title: image.title,
      rights: image.rights,
    };
  }

  return {
    kind: "plate",
    section,
    placement: descriptor.placement,
    opacity,
    seed: ARTWORK_PLATE_SEED,
    width: ARTWORK_PLATE_WIDTH,
    height: ARTWORK_PLATE_HEIGHT,
    columns: ARTWORK_PLATE_COLUMNS,
    rails: ARTWORK_PLATE_RAILS,
    rejectedImage:
      typeof image === "object" && image !== null && typeof image.src === "string"
        ? image.src
        : null,
  };
}

/**
 * Whether a resolution draws anything at all. The single question the island asks.
 *
 * A type predicate rather than a plain boolean so the `null` return narrows the
 * union for the caller: the drawing code below never has to re-check `kind`.
 */
export function hasSectionArtwork(resolved: ResolvedSectionArtwork): resolved is DrawnSectionArtwork {
  return resolved.kind !== "none";
}