import type { Metadata } from "next";

import { ResumeDocument } from "@/components/resume/resume-document";
import {
  LOCALE_SEGMENTS,
  getAlternateLanguageMap,
  getAlternateOpenGraphLocales,
  toLocale,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { getResumeContent } from "@/infrastructure/content";
import { getDictionary } from "@/i18n";

const SUFFIX = "/resume";

/**
 * Resume document route.
 *
 * This route is the document of record: every role, deliverable and measured
 * outcome from the original resume content, in full. The home route summarises
 * it; nothing here is derived from the home configuration.
 *
 * `alternates` and `openGraph` are restated in full — including the `hreflang`
 * set and the `og:locale` pair — because Next.js replaces those objects rather
 * than merging them, and a page declaring only `canonical` would strip the
 * alternate-language links the layout provides.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/resume">): Promise<Metadata> {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return {};
  }

  const t = await getDictionary(locale);
  const title = `${t.resume.title} | ${t.metadata.title}`;
  const canonical = `/${LOCALE_SEGMENTS[locale]}${SUFFIX}`;

  return {
    title,
    description: t.resume.subtitle,
    alternates: { canonical, languages: getAlternateLanguageMap(SUFFIX) },
    openGraph: {
      type: "article",
      siteName: t.metadata.siteName,
      title,
      description: t.resume.subtitle,
      url: canonical,
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
    },
  };
}

export default async function Page({ params }: PageProps<"/[locale]/resume">) {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return null;
  }

  return <ResumeDocument locale={locale} resume={getResumeContent(locale)} />;
}
