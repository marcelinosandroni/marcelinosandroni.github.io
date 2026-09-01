import type { Locale, ResumeContent } from "@/domain/resume/types";
import { ResumeVersion } from "@/domain/publication/resume-version";

export type PublishedResume = {
  version: ResumeVersion;
  content: ResumeContent;
};

export interface PublishedResumeRepository {
  findLatest(locale: Locale): Promise<PublishedResume | null>;
}

export class PublishedResumeNotFoundError extends Error {
  constructor(locale: Locale) {
    super(`Published resume not found for locale: ${locale}`);
    this.name = "PublishedResumeNotFoundError";
  }
}

export class GetPublishedResume {
  constructor(private readonly repository: PublishedResumeRepository) {}

  async execute(locale: Locale): Promise<PublishedResume> {
    const publishedResume = await this.repository.findLatest(locale);
    if (!publishedResume) {
      throw new PublishedResumeNotFoundError(locale);
    }

    return publishedResume;
  }
}
