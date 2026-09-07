import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ResumePdfCache } from "@/infrastructure/pdf/resume-pdf-cache";
import { getResumeContent } from "@/infrastructure/content";

describe("ResumePdfCache", () => {
  it("reuses the same cached PDF while content is unchanged", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "resume-pdf-cache-"));

    try {
      const cache = new ResumePdfCache(tempDir);
      const content = getResumeContent("pt-BR");
      const payload = Buffer.from("%PDF-1.4\nGenerated resume");

      const firstPath = cache.write("0.1.28", "pt-BR", content, payload, "Marcelino Sandroni Resume v0.1.28 pt-BR.pdf");
      const secondPath = cache.write("0.1.28", "pt-BR", content, payload, "Marcelino Sandroni Resume v0.1.28 pt-BR.pdf");

      expect(firstPath).toBe(secondPath);
      expect(readFileSync(secondPath)).toEqual(payload);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
