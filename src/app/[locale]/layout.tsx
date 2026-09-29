import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";

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
import { TelemetryBar } from "@/components/telemetry/telemetry-bar";
import { ThemeBootstrapScript } from "@/components/theme/theme-script";
import { DEFAULT_THEME_ID, themeColorFor } from "@/domain/theme/theme";
import "../globals.css";

/*
 * Three families, one job each (DESIGN.md §4). Loaded through `next/font`, so
 * the files are self-hosted at build time: no request to Google at runtime, no
 * FOUT, and a size-adjusted fallback that keeps the metric bars stable enough
 * that swapping the webfont causes no layout shift.
 */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--msd-font-manrope",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--msd-font-jetbrains",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--msd-font-playfair",
});

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
    sameAs: [SITE_OWNER.linkedin, SITE_OWNER.github],
    knowsAbout: t.metadata.knowsAbout,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Fortaleza",
      addressRegion: "CE",
      addressCountry: "BR",
    },
  };

  return (
    /*
     * `data-scroll-behavior="smooth"` tells the router that smooth scrolling is
     * intentional, so it disables it during route transitions and the new page
     * does not animate in from the top while the reader is mid-click.
     */
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${jetBrainsMono.variable} ${playfairDisplay.variable}`}
    >
      <body className="pb-10">
        {/*
          The theme is applied before first paint by a script placed in the
          document head by Next.js itself.

          An explicit `<head>` element here was tried first and broke hydration
          intermittently: the PDF download button stopped being interactive on
          roughly half of runs, and it cost several attempts to attribute,
          because the failure was "element not found" rather than a parse error.
          The fix is to not declare `<head>` at all — React 19 hoists `<script>`
          and `<meta>` rendered inside `<body>` into the head automatically,
          which keeps the script early without taking ownership of the element.
        */}
        <ThemeBootstrapScript />
        <meta name="theme-color" content={themeColorFor(DEFAULT_THEME_ID)} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
        {/*
          Page views only, and aggregate: no cookie, no cross-site identifier,
          no fingerprint. It is the one piece of traffic data a portfolio can
          collect without collecting anybody.

          It lives in the locale layout rather than a root layout, so the private
          `/admin` area is outside the tree it applies to. That is deliberate —
          owner traffic is not part of the public signal, and the less that is
          measured the better.
        */}
        <Analytics />
        <TelemetryBar labels={t.telemetry} />
      </body>
    </html>
  );
}
