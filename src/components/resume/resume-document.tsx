import { DownloadPDFButton } from "@/components/download-pdf-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Icon } from "@/components/ui/icon";
import { CONTENT_PERIOD, SITE_VERSION } from "@/domain/site/site-info";
import { blogPath, homePath, resumePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { ResumeContent, ResumeExperience, ResumeEducation } from "@/domain/resume/types";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@/infrastructure/pdf/resume-template-registry";
import { getDictionary, type Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

export interface ResumeDocumentProps {
  locale: Locale;
  resume: ResumeContent;
}

/**
 * The resume document of record.
 *
 * This page deliberately does **not** share the home design's card vocabulary: the
 * resume is a document to be read linearly and printed, and a recruiter evaluating
 * it needs the same structure whether they are on screen or holding the PDF. It
 * therefore keeps the original editorial structure — summary, skills, reverse
 * chronological experience with full case studies, education, languages — and only
 * adopts the design system's colour, type and spacing tokens.
 *
 * The data is the original resume content, byte for byte. The redesign did not
 * restyle, reorder or reword a single fact.
 */
export async function ResumeDocument({ locale, resume }: ResumeDocumentProps) {
  const t = await getDictionary(locale);

  const pdfTemplates = RESUME_TEMPLATES.map((template) => ({
    id: template.id as ResumeTemplateId,
    label: t.pdf.templates[template.id].label,
    description: t.pdf.templates[template.id].description,
  }));

  /*
   * Anchors first, then the routes. The summary sits at the top of the page and
   * is reached by scrolling, so it is not a nav entry — otherwise "Overview"
   * would appear twice with two different targets.
   */
  const sections = [
    { key: "experience", label: t.nav.experience, href: "#experience" },
    { key: "skills", label: t.nav.skills, href: "#skills" },
    { key: "education", label: t.nav.education, href: "#education" },
    { key: "blog", label: t.nav.blog, href: blogPath(locale) },
    { key: "overview", label: t.nav.home, href: homePath(locale) },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded focus:bg-surface-overlay focus:px-space-md focus:py-space-sm focus:font-label-mono focus:text-label-mono focus:text-primary-container"
      >
        {t.a11y.skipToContent}
      </a>

      <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-base/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-space-md px-margin md:px-margin-tablet lg:px-margin-desktop">
          <a
            href={resumePath(locale)}
            className="shrink-0 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary"
            aria-label={t.nav.backToTop}
          >
            MSD<span className="text-primary-container">.</span>
          </a>
          <nav
            aria-label={t.nav.mainNavigation}
            className="-mx-1 flex min-w-0 flex-1 items-center gap-space-md overflow-x-auto px-1 md:justify-center md:gap-space-lg"
          >
            {sections.map((section) => (
              <a
                key={section.key}
                href={section.href}
                className="shrink-0 whitespace-nowrap font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:text-primary-container"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <div className="shrink-0">
            <LocaleSwitcher locale={locale} t={t} />
          </div>
        </div>
      </header>

      <main
        id="main"
        aria-label={t.resume.documentLabel}
        className="mx-auto w-full max-w-[1320px] px-margin py-space-2xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-3xl"
      >
        <header id="summary" className="scroll-mt-24 space-y-space-md">
          <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
            {t.resume.kicker}
          </span>
          <h1 className="font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero">
            <span className="mb-space-sm block font-label-mono text-label-mono uppercase tracking-widest text-secondary">
              {resume.name}
            </span>
            {t.resume.title}
          </h1>
          <p className="hero-title font-editorial-quote text-editorial-quote italic text-secondary">
            {resume.title}
          </p>
          <p className="max-w-2xl font-body-lg text-body-lg text-text-secondary">
            {resume.summary}
          </p>
          <p className="font-label-mono text-label-mono text-text-muted">
            {formatMessage(t.hero.liveResume, { version: SITE_VERSION, period: CONTENT_PERIOD })}
          </p>
          <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
            <DownloadPDFButton
              locale={locale}
              templates={pdfTemplates}
              messages={{
                download: t.pdf.download,
                generating: t.pdf.generating,
                failed: t.pdf.failed,
                unknownError: t.pdf.unknownError,
                chooseTemplate: t.pdf.chooseTemplate,
              }}
            />
            <a href={homePath(locale)} className="button button-quiet">
              <Icon name="arrow-back" size={18} />
              {t.hero.backToOverview}
            </a>
          </div>
        </header>

        <ResumeExperienceList experiences={resume.experiences} t={t} />
        <ResumeSkills resume={resume} t={t} />
        <ResumeEducationSection resume={resume} t={t} />

        <footer className="mt-space-2xl border-t border-border-subtle pt-space-xl">
          <p className="font-label-mono text-label-mono text-text-muted">
            {t.blog.allArticles} ·{" "}
            <a
              href={`mailto:${resume.contact.email}`}
              className="text-primary-container underline-offset-4 hover:underline"
            >
              {resume.contact.email}
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}

function ResumeExperienceList({
  experiences,
  t,
}: {
  experiences: ResumeExperience[];
  t: Dictionary;
}) {
  return (
    <section id="experience" aria-labelledby="experience-heading" className="scroll-mt-24 pt-space-3xl">
      <SectionHeader
        id="experience-heading"
        kicker="// 01"
        title={t.experience.title}
        note={t.experience.subtitle}
      />

      <div className="mt-space-xl space-y-space-lg">
        {experiences.map((experience) => (
          <article
            key={`${experience.company}-${experience.period}`}
            className="rounded-xl border border-border-subtle bg-surface-raised p-space-xl"
          >
            <div className="flex flex-col justify-between gap-space-sm pb-space-md md:flex-row md:items-start">
              <div>
                <p className="font-label-mono text-label-mono uppercase text-text-muted">
                  {`${experience.period} // ${experience.location}`}
                </p>
                <h3 className="mt-1 font-headline-md text-headline-md text-text-primary">
                  {experience.company}
                </h3>
                <p className="font-headline-sm text-headline-sm font-medium text-primary-container">
                  {experience.role}
                </p>
              </div>
              {experience.teamSize ? (
                <span className="self-start rounded-lg bg-surface-overlay px-space-md py-space-xs font-label-mono text-label-mono text-text-secondary">
                  {t.experience.teamLabel}: {experience.teamSize}
                </span>
              ) : null}
            </div>

            <p className="max-w-3xl font-body-md text-body-md text-text-secondary">
              {experience.summary}
            </p>

            {experience.scope ? (
              <p className="mt-space-sm font-body-sm text-body-sm text-text-muted">
                <span className="font-label-mono text-label-mono uppercase text-text-muted">
                  {t.resume.scopeLabel}:{" "}
                </span>
                {experience.scope}
              </p>
            ) : null}

            <ul className="mt-space-md space-y-space-sm font-body-md text-body-md text-text-secondary">
              {experience.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-space-sm">
                  <span aria-hidden="true" className="text-primary-container">
                    •
                  </span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>

            {experience.technologies?.length ? (
              <div className="mt-space-md">
                <h4 className="font-label-mono text-label-mono uppercase text-text-muted">
                  {t.resume.technologiesLabel}
                </h4>
                <div className="mt-space-xs flex flex-wrap gap-1.5">
                  {experience.technologies.map((technology) => (
                    <span
                      key={technology}
                      className="rounded border border-border-subtle bg-surface-overlay px-2 py-0.5 font-label-mono text-[10px] uppercase text-text-secondary"
                    >
                      {technology}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {experience.caseStudies?.length ? (
              <div className="mt-space-xl space-y-space-lg">
                <h4 className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
                  {t.resume.caseStudiesLabel}
                </h4>
                {experience.caseStudies.map((caseStudy) => (
                  <div
                    key={caseStudy.title}
                    className="rounded-lg border border-border-subtle bg-surface-base p-space-lg"
                  >
                    <h5 className="font-headline-sm text-headline-sm text-text-primary">
                      {caseStudy.title}
                    </h5>

                    <dl className="mt-space-md space-y-space-sm font-body-sm text-body-sm">
                      <CaseRow label={t.resume.problem} body={caseStudy.challenge} />
                      <CaseRow label={t.resume.solution} body={caseStudy.solution} />
                      <CaseRow label={t.resume.result} body={caseStudy.result} />
                    </dl>

                    <ul className="mt-space-md grid grid-cols-2 gap-space-sm md:grid-cols-4">
                      {caseStudy.metrics.map((metric) => (
                        <li
                          key={metric.label}
                          className="rounded bg-surface-overlay/60 p-space-sm"
                        >
                          <span className="block font-label-mono text-[10px] uppercase text-text-muted">
                            {metric.label}
                          </span>
                          <span className="mt-1 block font-code-inline text-code-inline text-primary-container">
                            {metric.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function CaseRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid grid-cols-1 gap-space-xs md:grid-cols-[8rem_1fr] md:gap-space-md">
      <dt className="font-label-mono text-label-mono uppercase text-primary-container">{label}</dt>
      <dd className="text-text-secondary">{body}</dd>
    </div>
  );
}

function ResumeSkills({ resume, t }: { resume: ResumeContent; t: Dictionary }) {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="scroll-mt-24 pt-space-3xl">
      <SectionHeader
        id="skills-heading"
        kicker="// 02"
        title={`${t.skills.titleLead} ${t.skills.titleEmphasis}`}
        note={t.skills.subtitle}
      />

      <div className="mt-space-xl grid grid-cols-1 gap-space-md md:grid-cols-2 lg:grid-cols-3">
        {resume.skillGroups.map((group) => (
          <article
            key={group.label}
            className="rounded-lg border border-border-subtle bg-surface-raised p-space-lg"
          >
            <h3 className="font-label-mono text-label-mono uppercase text-primary-container">
              {group.label}
            </h3>
            <div className="mt-space-md flex flex-wrap gap-1.5">
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-border-subtle bg-surface-overlay px-2 py-0.5 font-label-mono text-[10px] uppercase text-text-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResumeEducationSection({ resume, t }: { resume: ResumeContent; t: Dictionary }) {
  return (
    <section id="education" aria-labelledby="education-heading" className="scroll-mt-24 pt-space-3xl">
      <SectionHeader
        id="education-heading"
        kicker="// 03"
        title={t.education.title}
        note={t.education.subtitle}
      />

      <div className="mt-space-xl grid grid-cols-1 gap-space-md md:grid-cols-2">
        {resume.education.map((item: ResumeEducation) => (
          <article
            key={`${item.institution}-${item.title}`}
            className="rounded-lg border border-border-subtle bg-surface-raised p-space-lg"
          >
            <span className="font-label-mono text-label-mono uppercase text-text-muted">
              {item.period}
            </span>
            <h3 className="mt-2 font-headline-sm text-headline-sm text-text-primary">
              {item.title}
            </h3>
            <strong className="font-body-sm text-body-sm font-medium text-secondary">
              {item.institution}
            </strong>
            <p className="mt-2 font-body-sm text-body-sm text-text-secondary">
              {item.description}
            </p>
          </article>
        ))}

        {resume.languages.length > 0 ? (
          <article className="rounded-lg border border-border-subtle bg-surface-raised p-space-lg">
            <span className="font-label-mono text-label-mono uppercase text-text-muted">
              {t.education.languagesLabel}
            </span>
            <h3 className="mt-2 font-headline-sm text-headline-sm text-text-primary">
              {t.education.languagesTitle}
            </h3>
            <strong className="font-body-sm text-body-sm font-medium text-secondary">
              {resume.languages.join(" · ")}
            </strong>
            <p className="mt-2 font-body-sm text-body-sm text-text-secondary">
              {t.education.languagesDescription}
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function SectionHeader({
  id,
  kicker,
  title,
  note,
}: {
  id: string;
  kicker: string;
  title: string;
  note: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-space-md border-b border-border-subtle pb-space-md md:flex-row md:items-end">
      <div>
        <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
          {kicker}
        </span>
        <h2 id={id} className="mt-space-xs font-headline-lg text-headline-lg text-text-primary">
          {title}
        </h2>
      </div>
      <p className="max-w-md font-body-sm text-body-sm text-text-muted">{note}</p>
    </div>
  );
}
