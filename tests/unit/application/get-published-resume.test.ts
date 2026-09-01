import { describe, expect, it } from "vitest";
import { GetPublishedResume, PublishedResumeNotFoundError, type PublishedResumeRepository } from "@/application/publication/get-published-resume";
import { ResumeVersion } from "@/domain/publication/resume-version";
import { resumeContent } from "@/infrastructure/content/resume-data";

describe("GetPublishedResume", () => {
  it("returns the latest published resume for a locale", async () => {
    const repository: PublishedResumeRepository = {
      findLatest: async () => ({ version: ResumeVersion.create("0.1.5"), content: resumeContent }),
    };

    const result = await new GetPublishedResume(repository).execute("pt-BR");

    expect(result.version.toString()).toBe("0.1.5");
    expect(result.content.locale).toBe("pt-BR");
  });

  it("raises a domain application error when no version is published", async () => {
    const repository: PublishedResumeRepository = { findLatest: async () => null };

    await expect(new GetPublishedResume(repository).execute("en-US")).rejects.toThrow(PublishedResumeNotFoundError);
  });
});
