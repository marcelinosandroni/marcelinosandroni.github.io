import type { MetadataRoute } from "next";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getAlternateLanguageMap,
  toLocaleSegment,
} from "@/domain/i18n";
import { SITE_URL } from "@/domain/site/site-info";
import { ROUTE_SEGMENTS } from "@/domain/site/routes";
import { getListArticles } from "@/infrastructure/repositories";

type SitemapEntry = MetadataRoute.Sitemap[number];

/**
 * Sitemap for every localized document.
 *
 * One entry per (route, locale), each declaring the full `hreflang` set so
 * search engines treat the locales as translations of a single document rather
 * than as duplicate pages. The blog entries are read through the same repository
 * the blog route uses, so a newly published article appears without a code
 * change; a build with no database configured falls back to the versioned
 * catalog and still lists what exists.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const listArticles = await getListArticles();
  const entries: SitemapEntry[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const segment = toLocaleSegment(locale);
    const priority = locale === DEFAULT_LOCALE ? 1 : 0.9;
    const articles = await listArticles.execute({ locale });

    entries.push({
      url: `${SITE_URL}/${segment}`,
      changeFrequency: "monthly",
      priority,
      alternates: { languages: getAlternateLanguageMap() },
    });

    for (const route of [ROUTE_SEGMENTS.resume, ROUTE_SEGMENTS.blog] as const) {
      entries.push({
        url: `${SITE_URL}/${segment}/${route}`,
        changeFrequency: "monthly",
        priority: priority - 0.1,
        alternates: { languages: getAlternateLanguageMap(`/${route}`) },
      });
    }

    for (const article of articles) {
      entries.push({
        url: `${SITE_URL}/${segment}/${ROUTE_SEGMENTS.blog}/${article.slug}`,
        lastModified: new Date(`${article.updatedAt ?? article.publishedAt}T00:00:00Z`),
        changeFrequency: "yearly",
        priority: 0.7,
        alternates: {
          languages: getAlternateLanguageMap(`/${ROUTE_SEGMENTS.blog}/${article.slug}`),
        },
      });
    }
  }

  return entries;
}
