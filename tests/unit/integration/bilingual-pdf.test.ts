import { describe, expect, it } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { BuildResumeDocument } from "@/application/publication/build-resume-document";
import { PublishPDFResume } from "@/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { MockPDFCompiler } from "@/infrastructure/pdf/mock-pdf-compiler";
import { getResumeContent } from "@/infrastructure/content";

describe("Bilingual Resume PDF Generation", () => {
  it("generates PT-BR resume with correct locale-specific content", async () => {
    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const contentPtBr = getResumeContent("pt-BR");
    expect(contentPtBr.locale).toBe("pt-BR");
    expect(contentPtBr.name).toBe("Marcelino Sandroni Dias");
    expect(contentPtBr.languages).toContain("Português · Nativo");

    const result = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "pt-BR",
      contentPtBr,
    );

    expect(result.locale).toBe("pt-BR");
    expect(result.filename).toContain("pt-BR");
  });

  it("generates EN-US resume with correct locale-specific content", async () => {
    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const contentEnUs = getResumeContent("en-US");
    expect(contentEnUs.locale).toBe("en-US");
    expect(contentEnUs.name).toBe("Marcelino Sandroni Dias");
    expect(contentEnUs.languages).toContain("English · Professional");

    const result = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "en-US",
      contentEnUs,
    );

    expect(result.locale).toBe("en-US");
    expect(result.filename).toContain("en-US");
  });

  it("produces different content for different locales", async () => {
    const contentPtBr = getResumeContent("pt-BR");
    const contentEnUs = getResumeContent("en-US");

    expect(contentPtBr.title).not.toBe(contentEnUs.title);
    expect(contentPtBr.summary).not.toBe(contentEnUs.summary);
    expect(contentPtBr.experiences.length).toBe(contentEnUs.experiences.length);
    expect(contentPtBr.skillGroups.length).toBe(contentEnUs.skillGroups.length);
  });

  it("maintains same locale in generated PDF filename", async () => {
    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const resultPtBr = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "pt-BR",
      getResumeContent("pt-BR"),
    );

    const resultEnUs = await publisher.execute(
      ResumeVersion.create("1.0.0"),
      "en-US",
      getResumeContent("en-US"),
    );

    expect(resultPtBr.filename).toContain("-pt-BR.pdf");
    expect(resultEnUs.filename).toContain("-en-US.pdf");
    expect(resultPtBr.filename).not.toEqual(resultEnUs.filename);
  });
});
