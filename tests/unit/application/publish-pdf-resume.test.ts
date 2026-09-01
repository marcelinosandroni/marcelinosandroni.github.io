import { describe, expect, it, vi } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { PublishPDFResume, type PDFCompiler } from "@/application/publication/publish-pdf-resume";
import { BuildResumeDocument, type ResumeDocumentRenderer } from "@/application/publication/build-resume-document";

const sampleContent = {
  locale: "pt-BR" as const,
  name: "Test Author",
  title: "Senior Engineer",
  location: "Test City",
  contact: {
    email: "test@example.com",
    linkedin: "linkedin.com/in/test",
  },
  summary: "Test summary",
  experiences: [],
  skillGroups: [],
  education: [],
  languages: ["Portuguese"],
};

describe("PublishPDFResume", () => {
  it("compiles LaTeX to PDF and returns artifact", async () => {
    const mockRenderer: ResumeDocumentRenderer = {
      render: async ({ version, locale }) => ({
        filename: `resume-${version.toString()}-${locale}.tex`,
        content: "\\documentclass{article}\n\\begin{document}\nTest\n\\end{document}",
      }),
    };

    const mockPdfBuffer = Buffer.from("mock-pdf-data");
    const mockCompiler: PDFCompiler = {
      compile: vi.fn().mockResolvedValue(mockPdfBuffer),
    };

    const builder = new BuildResumeDocument(mockRenderer);
    const publisher = new PublishPDFResume(builder, mockRenderer, mockCompiler);

    const result = await publisher.execute(
      ResumeVersion.create("0.1.5"),
      "pt-BR" as const,
      sampleContent,
    );

    expect(result.version.toString()).toBe("0.1.5");
    expect(result.locale).toBe("pt-BR");
    expect(result.filename).toContain(".pdf");
    expect(result.pdfBuffer).toEqual(mockPdfBuffer);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(mockCompiler.compile).toHaveBeenCalled();
  });
});
