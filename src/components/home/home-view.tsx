import { BlogPreviewSection } from "@/components/home/blog-preview";
import { ContactGatewaySection } from "@/components/home/contact-gateway";
import { HomeHeroSection } from "@/components/home/home-hero";
import { KpiMatrixSection } from "@/components/home/kpi-matrix";
import { TechArsenalSection } from "@/components/home/tech-arsenal";
import { TrackRecordSection } from "@/components/home/track-record";
import { BootSequence } from "@/components/site/boot-sequence";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/domain/i18n";
import type { ResumeContent } from "@/domain/resume/types";
import { resumePath } from "@/domain/site/routes";
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
    { key: "blog", label: t.nav.blog, href: `#${home.blog.id}` },
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
        <KpiMatrixSection section={home.kpis} />
        <TechArsenalSection section={home.stack} />
        <TrackRecordSection
          section={home.trackRecord}
          experiences={resume.experiences}
          locale={locale}
          openResumeLabel={home.trackRecord.resumeCtaLabel}
        />
        <BlogPreviewSection section={home.blog} locale={locale} t={t} />
        <ContactGatewaySection section={home.contact} email={resume.contact.email} t={t} />
      </main>

      <SiteFooter footer={home.footer} locale={locale} t={t} email={resume.contact.email} />
    </>
  );
}

/**
 * Terminal lines for the boot sequence. Data, not markup, so the copy is
 * translatable and reviewable in the same place as every other string.
 */
const BOOT_DIAGNOSTICS = {
  "en-US": [
    "> Initializing sovereign cognitive matrix...",
    "> Synchronizing dual-core architecture (financial SOX + distributed AI)",
    "> Vector DB: pgvector // TensorRT ingestion active",
    "> Edge gateway: Kafka 50M msgs/day p99 < 10ms verified",
    "> NEURAL UPLINK READY. STANDBY...",
  ],
  "pt-BR": [
    "> Inicializando matriz cognitiva soberana...",
    "> Sincronizando arquitetura de núcleo duplo (SOX financeiro + IA distribuída)",
    "> Banco vetorial: pgvector // Ingestão TensorRT ativa",
    "> Gateway de borda: Kafka 50M msgs/dia p99 < 10ms verificado",
    "> UPLINK NEURAL PRONTO. EM ESPERA...",
  ],
} as const satisfies Record<Locale, string[]>;
