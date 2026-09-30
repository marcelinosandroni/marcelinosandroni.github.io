/**
 * LaTeX escaping, in one place, tested against the characters the content
 * actually contains.
 *
 * ## Why this file exists
 *
 * The renderer had an inline chain of nine replacements, and it silently did not
 * cover the typography a person actually types. Both resume catalogs carried 53
 * characters it passed through raw — 18 en dashes, 2 em dashes, 32 arrows and 2
 * **U+2212 MINUS SIGN** — and pdflatex refused the document with:
 *
 *     ! LaTeX Error: Unicode character − (U+2212)
 *
 * Every PDF was falling back to the PDFKit compiler and nobody knew, because the
 * fallback is designed to be quiet. The output looked plausible and the LaTeX
 * path — the one with real typography — was dead in production.
 *
 * ## Why a single pass
 *
 * The first version of this fix was an ordered list of replacements, which is the
 * same design as the code it replaced and has the same failure mode: the output
 * of one rule can be matched by a later rule. `\textbackslash{}` contains braces,
 * so a later brace rule re-escaped them and printed literal backslashes. That bug
 * only shows up on input that contains a backslash, which the catalog does not
 * contain, so the test suite was green while the escape was wrong.
 *
 * Matching every special character in one alternation and resolving it through a
 * lookup makes double-processing structurally impossible. There is no order to
 * get wrong, so there is no order to document.
 */

/**
 * Every character that is not an ASCII letter, digit or space maps to a LaTeX
 * macro here. A character that reaches the output still being a Unicode
 * character is a bug, and `isLatexSafe` exists to turn that into a test failure
 * instead of a Docker log line nobody reads.
 */
const REPLACEMENTS: Readonly<Record<string, string>> = {
  /*
   * LaTeX syntax. These are the only characters where a mistake changes the
   * meaning of the document rather than just its appearance.
   */
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "&": "\\&",
  "%": "\\%",
  "$": "\\$",
  "#": "\\#",
  "_": "\\_",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",

  /*
   * Typography, mapped to the ligatures TeX already knows how to build.
   *
   * `−` (U+2212) is the trap that started all this. It is visually identical to
   * a hyphen in most editors, is not ASCII, and is inserted by a word
   * processor's "smart minus" without anyone deliberately typing it. It maps to
   * a plain hyphen because in a date range or a delta that is what it means.
   */
  "−": "-", // MINUS SIGN, not a hyphen
  "–": "--", // EN DASH -> en-dash ligature
  "—": "---", // EM DASH -> em-dash ligature
  "‘": "`", // LEFT SINGLE QUOTATION MARK
  "’": "'", // RIGHT SINGLE QUOTATION MARK
  "“": "``", // LEFT DOUBLE QUOTATION MARK
  "”": "''", // RIGHT DOUBLE QUOTATION MARK
  "…": "\\ldots{}", // HORIZONTAL ELLIPSIS
  " ": "~", // NO-BREAK SPACE -> unbreakable space

  /*
   * Symbols the content uses for outcomes. Each becomes a text-mode macro so it
   * renders in the document's own font instead of requiring a Unicode font
   * package, which is not installed in the compiler image.
   */
  "·": "\\textperiodcentered{}", // MIDDLE DOT, used as a separator
  "→": "$\\rightarrow$",
  "←": "$\\leftarrow$",
  "×": "$\\times$",
  "≥": "$\\geq$",
  "≤": "$\\leq$",
  "≠": "$\\neq$",
  "±": "$\\pm$",
};

/**
 * Characters that carry meaning inside a regex character class and have to be
 * escaped before the table is joined into one.
 *
 * `\` is the important one: it is the very first key in the table, and dropping
 * it here made it the class's own escape character, so `\{` collapsed to `{` and
 * a backslash in the text passed through untouched. The catalogs contain no
 * backslash, so only the explicit test for it caught this.
 */
const CLASS_SPECIAL = /[\\\]^\-]/;

/**
 * Matches any character in the table above, in one alternation so a single pass
 * handles the whole string.
 */
const SPECIAL = new RegExp(
  `[${Object.keys(REPLACEMENTS)
    .map((char) => char.replace(CLASS_SPECIAL, "\\$&"))
    .join("")}]`,
  "gu",
);

/**
 * ASCII punctuation that needs no macro, plus accented letters.
 *
 * Accented Latin letters are safe because the document preamble loads the T1
 * font encoding, which covers the Latin-1 range. Enumerating them here instead
 * would be a maintenance liability for no benefit: a new Portuguese word should
 * not require editing this file.
 */
const SAFE_ASCII = new Set(
  ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`,
);

/** Escapes one string for LaTeX. */
export function escapeLatex(text: string): string {
  return text.replace(SPECIAL, (char) => REPLACEMENTS[char] ?? char);
}

/**
 * True when every character in the string will survive LaTeX: either it is
 * mapped above, or it is a letter, digit, space or safe ASCII punctuation.
 */
export function isLatexSafe(text: string): boolean {
  return unsafeCharacters(text).length === 0;
}

/** The characters that would reach pdflatex raw, for a message that names them. */
export function unsafeCharacters(text: string): string[] {
  const found = new Set<string>();

  for (const char of text) {
    const isSafe = REPLACEMENTS[char] !== undefined || SAFE_ASCII.has(char) || /\p{L}|\p{N}|\p{Zs}/u.test(char);

    if (!isSafe) {
      found.add(char);
    }
  }

  return [...found];
}
