import { resumeContent } from "@/infrastructure/content/resume-data";

export default function Home() {
  const resume = resumeContent;

  return (
    <main>
      <header className="topbar shell">
        <a className="brand" href="#top" aria-label="Voltar ao início">MSD<span>.</span></a>
        <nav aria-label="Navegação principal"><a href="#experiencia">Experiência</a><a href="#habilidades">Habilidades</a><a href="#formacao">Formação</a></nav>
        <a className="language" href="/resume-en-us.md">EN <span>↗</span></a>
      </header>
      <section id="top" className="hero shell"><div className="hero-copy"><p className="eyebrow">Currículo vivo · Versão 2026.08</p><h1>{resume.name}</h1><p className="hero-title">{resume.title}</p><p className="hero-summary">{resume.summary}</p><div className="hero-actions"><a className="button button-primary" href="#experiencia">Explorar trajetória <span>↓</span></a><a className="button button-quiet" href={`mailto:${resume.contact.email}`}>Entrar em contato <span>↗</span></a></div></div><aside className="hero-note" aria-label="Perfil profissional"><span className="note-index">01 / 04</span><p>Engenharia que conecta sistemas distribuídos, produto e resultado financeiro.</p><span className="note-line" /><small>{resume.location}</small></aside></section>
      <div className="signal-bar"><div className="shell signal-inner"><span><i /> Disponível para conversas</span><span>Backend · Frontend · Cloud · Arquitetura</span><span>PT-BR / EN-US</span></div></div>
      <section id="experiencia" className="section shell"><div className="section-heading"><span className="section-number">01</span><h2>Experiência</h2><p>Uma trajetória entre tecnologia, operação e negócio.</p></div><div className="experience-list">{resume.experiences.map((experience, index) => <article className="experience" key={experience.company}><div className="experience-marker"><span>0{index + 1}</span></div><div className="experience-main"><div className="experience-meta"><span>{experience.period}</span><span>{experience.company}</span></div><h3>{experience.role}</h3><p>{experience.summary}</p><ul>{experience.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul></div></article>)}</div></section>
      <section id="habilidades" className="section section-dark"><div className="shell"><div className="section-heading section-heading-light"><span className="section-number">02</span><h2>Ferramentas para<br /><em>resolver o complexo.</em></h2><p>O repertório técnico é amplo. A escolha é sempre orientada pelo problema.</p></div><div className="skill-grid">{resume.skillGroups.map((group) => <article className="skill-group" key={group.label}><h3>{group.label}</h3><div>{group.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}</div></div></section>
      <section id="formacao" className="section shell education-section"><div className="section-heading"><span className="section-number">03</span><h2>Formação</h2><p>Base acadêmica para decisões técnicas melhores.</p></div><div className="education-grid">{resume.education.map((item) => <article className="education-item" key={`${item.institution}-${item.title}`}><span>{item.period}</span><h3>{item.title}</h3><strong>{item.institution}</strong><p>{item.description}</p></article>)}</div></section>
      <footer className="footer"><div className="shell footer-inner"><div><p className="eyebrow">Vamos construir algo sólido.</p><h2>Marcelino<br /><em>Sandroni Dias.</em></h2></div><div className="footer-links"><a href={`mailto:${resume.contact.email}`}>{resume.contact.email} <span>↗</span></a><a href={`https://${resume.contact.linkedin}`} target="_blank" rel="noreferrer">{resume.contact.linkedin} <span>↗</span></a><small>© 2026 · Currículo versionado</small></div></div></footer>
    </main>
  );
}
