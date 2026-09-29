import { ResumeVersion } from "@/domain/publication/resume-version";

/**
 * The one place the current resume version is written down.
 *
 * It used to be `ResumeVersion.create("0.1.28")` inline in
 * `app/api/resume/[locale]/pdf/route.ts` — a magic string in a route handler,
 * with no second source and no rule attached. Two consequences: the version that
 * names a PDF was invisible from the rest of the codebase, and nothing stopped it
 * from drifting away from the document it claims to describe.
 *
 * The rule it now exists to enforce is simple and worth stating: **the resume
 * version changes when the resume changes, and not otherwise.** The site
 * version follows the commits; this one follows the document. They are
 * different clocks, and conflating them is how a PDF ends up called `0.1.28`
 * while describing content that has since been rewritten.
 *
 * `tests/unit/publication/resume-version-policy.test.ts` pins the content
 * fingerprint, so editing the resume without bumping this fails CI instead of
 * shipping a mislabelled document.
 */
export const CURRENT_RESUME_VERSION = ResumeVersion.create("0.1.28");
