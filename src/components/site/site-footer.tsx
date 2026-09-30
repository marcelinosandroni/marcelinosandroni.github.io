import Link from "next/link";

import { ClickAnalytics } from "@/components/analytics/click-analytics";
import { SoundtrackToggle } from "@/components/audio/soundtrack-toggle";
import { ThemeControls } from "@/components/theme/theme-controls";

import { Icon } from "@/components/ui/icon";
import { toWhatsAppHref } from "@/domain/portfolio";
import { COPYRIGHT_YEAR, SITE_RELEASE_URL, SITE_VERSION } from "@/domain/site/site-info";
import type { HomeFooter } from "@/domain/portfolio";
import type { Locale } from "@/domain/i18n";
import { toLocaleSegment } from "@/domain/i18n";
import type { Dictionary } from "@/i18n";

export interface SiteFooterProps {
  footer: HomeFooter;
  locale: Locale;
  t: Dictionary;
  /** Email surfaced as the primary contact line. */
  email: string;
  /** WhatsApp number, shown next to the email. */
  phone: string;
}

/**
 * Contact-gateway footer.
 *
 * A Server Component. The theme picker and the feedback prompt are client
 * islands inside it — the prompt's state lives in `ThemeControls`, so this file
 * stays free of hooks and keeps rendering on the server.
 *
 * Columns are editable data rather than markup. External links get
 * `rel="noreferrer noopener"`; internal ones go through `next/link`.
 */
export function SiteFooter({ footer, locale, t, email, phone }: SiteFooterProps) {
  const segment = toLocaleSegment(locale);

  return (
    <footer
      id={footer.id}
      className="w-full border-t border-border-subtle bg-surface-overlay"
      aria-labelledby={`${footer.id}-heading`}
    >
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-2xl md:px-margin-tablet lg:px-margin-desktop lg:py-space-3xl">
        <div className="grid grid-cols-1 gap-space-2xl lg:grid-cols-12">
          <div className="space-y-space-md lg:col-span-6">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {footer.kicker}
            </span>
            <h2
              id={`${footer.id}-heading`}
              className="max-w-xl font-headline-lg text-headline-lg text-text-primary"
            >
              {footer.title}
            </h2>
            <p className="max-w-xl font-body-lg text-body-lg text-text-secondary">
              {footer.narrative}
            </p>
            <div className="flex flex-wrap items-center gap-x-space-lg gap-y-space-sm pt-space-sm font-code-inline text-code-inline">
              <a
                href={`mailto:${email}`}
                className="tap-target text-primary-container underline-offset-4 hover:underline"
              >
                {email}
              </a>
              <a
                href={toWhatsAppHref(phone)}
                target="_blank"
                rel="noreferrer noopener"
                className="tap-target gap-space-xs text-secondary underline-offset-4 hover:underline"
              >
                <Icon name="whatsapp" size={16} />
                {phone}
              </a>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-space-lg lg:col-span-6">
            <div className="grid grid-cols-2 gap-space-lg">
              {footer.columns.map((column) => (
                <nav key={column.id} aria-label={column.title}>
                  <h3 className="font-label-mono text-label-mono uppercase text-text-muted">
                    {column.title}
                  </h3>
                  <ul className="mt-space-md space-y-space-sm">
                    {column.items.map((item) => (
                      <li key={item.id}>
                        <FooterLink
                          href={item.href}
                          localeSegment={segment}
                          external={item.external}
                        >
                          <Icon name={item.icon} size={14} className="shrink-0" />
                          {item.label}
                        </FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-md">
              <p className="font-label-mono text-label-mono text-text-muted">
                {/*
                  The version links to the release that produced it, so the
                  number is a fact the reader can check rather than a claim.
                  `no-underline` because the string sits inside a sentence
                  between two dots; an underline here would read as a new element
                  rather than a detail.
                */}
                © {COPYRIGHT_YEAR} · {t.footer.versionedResume}{" "}
                <a
                  href={SITE_RELEASE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="tap-target-inline no-underline transition-colors hover:text-text-secondary hover:underline"
                >
                  v{SITE_VERSION}
                </a>{" "}
                · {footer.legalNote}
              </p>

              {/*
                The engagement panel lives in the footer rather than floating
                over the page. Fixed to the corner it sat on top of running text
                on a phone — full-bleed paragraphs leave no gutter for a
                floating control — and it is a tool for the owner, not something
                a reader needs mid-article.
              */}
              <ClickAnalytics labels={t.analytics} />
            </div>

                          <ThemeControls
                labels={{
                  caption: t.footer.themeLabel,
                  question: t.feedback.question,
                  keep: t.feedback.keep,
                  unsure: t.feedback.unsure,
                  leave: t.feedback.leave,
                  dismiss: t.feedback.dismiss,
                }}
              />

              {/*
                Beside the theme picker rather than floating over the page, for
                the same reason the analytics panel moved down here: a fixed
                corner control sat on top of running text on a phone. It is also
                a preference, and preferences live with the other preference.
              */}
              <SoundtrackToggle
                labels={{
                  start: t.footer.soundtrack.start,
                  stop: t.footer.soundtrack.stop,
                }}
              />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  localeSegment,
  external,
  children,
}: {
  href: string;
  localeSegment: string;
  external: boolean;
  children: React.ReactNode;
}) {
  const classes =
    "tap-target flex items-center gap-space-xs font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary-container";

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  }

  // Root-relative configured links are locale-prefixed so the footer never
  // bounces a pt-BR reader to an English page.
  const isRootRelative = href.startsWith("/") && !href.startsWith("#");
  const localized = isRootRelative ? `/${localeSegment}${href}` : href;

  return isRootRelative ? (
    <Link href={localized} className={classes}>
      {children}
    </Link>
  ) : (
    <a href={localized} className={classes}>
      {children}
    </a>
  );
}
