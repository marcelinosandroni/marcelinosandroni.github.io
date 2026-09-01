import type { Locale, ResumeContent } from "@/domain/resume/types";
import type { ResumeVersion } from "@/domain/publication/resume-version";
import type { ResumeDocumentRenderer } from "@/application/publication/build-resume-document";

export type ResumeArtifact = {
  version: ResumeVersion;
  locale: Locale;
  filename: string;
  pdfBuffer: Buffer;
  generatedAt: Date;
};

export interface PDFCompiler {
  compile(texSource: string, filename: string): Promise<Buffer>;
}

export class PublishPDFResume {
  constructor(
    private readonly documentBuilder: {
      execute: (input: { version: ResumeVersion; locale: Locale; content: ResumeContent }) => Promise<{ filename: string; content: string }>;
    },
    private readonly renderer: ResumeDocumentRenderer,
    private readonly compiler: PDFCompiler,
  ) {}

  async execute(
    version: ResumeVersion,
    locale: Locale,
    content: ResumeContent,
  ): Promise<ResumeArtifact> {
    const document = await this.documentBuilder.execute({
      version,
      locale,
      content,
    });

    const pdfBuffer = await this.compiler.compile(document.content, document.filename);

    return {
      version,
      locale,
      filename: document.filename.replace(".tex", ".pdf"),
      pdfBuffer,
      generatedAt: new Date(),
    };
  }
}
