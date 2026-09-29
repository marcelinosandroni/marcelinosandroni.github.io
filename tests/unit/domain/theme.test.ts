import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_ID,
  THEME_ATTRIBUTE,
  THEME_IDS,
  THEME_STORAGE_KEY,
  isThemeId,
  normalizeThemeId,
  readThemePreference,
  resolveTheme,
} from "@/domain/theme/theme";

/**
 * Multiple themes, decided before any of them were written.
 *
 * The mechanism is one CSS custom property per token. Tailwind v4 compiles
 * `.bg-surface-base` to `background-color: var(--color-surface-base)`, and there
 * are 136 such utilities across 24 files. Overriding the *variable* under
 * `[data-theme="..."]` therefore restyles all 136 without editing a single
 * component — the only reason this is affordable, and the reason the invariants
 * below are about completeness rather than about appearance.
 *
 * A theme that omits a token does not fail to load. It silently inherits that
 * value from the previous theme, and the result is a page that is 95% right,
 * which is far harder to notice than a page that is obviously broken. So
 * completeness is asserted here, against the CSS source, and every theme has to
 * define the full set.
 */

const root = resolve(__dirname, "../../..");
const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");

/** Every `--color-*` declared anywhere in the file. */
const BASE_TOKENS: string[] = [
  ...new Set([...css.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((match) => match[1])),
].sort();

/** The `[data-theme="..."]` blocks, in source order. */
function themeBlocks(): Map<string, string> {
  const blocks = new Map<string, string>();
  const pattern = /\[data-theme="([a-z0-9-]+)"\]\s*\{([^}]*)\}/g;

  for (const match of css.matchAll(pattern)) {
    blocks.set(match[1], match[2]);
  }

  return blocks;
}

describe("theme contract", () => {
  it("found the base tokens to compare against", () => {
    // A zero-length list would make every completeness assertion below pass
    // vacuously, so the count is pinned rather than assumed.
    expect(BASE_TOKENS.length).toBeGreaterThan(25);
    expect(BASE_TOKENS).toContain("--color-surface-base");
    expect(BASE_TOKENS).toContain("--color-text-primary");
  });

  it("declares at least two themes, so there is something to switch between", () => {
    expect(THEME_IDS.length).toBeGreaterThanOrEqual(2);
  });

  it("has a default that is one of the declared themes", () => {
    expect(THEME_IDS).toContain(DEFAULT_THEME_ID);
  });

  it("uses unique, url-safe identifiers", () => {
    for (const id of THEME_IDS) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }

    expect(new Set(THEME_IDS).size).toBe(THEME_IDS.length);
  });

  it("rejects an unknown id rather than accepting it", () => {
    expect(isThemeId(THEME_IDS[0])).toBe(true);
    expect(isThemeId("not-a-theme")).toBe(false);
    expect(isThemeId("")).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });
});

describe("theme selection is fail-safe", () => {
  it("falls back to the default for anything unrecognised", () => {
    /*
     * A stored value from a removed theme, a hand-edited one, or an empty
     * string must not leave the page without colours. An unknown value resolves
     * to the default rather than to nothing, because an invisible page is a much
     * worse outcome than a theme the reader did not choose.
     */
    expect(normalizeThemeId("nope")).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId("")).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME_ID);
  });

  it("keeps a valid stored value", () => {
    for (const id of THEME_IDS) {
      expect(normalizeThemeId(id)).toBe(id);
    }
  });

  it("prefers an explicit request over a stored preference", () => {
    const other = (THEME_IDS.find((id) => id !== DEFAULT_THEME_ID) ?? THEME_IDS[0]) as string;

    expect(resolveTheme(other, DEFAULT_THEME_ID)).toBe(other);
    expect(resolveTheme(null, other)).toBe(other);
    expect(resolveTheme(null, null)).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme("garbage", other)).toBe(other);
  });

  it("reads a stored preference without throwing when storage is unavailable", () => {
    /*
     * Private browsing, a blocked context and a server render all look like "no
     * storage". Reading must not throw, because this runs before the first paint.
     */
    const throwing = {
      getItem: (): string | null => {
        throw new Error("denied");
      },
    } as unknown as Pick<Storage, "getItem">;

    expect(readThemePreference(throwing)).toBeNull();

    const empty = { getItem: (): string | null => null } as unknown as Pick<Storage, "getItem">;
    expect(readThemePreference(empty)).toBeNull();

    const good = {
      getItem: (): string | null => THEME_IDS[1] ?? THEME_IDS[0],
    } as unknown as Pick<Storage, "getItem">;
    expect(readThemePreference(good)).toBe(THEME_IDS[1] ?? THEME_IDS[0]);
  });

  it("uses one storage key and one attribute, so there is nothing to drift", () => {
    expect(THEME_STORAGE_KEY).toBe("msd:theme:v1");
    expect(THEME_ATTRIBUTE).toBe("data-theme");
  });
});

describe("every theme is complete", () => {
  const blocks = themeBlocks();

  it("has a CSS block for every declared theme", () => {
    for (const id of THEME_IDS) {
      expect(blocks.has(id), `theme "${id}" is declared in TypeScript but has no [data-theme] block`).toBe(
        true,
      );
    }
  });

  it("has no orphan CSS block for a theme that does not exist", () => {
    for (const id of blocks.keys()) {
      expect(THEME_IDS, `[data-theme="${id}"] has no matching theme id`).toContain(id as never);
    }
  });

  it.each(THEME_IDS)("theme %s overrides every colour token", (id) => {
    const block = blocks.get(id) ?? "";
    const defined = new Set([...block.matchAll(/(--color-[a-z0-9-]+):/g)].map((match) => match[1]));

    const missing = BASE_TOKENS.filter((token) => !defined.has(token));

    expect(
      missing,
      `theme "${id}" is missing ${missing.length} token(s); it would silently inherit them. Copy the @theme block and change every colour.`,
    ).toEqual([]);
  });

  it.each(THEME_IDS)("theme %s defines real colours, not references or placeholders", (id) => {
    const block = blocks.get(id) ?? "";
    const values = [...block.matchAll(/--color-[a-z0-9-]+:\s*([^;]+);/g)].map((match) =>
      match[1].trim(),
    );

    expect(values.length).toBeGreaterThan(0);

    for (const value of values) {
      // A `var()` reference inside a theme block defeats the whole mechanism:
      // the theme would point at whatever was defined before it, so switching
      // would be a no-op that looks like it worked.
      expect(value, `theme "${id}" resolves a token instead of defining it`).not.toMatch(/^var\(/);

      // Textual placeholders only. A *hex* value is never treated as a
      // placeholder: `#000000` is the matrix ground and `#ffffff` is the paper
      // raised surface, both deliberate. Rejecting them would have made the two
      // most obvious themes impossible to write.
      expect(value.toLowerCase(), `theme "${id}" has a placeholder value`).not.toMatch(
        /^(todo|tbd|xxx+|changeme|placeholder|lorem ipsum|fixme|\?+)$/,
      );
    }
  });

  it("restates the base theme, so themes are comparable in one place", () => {
    /*
     * The default theme does not strictly need a block — it applies when no
     * attribute is present. But then its values would live only in `@theme`,
     * and a reviewer comparing themes would be comparing a block against a
     * different place. This asserts the default is a real, findable declaration.
     */
    expect(blocks.has(DEFAULT_THEME_ID)).toBe(true);
  });
});
