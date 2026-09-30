import { ImageResponse } from "next/og";

import { OgImageFrame } from "@/components/og/og-image-frame";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, SUPPORTED_LOCALES, toLocale } from "@/domain/i18n";
import { OG_IMAGE_SIZE, deriveSiteOgImage, ogImageCopyFrom } from "@/domain/og/image";
import { getDictionary } from "@/i18n";
import { enUS } from "@/i18n/dictionaries/en-US";

/**
 * The Open Graph card for the blog index and the resume.
 *
 * ## Why these two segments need their own file
 *
 * Both pages declare an `openGraph` object in their `generateMetadata`, and Next
 * **replaces** that object rather than merging it into the inherited one. So the
 * `opengraph-image.tsx` one level up — the site-wide card — was being dropped
 * exactly here, and both pages shipped with no `og:image` at all. That is the rule
 * the repo already documents at `src/app/[locale]/page.tsx:16`, applied to a case
 * it had not been applied to.
 *
 * A file in the same segment is the fix rather than threading a URL through the
 * metadata object: the image is then resolved for the route the same way in every
 * other segment, and there is no URL for the two to disagree about.
 *
 * `app/[locale]/blog/opengraph-image.tsx` is the same file with a different
 * subject; they differ only in the one line that picks the tagline.
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

async function resolve(
  segment: string,
): Promise<{ locale: ReturnType<typeof toLocale>; model: ReturnType<typeof deriveSiteOgImage> }> {
  const resolved = toLocale(segment);
  const locale = resolved ?? DEFAULT_LOCALE;
  const t = resolved ? await getDictionary(locale) : enUS;

  return {
    locale,
    model: deriveSiteOgImage({
      locale,
      copy: ogImageCopyFrom(t),
      jobTitle: t.metadata.jobTitle,
      // The page's own subject, not the site tagline: a shared resume link should
      // describe the resume.
      tagline: t.resume.subtitle,
    }),
  };
}

export default async function ResumeOpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const { model } = await resolve(segment);

  return new ImageResponse(<OgImageFrame model={model} />, { ...OG_IMAGE_SIZE });
}
