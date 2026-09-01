export type Locale = "pt-BR" | "en-US";

export type ResumeExperience = {
  company: string;
  role: string;
  period: string;
  summary: string;
  highlights: string[];
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
    email: string;
    linkedin: string;
  };
  summary: string;
  experiences: ResumeExperience[];
  skillGroups: ResumeSkillGroup[];
  education: ResumeEducation[];
  languages: string[];
};
