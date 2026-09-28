import type { MetadataRoute } from "next";

import {
  DEFAULT_LOCALE,
  LOCALE_SEGMENTS,
  SUPPORTED_LOCALES,
  getAlternateLanguageMap,
} from "@/domain/i18n";
import { SITE_URL } from "@/domain/site/site-info";

/**
 * One entry per localized route, each declaring the full `hreflang` set so
 * search engines treat the locales as translations of a single document rather
 * than as duplicate pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = getAlternateLanguageMap();

  return SUPPORTED_LOCALES.map((locale) => ({
    url: `${SITE_URL}/${LOCALE_SEGMENTS[locale]}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
    alternates: { languages },
  }));
}
