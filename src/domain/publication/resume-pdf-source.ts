/**
 * Where the PDF's content comes from.
 *
 * ## Why this exists
 *
 * The recruiter PDF was generated from the database through LaTeX. It now has a
 * second source: a document designed and fixed in this repository, rendered to a
 * PDF once, ahead of time.
 *
 * The reason it has to be pre-rendered rather than rendered per request is
 * concrete and not a preference: converting the design to a PDF means running a
 * browser, and a browser does not fit in a serverless function. The design is a
 * single fixed document, so rendering it once costs nothing and removes both the
 * database read and the LaTeX container from the request path entirely.
 *
 * `database` is kept, tested and documented rather than deleted. The whole
 * pipeline - the technology catalog, the stack profiles, the focused variants -
 * is working and this switch is the way back to it.
 */
export const RESUME_PDF_SOURCE_ENV = "RESUME_PDF_SOURCE";

export type ResumePdfSource = "fixed" | "database";

/**
 * The configured source, defaulting to `fixed`.
 *
 * Defaults rather than requiring the variable, so a deployment that never heard
 * of it serves the designed document instead of failing to start on a missing
 * configuration. An unknown value is `database` for the same reason in reverse:
 * a typo should not silently switch a recruiter's PDF to something else.
 */
export function resolveResumePdfSource(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ResumePdfSource {
  const raw = env[RESUME_PDF_SOURCE_ENV];

  if (raw === "fixed" || raw === undefined || raw.trim() === "") {
    return "fixed";
  }

  return "database";
}

/**
 * Whether the fixed artifact can narrow by stack focus.
 *
 * It cannot, and the reason is worth stating rather than hiding: narrowing works
 * by tagging bullets and roles with technologies in the relation graph, and a
 * fixed document has no relation graph. The PDF says so rather than returning
 * the generic document under a filename that promises a React + Node variant.
 */
export function fixedSourceSupportsFocus(): false {
  return false;
}