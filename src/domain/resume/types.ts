export type Locale = "pt-BR" | "en-US";

export type ResumeMediaAsset = {
  type: "image" | "video" | "link" | "document";
  url: string;
  caption?: string;
  thumbnailUrl?: string;
};

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
  mediaAssets?: ResumeMediaAsset[];
};

export type ResumeSkillGroup = {
  label: string;
  skills: string[];
  yearsOfExperience?: number;
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
