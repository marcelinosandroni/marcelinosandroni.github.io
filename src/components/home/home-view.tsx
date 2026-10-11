import { BlogPreviewSection } from "@/components/home/blog-preview";
import { ContactGatewaySection } from "@/components/home/contact-gateway";
import { HomeHeroSection } from "@/components/home/home-hero";
import { HowILeadSection } from "@/components/home/how-i-lead";
import { KpiSection } from "@/components/home/kpi-grid";
import { TechArsenalSection } from "@/components/home/tech-arsenal";
import { TrackRecordSection } from "@/components/home/track-record";
import { ResumeCopilot } from "@/components/ai/resume-copilot";
import { VisitorChat } from "@/components/chat/visitor-chat";
import { FirstVisitIntro } from "@/components/site/first-visit-intro";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackSection,
} from "@/domain/portfolio";
import type { ResumeContent } from "@/domain/resume/types";
import { blogPath, resumePath } from "@/domain/site/routes";
import { SITE_OWNER } from "@/domain/site/site-info";
import { getDictionary } from "@/i18n";
import { getHomeContent } from "@/infrastructure/content/home";

export interface HomeViewProps {
  locale: Locale;
  /** The document of record, already filtered to the `home` surface. */
  resume: ResumeContent;
  /**
   * Database-resolved tech stack, or `null` to use the typed one.
   *
   * Optional rather than required-with-a-default so the fallback is explicit at
   * the call site: a route that has not wired the database yet still renders,
   * and a reviewer can see which view is authoritative.
   */
  stack?: HomeStackSection | null;
  /** Database-resolved track-record annotations, or `null` for the typed ones. */
  annotations?: HomeExperienceAnnotation[] | null;
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
 * client islands are the copilot terminal and the boot sequence, both of which
 * receive already-translated strings as props.
 */
export async function HomeView({ locale, resume, stack, annotations }: HomeViewProps) {
  const t = await getDictionary(locale);
  const typed = getHomeContent(locale);

  /*
    The database wins where it answered, and the typed catalog answers everywhere
    else. Merged field by field rather than replaced wholesale, because the
    section *prose* — the kicker, the title, the sentence that introduces the
    cluster — is editorial and belongs to the page, while the rows are facts the
    owner edits. Swapping the whole object would hand a content edit authority
    over the sentence that frames it.
  */
  const home = {
    ...typed,
    stack: stack === null || stack === undefined
      ? typed.stack
      : { ...typed.stack, clusters: stack.clusters },
    trackRecord:
      annotations === null || annotations === undefined
        ? typed.trackRecord
        : { ...typed.trackRecord, annotations },
  };

  const sections = [
    /*
      Contact leads, and it is not a styling preference.
      It used to be last, on the reasoning that the reader works down the page and
      arrives at it having been convinced. That is how a portfolio is read by
      somebody evaluating it. It is not how a hiring manager reads one: they arrive
      from a link, they decide in seconds whether to keep reading, and the question
      in their head is "can I contact this person". Making that the first tab means
      it is answered before they have to look for it.
    */
    { key: "contact", label: t.nav.contact, href: `#${home.contact.id}` },
    { key: "kpis", label: t.nav.home, href: `#${home.kpis.id}` },
    { key: "arsenal", label: t.nav.arsenal, href: `#${home.stack.id}` },
    { key: "experience", label: t.nav.experience, href: `#${home.trackRecord.id}` },
    { key: "blog", label: t.nav.blog, href: blogPath(locale) },
    { key: "resume", label: t.nav.resume, href: resumePath(locale) },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded focus:bg-surface-overlay focus:px-space-md focus:py-space-sm focus:font-label-mono focus:text-label-mono focus:text-primary-container"
      >
        {t.a11y.skipToContent}
      </a>

      {/*
        The arrival, for a reader who has not been here before. It replaces the
        old boot sequence rather than sitting in front of it: two full-screen
        openings on one page is one too many, and the old one told the reader
        nothing except that the site had a splash screen.

        It contains no photograph. The rain resolves into the reader's name and the
        curtain rises, which means the hero's portrait is never a duplicate of
        something the reader has just watched appear — see `first-visit-intro.tsx`
        for why that was worth removing rather than animating harder.
      */}
      <FirstVisitIntro name={SITE_OWNER.introName} />

      <SiteHeader locale={locale} t={t} sections={sections} />

      <main id="main" aria-label={t.a11y.mainContent}>
        <HomeHeroSection hero={home.hero} t={t} locale={locale} />
        <KpiSection section={home.kpis} />
        <TechArsenalSection section={home.stack} />
        <TrackRecordSection
          section={home.trackRecord}
          experiences={resume.experiences}
          locale={locale}
          openResumeLabel={home.trackRecord.resumeCtaLabel}
        />
        <HowILeadSection section={home.leadership} />
        <ResumeCopilot locale={locale} labels={t.copilot} />
        {/*
          The visitor's side of the conversation, and it renders nothing at all
          until the owner has actually opened a conversation with that visitor.
          That is the product rule — a chat nobody has asked for is an
          interruption — so mounting it here is what costs a heartbeat and no
          visible surface.

          No `locale` prop: the component reads it from the document, so a
          conversation started in one locale and continued in the other does not
          silently switch the language of the owner's own replies.
        */}
        <VisitorChat labels={t.chat} />
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
