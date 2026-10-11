import type { Metadata } from "next";

import { ResumeDocument } from "@/components/resume/resume-document";
import {
  LOCALE_SEGMENTS,
  getAlternateLanguageMap,
  getAlternateOpenGraphLocales,
  toLocale,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { readResume } from "@/infrastructure/repositories";
import { getDictionary } from "@/i18n";

const SUFFIX = "/resume";

/**
 * Time-based revalidation, and the reason this page still counts as static.
 *
 * The document now comes from the database, so the page cannot be finished at
 * build time or an admin edit would need a redeploy to appear. But reading it
 * on every request is the other extreme: a page view spent waiting on a network
 * round trip is a page view that costs a recruiter.
 *
 * So the page stays prerendered and regenerates at most hourly, and an admin
 * save calls `revalidatePath` to make the change visible immediately. The
 * hourly figure is the safety net for the case where that call is missed — a
 * restore, a direct database edit, a webhook that did not arrive — not the
 * expected path to an edit going live.
 */
export const revalidate = 3_600;

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

  /*
    `"resume"` rather than `"both"`: this is the document of record, so every row
    the owner has written appears here regardless of where it is also shown. A
    role marked résumé-only is invisible for exactly this reason — it is not on
    the summary and it does not belong to be removed from the document.
  */
  const resume = await readResume(locale, "resume");

  return <ResumeDocument locale={locale} resume={resume} />;
}
