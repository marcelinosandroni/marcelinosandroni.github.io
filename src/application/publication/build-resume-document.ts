import type { Locale, ResumeContent } from "@/domain/resume/types";
import type { ResumeVersion } from "@/domain/publication/resume-version";

/**
 * Section headings printed in the document. Resolved from the message catalog by
 * the caller, so no user-facing text lives in the renderer.
 *
 * The last five are the *inline* labels the reference template needs: the team
 * size, the stack and the three parts of a case study. They are labels rather
 * than fixed words because a printed "Team: 10" in English is a bug in the
 * Portuguese document, and the whole point of the catalog is that this class of
 * bug is impossible.
 */
export type ResumeSectionLabels = {
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
  /** `{n}` is replaced with the headcount. */
  teamSize: string;
  stack: string;
  challenge: string;
  solution: string;
  result: string;
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
