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
import {
  DEFAULT_RESUME_TEMPLATE,
  isResumeTemplateId,
  type ResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";
import { createErrorResponse } from "@/infrastructure/http/error-handler";
import { InvalidLocaleError, InvalidTemplateError, PdfGenerationError } from "@/domain/errors";

function createPreferredFilename(locale: "pt-BR" | "en-US", version: string, templateId: ResumeTemplateId): string {
  return `Marcelino Sandroni Resume v${version} ${locale} ${templateId}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    const { locale } = await params;

    if (locale !== "pt-BR" && locale !== "en-US") {
      throw new InvalidLocaleError(`Invalid locale: ${locale}`, { providedLocale: locale });
    }

    const normalizedLocale = locale as "pt-BR" | "en-US";
    const requestedTemplate = request.nextUrl.searchParams.get("template");
    const templateId = requestedTemplate === null
      ? DEFAULT_RESUME_TEMPLATE
      : isResumeTemplateId(requestedTemplate)
        ? requestedTemplate
        : null;

    if (!templateId) {
      throw new InvalidTemplateError(`Invalid template: ${requestedTemplate}`, { providedTemplate: requestedTemplate });
    }

    const version = ResumeVersion.create("0.1.28");
    const renderer = new LaTeXResumeRenderer(templateId);
    const compiler = new DockerPDFCompiler(30000);
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);
    const resumeByLocale = getResumeContent(normalizedLocale);
    const cache = new ResumePdfCache(join(process.cwd(), "public", "artifacts", "cache"));
    const preferredFilename = createPreferredFilename(normalizedLocale, version.toString(), templateId);
    const cachedFilePath = cache.getPath(version.toString(), normalizedLocale, resumeByLocale, templateId, preferredFilename);

    let pdfBytes: Buffer;
    if (cachedFilePath) {
      pdfBytes = readFileSync(cachedFilePath);
    } else {
      let artifact;
      try {
        artifact = await publisher.execute(version, normalizedLocale, resumeByLocale, templateId);
      } catch (error) {
        // Log the primary compiler failure for debugging
        console.warn('Primary PDF compiler failed, attempting fallback', error);
        
        const fallbackCompiler = new PdfKitPDFCompiler();
        const fallbackPublisher = new PublishPDFResume(builder, renderer, fallbackCompiler);
        artifact = await fallbackPublisher.execute(version, normalizedLocale, resumeByLocale, templateId);
      }

      const generatedPath = cache.write(version.toString(), normalizedLocale, resumeByLocale, templateId, artifact.pdfBuffer, preferredFilename);
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
    // Use centralized error handler for consistent responses
    return createErrorResponse(error);
  }
}
