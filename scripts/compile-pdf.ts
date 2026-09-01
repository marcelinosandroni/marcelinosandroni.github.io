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
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface CompileOptions {
  locale?: "pt-BR" | "en-US";
  outputDir?: string;
}

async function compileResumePDF(options: CompileOptions = {}): Promise<void> {
  const locales = options.locale ? [options.locale] : ["pt-BR", "en-US"];
  const outputDir = options.outputDir || join(process.cwd(), "public", "artifacts");

  try {
    await fs.mkdir(outputDir, { recursive: true });

    for (const locale of locales) {
      console.log(`\n📄 Compiling resume for ${locale}...`);

      const tempDir = join(tmpdir(), `resume-pdf-${locale}-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // In a real scenario, this would call the API endpoint or use Docker directly
        // For now, we'll just create a placeholder that shows the structure

        const filename = `resume-marcelino-sandroni-0.1.5-${locale}.pdf`;
        const filepath = join(outputDir, filename);

        // Create a placeholder PDF with metadata
        const pdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 16 Tf
50 750 Td
(Marcelino Sandroni Dias - Resume v0.1.5) Tj
0 -20 Td
(Locale: ${locale}) Tj
0 -20 Td
(Generated: ${new Date().toISOString()}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000074 00000 n
0000000133 00000 n
0000000223 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
475
%%EOF`);

        await fs.writeFile(filepath, pdfContent);
        console.log(`✅ Generated: ${filename}`);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
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
