import Link from "next/link";

import { Section } from "@/components/ui";
import { ACCENT_TEXT, Icon } from "@/components/ui/icon";
import { toLocaleSegment, type Locale } from "@/domain/i18n";
import type { HomeBlogSection } from "@/domain/portfolio";
import type { Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

export interface BlogPreviewSectionProps {
  section: HomeBlogSection;
  locale: Locale;
  t: Dictionary;
}

/**
 * Blog teaser band.
 *
 * `limit` is honoured here rather than in the data so the same configuration
 * serves a wide desktop grid and a narrow mobile column. Each card is a real
 * link with the whole surface as the hit target, and the reading time is
 * formatted through the message catalog so it is translated.
 */
export function BlogPreviewSection({ section, locale, t }: BlogPreviewSectionProps) {
  const segment = toLocaleSegment(locale);
  const items = section.limit > 0 ? section.items.slice(0, section.limit) : section.items;

  return (
    <Section id={section.id}>
      <div className="space-y-space-xl">
        <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
          <div>
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {section.kicker}
            </span>
            <h2
              id={`${section.id}-heading`}
              className="mt-space-xs font-headline-lg text-headline-lg text-text-primary"
            >
              {section.title}
            </h2>
          </div>
          <Link
            href={`/${segment}/blog`}
            className="inline-flex shrink-0 items-center gap-space-xs font-label-mono text-label-mono text-primary-container transition-colors hover:text-text-primary"
          >
            {section.ctaLabel}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.slug}
              className="group relative flex flex-col justify-between rounded-xl bg-surface-raised p-space-xl transition-colors duration-300 hover:bg-surface-raised/80"
            >
              <div className="space-y-space-sm">
                <div className="flex items-center justify-between font-label-mono text-label-mono text-text-muted">
                  <span className={`font-bold ${ACCENT_TEXT[item.accent]}`}>{item.category}</span>
                  <span className="text-[10px]">
                    {formatMessage(t.blog.readingTime, { minutes: item.readingTimeMinutes })}
                  </span>
                </div>

                <h3 className="font-headline-sm text-headline-sm text-text-primary">
                  <Link
                    href={`/${segment}/blog/${item.slug}`}
                    className="transition-colors after:absolute after:inset-0 hover:text-primary-container"
                  >
                    {item.title}
                  </Link>
                </h3>

                <p className="font-body-sm text-body-sm text-text-secondary">{item.excerpt}</p>
              </div>

              <div
                className={`flex items-center justify-between pt-space-md font-label-mono text-label-mono ${ACCENT_TEXT[item.accent]}`}
              >
                <span>{item.ctaLabel}</span>
                <Icon
                  name="arrow-right"
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
