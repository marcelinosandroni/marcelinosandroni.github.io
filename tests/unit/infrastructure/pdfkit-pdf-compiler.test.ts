import { describe, expect, it } from "vitest";
import { PdfKitPDFCompiler } from "@/infrastructure/pdf/pdfkit-pdf-compiler";

describe("PdfKitPDFCompiler", () => {
  it("creates a complete PDF document with resume text", async () => {
    const compiler = new PdfKitPDFCompiler();

    const buffer = await compiler.compile(
      "\\documentclass{article}\n\\begin{document}\nMarcelino Sandroni Dias\\end{document}",
      "resume-test.pdf",
    );

    expect(buffer.toString("ascii", 0, 4)).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.toString("latin1")).toContain("/Type /Page");
    expect(buffer.toString("latin1")).toContain("4d617263656c696e6f2053616e64726f6e692044696173");
  });
});
