import { describe, expect, it } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";

const sampleContent = {
  locale: "pt-BR" as const,
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE",
  contact: {
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary: "Engenheiro Full Stack com 15 anos de experiência",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Engenheiro de Software Sênior",
      period: "Jan/2026 – Presente",
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

describe("LaTeXResumeRenderer", () => {
  it("renders valid LaTeX document with all sections", async () => {
    const renderer = new LaTeXResumeRenderer();
    const result = await renderer.render({
      version: ResumeVersion.create("0.1.5"),
      locale: "pt-BR",
      content: sampleContent,
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
    });

    expect(result.content).toContain("\\section{Resumo}");
    expect(result.content).toContain("\\section{Experiência}");
    expect(result.content).toContain("\\section{Habilidades}");
    expect(result.content).toContain("\\section{Formação}");
    expect(result.content).toContain("\\section{Idiomas}");
  });
});
