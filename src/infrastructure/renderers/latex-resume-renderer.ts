import type { ResumeDocumentInput, ResumeDocument, ResumeDocumentRenderer } from "@/application/publication/build-resume-document";

export class LaTeXResumeRenderer implements ResumeDocumentRenderer {
  async render(input: ResumeDocumentInput): Promise<ResumeDocument> {
    const { version, locale, content } = input;
    const isEn = locale === "en-US";

    const header = this.renderHeader(content.name, version.toString());
    const summary = this.renderSection(isEn ? "Summary" : "Resumo", content.summary);
    const experiences = this.renderExperiences(content.experiences, isEn ? "Experience" : "Experiência");
    const skills = this.renderSkills(content.skillGroups, isEn ? "Skills" : "Habilidades");
    const education = this.renderEducation(content.education, isEn ? "Education" : "Formação");
    const languages = this.renderLanguages(content.languages, isEn ? "Languages" : "Idiomas");

    const body = [header, summary, experiences, skills, education, languages].filter(Boolean).join("\n\n");

    const texContent = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf-8]{inputenc}
\\usepackage[english,portuges]{babel}
\\usepackage{geometry}
\\usepackage{titlesec}
\\usepackage{fancyhdr}
\\usepackage{hyperref}

\\geometry{margin=1in}
\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{Page \\thepage}

\\title{${this.escapeLatex(content.name)}}
\\author{}
\\date{${isEn ? "Version" : "Versão"} ${version.toString()}}

\\begin{document}

\\maketitle

\\section*{${isEn ? "Profile" : "Perfil"}}
${this.escapeLatex(content.title)} \\\\
${this.escapeLatex(content.location)}

${body}

\\end{document}
`;

    const sanitizedName = content.name.toLowerCase().replace(/\s+/g, "-");
    const filename = `resume-${sanitizedName}-${version.toString()}-${locale}.tex`;

    return {
      filename,
      content: texContent,
    };
  }

  private renderHeader(name: string, version: string): string {
    return `\\textbf{${this.escapeLatex(name)}} --- v${version}`;
  }

  private renderSection(title: string, content: string): string {
    return `\\section{${this.escapeLatex(title)}}
${this.escapeLatex(content)}`;
  }

  private renderExperiences(
    experiences: Array<{ company: string; role: string; period: string; summary: string; highlights: string[] }>,
    sectionTitle: string
  ): string {
    if (!experiences || experiences.length === 0) return "";

    const items = experiences
      .map(
        (exp) => `
\\subsection{${this.escapeLatex(exp.role)} @ ${this.escapeLatex(exp.company)}}
\\textit{${this.escapeLatex(exp.period)}} \\\\
${this.escapeLatex(exp.summary)}
\\begin{itemize}
${exp.highlights.map((h: string) => `\\item ${this.escapeLatex(h)}`).join("\n")}
\\end{itemize}
`,
      )
      .join("\n");

    return `\\section{${sectionTitle}}
${items}`;
  }

  private renderSkills(skillGroups: Array<{ label: string; skills: string[] }>, sectionTitle: string): string {
    if (!skillGroups || skillGroups.length === 0) return "";

    const items = skillGroups
      .map(
        (group) => `
\\subsection{${this.escapeLatex(group.label)}}
${group.skills.map((s: string) => this.escapeLatex(s)).join(", ")}
`,
      )
      .join("\n");

    return `\\section{${sectionTitle}}
${items}`;
  }

  private renderEducation(
    education: Array<{ title: string; institution: string; period: string; description: string }>,
    sectionTitle: string
  ): string {
    if (!education || education.length === 0) return "";

    const items = education
      .map(
        (edu) => `
\\subsection{${this.escapeLatex(edu.title)}}
\\textit{${this.escapeLatex(edu.institution)}} --- ${this.escapeLatex(edu.period)} \\\\
${this.escapeLatex(edu.description)}
`,
      )
      .join("\n");

    return `\\section{${sectionTitle}}
${items}`;
  }

  private renderLanguages(languages: string[], sectionTitle: string): string {
    if (!languages || languages.length === 0) return "";

    return `\\section{${sectionTitle}}
${languages.map((l) => `\\item ${this.escapeLatex(l)}`).join("\n")}`;
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[{}]/g, (m) => `\\${m}`)
      .replace(/&/g, "\\&")
      .replace(/%/g, "\\%")
      .replace(/\$/g, "\\$")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_")
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  }
}
