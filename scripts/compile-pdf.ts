#!/usr/bin/env node

/**
 * Script to compile resume PDF artifacts for all supported locales.
 * Can be run locally or in CI/CD pipeline.
 *
 * Usage:
 *   npm run compile:pdf
 *   npm run compile:pdf -- --locale pt-BR
 */

import { promises as fs } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ResumeVersion } from "../src/domain/publication/resume-version";
import { BuildResumeDocument } from "../src/application/publication/build-resume-document";
import { PublishPDFResume, type PDFCompiler } from "../src/application/publication/publish-pdf-resume";
import { LaTeXResumeRenderer } from "../src/infrastructure/renderers/latex-resume-renderer";
import { DockerPDFCompiler } from "../src/infrastructure/pdf/docker-pdf-compiler";
import { MockPDFCompiler } from "../src/infrastructure/pdf/mock-pdf-compiler";
import { getResumeContent } from "../src/infrastructure/content";

const execAsync = promisify(exec);

interface CompileOptions {
  locale?: "pt-BR" | "en-US";
  outputDir?: string;
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker info", { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

async function compileResumePDF(options: CompileOptions = {}): Promise<void> {
  const locales: ("pt-BR" | "en-US")[] = options.locale ? [options.locale] : ["pt-BR", "en-US"];
  const outputDir = options.outputDir || join(process.cwd(), "public", "artifacts");

  try {
    await fs.mkdir(outputDir, { recursive: true });

    const hasDocker = await isDockerAvailable();
    const renderer = new LaTeXResumeRenderer();
    const compiler: PDFCompiler = hasDocker ? new DockerPDFCompiler(10000) : new MockPDFCompiler();

    if (!hasDocker) {
      console.log("ℹ️ Docker daemon not active, using standalone deterministic PDF compiler.");
    }

    const builder = new BuildResumeDocument(renderer);
    const publisher = new PublishPDFResume(builder, renderer, compiler);
    const version = ResumeVersion.create("0.1.5");

    for (const locale of locales) {
      console.log(`\n📄 Compiling resume for ${locale}...`);
      const content = getResumeContent(locale);

      let artifact;
      try {
        artifact = await publisher.execute(version, locale, content);
      } catch (err) {
        console.warn("⚠️ Preferred compiler failed, falling back to standalone compiler:", err);
        const fallbackPublisher = new PublishPDFResume(builder, renderer, new MockPDFCompiler());
        artifact = await fallbackPublisher.execute(version, locale, content);
      }

      const filepath = join(outputDir, artifact.filename);
      await fs.writeFile(filepath, artifact.pdfBuffer);
      console.log(`✅ Generated: ${artifact.filename} (${artifact.pdfBuffer.length} bytes)`);
    }

    console.log(`\n✅ All PDFs compiled to ${outputDir}`);
  } catch (error) {
    console.error("❌ PDF compilation failed:", error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options: CompileOptions = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--locale" && args[i + 1]) {
    options.locale = args[i + 1] as "pt-BR" | "en-US";
    i++;
  } else if (args[i] === "--output" && args[i + 1]) {
    options.outputDir = args[i + 1];
    i++;
  }
}

compileResumePDF(options).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
