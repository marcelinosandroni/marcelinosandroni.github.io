import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { COMMIT_TYPES } from "../../../commitlint.config.mjs";

/**
 * The version number and the changelog are derived from the same Conventional
 * Commit types, but by two independent pieces of configuration: commitlint
 * decides which types are legal, and `.releaserc.json` decides which types move
 * the version and which get a changelog section.
 *
 * When those two lists drift apart the failure is invisible. A commit with a
 * valid type that has no changelog section still gets versioned, still gets
 * tagged, and still produces a release — it just never appears in the notes.
 * A type that bumps the version but is not in the commitlint enum is worse: it
 * can be merged from a terminal, where nothing validates the message, and the
 * bump then never happens at all.
 *
 * So the invariant asserted here is not "the version numbers are right" — that
 * is semantic-release's job and is not reproducible without a network. It is
 * that the configuration cannot describe a commit which both passes lint and
 * disappears from the release.
 */

const root = resolve(__dirname, "../../..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8")) as T;
}

interface PresetType {
  type: string;
  section: string;
  hidden?: boolean;
}

interface ReleasercShape {
  branches: string[];
  tagFormat: string;
  npmPublish: boolean;
  plugins: Array<string | [string, Record<string, unknown>]>;
}

interface ManifestShape {
  name: string;
  version: string;
  private: boolean;
}

const RELEASERC = readJson<ReleasercShape>(".releaserc.json");
const MANIFEST = readJson<ManifestShape>("package.json");

/** The `presetConfig.types` list is duplicated across two plugin entries on purpose. */
function presetTypes(index: number): PresetType[] {
  const [, options] = RELEASERC.plugins[index] as [string, { presetConfig: { types: PresetType[] } }];
  return options.presetConfig.types;
}

const ANALYZER_TYPES = presetTypes(0);
const NOTES_TYPES = presetTypes(1);
const RELEASE_RULES = (RELEASERC.plugins[0] as [string, { releaseRules: Array<{ type?: string; breaking?: boolean; release: string }> }])[1]
  .releaseRules;

describe("release contract", () => {
  it("never publishes the package to a registry", () => {
    /*
     * `npmPublish` defaults to true. Left unset, the first release would try to
     * push a private application package to the public registry and fail after
     * having already tagged and bumped, which is a much worse failure than
     * doing nothing.
     */
    expect(RELEASERC.npmPublish).toBe(false);
    expect(MANIFEST.private).toBe(true);
  });

  it("releases from main with a plain v-prefixed tag", () => {
    /*
     * `compile-pdf.yml` triggers on `v*.*.*` and strips a leading `v` to build
     * the PDF filenames. A tag format that dropped or doubled the prefix would
     * silently stop the resume PDFs from being published.
     */
    expect(RELEASERC.branches).toEqual(["main"]);
    expect(RELEASERC.tagFormat).toBe("v${version}");
    expect(RELEASERC.tagFormat).toMatch(/^v\$\{version\}$/);
  });

  it("gives every type that moves the version a changelog section", () => {
    const sectionTypes = new Set(NOTES_TYPES.map((entry) => entry.type));

    const bumped = RELEASE_RULES.filter((rule) => rule.type).map((rule) => rule.type as string);

    for (const type of bumped) {
      expect(sectionTypes, `${type} bumps the version but has no changelog section`).toContain(type);
    }
  });

  it("uses the same changelog sections for the analyzer and the notes", () => {
    /*
     * The analyzer and the notes generator take independent copies of this
     * list. If one gains a type the other lacks, commits land in one and not the
     * other — and the release still succeeds.
     */
    expect(ANALYZER_TYPES).toEqual(NOTES_TYPES);
  });

  it("accepts a commit type for every version-bumping type", () => {
    /*
     * The converse of the section check: if `fix` could move the version, a
     * `fix` commit has to be something commitlint accepts. Otherwise a bug fix
     * written on a branch would be rejected in review or, worse, merged and
     * never counted.
     */
    for (const rule of RELEASE_RULES) {
      if (!rule.type) continue;
      expect(COMMIT_TYPES, `${rule.type} bumps the version but commitlint rejects it`).toContain(rule.type);
    }
  });

  it("keeps every type in both configurations accounted for", () => {
    /*
     * Types that are lintable but neither bump nor are listed are recorded in
     * the history and nothing else. That is intentional for `chore`, `ci` and
     * `build`, but it has to be a decision, so each one is named explicitly
     * rather than falling through by accident.
     */
    const sectionTypes = new Set(NOTES_TYPES.map((entry) => entry.type));
    const bumpTypes = new Set(RELEASE_RULES.filter((r) => r.type).map((r) => r.type as string));
    const silent = COMMIT_TYPES.filter((type) => !sectionTypes.has(type) && !bumpTypes.has(type));

    expect(silent.sort()).toEqual(["build", "chore", "ci", "docs", "refactor", "test"]);
  });

  it("treats a breaking change as a major bump regardless of its type", () => {
    const breaking = RELEASE_RULES.find((rule) => rule.breaking);

    expect(breaking).toBeDefined();
    expect(breaking?.release).toBe("major");
  });

  it("exposes a current version that is plain semver", () => {
    /*
     * The footer renders `v${SITE_VERSION}` straight from this string, and the
     * test name in the assertion below is what makes a stray `v` prefix or a
     * placeholder like `0.0.0-PLACEHOLDER` fail rather than ship.
     */
    expect(MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(MANIFEST.version).not.toBe("0.0.0");
  });

  it("keeps the version single-sourced in package.json", () => {
    /*
     * `.releaserc.json` must not carry a version of its own, and the old
     * `.release-please-manifest.json` is gone. Two files holding the number is
     * how 0.1.5 stayed put while the automation reported success.
     */
    const releasercText = readFileSync(resolve(root, ".releaserc.json"), "utf8");

    expect(releasercText).not.toMatch(/"\d+\.\d+\.\d+"/);
  });
});
