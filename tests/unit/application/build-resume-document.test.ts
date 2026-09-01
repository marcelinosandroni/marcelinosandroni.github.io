import { describe, expect, it } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { BuildResumeDocument, type ResumeDocumentRenderer } from "@/application/publication/build-resume-document";

const sampleContent = {
  locale: "pt-BR" as const,
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE",
  contact: {
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary: "Resumo de teste",
  experiences: [],
  skillGroups: [],
  education: [],
  languages: ["Português", "Inglês"],
};

describe("BuildResumeDocument", () => {
  it("renders a deterministic document for the requested version and locale", async () => {
    const renderer: ResumeDocumentRenderer = {
      render: async ({ version, locale, content }) => ({
        filename: `${content.name.toLowerCase().replace(/\s+/g, "-")}-${version.toString()}-${locale}.tex`,
        content: `\\documentclass{article}\n\\title{${content.name}}\n\\date{${version.toString()}}\n\\author{${locale}}`,
      }),
    };

    const result = await new BuildResumeDocument(renderer).execute({
      version: ResumeVersion.create("0.1.5"),
      locale: "pt-BR",
      content: sampleContent,
    });

    expect(result.filename).toBe("marcelino-sandroni-dias-0.1.5-pt-BR.tex");
    expect(result.content).toContain("Marcelino Sandroni Dias");
    expect(result.content).toContain("0.1.5");
    expect(result.content).toContain("pt-BR");
  });
});
