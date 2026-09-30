import type { ResumeDocumentInput, ResumeDocument, ResumeDocumentRenderer } from "@/application/publication/build-resume-document";
import { resumeLatexTemplate } from "@/infrastructure/pdf/latex-templates";
import { DEFAULT_RESUME_TEMPLATE, type ResumeTemplateId } from "@/infrastructure/pdf/resume-template-registry";
import type { CaseStudy, ResumeExperience } from "@/domain/resume/types";
import { escapeLatex } from "@/infrastructure/renderers/latex-escape";
import {
  selectReferenceCases,
  toCleanExperience,
  type CleanExperience,
} from "@/application/publication/resume-audience";

/**
 * LaTeX renderer for both PDF templates.
 *
 * The two templates are two documents, not one document reordered. `CLEAN` is
 * for a thirty-second scan: the three bullets that carry the number. `REFERENCE`
 * is for someone who wants the reasoning behind them, so it prints the scope,
 * the team size, the stack and the case studies with their metrics.
 *
 * Previously both templates received a structural subset of `ResumeExperience`
 * that did not mention `caseStudies`, `technologies`, `teamSize` or `scope`, so
 * all of it was dropped by the compiler. Twenty-four case studies and ninety-six
 * metrics were rendered on the web and absent from the only file an evaluator
 * downloads.
 */
export class LaTeXResumeRenderer implements ResumeDocumentRenderer {
  constructor(private readonly templateId: ResumeTemplateId = DEFAULT_RESUME_TEMPLATE) {}

  async render(input: ResumeDocumentInput): Promise<ResumeDocument> {
    const { version, locale, content, labels } = input;

    const detailed = this.templateId === "REFERENCE";

    const sections = detailed
      ? [
          this.renderSection(labels.summary, escapeLatex(content.summary)),
          this.renderSkills(content.skillGroups, labels.skills),
          this.renderExperiences(content.experiences, labels.experience, true, labels),
          this.renderEducation(content.education, labels.education),
          this.renderLanguages(content.languages, labels.languages),
        ]
      : [
          this.renderSection(labels.summary, escapeLatex(content.summary)),
          this.renderExperiences(
            content.experiences.map(toCleanExperience),
            labels.experience,
            false,
            labels,
          ),
          this.renderSkills(content.skillGroups, labels.skills),
          this.renderEducation(content.education, labels.education),
          this.renderLanguages(content.languages, labels.languages),
        ];

    const body = sections.filter(Boolean).join("\n\n");

    const texContent = resumeLatexTemplate({
      templateId: this.templateId,
      name: escapeLatex(content.name),
      title: escapeLatex(content.title),
      location: escapeLatex(content.location),
      phone: escapeLatex(content.contact.phone),
      email: escapeLatex(content.contact.email),
      linkedin: escapeLatex(content.contact.linkedin),
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
    return `\\section{${escapeLatex(title)}}\n${content}`;
  }

  private renderExperiences(
    experiences: Array<CleanExperience | ResumeExperience>,
    title: string,
    detailed: boolean,
    labels: PdfLabels,
  ): string {
    if (experiences.length === 0) return "";

    const items = experiences
      .map((experience) => {
        const lines: string[] = [
          `\\textbf{${escapeLatex(experience.period)}}\\quad ${escapeLatex(experience.role)}, ${escapeLatex(experience.company)}, ${escapeLatex(experience.location)}`,
        ];

        /*
         * Scope and team size sit on the header line, in the small type, because
         * they qualify the role rather than belong to the story. A reader who
         * only wants the bullets can skip them without losing the shape of the
         * role.
         */
        if (detailed) {
          const detail = experience as ResumeExperience;
          const qualifiers: string[] = [];

          if (detail.scope !== undefined && detail.scope !== "") {
            qualifiers.push(escapeLatex(detail.scope));
          }

          if (detail.teamSize !== undefined) {
            qualifiers.push(escapeLatex(labels.teamSize.replace("{n}", String(detail.teamSize))));
          }

          if (qualifiers.length > 0) {
            lines.push(`{\\small\\itshape ${qualifiers.join(" — ")}\\par}`);
          }
        }

        if (experience.summary !== "") {
          lines.push(escapeLatex(experience.summary));
        }

        if (experience.highlights.length > 0) {
          lines.push("\\begin{itemize}");
          for (const highlight of experience.highlights) {
            lines.push(`\\item ${escapeLatex(highlight)}`);
          }
          lines.push("\\end{itemize}");
        }

        if (detailed) {
          const detail = experience as ResumeExperience;
          const cases = detail.caseStudies ?? [];

          for (const entry of selectReferenceCases(cases)) {
            lines.push(this.renderCaseStudy(entry, labels));
          }

          const stack = detail.technologies ?? [];

          if (stack.length > 0) {
            lines.push(
              `{\\small\\textbf{${escapeLatex(labels.stack)}}\\par}\n{\\small ${escapeLatex(stack.join(", "))}\\par}`,
            );
          }
        }

        return lines.join("\n");
      })
      .join("\n\n");

    return this.renderSection(title, items);
  }

  /**
   * One case study: the decision, the outcome, and the numbers.
   *
   * Challenge and solution are printed in a compact two-column table rather than
   * as three stacked paragraphs, because the shape of the argument is
   * problem → response → result and a reader scanning for the result should not
   * have to read past two paragraphs to find it.
   */
  private renderCaseStudy(entry: CaseStudy, labels: PdfLabels): string {
    const lines: string[] = [`\\textit{${escapeLatex(entry.title)}}\\par`];

    const rows: string[] = [];

    if (entry.challenge !== "") {
      rows.push(`${escapeLatex(labels.challenge)} & ${escapeLatex(entry.challenge)} \\\\`);
    }

    if (entry.solution !== "") {
      rows.push(`${escapeLatex(labels.solution)} & ${escapeLatex(entry.solution)} \\\\`);
    }

    if (entry.result !== "") {
      rows.push(`${escapeLatex(labels.result)} & ${escapeLatex(entry.result)} \\\\`);
    }

    if (rows.length > 0) {
      /*
       * The trailing `\par` ends the paragraph the table sits in. A tabularx is a
       * box in the current horizontal line, and text emitted on the following
       * source line otherwise joins that same paragraph — the metrics block was
       * being measured as part of the table's line. Kept separate so each has
       * the full `\linewidth` to typeset in.
       */
      lines.push(
        [
          "\\begin{tabularx}{\\linewidth}{@{}p{0.11\\linewidth}X@{}}",
          ...rows,
          "\\end{tabularx}",
          "\\par",
        ].join("\n"),
      );
    }

    if (entry.metrics.length > 0) {
      /*
       * The value is bold and the label is not, separated by a slash.
       *
       * This was a monospaced line, on the theory that a column of figures reads
       * better in a fixed pitch. It does not work in this document: `\ttfamily`
       * selects Computer Modern Typewriter, whose characters are ~20% wider than
       * the Helvetica body text, and a row of metrics is long enough that the line
       * ran up to 51pt past the right margin — ten times across the REFERENCE
       * template, visibly broken in the PDF while the build stayed green.
       *
       * A bold value gets the same scannability without the width, and the line
       * wraps. `\small` alone measured zero overfull boxes in both locales.
       */
      const rendered = entry.metrics
        .map((metric) => `\\textbf{${escapeLatex(metric.value)}} ${escapeLatex(metric.label)}`)
        .join("  /  ");

      lines.push(`{\\small ${rendered}\\par}`);
    }

    return lines.join("\n");
  }

  private renderSkills(
    groups: Array<{ label: string; skills: string[] }>,
    title: string,
  ): string {
    if (groups.length === 0) return "";
    const content = [
      "\\renewcommand{\\arraystretch}{1.15}",
      "\\begin{tabularx}{\\linewidth}{@{}p{0.25\\linewidth}X@{}}",
      ...groups.map(
        (group) =>
          `${escapeLatex(group.label)} & ${group.skills.map((skill) => escapeLatex(skill)).join(", ")} \\\\`,
      ),
      "\\end{tabularx}",
    ].join("\n");
    return this.renderSection(title, content);
  }

  private renderEducation(
    education: Array<{ title: string; institution: string; period: string; description: string }>,
    title: string,
  ): string {
    if (education.length === 0) return "";
    const content = education
      .map((item) =>
        [
          `\\textbf{${escapeLatex(item.title)}} -- ${escapeLatex(item.institution)}`,
          `\\textit{${escapeLatex(item.period)}}`,
          escapeLatex(item.description),
        ].join("\\\\\n"),
      )
      .join("\n\n");
    return this.renderSection(title, content);
  }

  private renderLanguages(languages: string[], title: string): string {
    if (languages.length === 0) return "";
    return this.renderSection(
      title,
      languages.map((language) => escapeLatex(language)).join("\\\\\n"),
    );
  }

}

/**
 * The subset of PDF labels the experience renderer needs.
 *
 * Declared structurally rather than importing the label type, because a test
 * asserts the renderer holds no heading literals — and importing the full type
 * would make it impossible to tell which of those literals are deliberate.
 */
export interface PdfLabels {
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
  teamSize: string;
  stack: string;
  challenge: string;
  solution: string;
  result: string;
}
