import { describe, expect, it } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { BuildResumeDocument } from "@/application/publication/build-resume-document";
import { PublishPDFResume } from "@/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { MockPDFCompiler } from "@/infrastructure/pdf/mock-pdf-compiler";

const sampleContent = {
  locale: "pt-BR" as const,
  name: "Test Candidate",
  title: "Test Engineer",
  location: "Test City",
  contact: {
    email: "test@example.com",
    linkedin: "linkedin.com/in/test",
  },
  summary: "Test summary for resume",
  experiences: [
    {
      company: "Test Corp",
      role: "Engineer",
      period: "2023-2024",
      summary: "Built things",
      highlights: ["Feature A", "Feature B"],
    },
  ],
  skillGroups: [
    {
      label: "Technologies",
      skills: ["TypeScript", "React"],
    },
  ],
  education: [
    {
      title: "Bachelor in CS",
      institution: "Test University",
      period: "2018-2022",
      description: "Computer Science degree",
    },
  ],
  languages: ["English", "Portuguese"],
};

describe("PDF Generation Integration", () => {
  it("generates a complete PDF resume with all sections", async () => {
    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const result = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "pt-BR",
      sampleContent,
    );

    expect(result.version.toString()).toBe("1.0.0");
    expect(result.locale).toBe("pt-BR");
    expect(result.filename).toContain(".pdf");
    expect(result.pdfBuffer).toBeDefined();
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
    expect(result.pdfBuffer.toString("ascii", 0, 4)).toBe("%PDF");
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it("generates different PDFs for different locales", async () => {
    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const resultPtBr = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "pt-BR",
      sampleContent,
    );

    const resultEnUs = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "en-US",
      { ...sampleContent, locale: "en-US" },
    );

    expect(resultPtBr.locale).toBe("pt-BR");
    expect(resultEnUs.locale).toBe("en-US");
    expect(resultPtBr.filename).toContain("pt-BR");
    expect(resultEnUs.filename).toContain("en-US");
  });
});
