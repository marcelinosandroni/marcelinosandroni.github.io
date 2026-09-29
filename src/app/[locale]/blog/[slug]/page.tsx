import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticlePage } from "@/components/blog/article-page";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ArticleNotFoundError } from "@/application/blog";
import {
  LOCALE_SEGMENTS,
  SUPPORTED_LOCALES,
  getAlternateLanguageMap,
  getAlternateOpenGraphLocales,
  toLocale,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { ArticleSlug, InvalidArticleSlugError } from "@/domain/blog";
import { SITE_AUTHOR, SITE_URL } from "@/domain/site/site-info";
import { homePath, resumePath } from "@/domain/site/routes";
import { getResumeContent } from "@/infrastructure/content";
import { getHomeContent } from "@/infrastructure/content/home";
import { getArticle, getListArticles } from "@/infrastructure/repositories";
import { getDictionary } from "@/i18n";

const SUFFIX = "/blog";

/**
 * Pre-renders every article slug known at build time.
 *
 * `dynamicParams` stays at its default of `true`, so an article published after
 * the build is rendered on first request instead of 404-ing until the next
 * deploy. That is the whole point of a database-backed blog: a draft becoming
 * published must not require a redeploy to become reachable.
 *
 * When the database is unreachable the repository falls back to the versioned
 * catalog, so this function still returns a useful set during a credential-less
 * build and the build never fails on a missing backend.
 */
export async function generateStaticParams(): Promise<{ locale: string; slug: string }[]> {
  const useCase = await getListArticles();
  const params: { locale: string; slug: string }[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const articles = await useCase.execute({ locale });
    for (const article of articles) {
      params.push({ locale: LOCALE_SEGMENTS[locale], slug: article.slug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale: localeSegment, slug } = await params;
  const locale = toLocale(localeSegment);

  if (!locale || !ArticleSlug.isValid(slug)) {
    return { title: "", robots: { index: false, follow: true } };
  }

  const t = await getDictionary(locale);

  let article;
  try {
    article = await (await getArticle()).execute({ locale, slug });
  } catch {
    return { title: t.blog.notFoundTitle, robots: { index: false, follow: true } };
  }

  const canonical = `/${LOCALE_SEGMENTS[locale]}${SUFFIX}/${article.slug}`;

  return {
    title: `${article.title} | ${t.metadata.siteName}`,
    description: article.excerpt,
    keywords: article.tags,
    authors: [{ name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }],
    alternates: { canonical, languages: getAlternateLanguageMap(`${SUFFIX}/${article.slug}`) },
    openGraph: {
      type: "article",
      siteName: t.metadata.siteName,
      title: article.title,
      description: article.excerpt,
      url: canonical,
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? undefined,
      authors: [SITE_AUTHOR.url],
      tags: article.tags,
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale: localeSegment, slug } = await params;
  const locale = toLocale(localeSegment);

  if (!locale) {
    notFound();
  }

  let article;
  try {
    article = await (await getArticle()).execute({ locale, slug });
  } catch (error) {
    // A malformed slug and an unpublished article are the same outcome for a
    // reader, and neither should leak a reason through the error boundary.
    if (error instanceof InvalidArticleSlugError || error instanceof ArticleNotFoundError) {
      notFound();
    }
    throw error;
  }

  const t = await getDictionary(locale);
  const home = getHomeContent(locale);
  const resume = getResumeContent(locale);

  const sections = [
    { key: "resume", label: t.nav.resume, href: resumePath(locale) },
    { key: "blog", label: t.nav.blog, href: `/${LOCALE_SEGMENTS[locale]}${SUFFIX}` },
    { key: "overview", label: t.nav.home, href: homePath(locale) },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    inLanguage: locale,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    keywords: article.tags.join(", "),
    wordCount: article.body.reduce((total, block) => total + countWords(block), 0),
    timeRequired: `PT${article.readingTimeMinutes}M`,
    author: { "@type": "Person", name: SITE_AUTHOR.name, url: SITE_AUTHOR.url },
    mainEntityOfPage: `${SITE_URL}/${LOCALE_SEGMENTS[locale]}${SUFFIX}/${article.slug}`,
  };

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <ArticlePage article={article} locale={locale} t={t} />
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

/** Rough word count for the `BlogPosting` schema; blocks are short by design. */
function countWords(block: { [key: string]: unknown }): number {
  const text = [block.text, block.code, ...(Array.isArray(block.items) ? block.items : [])]
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  return text.split(/\s+/).filter(Boolean).length;
}
