"use client";

import { useState, useEffect } from "react";
import type { Locale } from "@/domain/resume/types";
import { getResumeContent } from "@/infrastructure/content";
import { DownloadPDFButton } from "@/components/download-pdf-button";
import { LocaleSwitcher } from "@/components/locale-switcher";

interface ResumeViewProps {
  initialLocale?: Locale;
}

function getInitialLocale(fallback: Locale): Locale {
  if (typeof window === "undefined") {
    return fallback;
  }
  const params = new URLSearchParams(window.location.search);
  const urlLocale = params.get("locale") || params.get("lang");
  if (urlLocale === "en-US" || urlLocale === "en") {
    return "en-US";
  }
  if (urlLocale === "pt-BR" || urlLocale === "pt") {
    return "pt-BR";
  }
  return fallback;
}

export function ResumeView({ initialLocale = "pt-BR" }: ResumeViewProps) {
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale(initialLocale));

  useEffect(() => {
    const handlePopState = () => {
      setLocale(getInitialLocale(initialLocale));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialLocale]);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("locale", newLocale);
      window.history.pushState({}, "", url.toString());
    }
  };

  const resume = getResumeContent(locale);
  const isEn = locale === "en-US";

  return (
    <main>
      <header className="topbar shell">
        <a className="brand" href="#top" aria-label={isEn ? "Back to top" : "Voltar ao início"}>
          MSD<span>.</span>
        </a>
        <nav aria-label={isEn ? "Main navigation" : "Navegação principal"}>
          <a href="#experiencia">{isEn ? "Experience" : "Experiência"}</a>
          <a href="#habilidades">{isEn ? "Skills" : "Habilidades"}</a>
          <a href="#formacao">{isEn ? "Education" : "Formação"}</a>
        </nav>
        <LocaleSwitcher currentLocale={locale} onLocaleChange={handleLocaleChange} />
      </header>

      <section id="top" className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            {isEn ? "Live Resume · v0.1.5 · Updated 2026.08" : "Currículo vivo · v0.1.5 · Atualizado em 2026.08"}
          </p>
          <h1>{resume.name}</h1>
          <p className="hero-title">{resume.title}</p>
          <p className="hero-summary">{resume.summary}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#experiencia">
              {isEn ? "Explore trajectory" : "Explorar trajetória"} <span>↓</span>
            </a>
            <a className="button button-quiet" href={`mailto:${resume.contact.email}`}>
              {isEn ? "Get in touch" : "Entrar em contato"} <span>↗</span>
            </a>
            <DownloadPDFButton locale={locale} label={isEn ? "Download PDF" : "Baixar PDF"} />
          </div>
        </div>

        <aside className="hero-note" aria-label={isEn ? "Professional profile" : "Perfil profissional"}>
          <span className="note-index">01 / 04</span>
          <p>
            {isEn
              ? "Engineering connecting distributed systems, product and financial outcomes."
              : "Engenharia que conecta sistemas distribuídos, produto e resultado financeiro."}
          </p>
          <span className="note-line" />
          <small>{resume.location}</small>
        </aside>
      </section>

      <div className="signal-bar">
        <div className="shell signal-inner">
          <span>
            <i /> {isEn ? "Available for opportunities" : "Disponível para conversas"}
          </span>
          <span>{isEn ? "Backend · Frontend · Cloud · Architecture" : "Backend · Frontend · Cloud · Arquitetura"}</span>
          <span>PT-BR / EN-US</span>
        </div>
      </div>

      <section id="experiencia" className="section shell">
        <div className="section-heading">
          <span className="section-number">01</span>
          <h2>{isEn ? "Experience" : "Experiência"}</h2>
          <p>
            {isEn
              ? "A trajectory across technology, operations and business."
              : "Uma trajetória entre tecnologia, operação e negócio."}
          </p>
        </div>
        <div className="experience-list">
          {resume.experiences.map((experience, index) => (
            <article className="experience" key={`${experience.company}-${experience.period}`}>
              <div className="experience-marker">
                <span>0{index + 1}</span>
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

      <section id="habilidades" className="section section-dark">
        <div className="shell">
          <div className="section-heading section-heading-light">
            <span className="section-number">02</span>
            <h2>
              {isEn ? (
                <>
                  Tools to<br />
                  <em>solve the complex.</em>
                </>
              ) : (
                <>
                  Ferramentas para<br />
                  <em>resolver o complexo.</em>
                </>
              )}
            </h2>
            <p>
              {isEn
                ? "A broad technical repertoire. The choice is always problem-driven."
                : "O repertório técnico é amplo. A escolha é sempre orientada pelo problema."}
            </p>
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

      <section id="formacao" className="section shell education-section">
        <div className="section-heading">
          <span className="section-number">03</span>
          <h2>{isEn ? "Education & Languages" : "Formação & Idiomas"}</h2>
          <p>
            {isEn
              ? "Academic foundation and international communication."
              : "Base acadêmica para decisões técnicas melhores."}
          </p>
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
          {resume.languages && (
            <article className="education-item" key="languages">
              <span>{isEn ? "Languages" : "Idiomas"}</span>
              <h3>{isEn ? "Bilingual Fluency" : "Fluência Bilíngue"}</h3>
              <strong>{resume.languages.join(" · ")}</strong>
              <p>
                {isEn
                  ? "Full professional proficiency in English and native Portuguese."
                  : "Proficiência profissional completa em inglês e português nativo."}
              </p>
            </article>
          )}
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-inner">
          <div>
            <p className="eyebrow">
              {isEn ? "Let's build something solid." : "Vamos construir algo sólido."}
            </p>
            <h2>
              Marcelino<br />
              <em>Sandroni Dias.</em>
            </h2>
          </div>
          <div className="footer-links">
            <a href={`mailto:${resume.contact.email}`}>
              {resume.contact.email} <span>↗</span>
            </a>
            <a href={`https://${resume.contact.linkedin}`} target="_blank" rel="noreferrer">
              {resume.contact.linkedin} <span>↗</span>
            </a>
            <small>
              © 2026 · {isEn ? "Versioned Resume" : "Currículo versionado"} · v0.1.5
            </small>
          </div>
        </div>
      </footer>
    </main>
  );
}
