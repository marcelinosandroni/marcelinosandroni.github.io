import type { Locale } from "@/domain/resume/types";
import { ResumeVersion } from "@/domain/publication/resume-version";

export type ResumeVersionSummary = {
  version: ResumeVersion;
  locale: Locale;
  publishedAt: Date;
  artifactUrl?: string;
};

export interface ResumeVersionRepository {
  list(locale: Locale): Promise<ResumeVersionSummary[]>;
}

export class ListResumeVersions {
  constructor(private readonly repository: ResumeVersionRepository) {}

  async execute(locale: Locale): Promise<ResumeVersionSummary[]> {
    return this.repository.list(locale);
  }
}
