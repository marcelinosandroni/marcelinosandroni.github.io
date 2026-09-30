import { ImageResponse } from "next/og";

import { OgImageFrame } from "@/components/og/og-image-frame";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, SUPPORTED_LOCALES, toLocale } from "@/domain/i18n";
import { OG_IMAGE_SIZE, deriveSiteOgImage, ogImageCopyFrom } from "@/domain/og/image";
import { getDictionary } from "@/i18n";
import { enUS } from "@/i18n/dictionaries/en-US";

/**
 * The default Open Graph card for every page in the public tree: the overview,
 * the resume and the blog index. `app/[locale]/blog/[slug]/opengraph-image.tsx`
 * overrides it for a post, because the more specific file wins.
 *
 * ## Why this file exists as well as `app/opengraph-image.tsx`
 *
 * The root layout of this app is `app/[locale]/layout.tsx` — there is no
 * `app/layout.tsx`, because every public URL is prefixed with a locale. The
 * metadata file conventions resolve along the segment chain that renders a
 * route, and that chain for `/en-us` starts at `[locale]`. A metadata file in
 * `app/` alone is therefore only collected for routes that render at the root
 * segment: it reaches the 404 page and `/loading`, and it does **not** reach
 * `/en-us`. That was confirmed against the built HTML, where `/en-us` carried no
 * `og:image` at all while the article pages did.
 *
 * `app/opengraph-image.tsx` is kept because it is the true default for the
 * root-segment routes, and because it is the one that has to exist for the icons
 * to have a sibling. This file is the one that makes the site-wide card actually
 * appear on the pages a reader shares.
 *
 * ## Why this card is localized but `app/opengraph-image.tsx` is not
 *
 * This route sits *below* `[locale]`, so it knows which language it is drawing
 * and can say "Engenheiro de Software Sênior" to a reader who shared the
 * Portuguese resume. The root file has no locale parameter to resolve, so it
 * renders in the reference locale — there is nothing else it could do without
 * guessing from a request header.
 *
 * ## No network access
 *
 * No `fonts` option is passed to `ImageResponse`, so Satori falls back to the
 * single TrueType face that `next/og` bundles with itself and loads from its own
 * package directory. Nothing is fetched at build time or at render time; the
 * build works with no network at all. See `OgImageFrame` for what that costs in
 * typographic weight, and `app/opengraph-image.tsx` for the same note in full.
 */
export const alt = enUS.og.alt;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): { locale: string }[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale: LOCALE_SEGMENTS[locale] }));
}

export default async function LocaleOpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: segment } = await params;
  const resolved = toLocale(segment);

  /*
   * A crawler can request this route for a segment that is not a locale — the
   * page would have 404'd, but the image is fetched directly by URL. Falling back
   * to the reference catalog answers with a usable card instead of a 500, which
   * is the difference between a plain preview and no preview at all.
   */
  const locale = resolved ?? DEFAULT_LOCALE;
  const t = resolved ? await getDictionary(locale) : enUS;

  const model = deriveSiteOgImage({
    locale,
    copy: ogImageCopyFrom(t),
    jobTitle: t.metadata.jobTitle,
    tagline: t.metadata.openGraphDescription,
  });

  return new ImageResponse(<OgImageFrame model={model} />, { ...OG_IMAGE_SIZE });
}
