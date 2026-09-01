import type { Locale, ResumeContent } from "@/domain/resume/types";
import type { ResumeVersion } from "@/domain/publication/resume-version";

export type ResumeDocumentInput = {
  version: ResumeVersion;
  locale: Locale;
  content: ResumeContent;
};

export type ResumeDocument = {
  filename: string;
  content: string;
};

export interface ResumeDocumentRenderer {
  render(input: ResumeDocumentInput): Promise<ResumeDocument>;
}

export class BuildResumeDocument {
  constructor(private readonly renderer: ResumeDocumentRenderer) {}

  async execute(input: ResumeDocumentInput): Promise<ResumeDocument> {
    return this.renderer.render(input);
  }
}
