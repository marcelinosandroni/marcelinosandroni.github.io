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
      let isInsideTabular = false;

      for (const section of sections) {
        if (section.type === "tabularStart") {
          isInsideTabular = true;
          continue;
        }

        if (section.type === "tabularEnd") {
          isInsideTabular = false;
          doc.moveDown(0.3);
          continue;
        }

        if (isInsideTabular && section.type === "tabularRow") {
          const y = doc.y;
          // Split by & but use the LAST " & " as separator since label may contain & (e.g., "Architecture & Backend")
          const lastAmpIndex = section.value.lastIndexOf(" & ");
          let label, content;
          if (lastAmpIndex > -1) {
            label = section.value.substring(0, lastAmpIndex);
            content = section.value.substring(lastAmpIndex + 3);
          } else {
            label = section.value;
            content = "";
          }
          const labelWidth = 140;

          if (content && content.trim()) {
            doc.font("Helvetica-Bold").fontSize(10).text(label.trim(), 52, y, { width: labelWidth, align: "left" });
            doc.font("Helvetica").fontSize(10).text(content.trim(), 52 + labelWidth, y, { width: doc.page.width - 52 - labelWidth - 52, align: "left" });
          } else {
            doc.font("Helvetica").fontSize(10).text(section.value, 52, y);
          }
          doc.moveDown(0.15);
          continue;
        }

        switch (section.type) {
          case "title":
            doc.font("Helvetica-Bold").fontSize(20).text(section.value, { align: "center" });
            doc.moveDown(0.35);
            break;
          case "subtitle":
            doc.font("Helvetica-Bold").fontSize(11).text(section.value);
            doc.moveDown(0.2);
            break;
          case "contact":
            doc.font("Helvetica").fontSize(9).text(section.value, { align: "center" });
            doc.moveDown(0.15);
            break;
          case "section":
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#17211D").text(section.value.toUpperCase());
            doc.moveDown(0.15);
            // Draw accent line
            const lineWidth = doc.page.width - 104;
            doc.rect(52, doc.y - 2, lineWidth, 2).fill("#819023");
            doc.moveDown(0.25);
            break;
          case "paragraph":
            doc.font("Helvetica").fontSize(10).fillColor("#17211D").text(section.value, { lineGap: 2, paragraphGap: 4 });
            break;
          case "listItem":
            doc.font("Helvetica").fontSize(10).fillColor("#17211D").text(`• ${section.value}`, { indent: 18, paragraphGap: 3, lineGap: 1.5 });
            break;
          case "emphasis":
            doc.font("Helvetica-Oblique").fontSize(10).fillColor("#17211D").text(section.value, { paragraphGap: 3 });
            break;
          case "bold":
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#17211D").text(section.value, { paragraphGap: 2 });
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

  private parseDocumentSections(texSource: string): Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis" | "bold" | "contact" | "tabularStart" | "tabularEnd" | "tabularRow"; value: string }> {
    const entries: Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis" | "bold" | "contact" | "tabularStart" | "tabularEnd" | "tabularRow"; value: string }> = [];
    
    // Remove document preamble and extract body content
    const bodyMatch = texSource.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (!bodyMatch) {
      return entries;
    }

    const body = bodyMatch[1];
    const lines = body.split(/\r?\n/);

    let inList = false;
    let inTabular = false;
    let currentParagraph = "";

    const flushParagraph = () => {
      if (currentParagraph.trim()) {
        entries.push({ type: "paragraph", value: this.normalizeLatexText(currentParagraph) });
        currentParagraph = "";
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flushParagraph();
        continue;
      }

      // Skip LaTeX setup commands
      if (["\\color{ink}", "\\vspace{4pt}", "\\vfill"].includes(line)) {
        continue;
      }

      // Center environment - extract contact info
      if (line === "\\begin{center}") {
        continue;
      }

      if (line === "\\end{center}") {
        flushParagraph();
        continue;
      }

      // Handle fontsize commands - extract the text content
      const fontsizeMatch = line.match(/\\fontsize\{\d+\}\{\d+\}\\selectfont(?:\\bfseries)?\s*(.+?)(?:\\\\|$)/);
      if (fontsizeMatch) {
        const text = fontsizeMatch[1].trim();
        if (text) {
          // Check if it's a title (larger font) or subtitle
          if (line.includes("\\fontsize{24}") || line.includes("\\fontsize{22}")) {
            entries.push({ type: "title", value: this.normalizeLatexText(text) });
          } else {
            entries.push({ type: "subtitle", value: this.normalizeLatexText(text) });
          }
        }
        continue;
      }

      // Handle line breaks in center block (contact info)
      const centerTextMatch = line.match(/^\\small\s+(.+)$/);
      if (centerTextMatch) {
        entries.push({ type: "contact", value: this.normalizeLatexText(centerTextMatch[1]) });
        continue;
      }

      // Section headers
      const sectionMatch = line.match(/^\\section\{(.+)\}$/);
      if (sectionMatch) {
        flushParagraph();
        entries.push({ type: "section", value: this.normalizeLatexText(sectionMatch[1]) });
        inList = false;
        inTabular = false;
        continue;
      }

      // Tabular environment
      if (line.includes("\\begin{tabularx}")) {
        inTabular = true;
        entries.push({ type: "tabularStart", value: "" });
        continue;
      }

      if (line.includes("\\end{tabularx}")) {
        inTabular = false;
        entries.push({ type: "tabularEnd", value: "" });
        continue;
      }

      // Tabular rows (label & content \\\\)
      if (inTabular) {
        // Match rows with & as column separator, but not \& (escaped ampersand)
        // We need to find the column separator & that's not preceded by backslash
        const rowMatch = line.match(/^(.+?)\s*&\s*(.+?)\s*\\\\$/);
        if (rowMatch) {
          let label = rowMatch[1];
          let content = rowMatch[2];
          // The label may contain \& which should be part of the label text
          // Check if label ends with backslash (meaning the & was actually \&)
          if (label.trim().endsWith('\\')) {
            // This means we matched on a wrong &, look for the real column separator
            // The real separator is & not preceded by \
            const parts = line.split(/(?<!\\)&/);
            if (parts.length >= 2) {
              label = parts[0].replace(/\\$/, '').trim();
              content = parts.slice(1).join('&').replace(/\s*\\\\$/, '').trim();
            }
          }
          entries.push({ type: "tabularRow", value: `${this.normalizeLatexText(label)} & ${this.normalizeLatexText(content)}` });
        }
        continue;
      }

      // Itemize environment
      if (line === "\\begin{itemize}") {
        inList = true;
        flushParagraph();
        continue;
      }

      if (line === "\\end{itemize}") {
        inList = false;
        flushParagraph();
        continue;
      }

      // List items
      const itemMatch = line.match(/^\\item\s+(.+)$/);
      if (itemMatch) {
        flushParagraph();
        entries.push({ type: "listItem", value: this.normalizeLatexText(itemMatch[1]) });
        continue;
      }

      // Bold text with period at end (experience headers)
      const boldPeriodMatch = line.match(/^\\textbf\{([^}]+)\}\\quad(.+)$/);
      if (boldPeriodMatch) {
        flushParagraph();
        const boldText = this.normalizeLatexText(boldPeriodMatch[1]);
        const restText = this.normalizeLatexText(boldPeriodMatch[2]);
        entries.push({ type: "bold", value: boldText + " " + restText });
        continue;
      }

      // Standalone bold text
      const boldMatch = line.match(/^\\textbf\{(.+)\}$/);
      if (boldMatch) {
        flushParagraph();
        entries.push({ type: "bold", value: this.normalizeLatexText(boldMatch[1]) });
        continue;
      }

      // Italic text (education periods)
      const italicMatch = line.match(/^\\textit\{(.+)\}$/);
      if (italicMatch) {
        flushParagraph();
        entries.push({ type: "emphasis", value: this.normalizeLatexText(italicMatch[1]) });
        continue;
      }

      // Renew command (skip)
      if (line.startsWith("\\renewcommand")) {
        continue;
      }

      // Plain text - accumulate for paragraph
      const plainText = this.normalizeLatexText(line)
        .replace(/^\\/, "")
        .trim();

      if (plainText) {
        currentParagraph += plainText + " ";
      }
    }

    flushParagraph();
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
      .replace(/\\\\/g, "")
      .replace(/\\&/g, "&")
      .replace(/\\%/g, "%")
      .replace(/\\\$/g, "$")
      .replace(/\\#/g, "#")
      .replace(/\\_/g, "_")
      .replace(/\\textbar\{\}/g, "|")
      .replace(/\\textbar/g, "|")
      .replace(/\\href\{[^}]*\}\{([^}]+)\}/g, "$1")
      .replace(/\\,/g, "")
      .replace(/\{\}/g, "")
      .replace(/\{/g, "")
      .replace(/\}/g, "")
      .replace(/\\~/g, "~")
      .replace(/\^/g, "^")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\s+/g, " ")
      .trim();
  }
}
