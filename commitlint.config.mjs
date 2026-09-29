/**
 * Conventional Commits contract.
 *
 * This file and `.releaserc.json` are two halves of one rule and they have to
 * agree: commitlint rejects a type that is not listed here, and the release
 * notes silently omit any type that has no section over there. A type present
 * in one and missing from the other is therefore a bug that no error message
 * ever reports — a commit can be accepted, version correctly, and still never
 * appear in the changelog.
 *
 * `tests/unit/config/release-contract.test.ts` asserts the two lists are
 * identical, so a type cannot be added to one place and forgotten in the other.
 */

/**
 * Single list of valid types, shared with `.releaserc.json` via that test.
 * `chore` and `ci` produce no version bump but must still be lintable, or the
 * only way to record infrastructure work is to write a malformed commit.
 */
export const COMMIT_TYPES = [
  "feat",
  "fix",
  "perf",
  "docs",
  "refactor",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

/** The rules, as a named const so the default export is not an anonymous object. */
const rules = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    /*
     * Release Please used to own the version number and is gone. This repo now
     * versions from Conventional Commits, so a malformed type has to fail the
     * build rather than produce a release that quietly skips a breaking change.
     *
     * `always` with the full list, not `never` with a deny-list: the failure
     * mode of an unknown type is a *missing* version bump, which is exactly the
     * kind of bug nobody notices until a user reports a missing fix.
     */
    "type-enum": [2, "always", COMMIT_TYPES],

    /*
     * Lower-case, no trailing period. The subject is what ends up in the
     * changelog, so "Add feature." reads badly in a list of real changes and
     * a trailing period breaks the sentence-style summaries people scan.
     */
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],

    /*
     * A blank subject produces a changelog entry with nothing in it, which is
     * worse than no entry: it looks like a release happened and says nothing
     * about what changed.
     */
    "subject-full-stop": [2, "never", "."],

    /*
     * 100 characters. Not a law, but the changelog is a table of one-line
     * descriptions, and a subject that does not fit one line has usually
     * stopped being a summary and started being a paragraph.
     */
    "header-max-length": [2, "always", 100],

    /*
     * The body is optional, but when present it has to explain *why*. The scope
     * is optional too — a repo this size does not need one on every commit.
     */
    "body-max-line-length": [2, "always", 100],
  },
};

export default rules;
