import type { Locale, ResumeContent } from "@/domain/resume/types";
import type { ResumeVersion } from "@/domain/publication/resume-version";

/**
 * Section headings printed in the document. Resolved from the message catalog by
 * the caller, so no user-facing text lives in the renderer.
 */
export type ResumeSectionLabels = {
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
};

export type ResumeDocumentInput = {
  version: ResumeVersion;
  locale: Locale;
  content: ResumeContent;
  templateId?: string;
  labels: ResumeSectionLabels;
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
