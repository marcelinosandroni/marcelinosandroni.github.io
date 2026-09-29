import type { Metadata } from "next";

import { BlogIndex } from "@/components/blog/blog-index";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  LOCALE_SEGMENTS,
  getAlternateLanguageMap,
  getAlternateOpenGraphLocales,
  toLocale,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { homePath, resumePath } from "@/domain/site/routes";
import { getResumeContent } from "@/infrastructure/content";
import { getHomeContent } from "@/infrastructure/content/home";
import { getListArticles } from "@/infrastructure/repositories";
import { getDictionary } from "@/i18n";

const SUFFIX = "/blog";

/**
 * Blog index route.
 *
 * The catalog is read through `ListArticles`, which is backed by the database
 * with the versioned catalog as a fallback — so this route builds and renders
 * with no database configured, and stays current when there is one.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return {};
  }

  const t = await getDictionary(locale);
  const title = `${t.blog.indexTitle} | ${t.metadata.siteName}`;
  const canonical = `/${LOCALE_SEGMENTS[locale]}${SUFFIX}`;

  return {
    title,
    description: t.blog.indexSubtitle,
    alternates: { canonical, languages: getAlternateLanguageMap(SUFFIX) },
    openGraph: {
      type: "website",
      siteName: t.metadata.siteName,
      title,
      description: t.blog.indexSubtitle,
      url: canonical,
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/blog">) {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return null;
  }

  const t = await getDictionary(locale);
  const home = getHomeContent(locale);
  const resume = getResumeContent(locale);
  const articles = await (await getListArticles()).execute({ locale });

  const sections = [
    { key: "resume", label: t.nav.resume, href: resumePath(locale) },
    { key: "blog", label: t.nav.blog, href: `/${LOCALE_SEGMENTS[locale]}${SUFFIX}` },
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

      <SiteHeader locale={locale} t={t} sections={sections} />

      <main
        id="main"
        aria-label={t.a11y.mainContent}
        className="mx-auto w-full max-w-[1320px] px-margin py-space-2xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-3xl"
      >
        <BlogIndex articles={articles} locale={locale} t={t} />
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
