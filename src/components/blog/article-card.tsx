import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { ACCENT_TEXT } from "@/components/ui/icon";
import { articlePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { ArticleCategory, ArticleSummary } from "@/domain/blog";
import { formatArticleDate, toDateTimeAttribute } from "@/infrastructure/format/format-date";
import type { Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

/**
 * Localised category labels.
 *
 * Categories are a closed enum in the domain and therefore a closed set of
 * strings here — an exhaustive `satisfies` record, so adding a category to the
 * domain without a label in both catalogs is a build error.
 */
const CATEGORY_LABELS = {
  "distributed-systems": {
    "en-US": "Distributed Systems",
    "pt-BR": "Sistemas Distribuídos",
  },
  "data-platforms": {
    "en-US": "Data Platforms",
    "pt-BR": "Plataformas de Dados",
  },
  leadership: {
    "en-US": "Leadership",
    "pt-BR": "Liderança",
  },
  "ai-ml": {
    "en-US": "AI & ML",
    "pt-BR": "IA & ML",
  },
  fintech: {
    "en-US": "Fintech",
    "pt-BR": "Fintech",
  },
} as const satisfies Record<ArticleCategory, Record<Locale, string>>;

export function categoryLabel(category: ArticleCategory, locale: Locale): string {
  return CATEGORY_LABELS[category][locale];
}

export interface ArticleCardProps {
  article: ArticleSummary;
  locale: Locale;
  t: Dictionary;
  /** `featured` promotes the card to a two-column layout in the index. */
  featured?: boolean;
}

/**
 * Article card (DESIGN.md §8.4/§8.5).
 *
 * The whole surface is the hit target via a stretched link, so a recruiter does
 * not have to hit the 18px title text. The metadata row is mono and muted, the
 * title is the only headline, and the publication date is a real `<time>` element
 * with a machine-readable value.
 */
export function ArticleCard({ article, locale, t, featured = false }: ArticleCardProps) {
  return (
    <article
      className={`group relative flex flex-col justify-between rounded-xl border border-border-subtle bg-surface-raised p-space-xl transition-colors duration-300 hover:bg-surface-raised/80 ${
        featured ? "md:col-span-2" : ""
      }`}
    >
      <div className="space-y-space-sm">
        <div className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs font-label-mono text-label-mono text-text-muted">
          <span className="font-bold uppercase text-primary-container">
            {categoryLabel(article.category, locale)}
          </span>
          <span>{formatMessage(t.blog.readingTime, { minutes: article.readingTimeMinutes })}</span>
          <time dateTime={toDateTimeAttribute(article.publishedAt)}>
            {formatArticleDate(locale, article.publishedAt)}
          </time>
        </div>

        <h3 className="font-headline-md text-headline-md text-text-primary">
          <Link
            href={articlePath(locale, article.slug)}
            data-click="blog-article"
            className="transition-colors after:absolute after:inset-0 hover:text-primary-container"
          >
            {article.title}
          </Link>
        </h3>

        <p className="max-w-3xl font-body-sm text-body-sm text-text-secondary">
          {article.excerpt}
        </p>

        {article.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5 pt-space-xs">
            {article.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-border-subtle bg-surface-overlay px-2 py-0.5 font-label-mono text-[10px] uppercase text-text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-between pt-space-md font-label-mono text-label-mono ${ACCENT_TEXT.primary}`}
      >
        <span>{t.blog.allArticles}</span>
        <Icon
          name="arrow-right"
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </div>
    </article>
  );
}
