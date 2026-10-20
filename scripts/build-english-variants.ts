import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { TIMELINE_EN, translateResumeToEnglish } from "./build-english-resume";
import { renderVariant } from "./data/variant-render";
import { VARIANTS_EN } from "./data/stack-variants.en-us";

/**
 * Builds the English stack variants.
 *
 * ## Why from the shell, like the Portuguese ones
 *
 * Because a variant is the shared shell with five things replaced, in any language.
 * `build-stack-variants.ts` builds the Portuguese set by swapping Portuguese content
 * into the shell; this builds the English set by swapping English content into the
 * same shell and then translating what the shell itself carries.
 *
 * The alternative — translating the finished Portuguese variant — was the first thing
 * tried and it does not hold up. The Portuguese variant's sentences are the `from`
 * side of a rule set, so a rule that stops matching is either a missing translation or
 * a leftover, and the two are indistinguishable from the rule. Building from the
 * shell means the Portuguese text is never matched at all: it is replaced before
 * translation begins, so there is nothing to leave behind.
 *
 * ## Why the experience rules apply to only one variant
 *
 * `enterprise-java` is the one variant that declares no roles, so its experience is
 * the shell's — the same eleven sentences the general résumé carries, and the ones
 * `TEXT_EXPERIENCE` translates. The other four declare their own experience, which is
 * written here in English, so those sentences never appear and the rules must not be
 * required to match.
 *
 * That difference is a fact about each document, and `translateResumeToEnglish` takes
 * it as `shellContent` rather than inferring it, because inferring "does this variant
 * have the shell's experience" from the presence of a rules list is the kind of check
 * that passes for the wrong reason.
 */
async function main(): Promise<void> {
  const shell = await fs.readFile(resolve("resume-shell.html"), "utf8");

  for (const variant of VARIANTS_EN) {
    const flat = renderVariant(shell, { ...variant, timeline: TIMELINE_EN });

    const { html, pages } = await translateResumeToEnglish(flat, variant.slug, {
      shellContent: variant.roles === undefined ? "experience" : "none",
    });

    const target = `resume-recruiter-en-us-${variant.slug}.html`;

    await fs.writeFile(resolve(target), html, "utf8");

    console.log(`wrote ${target} (${html.length} chars, ${pages} pages)`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
