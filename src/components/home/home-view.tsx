import { BlogPreviewSection } from "@/components/home/blog-preview";
import { ContactGatewaySection } from "@/components/home/contact-gateway";
import { HomeHeroSection } from "@/components/home/home-hero";
import { KpiSection } from "@/components/home/kpi-grid";
import { TechArsenalSection } from "@/components/home/tech-arsenal";
import { TrackRecordSection } from "@/components/home/track-record";
import { ResumeCopilot } from "@/components/ai/resume-copilot";
import { BootSequence } from "@/components/site/boot-sequence";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/domain/i18n";
import type { ResumeContent } from "@/domain/resume/types";
import { blogPath, resumePath } from "@/domain/site/routes";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@/infrastructure/pdf/resume-template-registry";
import { getDictionary } from "@/i18n";
import { getHomeContent } from "@/infrastructure/content/home";

export interface HomeViewProps {
  locale: Locale;
  /** The document of record, reused for the track record. */
  resume: ResumeContent;
}

/**
 * Home route composition.
 *
 * A Server Component that does nothing but resolve data and compose sections.
 * Every band is an independent component with an independent content contract,
 * so adding, removing or reordering one is a data change plus one import — never
 * an edit to a shared layout.
 *
 * Deliberately a Server Component: it imports the resume and the home
 * configuration, neither of which may ever reach the browser bundle. The single
 * client island is the PDF download button, and the boot sequence, both of which
 * receive already-translated strings as props.
 */
export async function HomeView({ locale, resume }: HomeViewProps) {
  const t = await getDictionary(locale);
  const home = getHomeContent(locale);

  const pdfTemplates = RESUME_TEMPLATES.map((template) => ({
    id: template.id as ResumeTemplateId,
    label: t.pdf.templates[template.id].label,
    description: t.pdf.templates[template.id].description,
  }));

  const sections = [
    { key: "kpis", label: t.nav.home, href: `#${home.kpis.id}` },
    { key: "arsenal", label: t.nav.arsenal, href: `#${home.stack.id}` },
    { key: "experience", label: t.nav.experience, href: `#${home.trackRecord.id}` },
    { key: "blog", label: t.nav.blog, href: blogPath(locale) },
    { key: "resume", label: t.nav.resume, href: resumePath(locale) },
    { key: "contact", label: t.nav.contact, href: `#${home.contact.id}` },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded focus:bg-surface-overlay focus:px-space-md focus:py-space-sm focus:font-label-mono focus:text-label-mono focus:text-primary-container"
      >
        {t.a11y.skipToContent}
      </a>

      <BootSequence
        statusLabel={home.hero.statusPill}
        skipLabel={t.boot.skip}
        hint={t.boot.hint}
        ownerLine={resume.name}
        diagnostics={BOOT_DIAGNOSTICS[locale]}
      />

      <SiteHeader locale={locale} t={t} sections={sections} />

      <main id="main" aria-label={t.a11y.mainContent}>
        <HomeHeroSection hero={home.hero} locale={locale} t={t} pdfTemplates={pdfTemplates} />
        <KpiSection section={home.kpis} />
        <TechArsenalSection section={home.stack} />
        <TrackRecordSection
          section={home.trackRecord}
          experiences={resume.experiences}
          locale={locale}
          openResumeLabel={home.trackRecord.resumeCtaLabel}
        />
        <ResumeCopilot locale={locale} labels={t.copilot} />
        <BlogPreviewSection section={home.blog} locale={locale} t={t} />
        <ContactGatewaySection
          section={home.contact}
          email={resume.contact.email}
          phone={resume.contact.phone}
          t={t}
        />
      </main>

      <SiteFooter
        footer={home.footer}
        locale={locale}
        t={t}
        email={resume.contact.email}
        phone={resume.contact.phone}
      />
    </>
  );
}

/**
 * Terminal lines for the boot sequence. Data, not markup, so the copy is
 * translatable and reviewable in the same place as every other string.
 *
 * Every line is a checkable fact drawn from the resume — no codenames, no
 * theatrical jargon, and the arithmetic is stated outright because it is the
 * single most useful thing a reader can learn in the first second.
 */
const BOOT_DIAGNOSTICS = {
  "en-US": [
    "> Loading profile and portfolio...",
    "> 15 yrs financial governance (2005-2020) + 6 yrs software engineering (2021-2026)",
    "> Combined: 21 years of applied expertise",
    "> Platform: Go / .NET / Java / Kafka / Kubernetes / AWS",
    "> Protected revenue R$ 24M per year · 100M messages per day",
    "> READY. AWAITING INSTRUCTION...",
  ],
  "pt-BR": [
    "> Carregando perfil e portfólio...",
    "> 15 anos de governança financeira (2005-2020) + 6 anos de engenharia (2021-2026)",
    "> Combinado: 21 anos de expertise aplicada",
    "> Plataforma: Go / .NET / Java / Kafka / Kubernetes / AWS",
    "> Receita protegida de R$ 24M por ano · 100M de mensagens por dia",
    "> PRONTO. AGUARDANDO INSTRUÇÃO...",
  ],
} as const satisfies Record<Locale, string[]>;
