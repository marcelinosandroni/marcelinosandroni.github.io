import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { join, dirname } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
import { decideResumePdfResponse } from "@/application/publication/resume-pdf-response";
import { CURRENT_RESUME_VERSION } from "@/domain/publication/current-resume-version";
import { BuildResumeDocument } from "@/application/publication/build-resume-document";
import { PublishPDFResume } from "@/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "@/infrastructure/renderers/latex-resume-renderer";
import { DockerPDFCompiler } from "@/infrastructure/pdf/docker-pdf-compiler";
import { PdfKitPDFCompiler } from "@/infrastructure/pdf/pdfkit-pdf-compiler";
import { ResumePdfCache } from "@/infrastructure/pdf/resume-pdf-cache";
import { readResume, readResolvedProfiles } from "@/infrastructure/repositories";
import { applyFocus, narrowDocument } from "@/domain/resume/focus";
import { getDictionary } from "@/i18n";
import { getPdfSectionLabels } from "@/infrastructure/pdf/pdf-section-labels";
import {
  resolveResumeTemplateId,
  type ResumeTemplateId,
} from "@/infrastructure/pdf/resume-template-registry";
import { createErrorResponse } from "@/infrastructure/http/error-handler";
import { assertResumeDownloadEnabled } from "@/application/publication/assert-resume-download-enabled";
import {
  RESUME_VARIANTS,
  availableResumeVariants,
  fixedResumeFilename,
  readFixedResumeArtifact,
  resolveResumeVariant,
} from "@/infrastructure/pdf/fixed-resume-artifact";
import { resolveResumePdfSource } from "@/domain/publication/resume-pdf-source";
import {
  InvalidLocaleError,
  InvalidTemplateError,
  PdfGenerationError,
  ResumeVariantNotRenderedError,
  UnknownResumeVariantError,
} from "@/domain/errors";

function getCacheDirectory(): string {
  // Em ambientes serverless (Vercel, AWS Lambda, etc.), apenas /tmp é gravável
  // Detectamos isso verificando se estamos em produção e se o processo está rodando em /var/task
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.cwd().startsWith("/var/task");
  
  if (isServerless) {
    const tmpDir = "/tmp/artifacts/cache";
    mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }
  
  // Em desenvolvimento local, usa o diretório public normal
  return join(process.cwd(), "public", "artifacts", "cache");
}

function createPreferredFilename(
  locale: "pt-BR" | "en-US",
  version: string,
  templateId: ResumeTemplateId,
  focus: string | null,
): string {
  /*
    The focus is in the *filename*, not only in the cache key.

    A recruiter who downloads "React + Node" and "Angular + Java" into the same
    folder gets two files with the same name, and the second silently replaces
    the first — which is the one place a reader might genuinely want both, and
    the place where they would have least reason to check. Nothing else on the
    page distinguishes the two files once they are on disk.
  */
  const suffix = focus === null ? "" : ` ${focus}`;

  return `Marcelino Sandroni Resume v${version} ${locale}${suffix} ${templateId}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  try {
    // The flag is read here as well as in the button. A hidden button over a live
    // endpoint is not a disabled feature — the URL is one guess from the route
    // pattern and the response is a compiled PDF either way, so removing the
    // affordance would be the whole of the change. This is the part that makes it
    // a gate.
    //
    // Called first, before the locale is even looked at, so that "the route is
    // off" and "you asked for the wrong language" are indistinguishable from
    // outside. See the module for why the policy lives outside this file.
    assertResumeDownloadEnabled();

    const { locale } = await params;

    if (locale !== "pt-BR" && locale !== "en-US") {
      throw new InvalidLocaleError(`Invalid locale: ${locale}`, { providedLocale: locale });
    }

    const normalizedLocale = locale as "pt-BR" | "en-US";
    const requestedTemplate = request.nextUrl.searchParams.get("template");
    const templateId = resolveResumeTemplateId(requestedTemplate);

    if (!templateId) {
      throw new InvalidTemplateError(`Invalid template: ${requestedTemplate}`, { providedTemplate: requestedTemplate });
    }

        const version = CURRENT_RESUME_VERSION;

    /*
      The fixed source, checked before anything is built.

      Order matters: this runs before the renderer, the compiler, the cache and
      the database read, because on this path none of them are needed. Serving a
      file removes the LaTeX container and the database round trip from a
      download a recruiter is waiting on, which is the whole point.

      `?stack=` chooses *which document*, not which part of one. A fixed document
      has no relation graph, so the stack cannot narrow it at request time - the
      specialised versions are separate documents written for that stack, and the
      slug selects between them. An unknown slug is refused rather than silently
      answered with the general résumé, which would be a document that never
      mentions the stack the reader asked about.
    */
    if (resolveResumePdfSource() === "fixed") {
      const requestedStack = request.nextUrl.searchParams.get("stack");
      const variant = resolveResumeVariant(requestedStack);

      if (variant === null) {
        return createErrorResponse(new UnknownResumeVariantError(requestedStack ?? "", RESUME_VARIANTS));
      }

      const artifact = await readFixedResumeArtifact(normalizedLocale, variant);

      if (artifact !== null) {
        return respondWithPdf(artifact.bytes, request, fixedResumeFilename(normalizedLocale, variant));
      }

      /*
        No artifact for this variant in this locale.

        Two different situations share this branch, and they get different answers
        because they are different problems.

        When the *locale* has nothing rendered, there used to be a fallback: log a
        line and carry on into the database path below. That is how a download from
        this route produced a 39KB LaTeX document when the request had asked for a
        345KB one - the reader got a real, complete, professionally typeset résumé
        that was not the one on the site, and nothing in the download said so.

        Falling back is exactly the failure the branch above exists to prevent, one
        level up. If the artifacts are missing, the build has not run: the answer is
        a refusal naming the command, not a different document. Setting
        `RESUME_PDF_SOURCE=database` still gets the database path on purpose.
      */
      const offered = await availableResumeVariants(normalizedLocale);

      if (offered.length > 0) {
        return createErrorResponse(
          new ResumeVariantNotRenderedError(variant, normalizedLocale, offered),
        );
      }

      return createErrorResponse(
        new ResumeVariantNotRenderedError(
          variant,
          normalizedLocale,
          [],
          "no fixed artefact has been built for this locale. Run `npm run pdf:fixed:build`, " +
            "or set RESUME_PDF_SOURCE=database to serve the database document instead.",
        ),
      );
    }

    const renderer = new LaTeXResumeRenderer(templateId);
    const compiler = new DockerPDFCompiler(30000);
    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);

    /*
      The database, not the typed catalog.

      This used to read `getResumeContent`, which made the PDF the third copy of
      the résumé: the page showed the database's content while the download
      showed a version frozen in TypeScript at whatever commit last edited it.
      "Add NestJS and it appears in the résumé and the PDF" was therefore half
      true — the page yes, the PDF no, with nothing saying so.

      `readResume` already falls back to the typed catalog when the database is
      unreachable, so this is strictly an improvement: the same answer in the
      degraded case, a current one otherwise.
    */
    const resumeByLocale = await readResume(normalizedLocale, "resume");

    /*
      Focus, applied before the render rather than after.

      Narrowing after the PDF exists would mean re-typesetting it, which is the
      expensive step. Narrowing the document first means the renderer, the cache
      signature and the filename all describe the same thing by construction.
    */
    const requestedStack = request.nextUrl.searchParams.get("stack");
    const profiles = await readResolvedProfiles(normalizedLocale).catch(() => []);
    const selected = profiles.find((entry) => entry.profile.slug === requestedStack);

    const focused =
      selected === undefined || resumeByLocale.stackIndex === undefined
        ? null
        : applyFocus(resumeByLocale.stackIndex, resumeByLocale, selected.focus);

    const document_ = focused === null ? resumeByLocale : narrowDocument(resumeByLocale, focused);

    const t = await getDictionary(normalizedLocale);
    const sectionLabels = getPdfSectionLabels(t, templateId);
    const cacheDir = getCacheDirectory();
    const cache = new ResumePdfCache(cacheDir);

    /*
      `null` rather than the raw query value, so a stack that does not resolve to
      a profile is the generic document with the generic filename rather than a
      document signed with a name that produced nothing.
    */
    const focusKey = selected?.profile.slug ?? null;
    const preferredFilename = createPreferredFilename(
      normalizedLocale,
      version.toString(),
      templateId,
      focusKey,
    );
    const cachedFilePath = cache.getPath(
      version.toString(),
      normalizedLocale,
      document_,
      templateId,
      preferredFilename,
      focusKey,
    );

    let pdfBytes: Buffer;
    if (cachedFilePath) {
      pdfBytes = readFileSync(cachedFilePath);
    } else {
      let artifact;
      try {
        artifact = await publisher.execute(
          version,
          normalizedLocale,
          document_,
          sectionLabels,
          templateId,
        );
      } catch (error) {
        // Log the primary PDF compiler failure for debugging
        console.warn("Primary PDF compiler failed, attempting fallback", error);

        const fallbackCompiler = new PdfKitPDFCompiler();
        const fallbackPublisher = new PublishPDFResume(builder, renderer, fallbackCompiler);
        artifact = await fallbackPublisher.execute(
          version,
          normalizedLocale,
          document_,
          sectionLabels,
          templateId,
        );
      }

      const generatedPath = cache.write(
        version.toString(),
        normalizedLocale,
        document_,
        templateId,
        artifact.pdfBuffer,
        preferredFilename,
        focusKey,
      );
      pdfBytes = readFileSync(generatedPath);
    }

    return respondWithPdf(pdfBytes, request, preferredFilename);
  } catch (error) {
    // Use centralized error handler for consistent responses
    return createErrorResponse(error);
  }
}

/**
 * A résumé download, with the cache policy the route is not allowed to invent.
 *
 * The decision lives in the application layer because it is a decision, not a
 * detail of this handler: the URL is stable and the bytes are not, so the cache is
 * keyed on the content. See `decideResumePdfResponse` for why a day-long shared
 * cache was wrong here.
 */
function respondWithPdf(
  bytes: Uint8Array,
  request: NextRequest,
  filename: string,
): NextResponse {
  const decision = decideResumePdfResponse(bytes, {
    filename,
    ifNoneMatch: request.headers.get("if-none-match"),
  });

  return new NextResponse(decision.body === null ? null : new Uint8Array(decision.body), {
    status: decision.status,
    headers: decision.headers,
  });
}
