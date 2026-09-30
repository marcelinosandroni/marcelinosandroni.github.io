import { ImageResponse } from "next/og";

import { OgImageFrame } from "@/components/og/og-image-frame";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { OG_IMAGE_SIZE, deriveSiteOgImage, ogImageCopyFrom } from "@/domain/og/image";
import { enUS } from "@/i18n/dictionaries/en-US";

/**
 * The default Open Graph card for the site.
 *
 * Colocated at the root of `app/` so it covers every route: the overview, the
 * resume, the blog index, and anything served outside the `[locale]` tree. The
 * per-article card in `app/[locale]/blog/[slug]/opengraph-image.tsx` overrides it
 * for a post, and Next.js resolves the more specific file first.
 *
 * ## Why the card is rendered in one language
 *
 * This route sits above the `[locale]` segment, so it receives no locale
 * parameter and there is nothing to resolve. Rendering it in the reference
 * locale (`DEFAULT_LOCALE`) is a deliberate choice, not an oversight: a crawler
 * that fetches `/en-us/resume` and a crawler that fetches `/pt-br/resume` are
 * requesting the *same* URL, so the card cannot differ between them without
 * either guessing from a request header or generating two identical routes. The
 * localized card for a post is generated under the locale segment, where the
 * locale is known. The reference catalog is imported directly rather than
 * through `getDictionary` because there is no locale to look up.
 */
export const alt = enUS.og.alt;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

/**
 * ## No network access
 *
 * `ImageResponse` renders in a sandbox with no outbound requests, and the
 * obvious way to get the site's own typography into a card — pointing Satori at
 * the `next/font` families or at a Google Fonts URL — needs one. It is not used.
 *
 * No `fonts` option is passed, so Satori falls back to the single TrueType face
 * that `next/og` itself bundles and loads from its own package directory. Nothing
 * is fetched at build time or at render time, and the build works with no
 * network at all.
 *
 * The cost of that choice is that there is only one weight available, so the
 * hierarchy on the card comes from size, colour and letter-spacing rather than
 * from a bold cut. Every `fontWeight` in `OgImageFrame` is therefore left at the
 * default rather than pretending to a weight the renderer does not have.
 */
export default async function SiteOpenGraphImage() {
  const model = deriveSiteOgImage({
    locale: DEFAULT_LOCALE,
    copy: ogImageCopyFrom(enUS),
    jobTitle: enUS.metadata.jobTitle,
    tagline: enUS.metadata.openGraphDescription,
  });

  return new ImageResponse(<OgImageFrame model={model} />, { ...OG_IMAGE_SIZE });
}
