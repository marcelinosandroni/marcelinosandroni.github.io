import type { Metadata } from "next";

import { HomeView } from "@/components/home/home-view";
import { toLocale } from "@/domain/i18n";
import { isFeatureEnabled } from "@/domain/feature-flags/feature-flags";
import { getHomeContent } from "@/infrastructure/content/home";
import {
  readHomeStack,
  readHomeTrackRecord,
  readResume,
  readTestimonials,
} from "@/infrastructure/repositories";

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

/**
 * The same hourly regeneration as the résumé, for the same reason: the summary
 * is assembled from the database now, and an edit should not need a redeploy.
 */
export const revalidate = 3_600;

export default async function Page({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return null;
  }

  /*
    `"home"`: the summary shows the roles the owner marked for it, and reading
    `"both"` would put a résumé-only role back onto the landing page — which is
    precisely the decision the `surfaces` column exists to express.
  */
  const [
    resume,
    stack,
    annotations,
    testimonials,
  ] = await Promise.all([
    readResume(locale, "home"),
    readHomeStack(locale),
    readHomeTrackRecord(locale),
    readTestimonials(locale),
  ]);

  return (
    <HomeView
      locale={locale}
      resume={resume}
      stack={stack}
      annotations={annotations}
      testimonials={testimonials}
      testimonialsEnabled={isFeatureEnabled("testimonials")}
    />
  );
}
