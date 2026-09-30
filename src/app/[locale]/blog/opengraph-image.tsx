import { ImageResponse } from "next/og";

import { OgImageFrame } from "@/components/og/og-image-frame";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, SUPPORTED_LOCALES, toLocale } from "@/domain/i18n";
import { OG_IMAGE_SIZE, deriveSiteOgImage, ogImageCopyFrom } from "@/domain/og/image";
import { getDictionary } from "@/i18n";
import { enUS } from "@/i18n/dictionaries/en-US";

/**
 * The Open Graph card for the blog index.
 *
 * ## Why this segment needs its own file
 *
 * This page declares an `openGraph` object in its `generateMetadata`, and Next
 * **replaces** that object rather than merging it into the inherited one. So the
 * `opengraph-image.tsx` one level up — the site-wide card — was being dropped
 * exactly here, and the page shipped with no `og:image` at all. That is the rule
 * the repo already documents at `src/app/[locale]/page.tsx:16`, applied to a case
 * it had not been applied to.
 *
 * A file in the same segment is the fix rather than threading a URL through the
 * metadata object: the image is then resolved for the route the same way in every
 * other segment, and there is no URL for the two to disagree about.
 *
 * ## No network access
 *
 * No `fonts` option, so Satori uses the single TrueType face `next/og` bundles
 * with itself. See `OgImageFrame` for what that costs.
 */
export const alt = enUS.og.alt;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): { locale: string }[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale: LOCALE_SEGMENTS[locale] }));
}

export default async function BlogOpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const resolved = toLocale(segment);

  /*
   * A crawler can request this route for a segment that is not a locale — the
   * page would have 404'd, but the image is fetched directly by URL. Falling back
   * to the reference catalog answers with a usable card instead of a 500, which is
   * the difference between a plain preview and no preview at all.
   */
  const locale = resolved ?? DEFAULT_LOCALE;
  const t = resolved ? await getDictionary(locale) : enUS;

  const model = deriveSiteOgImage({
    locale,
    copy: ogImageCopyFrom(t),
    jobTitle: t.metadata.jobTitle,
    // The page's own subject, not the site tagline: a shared blog link should
    // describe the writing, not the person.
    tagline: t.blog.indexSubtitle,
  });

  return new ImageResponse(<OgImageFrame model={model} />, { ...OG_IMAGE_SIZE });
}
