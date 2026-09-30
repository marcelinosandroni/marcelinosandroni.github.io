import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { escapeLatex as escapeForTest } from "@/infrastructure/renderers/latex-escape";
import { labelsFor } from "../../fixtures/pdf-labels";

/** Labels that become a `\section{}` heading. */
const SECTION_LABELS = ["summary", "skills", "experience", "education", "languages"] as const;

const sampleContent = {
  locale: "pt-BR" as const,
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE",
  contact: {
    phone: "+55 11 91446-1993",
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary: "Engenheiro Full Stack com 15 anos de experiência",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Engenheiro de Software Sênior",
      period: "Jan/2026 – Presente",
      location: "Remoto",
      summary: "Modernização de sistemas",
      highlights: ["C# .NET", "Microsserviços"],
    },
  ],
  skillGroups: [
    {
      label: "Backend",
      skills: ["C#", "Java", "Node.js"],
    },
  ],
  education: [
    {
      title: "Engenharia da Computação",
      institution: "UNIVESP",
      period: "2021-2025",
      description: "Engenharia moderna",
    },
  ],
  languages: ["Português: Nativo", "Inglês: Profissional"],
};

/**
 * The renderer is the one that escapes. This used to be a local copy of the
 * escaping chain, which meant the test asserted against a second implementation
 * of the rule rather than the one that runs — and the copy was missing the
 * typography, so it agreed with the bug it should have caught.
 */
const escapeLatex = escapeForTest;

/**
 * Content carrying the fields only the REFERENCE template reads: scope, team
 * size, the stack and case studies. Without these the detailed path is never
 * exercised, and a test over it would pass without proving anything.
 */
const detailedSampleContent = {
  ...sampleContent,
  experiences: [
    {
      ...sampleContent.experiences[0],
      scope: "Sistemas críticos de segurança pública",
      teamSize: 10,
      technologies: ["Go", ".NET", "ClickHouse"],
      caseStudies: [
        {
          title: "Plataforma de segurança preditiva",
          challenge: "Reação tardia a incidentes",
          solution: "Integração de feeds em tempo real",
          result: "Operacional em múltiplas cidades",
          metrics: [
            { value: "100M", label: "eventos diários" },
            { value: "35%", label: "redução de crimes" },
          ],
        },
      ],
    },
  ],
};

describe("LaTeXResumeRenderer", () => {
  it("renders valid LaTeX document with all sections", async () => {
    const renderer = new LaTeXResumeRenderer();
    const result = await renderer.render({
      version: ResumeVersion.create("0.1.5"),
      locale: "pt-BR",
      content: sampleContent,
      labels: await labelsFor("pt-BR"),
    });

    expect(result.filename).toContain("0.1.5");
    expect(result.filename).toContain("pt-BR");
    expect(result.content).toContain("\\documentclass");
    expect(result.content).toContain("\\begin{document}");
    expect(result.content).toContain("\\end{document}");
  });

  it("escapes special LaTeX characters safely", async () => {
    const renderer = new LaTeXResumeRenderer();
    const contentWithSpecialChars = {
      ...sampleContent,
      name: "Test & Co. #1",
      summary: "Uses $100 and 50% of time",
    };

    const result = await renderer.render({
      version: ResumeVersion.create("1.0.0"),
      locale: "en-US",
      content: contentWithSpecialChars,
      labels: await labelsFor("en-US"),
    });

    expect(result.content).toContain("\\&");
    expect(result.content).toContain("\\$");
    expect(result.content).toContain("\\%");
  });

  it("includes all resume sections in output", async () => {
    const renderer = new LaTeXResumeRenderer();
    const result = await renderer.render({
      version: ResumeVersion.create("0.2.0"),
      locale: "pt-BR",
      content: sampleContent,
      labels: await labelsFor("pt-BR"),
    });

    expect(result.content).toContain("\\section{Resumo}");
    expect(result.content).toContain("\\section{Experiência}");
    expect(result.content).toContain("\\section{Habilidades}");
    expect(result.content).toContain("\\section{Formação}");
    expect(result.content).toContain("\\section{Idiomas}");
  });

  it("renders the reference model with the reference section contract", async () => {
    const renderer = new LaTeXResumeRenderer("REFERENCE");
    const result = await renderer.render({
      version: ResumeVersion.create("0.2.0"),
      locale: "pt-BR",
      content: sampleContent,
      labels: await labelsFor("pt-BR", "REFERENCE"),
    });

    expect(result.content).toContain("\\section{Resumo Executivo}");
    expect(result.content).toContain("\\section{Core Skills \\& Arquitetura de Software}");
    expect(result.content).toContain("\\section{Experiência Profissional}");
    expect(result.content).toContain("\\section{Formação Acadêmica \\& Certificações}");
    expect(result.content).toContain("\\section{Idiomas}");
    expect(result.content.indexOf("Core Skills \\& Arquitetura")).toBeLessThan(result.content.indexOf("Experiência Profissional"));
  });

  it("prints every section heading it is given, for any locale and template", async () => {
    // Guards the contract that no heading is hardcoded in the renderer: whatever
    // the catalog resolves must be what reaches the document, after escaping.
    for (const locale of ["pt-BR", "en-US"] as const) {
      for (const templateId of ["CLEAN", "REFERENCE"] as const) {
        const labels = await labelsFor(locale, templateId);
        const result = await new LaTeXResumeRenderer(templateId).render({
          version: ResumeVersion.create("1.0.0"),
          locale,
          content: detailedSampleContent,
          labels,
        });

        for (const key of SECTION_LABELS) {
          expect(result.content, `${locale}/${templateId} must print "${key}"`).toContain(
            `\\section{${escapeLatex(labels[key])}}`,
          );
        }
      }
    }
  });

  it("prints the detail in REFERENCE, where it belongs", async () => {
    for (const locale of ["pt-BR", "en-US"] as const) {
      const labels = await labelsFor(locale, "REFERENCE");
      const result = await new LaTeXResumeRenderer("REFERENCE").render({
        version: ResumeVersion.create("1.0.0"),
        locale,
        content: detailedSampleContent,
        labels,
      });

      const first = detailedSampleContent.experiences[0];

      // teamSize is a template, not a literal: "{n}" has to be the real number,
      // otherwise the document ships the placeholder to the reader.
      expect(result.content).toContain(escapeLatex(labels.teamSize.replace("{n}", "10")));
      expect(result.content).not.toContain("{n}");

      // The stack heading and the technologies under it.
      expect(result.content).toContain(escapeLatex(labels.stack));
      expect(result.content).toContain("ClickHouse");

      // The case study, label by label, with its text.
      for (const [key, text] of [
        ["challenge", first.caseStudies[0].challenge],
        ["solution", first.caseStudies[0].solution],
        ["result", first.caseStudies[0].result],
      ] as const) {
        expect(result.content, `${locale}/REFERENCE must use "${key}"`).toContain(escapeLatex(labels[key]));
        expect(result.content, `${locale}/REFERENCE must carry the ${key} text`).toContain(escapeLatex(text));
      }
    }
  });

  it("keeps the detail out of CLEAN, which is the point of having two templates", async () => {
    for (const locale of ["pt-BR", "en-US"] as const) {
      const result = await new LaTeXResumeRenderer("CLEAN").render({
        version: ResumeVersion.create("1.0.0"),
        locale,
        content: detailedSampleContent,
        labels: await labelsFor(locale, "CLEAN"),
      });

      const first = detailedSampleContent.experiences[0];

      // Asserted on content rather than on label text: the word "Stack" appears in
      // this sample's summary as "Full Stack", so checking for the label string
      // would fail for a reason that has nothing to do with the template.
      expect(result.content, `${locale}/CLEAN must drop the case studies`).not.toContain(
        escapeLatex(first.caseStudies[0].challenge),
      );
      expect(result.content, `${locale}/CLEAN must drop the technologies`).not.toContain("ClickHouse");
      expect(result.content, `${locale}/CLEAN must drop the scope`).not.toContain(escapeLatex(first.scope));
      expect(result.content, `${locale}/CLEAN must not leak the team size placeholder`).not.toContain("{n}");
    }
  });

  it("keeps no section heading hardcoded in the renderer source", async () => {
    const source = await readFile(
      new URL("../../../src/infrastructure/renderers/latex-resume-renderer.ts", import.meta.url),
      "utf8",
    );

    for (const heading of [
      "Executive Summary",
      "Professional Experience",
      "Education & Certifications",
      "Resumo Executivo",
      "Experiência Profissional",
      "Formação Acadêmica",
      "Habilidades",
      "Idiomas",
    ]) {
      expect(source, `renderer must not contain the literal "${heading}"`).not.toContain(heading);
    }
  });
});
