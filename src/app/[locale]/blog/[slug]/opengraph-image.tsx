import { ImageResponse } from "next/og";

import { OgImageFrame } from "@/components/og/og-image-frame";
import { ArticleSlug, type BlogArticle } from "@/domain/blog";
import { LOCALE_SEGMENTS, SUPPORTED_LOCALES, toLocale } from "@/domain/i18n";
import {
  OG_IMAGE_SIZE,
  deriveArticleOgImage,
  deriveMissingArticleOgImage,
  ogImageCopyFrom,
} from "@/domain/og/image";
import { getArticle, getListArticles } from "@/infrastructure/repositories";
import { getDictionary } from "@/i18n";
import { enUS } from "@/i18n/dictionaries/en-US";

/**
 * The Open Graph card for one blog article.
 *
 * Colocated with the page, so the file convention makes it the `og:image` for
 * `/[locale]/blog/[slug]` and overrides the site-wide card in
 * `app/[locale]/opengraph-image.tsx`. The resulting
 * `<meta property="og:image">` is absolute because the locale layout declares
 * `metadataBase`, which is `SITE_URL` — the metadata resolution happens in that
 * layout, so no absolute URL is assembled here and none can drift from the
 * canonical origin.
 *
 * `alt` is a config export and therefore static; it cannot be built from the
 * article. It names the surface rather than the post, which is the honest
 * description of an image that may be regenerated for any slug in any locale.
 */
export const alt = enUS.og.articleAlt;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

/**
 * Prerenders a card per article per locale at build time, so a share never waits
 * on a renderer and the build output lists the route. `dynamicParams` is left at
 * its default of `true`, matching the page: an article published after the build
 * still gets a card on first request rather than a 404.
 *
 * Reads through the same composition root as the page, so it resolves to the
 * versioned catalog when Supabase is unconfigured and a credential-less build
 * still succeeds.
 */
export async function generateStaticParams(): Promise<{ locale: string; slug: string }[]> {
  const useCase = await getListArticles();
  const params: { locale: string; slug: string }[] = [];

  for (const locale of SUPPORTED_LOCALES) {
    const articles = await useCase.execute({ locale });

    for (const article of articles) {
      params.push({ locale: LOCALE_SEGMENTS[locale], slug: article.slug });
    }
  }

  return params;
}

export default async function ArticleOpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeSegment, slug } = await params;
  const locale = toLocale(localeSegment);

  /*
   * A crawler has no way to distinguish "unpublished", "not in this language"
   * and "not a slug at all", and it will ask for the image anyway. Every one of
   * them renders the same fallback card with a 200 rather than throwing: a 500
   * here makes the platform drop the preview entirely, whereas a card that
   * names the slug is still a usable preview of a page that is genuinely gone.
   */
  if (!locale || !ArticleSlug.isValid(slug)) {
    return render(
      deriveMissingArticleOgImage(
        { copy: ogImageCopyFrom(enUS), tagline: enUS.metadata.openGraphDescription },
        slug,
      ),
    );
  }

  const t = await getDictionary(locale);

  let article: BlogArticle | null = null;

  try {
    article = await (await getArticle()).execute({ locale, slug });
  } catch {
    article = null;
  }

  if (article === null) {
    return render(
      deriveMissingArticleOgImage(
        { copy: ogImageCopyFrom(t), tagline: t.metadata.openGraphDescription },
        slug,
      ),
    );
  }

  /*
   * The article is passed whole and the derivation is defensive about it. That is
   * not paranoia about the typed shape: this row came out of a database, and the
   * card is generated for whatever is there. A missing date drops the date fact,
   * an absent excerpt drops the subtitle, a category this build has no
   * translation for falls back to its slug, and only a title long enough to
   * overflow the card is cut.
   */
  return render(deriveArticleOgImage({ locale, copy: ogImageCopyFrom(t), article }));
}

function render(model: ReturnType<typeof deriveArticleOgImage>) {
  return new ImageResponse(<OgImageFrame model={model} />, { ...OG_IMAGE_SIZE });
}
