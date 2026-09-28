export type { Locale } from "@/domain/i18n";

import type { Locale } from "@/domain/i18n";

export type CaseStudy = {
  title: string;
  challenge: string;
  solution: string;
  result: string;
  metrics: {
    label: string;
    value: string;
    icon?: "time" | "money" | "people" | "performance";
  }[];
};

export type ResumeExperience = {
  company: string;
  role: string;
  period: string;
  location: string;
  summary: string;
  highlights: string[];
  caseStudies?: CaseStudy[];
  technologies?: string[];
  teamSize?: number;
  scope?: string;
};

export type ResumeSkillGroup = {
  label: string;
  skills: string[];
};

export type ResumeEducation = {
  title: string;
  institution: string;
  period: string;
  description: string;
};

export type ResumeContent = {
  locale: Locale;
  name: string;
  title: string;
  location: string;
  contact: {
    phone: string;
    email: string;
    linkedin: string;
  };
  summary: string;
  experiences: ResumeExperience[];
  skillGroups: ResumeSkillGroup[];
  education: ResumeEducation[];
  languages: string[];
};
