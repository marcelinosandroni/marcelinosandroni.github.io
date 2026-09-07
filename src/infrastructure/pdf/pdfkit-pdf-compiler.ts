import PDFDocument from "pdfkit";
import type { PDFCompiler } from "@/application/publication/publish-pdf-resume";

export class PdfKitPDFCompiler implements PDFCompiler {
  async compile(texSource: string, filename: string): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "A4",
      margin: 52,
      bufferPages: true,
      compress: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const sections = this.parseDocumentSections(texSource);

    if (sections.length === 0) {
      doc.font("Helvetica-Bold").fontSize(20).text("Resume");
      doc.moveDown();
      doc.font("Helvetica").fontSize(11).text("Generated from: " + filename);
    } else {
      for (const section of sections) {
        switch (section.type) {
          case "title":
            doc.font("Helvetica-Bold").fontSize(20).text(section.value, { align: "center" });
            doc.moveDown(0.35);
            break;
          case "subtitle":
            doc.font("Helvetica-Bold").fontSize(11).text(section.value);
            doc.moveDown(0.2);
            break;
          case "section":
            doc.font("Helvetica-Bold").fontSize(13).text(section.value.toUpperCase());
            doc.moveDown(0.2);
            break;
          case "paragraph":
            doc.font("Helvetica").fontSize(10).text(section.value, { lineGap: 2, paragraphGap: 4 });
            break;
          case "listItem":
            doc.font("Helvetica").fontSize(10).text(`• ${section.value}`, { indent: 18, paragraphGap: 3, lineGap: 1.5 });
            break;
          case "emphasis":
            doc.font("Helvetica-Oblique").fontSize(10).text(section.value, { paragraphGap: 3 });
            break;
        }
      }
    }

    doc.end();

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    return Buffer.concat(chunks);
  }

  private parseDocumentSections(texSource: string): Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis"; value: string }> {
    const entries: Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis"; value: string }> = [];
    const lines = texSource.split(/\r?\n/);

    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (["\\begin{document}", "\\end{document}", "\\maketitle", "\\usepackage", "\\documentclass"].some((token) => line.startsWith(token))) {
        continue;
      }

      const titleMatch = line.match(/^\\title\{(.+)\}$/);
      if (titleMatch) {
        entries.push({ type: "title", value: this.normalizeLatexText(titleMatch[1]) });
        continue;
      }

      const sectionMatch = line.match(/^\\section\*?\{(.+)\}$/) || line.match(/^\\section\s*\{(.+)\}$/);
      if (sectionMatch) {
        entries.push({ type: "section", value: this.normalizeLatexText(sectionMatch[1]) });
        inList = false;
        continue;
      }

      const subsectionMatch = line.match(/^\\subsection\{(.+)\}$/);
      if (subsectionMatch) {
        entries.push({ type: "subtitle", value: this.normalizeLatexText(subsectionMatch[1]) });
        inList = false;
        continue;
      }

      if (line === "\\begin{itemize}") {
        inList = true;
        continue;
      }

      if (line === "\\end{itemize}") {
        inList = false;
        continue;
      }

      const itemMatch = line.match(/^\\item\s*(.+)$/);
      if (itemMatch) {
        entries.push({ type: "listItem", value: this.normalizeLatexText(itemMatch[1]) });
        continue;
      }

      const emphasisMatch = line.match(/^\\textit\{(.+)\}$/);
      if (emphasisMatch) {
        entries.push({ type: "emphasis", value: this.normalizeLatexText(emphasisMatch[1]) });
        continue;
      }

      const textMatch = line.match(/^\\textbf\{(.+)\}$/);
      if (textMatch) {
        entries.push({ type: "paragraph", value: this.normalizeLatexText(textMatch[1]) });
        continue;
      }

      if (inList) {
        entries.push({ type: "listItem", value: this.normalizeLatexText(line.replace(/^\\item\s*/, "")) });
        continue;
      }

      const plainText = this.normalizeLatexText(line)
        .replace(/^\\/, "")
        .trim();

      if (!plainText) continue;

      entries.push({ type: "paragraph", value: plainText });
    }

    return entries;
  }

  private normalizeLatexText(value: string): string {
    return value
      .replace(/\\textbackslash\{\}/g, "\\")
      .replace(/\\textasciitilde\{\}/g, "~")
      .replace(/\\textasciicircum\{\}/g, "^")
      .replace(/\\textbf\{([^}]+)\}/g, "$1")
      .replace(/\\textit\{([^}]+)\}/g, "$1")
      .replace(/\\section\*?\{([^}]+)\}/g, "$1")
      .replace(/\\subsection\{([^}]+)\}/g, "$1")
      .replace(/\\item\s*/g, "")
      .replace(/\\\\/g, "\n")
      .replace(/\\&/g, "&")
      .replace(/\\%/g, "%")
      .replace(/\\\$/g, "$")
      .replace(/\\#/g, "#")
      .replace(/\\_/g, "_")
      .replace(/\{\}/g, "")
      .replace(/\{([^}]+)\}/g, "$1")
      .replace(/\\~/g, "~")
      .replace(/\\^/g, "^")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\s+\n/g, "\n")
      .trim();
  }
}
