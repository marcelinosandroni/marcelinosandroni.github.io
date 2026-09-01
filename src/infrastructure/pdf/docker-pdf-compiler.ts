import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, rm } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PDFCompiler } from "@/application/publication/publish-pdf-resume";

const execAsync = promisify(exec);

export class DockerPDFCompiler implements PDFCompiler {
  async compile(texSource: string, filename: string): Promise<Buffer> {
    const tempDir = await mkdtemp(join(tmpdir(), "resume-pdf-"));

    try {
      const texFilename = filename.replace(".pdf", ".tex");
      const texPath = join(tempDir, texFilename);
      const pdfFilename = filename.replace(".tex", ".pdf");
      const pdfPath = join(tempDir, pdfFilename);

      await writeFile(texPath, texSource);

      const command = `docker run --rm -v ${tempDir}:/workspace mcr.microsoft.com/devcontainers/base:alpine-3.20 pdflatex -interaction=nonstopmode -output-directory=/workspace ${texFilename}`;

      try {
        await execAsync(command);
      } catch (error) {
        console.error("LaTeX compilation error:", error);
      }

      const pdfBuffer = await readFile(pdfPath);
      return pdfBuffer;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}
