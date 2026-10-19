import { resolve } from "node:path";

import { convertHtmlToPdf } from "./html-to-pdf";
import { variants } from "./data/stack-variants.pt-br";

/**
 * Renders one PDF per stack variant.
 *
 * ## Why this is a script and not a chain in `package.json`
 *
 * Because the chain was written out by hand, with one `html-to-pdf` invocation per
 * variant, and it had fallen behind: a fourth variant was added to the data, built
 * cleanly, passed the layout contract, and produced no PDF at all. Nothing failed.
 * The verifier caught it, which is the only reason it was found before a recruiter
 * did - and a check that exists because a writer forgot to update a package script is
 * a check standing in for the thing it should be.
 *
 * So the list is read from the variant data, and the order the documents are rendered
 * in is the order they are written in.
 *
 * ## What it does not decide
 *
 * The artifact filenames. Those live in `src/infrastructure/pdf/fixed-resume-artifact.ts`
 * and are asserted by `scripts/verify-fixed-artifacts.ts`, and the two have to agree -
 * but the artifact name is a serving concern and this is a build concern, so neither
 * derives from the other. What `verify-fixed-artifacts.ts` checks is that every file
 * this produced exists and has the right page count.
 */
async function main(): Promise<void> {
  for (const variant of variants) {
    await convertHtmlToPdf({
      input: resolve(`resume-recruiter-pt-br-${variant.slug}.html`),
      output: resolve(`public/artifacts/fixed/resume-fixed-pt-BR-${variant.slug}.pdf`),
      /*
        The set is two A4 sheets and always has been - page one sells the profile,
        page two carries the experience. Asserting it here rather than only in
        `verify-fixed-artifacts.ts` means the document that broke it is the one named
        in the error, instead of a filename in a list.
      */
      expectPages: 2,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
