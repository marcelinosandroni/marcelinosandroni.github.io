import { CONTENT_PERIOD, COPYRIGHT_YEAR, SITE_VERSION } from "@/domain/site/site-info";
import { getResumeContent } from "@/infrastructure/content";
import { RESUME_TEMPLATES } from "@/infrastructure/pdf/resume-template-registry";
import { formatMessage, getDictionaryForRoute, requireLocaleForRoute } from "@/i18n";
import { DownloadPDFButton } from "@/components/download-pdf-button";
import { LocaleSwitcher } from "@/components/locale-switcher";

/**
 * Resume presentation as a Server Component.
 *
 * Both the message catalog and the resume content are resolved on the server, so
 * the browser receives rendered HTML instead of a 70KB+ bilingual dataset plus
 * a hydration payload. No user-facing string is written here: every label comes
 * from the catalog for the active locale.
 */
export async function ResumeView() {
  const locale = await requireLocaleForRoute();
  const t = await getDictionaryForRoute();
  const resume = getResumeContent(locale);

  const pdfTemplates = RESUME_TEMPLATES.map((template) => ({
    id: template.id,
    label: t.pdf.templates[template.id].label,
    description: t.pdf.templates[template.id].description,
  }));

  return (
    <main>
      <header className="topbar shell">
        <a className="brand" href="#top" aria-label={t.nav.backToTop}>
          MSD<span>.</span>
        </a>
        <nav aria-label={t.nav.mainNavigation}>
          <a href="#experience">{t.nav.experience}</a>
          <a href="#skills">{t.nav.skills}</a>
          <a href="#education">{t.nav.education}</a>
        </nav>
        <LocaleSwitcher locale={locale} t={t} />
      </header>

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            {formatMessage(t.hero.liveResume, { version: SITE_VERSION, period: CONTENT_PERIOD })}
          </p>
          <h1>{resume.name}</h1>
          <p className="hero-title">{resume.title}</p>
          <p className="hero-summary">{resume.summary}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#experience">
              {t.hero.exploreTrajectory} <span aria-hidden="true">↓</span>
            </a>
            <a className="button button-quiet" href={`mailto:${resume.contact.email}`}>
              {t.hero.getInTouch} <span aria-hidden="true">↗</span>
            </a>
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
          </div>
        </div>

        <aside className="hero-note" aria-label={t.hero.profileLabel}>
          <span className="note-index">01 / 04</span>
          <p>{t.hero.note}</p>
          <span className="note-line" />
          <small>{resume.location}</small>
        </aside>
      </section>

      <div className="signal-bar">
        <div className="shell signal-inner">
          <span>
            <i aria-hidden="true" /> {t.signal.available}
          </span>
          <span>{t.signal.disciplines}</span>
          <span>{t.signal.localePair}</span>
        </div>
      </div>

      <section id="experience" className="section shell">
        <div className="section-heading">
          <span className="section-number">01</span>
          <h2>{t.experience.title}</h2>
          <p>{t.experience.subtitle}</p>
        </div>
        <div className="experience-list">
          {resume.experiences.map((experience, index) => (
            <article className="experience" key={`${experience.company}-${experience.period}`}>
              <div className="experience-marker">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="experience-main">
                <div className="experience-meta">
                  <span>{experience.period}</span>
                  <span>{experience.company}</span>
                </div>
                <h3>{experience.role}</h3>
                <p>{experience.summary}</p>
                <ul>
                  {experience.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="skills" className="section section-dark">
        <div className="shell">
          <div className="section-heading section-heading-light">
            <span className="section-number">02</span>
            <h2>
              {t.skills.titleLead}
              <br />
              <em>{t.skills.titleEmphasis}</em>
            </h2>
            <p>{t.skills.subtitle}</p>
          </div>
          <div className="skill-grid">
            {resume.skillGroups.map((group) => (
              <article className="skill-group" key={group.label}>
                <h3>{group.label}</h3>
                <div>
                  {group.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="education" className="section shell education-section">
        <div className="section-heading">
          <span className="section-number">03</span>
          <h2>{t.education.title}</h2>
          <p>{t.education.subtitle}</p>
        </div>
        <div className="education-grid">
          {resume.education.map((item) => (
            <article className="education-item" key={`${item.institution}-${item.title}`}>
              <span>{item.period}</span>
              <h3>{item.title}</h3>
              <strong>{item.institution}</strong>
              <p>{item.description}</p>
            </article>
          ))}
          {resume.languages.length > 0 && (
            <article className="education-item" key="languages">
              <span>{t.education.languagesLabel}</span>
              <h3>{t.education.languagesTitle}</h3>
              <strong>{resume.languages.join(" · ")}</strong>
              <p>{t.education.languagesDescription}</p>
            </article>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-inner">
          <div>
            <p className="eyebrow">{t.footer.tagline}</p>
            <h2>
              Marcelino
              <br />
              <em>Sandroni Dias.</em>
            </h2>
          </div>
          <div className="footer-links">
            <a href={`mailto:${resume.contact.email}`}>
              {resume.contact.email} <span aria-hidden="true">↗</span>
            </a>
            <a href={`https://${resume.contact.linkedin}`} target="_blank" rel="noreferrer">
              {resume.contact.linkedin} <span aria-hidden="true">↗</span>
            </a>
            <small>
              © {COPYRIGHT_YEAR} · {t.footer.versionedResume} · v{SITE_VERSION}
            </small>
          </div>
        </div>
      </footer>
    </main>
  );
}
