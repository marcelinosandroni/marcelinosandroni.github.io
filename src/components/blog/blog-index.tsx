import Link from "next/link";

import { ArticleCard } from "@/components/blog/article-card";
import { Icon } from "@/components/ui/icon";
import { homePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { ArticleSummary } from "@/domain/blog";
import type { Dictionary } from "@/i18n";

export interface BlogIndexProps {
  articles: ArticleSummary[];
  locale: Locale;
  t: Dictionary;
}

/**
 * Blog index.
 *
 * Server-rendered from the repository, so the full list is in the HTML and the
 * page is indexable and readable with JavaScript disabled. An empty catalog
 * renders an explicit empty state rather than a blank grid — a blog that silently
 * shows nothing reads as a broken site.
 */
export function BlogIndex({ articles, locale, t }: BlogIndexProps) {
  return (
    <div className="space-y-space-2xl">
      <header className="space-y-space-md">
        <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
          {t.blog.indexKicker}
        </span>
        <h1 className="max-w-3xl font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero">
          {t.blog.indexTitle}
        </h1>
        <p className="max-w-2xl font-body-lg text-body-lg text-text-secondary">
          {t.blog.indexSubtitle}
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-raised p-space-2xl text-center">
          <p className="font-headline-sm text-headline-sm text-text-primary">
            {t.blog.emptyTitle}
          </p>
          <p className="mt-space-sm font-body-sm text-body-sm text-text-secondary">
            {t.blog.emptyDescription}
          </p>
          <Link href={homePath(locale)} className="button button-quiet mt-space-lg">
            <Icon name="arrow-back" size={18} />
            {t.resume.backToOverview}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
          {articles.map((article, index) => (
            <ArticleCard
              key={article.slug}
              article={article}
              locale={locale}
              t={t}
              featured={index === 0 && articles.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
