import { resolve } from "node:path";

import { convertHtmlToPdf } from "./html-to-pdf";
import { VARIANTS_EN } from "./data/stack-variants.en-us";

/**
 * Renders the English stack variants, one PDF each.
 *
 * The mirror of `render-variant-pdfs.ts`, which does the same for the Portuguese
 * set. Separate rather than a locale parameter because the two differ in more than
 * the locale: the Portuguese set renders from `variants`, this one from
 * `VARIANTS_EN`, and the artifact names carry the locale in them.
 *
 * The list is read from the data, so a sixth variant in either language is rendered
 * without this file being touched — the failure this replaces was a hand-written list
 * that had already fallen behind by one.
 */
async function main(): Promise<void> {
  for (const variant of VARIANTS_EN) {
    await convertHtmlToPdf({
      input: resolve(`resume-recruiter-en-us-${variant.slug}.html`),
      output: resolve(`public/artifacts/fixed/resume-fixed-en-US-${variant.slug}.pdf`),
      expectPages: 2,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
