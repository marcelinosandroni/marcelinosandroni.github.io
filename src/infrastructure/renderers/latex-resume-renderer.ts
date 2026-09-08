import type { ResumeDocumentInput, ResumeDocument, ResumeDocumentRenderer } from "@/application/publication/build-resume-document";
import { resumeLatexTemplate } from "@/infrastructure/pdf/latex-templates";
import { DEFAULT_RESUME_TEMPLATE, type ResumeTemplateId } from "@/infrastructure/pdf/resume-template-registry";

export class LaTeXResumeRenderer implements ResumeDocumentRenderer {
  constructor(private readonly templateId: ResumeTemplateId = DEFAULT_RESUME_TEMPLATE) {}

  async render(input: ResumeDocumentInput): Promise<ResumeDocument> {
    const { version, locale, content } = input;
    const isEnglish = locale === "en-US";
    const labels = this.templateId === "REFERENCE"
      ? isEnglish
        ? {
            summary: "Executive Summary",
            skills: "Core Skills & Software Architecture",
            experience: "Professional Experience",
            education: "Education & Certifications",
            languages: "Languages",
          }
        : {
            summary: "Resumo Executivo",
            skills: "Core Skills & Arquitetura de Software",
            experience: "Experiência Profissional",
            education: "Formação Acadêmica & Certificações",
            languages: "Idiomas",
          }
      : isEnglish
        ? { summary: "Summary", skills: "Skills", experience: "Experience", education: "Education", languages: "Languages" }
        : { summary: "Resumo", skills: "Habilidades", experience: "Experiência", education: "Formação", languages: "Idiomas" };
    const sections = this.templateId === "REFERENCE"
      ? [
          this.renderSection(labels.summary, this.escapeLatex(content.summary)),
          this.renderSkills(content.skillGroups, labels.skills),
          this.renderExperiences(content.experiences, labels.experience),
          this.renderEducation(content.education, labels.education),
          this.renderLanguages(content.languages, labels.languages),
        ]
      : [
          this.renderSection(labels.summary, this.escapeLatex(content.summary)),
          this.renderExperiences(content.experiences, labels.experience),
          this.renderSkills(content.skillGroups, labels.skills),
          this.renderEducation(content.education, labels.education),
          this.renderLanguages(content.languages, labels.languages),
        ];
    const body = sections.filter(Boolean).join("\n\n");

    const texContent = resumeLatexTemplate({
      templateId: this.templateId,
      name: this.escapeLatex(content.name),
      title: this.escapeLatex(content.title),
      location: this.escapeLatex(content.location),
      phone: this.escapeLatex(content.contact.phone),
      email: this.escapeLatex(content.contact.email),
      linkedin: this.escapeLatex(content.contact.linkedin),
      version: version.toString(),
      locale,
      body,
    });

    const sanitizedName = content.name.toLowerCase().replace(/\s+/g, "-");
    return {
      filename: `resume-${sanitizedName}-${version.toString()}-${locale}-${this.templateId}.tex`,
      content: texContent,
    };
  }

  private renderSection(title: string, content: string): string {
    return `\\section{${this.escapeLatex(title)}}\n${content}`;
  }

  private renderExperiences(
    experiences: Array<{ company: string; role: string; period: string; location: string; summary: string; highlights: string[] }>,
    title: string,
  ): string {
    if (experiences.length === 0) return "";
    const items = experiences.map((experience) => [
      `\\textbf{${this.escapeLatex(experience.period)}}\\quad ${this.escapeLatex(experience.role)}, ${this.escapeLatex(experience.company)}, ${this.escapeLatex(experience.location)}`,
      experience.summary ? this.escapeLatex(experience.summary) : "",
      "\\begin{itemize}",
      ...experience.highlights.map((highlight) => `\\item ${this.escapeLatex(highlight)}`),
      "\\end{itemize}",
    ].join("\n")).join("\n\n");
    return this.renderSection(title, items);
  }

  private renderSkills(
    groups: Array<{ label: string; skills: string[] }>,
    title: string,
  ): string {
    if (groups.length === 0) return "";
    const content = [
      "\\renewcommand{\\arraystretch}{1.15}",
      "\\begin{tabularx}{\\linewidth}{@{}p{0.25\\linewidth}X@{}}",
      ...groups.map((group) => `${this.escapeLatex(group.label)} & ${group.skills.map((skill) => this.escapeLatex(skill)).join(", ")} \\\\`),
      "\\end{tabularx}",
    ].join("\n");
    return this.renderSection(title, content);
  }

  private renderEducation(
    education: Array<{ title: string; institution: string; period: string; description: string }>,
    title: string,
  ): string {
    if (education.length === 0) return "";
    const content = education.map((item) => [
      `\\textbf{${this.escapeLatex(item.title)}} -- ${this.escapeLatex(item.institution)}`,
      `\\textit{${this.escapeLatex(item.period)}}`,
      this.escapeLatex(item.description),
    ].join("\\\\\n")).join("\n\n");
    return this.renderSection(title, content);
  }

  private renderLanguages(languages: string[], title: string): string {
    if (languages.length === 0) return "";
    return this.renderSection(title, languages.map((language) => this.escapeLatex(language)).join("\\\\\n"));
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[{}]/g, (match) => `\\${match}`)
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  }
}
