import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { BuildResumeDocument } from "@/application/publication/build-resume-document";
import { PublishPDFResume } from "@/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { MockPDFCompiler } from "@/infrastructure/pdf/mock-pdf-compiler";
import { getResumeContent } from "@/infrastructure/content";

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

    const renderer = new LaTeXResumeRenderer();
    const compiler = new MockPDFCompiler();
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    const currentVersion = ResumeVersion.create("0.1.5");
    const resumeByLocale = getResumeContent(locale as "pt-BR" | "en-US");
    const artifact = await publisher.execute(
      currentVersion,
      locale as "pt-BR" | "en-US",
      resumeByLocale
    );

    return new NextResponse(new Uint8Array(artifact.pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
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
