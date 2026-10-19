import { describe, expect, it } from "vitest";

import type { Locale } from "@/domain/i18n";
import {
  resumePdfFilename,
  resumePdfFilenameForSlug,
} from "@/domain/publication/resume-pdf-filename";
import {
  RESUME_VARIANTS,
  resolveResumeVariant,
  resumeVariantLabel,
  resumeVariantStack,
  type ResumeVariant,
} from "@/domain/publication/resume-variant";

/**
 * The name a recruiter's file arrives under, and the name on the button that
 * produced it.
 *
 * These are the strings that end up in someone's downloads folder for as long as
 * they keep the file, so they are asserted as literal strings rather than as
 * something derived: a scheme that can only be checked by reading the code is not
 * a scheme, it is a convention nobody has written down.
 */
describe("the download filename", () => {
  it("is the name and the role, with no locale and no slug", () => {
    /*
      The locale and the `enterprise-` prefix were in the old name. Both were noise:
      the reader knows which document they asked for, and a file called
      `...-pt-BR-...CLEAN.pdf` says less than one that names the role.
    */
    expect(resumePdfFilename("pt-BR", "all")).toBe(
      "Marcelino Sandroni - Engenheiro de Software.pdf",
    );
    expect(resumePdfFilename("en-US", "all")).toBe("Marcelino Sandroni - Software Engineer.pdf");
  });

  it("names a variant with its stack, backend plus frontend", () => {
    expect(resumePdfFilename("pt-BR", "enterprise-java")).toBe(
      "Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf",
    );
    expect(resumePdfFilename("en-US", "enterprise-java")).toBe(
      "Marcelino Sandroni - Software Engineer - Java and Angular.pdf",
    );
  });

  it("names every variant in every locale", () => {
    for (const locale of ["pt-BR", "en-US"] as const) {
      for (const variant of RESUME_VARIANTS) {
        const name = resumePdfFilename(locale, variant);

        expect(name.startsWith("Marcelino Sandroni - ")).toBe(true);
        expect(name.endsWith(".pdf")).toBe(true);
        expect(name.includes("--")).toBe(false);

        if (variant !== "all") {
          expect(name.includes(resumeVariantStack(locale, variant) ?? "")).toBe(true);
        }
      }
    }
  });

  it("keeps every variant's name the same shape", () => {
    /*
      Backend plus frontend, and nothing else. The labels used to lead with a
      seniority — "Enterprise Java + Angular", "Modern Node + Go + React" — which
      made two of the three look like they were for more senior work than the
      third. They are the same person at the same level, argued for a different
      stack, and the name is where that should be visible.

      Two parts, joined by a plus, is therefore the assertion: a variant named
      after three technologies, or after a level, fails here.
    */
    for (const variant of RESUME_VARIANTS) {
      if (variant === "all") {
        continue;
      }

      for (const locale of ["pt-BR", "en-US"] as const) {
        const stack = resumeVariantStack(locale, variant) ?? "";

        const parts = stack.split(locale === "pt-BR" ? " e " : " and ");

        expect(`${variant}:${locale}:${parts.length}`).toBe(`${variant}:${locale}:2`);
        expect(`${variant}:${locale}:${parts.every((part) => part.length > 0)}`).toBe(
          `${variant}:${locale}:true`,
        );
      }
    }
  });

  it("is ASCII, so a header can carry it without encoding", () => {
    /*
      The name goes into a `Content-Disposition` header, which is not UTF-8. Every
      name here is plain ASCII by construction — that is worth knowing rather than
      discovering, because the first variant written in a language with an accent
      would otherwise produce a header the browser mangles.
    */
    for (const locale of ["pt-BR", "en-US"] as const) {
      for (const variant of RESUME_VARIANTS) {
        const name = resumePdfFilename(locale, variant);

        expect(`${variant}:${locale}:ascii`).toBe(
          `${variant}:${locale}:${/^[\x20-\x7e]+$/.test(name) ? "ascii" : "not ascii"}`,
        );
      }
    }
  });

  it("resolves a slug the way the route does, and falls back the same way", () => {
    expect(resumePdfFilenameForSlug("pt-BR", null)).toBe(resumePdfFilename("pt-BR", "all"));
    expect(resumePdfFilenameForSlug("pt-BR", "")).toBe(resumePdfFilename("pt-BR", "all"));
    expect(resumePdfFilenameForSlug("pt-BR", "enterprise-java")).toBe(
      resumePdfFilename("pt-BR", "enterprise-java"),
    );

    /*
      An unknown slug resolves to `all`, which is what the route serves too — but
      the route answers a 404 rather than serving the general document. The name
      is only reached by a reader who already got a PDF, so this is the right
      fallback for a name and the wrong one for a response.
    */
    expect(resumePdfFilenameForSlug("pt-BR", "nao-existe")).toBe(resumePdfFilename("pt-BR", "all"));
  });

  it("agrees with the slug resolver on every variant", () => {
    for (const variant of RESUME_VARIANTS) {
      expect(resolveResumeVariant(variant)).toBe(variant);
    }
  });
});

describe("what the selector calls each document", () => {
  it("is the same stack the file is named after", () => {
    /*
      A label and a filename that disagree is how the same stack ends up written
      two ways on one page — the button says one thing and the file it produces is
      called something else.
    */
    for (const variant of RESUME_VARIANTS) {
      for (const locale of ["pt-BR", "en-US"] as const) {
        const label = resumeVariantLabel(locale, variant, "Completo");
        const name = resumePdfFilename(locale, variant);

        if (variant === "all") {
          expect(`${variant}:${locale}:${label}`).toBe(`${variant}:${locale}:Completo`);
        } else {
          expect(`${variant}:${locale}:${name.includes(label)}`).toBe(
            `${variant}:${locale}:true`,
          );
        }
      }
    }
  });

  it("never puts a seniority in a variant's name", () => {
    for (const variant of RESUME_VARIANTS) {
      if (variant === "all") {
        continue;
      }

      for (const locale of ["pt-BR", "en-US"] as const) {
        const label = resumeVariantLabel(locale, variant, "Completo");

        expect(`${variant}:${locale}:${/enterprise|modern/i.test(label)}`).toBe(
          `${variant}:${locale}:false`,
        );
      }
    }
  });
});

/** The two shapes the scheme has to keep producing, spelled out. */
describe("the scheme, spelled out", () => {
  const cases: ReadonlyArray<readonly [Locale, ResumeVariant, string]> = [
    ["pt-BR", "all", "Marcelino Sandroni - Engenheiro de Software.pdf"],
    ["en-US", "all", "Marcelino Sandroni - Software Engineer.pdf"],
    ["pt-BR", "enterprise-java", "Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf"],
    ["en-US", "enterprise-java", "Marcelino Sandroni - Software Engineer - Java and Angular.pdf"],
    ["pt-BR", "enterprise-java-react", "Marcelino Sandroni - Engenheiro de Software - Java e React.pdf"],
    ["en-US", "enterprise-java-react", "Marcelino Sandroni - Software Engineer - Java and React.pdf"],
    ["pt-BR", "enterprise-dotnet", "Marcelino Sandroni - Engenheiro de Software - C# e Angular.pdf"],
    ["en-US", "enterprise-dotnet", "Marcelino Sandroni - Software Engineer - C# and Angular.pdf"],
    ["pt-BR", "enterprise-dotnet-react", "Marcelino Sandroni - Engenheiro de Software - C# e React.pdf"],
    ["en-US", "enterprise-dotnet-react", "Marcelino Sandroni - Software Engineer - C# and React.pdf"],
    ["pt-BR", "modern-web", "Marcelino Sandroni - Engenheiro de Software - Node e React.pdf"],
    ["en-US", "modern-web", "Marcelino Sandroni - Software Engineer - Node and React.pdf"],
  ];

  it("is `Name - Role` or `Name - Role - Backend and Frontend`", () => {
    for (const [locale, variant, expected] of cases) {
      expect(`${locale}:${variant}:${resumePdfFilename(locale, variant)}`).toBe(
        `${locale}:${variant}:${expected}`,
      );
    }
  });

  it("spells out every variant that exists", () => {
    /*
      The table above is a list someone has to remember to extend, and the thing it
      would miss is exactly the thing that matters: a variant added to
      `RESUME_VARIANTS` with no asserted filename ships a document whose download is
      named by whatever the code happens to produce.
    */
    for (const locale of ["pt-BR", "en-US"] as const) {
      for (const variant of RESUME_VARIANTS) {
        const spelled = cases.some(([where, which]) => where === locale && which === variant);

        expect(`${locale}/${variant} is spelled out above: ${spelled}`).toBe(
          `${locale}/${variant} is spelled out above: true`,
        );
      }
    }
  });
});