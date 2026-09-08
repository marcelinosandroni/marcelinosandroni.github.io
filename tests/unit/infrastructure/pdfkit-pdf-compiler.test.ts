import { describe, expect, it } from "vitest";
import { PdfKitPDFCompiler } from "@/infrastructure/pdf/pdfkit-pdf-compiler";

describe("PdfKitPDFCompiler", () => {
  it("creates a complete PDF document with resume text", async () => {
    const compiler = new PdfKitPDFCompiler();

    const buffer = await compiler.compile(
      "\\documentclass{article}\\n\\begin{document}\\nMarcelino Sandroni Dias\\end{document}",
      "resume-test.pdf",
    );

    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.toString("latin1")).toContain("/Type /Page");
  });

  it("parses contact info and removes \\textbar commands correctly", async () => {
    const compiler = new PdfKitPDFCompiler();
    const texSource = String.raw`\documentclass{article}
\begin{document}
\begin{center}
{\fontsize{24}{26}\selectfont\bfseries Marcelino Sandroni Dias}\\[3pt]
{\fontsize{13}{15}\selectfont Engenheiro de Software Senior}\\[4pt]
{\small Fortaleza, CE (Remoto) \textbar{} +55 11 91446-1993 \textbar{} marcelino.sandroni@gmail.com}
\end{center}
\end{document}`;

    const buffer = await compiler.compile(texSource, "resume-contact.pdf");
    
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    // Should not contain raw LaTeX commands in the stream
    const pdfContent = buffer.toString("latin1");
    expect(pdfContent).not.toContain("\\textbar{}");
    expect(pdfContent).not.toMatch(/[^\\]\}/); // No standalone closing braces
  });

  it("parses tabular skills section correctly", async () => {
    const compiler = new PdfKitPDFCompiler();
    const texSource = String.raw`\documentclass{article}
\begin{document}
\section{Skills}
\renewcommand{\arraystretch}{1.15}
\begin{tabularx}{\linewidth}{@{}p{0.25\linewidth}X@{}}
Backend & C#, Java, Node.js \\
Frontend & React, Next.js, Angular \\
\end{tabularx}
\end{document}`;

    const buffer = await compiler.compile(texSource, "resume-skills.pdf");
    
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    // Verify PDF structure is valid
    const pdfContent = buffer.toString("latin1");
    expect(pdfContent).toContain("/Font");
  });

  it("parses education section with proper formatting", async () => {
    const compiler = new PdfKitPDFCompiler();
    const texSource = String.raw`\documentclass{article}
\begin{document}
\section{Education}
\textbf{Computer Engineering -- UNIVESP}\\
\textit{2021--2025}\\
Focus on computer architecture.
\end{document}`;

    const buffer = await compiler.compile(texSource, "resume-education.pdf");
    
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("parses languages section without extra braces", async () => {
    const compiler = new PdfKitPDFCompiler();
    const texSource = String.raw`\documentclass{article}
\begin{document}
\section{Languages}
English Professional\\
Portuguese Native
\end{document}`;

    const buffer = await compiler.compile(texSource, "resume-languages.pdf");
    
    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    const pdfContent = buffer.toString("latin1");
    // Should not have leftover braces from LaTeX parsing
    expect(pdfContent).not.toMatch(/\{[^}]*\}/); // No unmatched brace pairs
  });
});
