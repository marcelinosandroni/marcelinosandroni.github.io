import type { ResumeDocumentInput, ResumeDocument, ResumeDocumentRenderer } from "@/application/publication/build-resume-document";
import { resumeLatexTemplate } from "@/infrastructure/pdf/latex-templates";

export class LaTeXResumeRenderer implements ResumeDocumentRenderer {
  async render(input: ResumeDocumentInput): Promise<ResumeDocument> {
    const { version, locale, content } = input;
    const isEnglish = locale === "en-US";
    const sections = [
      this.renderSection(isEnglish ? "Summary" : "Resumo", this.escapeLatex(content.summary)),
      this.renderExperiences(content.experiences, isEnglish ? "Experience" : "Experiência"),
      this.renderSkills(content.skillGroups, isEnglish ? "Skills" : "Habilidades"),
      this.renderEducation(content.education, isEnglish ? "Education" : "Formação"),
      this.renderLanguages(content.languages, isEnglish ? "Languages" : "Idiomas"),
    ].filter(Boolean).join("\n\n");

    const texContent = resumeLatexTemplate({
      name: this.escapeLatex(content.name),
      title: this.escapeLatex(content.title),
      location: this.escapeLatex(content.location),
      phone: this.escapeLatex(content.contact.phone),
      email: this.escapeLatex(content.contact.email),
      linkedin: this.escapeLatex(content.contact.linkedin),
      version: version.toString(),
      locale,
      body: sections,
    });

    const sanitizedName = content.name.toLowerCase().replace(/\s+/g, "-");
    return {
      filename: `resume-${sanitizedName}-${version.toString()}-${locale}.tex`,
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
