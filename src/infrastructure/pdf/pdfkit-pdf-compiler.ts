import PDFDocument from "pdfkit";
import type { PDFCompiler } from "@/application/publication/publish-pdf-resume";

export class PdfKitPDFCompiler implements PDFCompiler {
  async compile(texSource: string, filename: string): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true,
      compress: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    doc.fontSize(18).text(`${filename} — Marcelino Sandroni Dias`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text("Resume PDF generated successfully", { align: "left" });
    doc.moveDown();

    const lines = texSource
      .replace(/\\documentclass\[[^\]]*\]\{[^}]+\}/g, "")
      .replace(/\\usepackage\[[^\]]*\]\{[^}]+\}/g, "")
      .replace(/\\usepackage\{[^}]+\}/g, "")
      .replace(/\\begin\{document\}/g, "")
      .replace(/\\end\{document\}/g, "")
      .replace(/\\section\*\{([^}]+)\}/g, "$1\n")
      .replace(/\\section\{([^}]+)\}/g, "$1\n")
      .replace(/\\subsection\{([^}]+)\}/g, "$1\n")
      .replace(/\\textbf\{([^}]+)\}/g, "$1")
      .replace(/\\textit\{([^}]+)\}/g, "$1")
      .replace(/\\\\/g, "\n")
      .replace(/\\&/g, "&")
      .replace(/\\%/g, "%")
      .replace(/\\$/g, "$")
      .replace(/\\#/g, "#")
      .replace(/\\_/g, "_")
      .split(/\r?\n/)
      .filter(Boolean);

    for (const line of lines) {
      doc.text(line.trim());
    }

    doc.end();

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    return Buffer.concat(chunks);
  }
}
