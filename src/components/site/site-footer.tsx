import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { toWhatsAppHref } from "@/domain/portfolio";
import { COPYRIGHT_YEAR, SITE_VERSION } from "@/domain/site/site-info";
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
 * Renders the localized footer block from the home configuration, so the
 * columns are editable data rather than markup. External links get
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
                className="text-primary-container underline-offset-4 hover:underline"
              >
                {email}
              </a>
              <a
                href={toWhatsAppHref(phone)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-space-xs text-secondary underline-offset-4 hover:underline"
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

            <p className="font-label-mono text-label-mono text-text-muted">
              © {COPYRIGHT_YEAR} · {t.footer.versionedResume} · v{SITE_VERSION} · {footer.legalNote}
            </p>
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
    "flex items-center gap-space-xs font-body-sm text-body-sm text-text-secondary transition-colors hover:text-primary-container";

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
