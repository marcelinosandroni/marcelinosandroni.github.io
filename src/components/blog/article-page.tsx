import Link from "next/link";

import { ArticleBody } from "@/components/blog/article-body";
import { categoryLabel } from "@/components/blog/article-card";
import { Icon } from "@/components/ui/icon";
import { blogPath, homePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { BlogArticle } from "@/domain/blog";
import { formatArticleDate, toDateTimeAttribute } from "@/infrastructure/format/format-date";
import type { Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

export interface ArticlePageProps {
  article: BlogArticle;
  locale: Locale;
  t: Dictionary;
}

/**
 * Long-form article page.
 *
 * Measure is capped at `max-w-3xl` (DESIGN.md §5.2): a 1320px line length is a
 * design decision for grids and data, not for prose. The reading column sits
 * inside the site container so the sticky header and footer stay aligned with
 * the rest of the site.
 */
export function ArticlePage({ article, locale, t }: ArticlePageProps) {
  return (
    <article className="space-y-space-lg">
      <header className="space-y-space-md">
        <Link
          href={blogPath(locale)}
          className="inline-flex items-center gap-space-xs font-label-mono text-label-mono uppercase text-text-muted transition-colors hover:text-primary-container"
        >
          <Icon name="arrow-back" size={16} />
          {t.blog.backToIndex}
        </Link>

        <span className="block font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
          {categoryLabel(article.category, locale)}
        </span>

        <h1 className="max-w-3xl font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero">
          {article.title}
        </h1>

        <p className="max-w-2xl font-body-lg text-body-lg text-text-secondary">
          {article.excerpt}
        </p>

        <dl className="flex flex-wrap items-center gap-x-space-lg gap-y-space-xs pt-space-sm font-label-mono text-label-mono text-text-muted">
          <div className="flex items-center gap-space-xs">
            <dt>{t.blog.publishedOn}</dt>
            <dd>
              <time
                dateTime={toDateTimeAttribute(article.publishedAt)}
                className="text-text-secondary"
              >
                {formatArticleDate(locale, article.publishedAt)}
              </time>
            </dd>
          </div>

          {article.updatedAt ? (
            <div className="flex items-center gap-space-xs">
              <dt>{t.blog.updatedOn}</dt>
              <dd>
                <time
                  dateTime={toDateTimeAttribute(article.updatedAt)}
                  className="text-text-secondary"
                >
                  {formatArticleDate(locale, article.updatedAt)}
                </time>
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="font-label-mono text-label-mono text-text-muted">
          {formatMessage(t.blog.readingTime, { minutes: article.readingTimeMinutes })}
        </p>
      </header>

      <hr className="border-border-subtle" />

      <ArticleBody blocks={article.body} />

      {article.tags.length > 0 ? (
        <footer className="space-y-space-sm border-t border-border-subtle pt-space-lg">
          <h2 className="font-label-mono text-label-mono uppercase text-text-muted">
            {t.blog.tagsLabel}
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-border-subtle bg-surface-overlay px-2 py-0.5 font-label-mono text-[10px] uppercase text-text-secondary"
              >
                {tag}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}

      <footer className="flex flex-wrap items-center gap-space-md pt-space-sm">
        <Link href={blogPath(locale)} className="button button-quiet">
          <Icon name="arrow-back" size={18} />
          {t.blog.backToIndex}
        </Link>
        <Link href={homePath(locale)} className="button button-quiet">
          {t.resume.backToOverview}
        </Link>
      </footer>
    </article>
  );
}
