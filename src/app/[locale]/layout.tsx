import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  LOCALE_SEGMENTS,
  SUPPORTED_LOCALES,
  getAlternateLanguageMap,
  isLocaleSegment,
  toLocale,
  toLocaleFromSegment,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { SITE_OWNER, SITE_URL } from "@/domain/site/site-info";
import { getDictionary } from "@/i18n";
import "../globals.css";

/**
 * Only the locales returned by `generateStaticParams` are routable. Anything
 * else 404s at the routing layer instead of being rendered dynamically, which
 * keeps every page statically generated and prevents unbounded route growth.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale: LOCALE_SEGMENTS[locale] }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = toLocale(segment);

  if (!locale) {
    return {};
  }

  const t = await getDictionary(locale);

  return {
    metadataBase: new URL(SITE_URL),
    title: t.metadata.title,
    description: t.metadata.description,
    keywords: t.metadata.keywords,
    authors: [{ name: SITE_OWNER.name, url: SITE_URL }],
    creator: SITE_OWNER.name,
    alternates: {
      canonical: `/${segment}`,
      languages: getAlternateLanguageMap(),
    },
    openGraph: {
      type: "profile",
      siteName: t.metadata.siteName,
      title: t.metadata.title,
      description: t.metadata.openGraphDescription,
      url: `/${segment}`,
      locale: toOpenGraphLocale(locale),
      alternateLocale: SUPPORTED_LOCALES.filter((candidate) => candidate !== locale).map(
        toOpenGraphLocale,
      ),
    },
    twitter: {
      card: "summary",
      title: t.metadata.title,
      description: t.metadata.openGraphDescription,
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale: segment } = await params;

  if (!isLocaleSegment(segment)) {
    notFound();
  }

  const locale = toLocaleFromSegment(segment);
  const t = await getDictionary(locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: SITE_OWNER.name,
    jobTitle: t.metadata.jobTitle,
    description: t.metadata.structuredDataDescription,
    url: `${SITE_URL}/${segment}`,
    inLanguage: locale,
    sameAs: [SITE_OWNER.linkedin],
    knowsAbout: t.metadata.knowsAbout,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Fortaleza",
      addressRegion: "CE",
      addressCountry: "BR",
    },
  };

  return (
    <html lang={locale}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
