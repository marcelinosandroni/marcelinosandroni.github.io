import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { labelsFor } from "../../fixtures/pdf-labels";

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

/** Mirrors the escaping applied by the renderer before text reaches LaTeX. */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_");
}

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

  it("prints the headings it is given, for any locale", async () => {
    // Guards the contract that no heading is hardcoded in the renderer: whatever
    // the catalog resolves must be what reaches the document, after escaping.
    for (const locale of ["pt-BR", "en-US"] as const) {
      for (const templateId of ["CLEAN", "REFERENCE"] as const) {
        const labels = await labelsFor(locale, templateId);
        const result = await new LaTeXResumeRenderer(templateId).render({
          version: ResumeVersion.create("1.0.0"),
          locale,
          content: sampleContent,
          labels,
        });

        for (const heading of Object.values(labels)) {
          expect(result.content, `${locale}/${templateId} must print "${heading}"`).toContain(
            `\\section{${escapeLatex(heading)}}`,
          );
        }
      }
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
