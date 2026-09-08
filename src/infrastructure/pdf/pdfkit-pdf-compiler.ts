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

    const sections = this.parseDocumentSections(texSource);

    if (sections.length === 0) {
      doc.font("Helvetica-Bold").fontSize(20).text("Resume");
      doc.moveDown();
      doc.font("Helvetica").fontSize(11).text("Generated from: " + filename);
    } else {
      let isInsideTabular = false;
      let metadata = { locale: "pt-BR", version: "" };

      for (const section of sections) {
        // Capture metadata from footer
        if (section.type === "metadata") {
          metadata = section.value;
          continue;
        }

        if (section.type === "tabularStart") {
          isInsideTabular = true;
          continue;
        }

        if (section.type === "tabularEnd") {
          isInsideTabular = false;
          doc.moveDown(0.5);
          continue;
        }

        if (isInsideTabular && section.type === "tabularRow") {
          const y = doc.y;
          const parts = section.value.split(" & ");
          const label = parts[0] || "";
          const content = parts.slice(1).join(" & ") || "";
          const labelWidth = 130;

          if (content && content.trim()) {
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#17211D").text(label.trim(), 50, y, { width: labelWidth, align: "left" });
            doc.font("Helvetica").fontSize(9).fillColor("#17211D").text(content.trim(), 50 + labelWidth, y, { width: doc.page.width - 50 - labelWidth - 50, align: "left", lineGap: 1.5 });
            const lineHeight = doc.currentLineHeight();
            const maxLines = Math.max(
              Math.ceil(doc.widthOfString(label.trim(), { width: labelWidth }) / labelWidth),
              Math.ceil(doc.widthOfString(content.trim(), { width: doc.page.width - 50 - labelWidth - 50 }) / (doc.page.width - 50 - labelWidth - 50))
            );
            doc.y = y + (maxLines * lineHeight) + 3;
          } else {
            doc.font("Helvetica").fontSize(9).fillColor("#17211D").text(section.value, 50, y);
          }
          continue;
        }

        switch (section.type) {
          case "title":
            doc.font("Helvetica-Bold").fontSize(22).fillColor("#17211D").text(section.value, { align: "center" });
            doc.moveDown(0.4);
            break;
          case "subtitle":
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#17211D").text(section.value, { align: "center" });
            doc.moveDown(0.25);
            break;
          case "contact":
            doc.font("Helvetica").fontSize(9).fillColor("#5F6360").text(section.value, { align: "center", lineGap: 1.5 });
            doc.moveDown(0.3);
            break;
          case "section":
            doc.moveDown(0.5);
            doc.font("Helvetica-Bold").fontSize(12).fillColor("#17211D").text(section.value.toUpperCase(), { tracking: 2 });
            doc.moveDown(0.15);
            // Draw accent line
            const lineWidth = doc.page.width - 100;
            doc.rect(50, doc.y - 1, lineWidth, 1.5).fill("#819023");
            doc.moveDown(0.35);
            break;
          case "paragraph":
            doc.font("Helvetica").fontSize(10).fillColor("#17211D").text(section.value, { lineGap: 2, paragraphGap: 4, align: "justify" });
            break;
          case "listItem":
            doc.font("Helvetica").fontSize(10).fillColor("#17211D").text(`• ${section.value}`, { indent: 15, paragraphGap: 2, lineGap: 1.5, align: "left" });
            break;
          case "emphasis":
            doc.font("Helvetica-Oblique").fontSize(10).fillColor("#5F6360").text(section.value, { paragraphGap: 2 });
            break;
          case "bold":
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#17211D").text(section.value, { paragraphGap: 2, lineGap: 1.5 });
            break;
        }
      }

      // Add metadata in bottom right corner
      if (metadata.version) {
        const originalY = doc.y;
        doc.fontSize(7).fillColor("#9F9F9F").text(`${metadata.locale} | v${metadata.version}`, doc.page.width - 100, doc.page.height - 40, { align: "right" });
        doc.y = originalY;
      }
    }

    doc.end();

    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    return Buffer.concat(chunks);
  }

  private parseDocumentSections(texSource: string): Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis" | "bold" | "contact" | "tabularStart" | "tabularEnd" | "tabularRow" | "metadata"; value: string | { locale: string; version: string } }> {
    const entries: Array<{ type: "title" | "section" | "subtitle" | "paragraph" | "listItem" | "emphasis" | "bold" | "contact" | "tabularStart" | "tabularEnd" | "tabularRow" | "metadata"; value: string | { locale: string; version: string } }> = [];
    
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
      if ([
        "\\color{ink}", "\\vspace{4pt}", "\\vfill",
        "\\renewcommand\\familydefault\\sfdefault",
        "\\pagestyle{empty}",
        "\\setlength\\parindent{0pt}",
        "\\setlength\\parskip{3pt}",
        "\\definecolor{ink}{RGB}{23,33,29}",
        "\\definecolor{muted}{RGB}{95,99,96}",
        "\\definecolor{accent}{RGB}{129,144,35}",
        "\\hypersetup{colorlinks=true,urlcolor=ink}",
        "\\titleformat\\section\\large\\bfseries\\color{ink}{0pt}[\\vspace{-4pt}\\textcolor{accent}\\rule{\\linewidth}{0.7pt}]",
        "\\titlespacing*\\section{0pt}{8pt}{4pt}",
        "\\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt,parsep=0pt}",
        "\\renewcommand{\\arraystretch}{1.15}"
      ].includes(line)) {
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

      // Handle line breaks in center block (contact info) - skip \small command
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
        // Match rows with & as column separator
        const rowMatch = line.match(/^(.+?)\s*&\s*(.+?)\s*\\\\$/);
        if (rowMatch) {
          let label = rowMatch[1];
          let content = rowMatch[2];
          // Handle escaped ampersand in label
          if (label.trim().endsWith('\\')) {
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

      // Footer metadata - extract locale and version
      const footerMatch = line.match(/\\scriptsize\\color\{muted\}\s*([a-z]{2}-[A-Z]{2})\s*\\textbar\s*v([\d.]+)/);
      if (footerMatch) {
        entries.push({ type: "metadata", value: { locale: footerMatch[1], version: footerMatch[2] } });
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
      .replace(/\\small/g, "")
      .replace(/\\scriptsize/g, "")
      .replace(/\\color\{[^}]*\}/g, "")
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
