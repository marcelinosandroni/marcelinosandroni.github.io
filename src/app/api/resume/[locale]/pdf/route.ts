import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { BuildResumeDocument } from "@/application/publication/build-resume-document";
import { PublishPDFResume } from "@/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { DockerPDFCompiler } from "@/infrastructure/pdf/docker-pdf-compiler";
import { PdfKitPDFCompiler } from "@/infrastructure/pdf/pdfkit-pdf-compiler";
import { ResumePdfCache } from "@/infrastructure/pdf/resume-pdf-cache";
import { getResumeContent } from "@/infrastructure/content";

function createPreferredFilename(locale: "pt-BR" | "en-US", version: string): string {
  return `Marcelino Sandroni Resume v${version} ${locale}.pdf`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;

    if (locale !== "pt-BR" && locale !== "en-US") {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    const normalizedLocale = locale as "pt-BR" | "en-US";
    const version = ResumeVersion.create("0.1.28");
    const renderer = new LaTeXResumeRenderer();
    const compiler = new DockerPDFCompiler(30000);
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);
    const resumeByLocale = getResumeContent(normalizedLocale);
    const cache = new ResumePdfCache(join(process.cwd(), "public", "artifacts", "cache"));
    const preferredFilename = createPreferredFilename(normalizedLocale, version.toString());
    const cachedFilePath = cache.getPath(version.toString(), normalizedLocale, resumeByLocale, preferredFilename);

    let pdfBytes: Buffer;
    if (cachedFilePath) {
      pdfBytes = readFileSync(cachedFilePath);
    } else {
      let artifact;
      try {
        artifact = await publisher.execute(version, normalizedLocale, resumeByLocale);
      } catch {
        const fallbackCompiler = new PdfKitPDFCompiler();
        const fallbackPublisher = new PublishPDFResume(builder, renderer, fallbackCompiler);
        artifact = await fallbackPublisher.execute(version, normalizedLocale, resumeByLocale);
      }

      const generatedPath = cache.write(version.toString(), normalizedLocale, resumeByLocale, artifact.pdfBuffer, preferredFilename);
      pdfBytes = readFileSync(generatedPath);
    }

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${preferredFilename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
