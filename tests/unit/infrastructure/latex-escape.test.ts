import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { escapeLatex, isLatexSafe, unsafeCharacters } from "@/infrastructure/renderers/latex-escape";
import { getResumeContent } from "@/infrastructure/content";
import { SUPPORTED_LOCALES } from "@/domain/i18n";

/**
 * The escaper, checked against the characters the content actually contains.
 *
 * This file exists because the previous inline escaper did not cover the
 * typography a person types. Both catalogs carried 53 characters it passed
 * through raw — nine en dashes, an em dash, sixteen arrows and one **U+2212
 * MINUS SIGN** — and pdflatex refused the document with:
 *
 *     ! LaTeX Error: Unicode character − (U+2212)
 *
 * Every PDF was silently falling back to the PDFKit compiler. The output looked
 * fine and the LaTeX path was dead in production, which is the worst possible
 * shape for a bug: invisible, and it removed a capability nobody knew was there.
 */

describe("LaTeX escaping", () => {
  it("escapes the characters that break a LaTeX document", () => {
    expect(escapeLatex("&")).toBe("\\&");
    expect(escapeLatex("%")).toBe("\\%");
    expect(escapeLatex("$")).toBe("\\$");
    expect(escapeLatex("#")).toBe("\\#");
    expect(escapeLatex("_")).toBe("\\_");
    expect(escapeLatex("~")).toBe("\\textasciitilde{}");
    expect(escapeLatex("^")).toBe("\\textasciicircum{}");
    expect(escapeLatex("{")).toBe("\\{");
    expect(escapeLatex("}")).toBe("\\}");
  });

  it("escapes a backslash without re-escaping the macro it emits", () => {
    /*
     * This is the assertion that catches the ordered-replacement bug. The
     * original escaper emitted `\textbackslash{}` and a later brace rule then
     * escaped those braces, printing literal backslashes. A single pass cannot
     * do that, so this stays green only while it is a single pass.
     *
     * The catalogs contain no backslash, so nothing else in the suite would have
     * caught it.
     */
    expect(escapeLatex("\\")).toBe("\\textbackslash{}");
    expect(escapeLatex("a&b")).toBe("a\\&b");
    expect(escapeLatex("\\&")).toBe("\\textbackslash{}\\&");
  });

  it("maps the typography a person types", () => {
    // The character that broke the build.
    expect(escapeLatex("2005–2020")).toBe("2005--2020");
    expect(escapeLatex("2018—2019")).toBe("2018---2019");
    expect(escapeLatex("30s → 200ms")).toBe("30s $\\rightarrow$ 200ms");

    // U+2212 looks like a hyphen and is not one. Mapped to a hyphen because in
    // a date range or a delta that is what it means.
    expect(escapeLatex("−83%")).toBe("-83\\%");

    expect(escapeLatex("10×")).toBe("10$\\times$");
    expect(escapeLatex("São Paulo · SP")).toBe("São Paulo \\textperiodcentered{} SP");
  });

  it("leaves ordinary prose untouched", () => {
    const prose = "Senior Software Engineer & Tech Lead, 15 anos de experiencia";
    expect(escapeLatex(prose)).toBe("Senior Software Engineer \\& Tech Lead, 15 anos de experiencia");
  });
});

describe("the real catalogs", () => {
  it.each(SUPPORTED_LOCALES)("%s content survives escaping with no raw Unicode", (locale) => {
    const content = getResumeContent(locale);

    /*
     * Walk the whole object rather than a few fields. A character hiding in a
     * case study's result string is exactly as fatal as one in a title, and the
     * previous escaper was never tested against either.
     */
    const offenders: string[] = [];

    const walk = (value: unknown, path: string): void => {
      if (typeof value === "string") {
        const unsafe = unsafeCharacters(value);
        if (unsafe.length > 0) {
          offenders.push(`${path}: ${unsafe.map((c) => `U+${c.codePointAt(0)?.toString(16)}`).join(", ")}`);
        }
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }

      if (value !== null && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          walk(nested, `${path}.${key}`);
        }
      }
    };

    walk(content, "resume");

    expect(offenders, `unsafe characters in the ${locale} catalog:\n${offenders.join("\n")}`).toEqual([]);
  });

  it.each(SUPPORTED_LOCALES)("%s content contains the characters that broke the build", (locale) => {
    /*
     * The catalog is not "clean" in the abstract — it is full of arrows and
     * dashes, and it *should* be. This asserts the real input is the hard case,
     * so a future content edit that removes the typography would not quietly
     * turn this whole file into a test that passes for the wrong reason.
     */
    const source = readFileSync(
      resolve(__dirname, `../../../src/infrastructure/content/resume-data${locale === "en-US" ? "-en-us" : ""}.ts`),
      "utf8",
    );

    expect(source).toMatch(/[→←]/);
  });

  it("escapes a document that actually compiles", () => {
    /*
     * The integration check: take a real field with real typography, escape it,
     * and assert nothing that pdflatex would reject survives.
     */
    const content = getResumeContent("pt-BR");
    const first = content.experiences[0];
    const sample = [first?.summary ?? "", ...(first?.highlights ?? []), ...(first?.caseStudies ?? []).map((c) => `${c.challenge} ${c.solution} ${c.result}`)].join(" ");

    expect(isLatexSafe(escapeLatex(sample))).toBe(true);
  });
});
