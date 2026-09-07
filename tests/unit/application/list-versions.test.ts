import { describe, expect, it } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { ListResumeVersions, type ResumeVersionRepository } from "@/application/publication/list-versions";

describe("ListResumeVersions", () => {
  it("returns all versions ordered by publication date", async () => {
    const repository: ResumeVersionRepository = {
      list: async () => [
        { version: ResumeVersion.create("0.1.5"), locale: "pt-BR", publishedAt: new Date("2026-08-31T00:00:00Z") },
        { version: ResumeVersion.create("0.1.4"), locale: "pt-BR", publishedAt: new Date("2026-08-30T00:00:00Z") },
      ],
    };

    const result = await new ListResumeVersions(repository).execute("pt-BR");

    expect(result).toHaveLength(2);
    expect(result[0].version.toString()).toBe("0.1.5");
  });
});
