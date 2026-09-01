import type { Locale, ResumeContent } from "@/domain/resume/types";
import { resumeContent } from "@/infrastructure/content/resume-data";
import { resumeContentEnUs } from "@/infrastructure/content/resume-data-en-us";

export function getResumeContent(locale: Locale): ResumeContent {
  if (locale === "en-US") {
    return resumeContentEnUs;
  }
  return resumeContent;
}
