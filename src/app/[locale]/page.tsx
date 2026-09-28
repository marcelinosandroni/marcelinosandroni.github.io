import type { Metadata } from "next";

import { HomeView } from "@/components/home/home-view";
import { toLocale } from "@/domain/i18n";
import { getResumeContent } from "@/infrastructure/content";
import { getHomeContent } from "@/infrastructure/content/home";

/**
 * Home route — the executive overview.
 *
 * The resume is read on the server so the track record renders from the document
 * of record, but only the fields the overview needs reach the HTML.
 *
 * Metadata is deliberately limited to `title` and `description`, both derived
 * from the home configuration. Next.js replaces (rather than merges) the
 * `alternates`, `openGraph` and `twitter` objects a page declares, so restating
 * them here would silently drop the layout's `hreflang` set and the
 * `og:locale` pair. The layout owns those; the page owns the positioning copy.
 */
export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return {};
  }

  const home = getHomeContent(locale);

  return {
    title: `${home.hero.name} | ${home.hero.role}`,
    description: home.hero.metaDescription,
  };
}

export default async function Page({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return null;
  }

  const resume = getResumeContent(locale);

  return <HomeView locale={locale} resume={resume} />;
}
