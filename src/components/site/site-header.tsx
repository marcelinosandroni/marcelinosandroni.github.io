import Link from "next/link";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { AdminLock } from "@/components/admin/admin-lock";
import { localePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { Dictionary } from "@/i18n";

export interface SiteHeaderProps {
  locale: Locale;
  t: Dictionary;
  /**
   * Navigation targets. `href` is resolved by the caller — the caller knows which
   * entries are in-page anchors and which are separate documents, so the header
   * stays a pure renderer and no route string is duplicated here.
   */
  sections: { key: string; label: string; href: string }[];
}

/**
 * Sticky glass navigation rail (DESIGN.md §6).
 *
 * Exactly one `<nav>` element carries the `mainNavigation` label: the mobile and
 * desktop arrangements are the same element with responsive layout, so assistive
 * technology and the e2e suite see a single landmark rather than two.
 *
 * Section links are plain fragment anchors, so in-page navigation works before
 * hydration and survives a JavaScript failure.
 */
export function SiteHeader({ locale, t, sections }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-base/82 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1320px] px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="flex h-16 items-center justify-between gap-space-md">
          <Link
            href={localePath(locale, "home")}
            className="shrink-0 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary"
            aria-label={t.nav.backToTop}
          >
            MSD<span className="text-primary-container">.</span>
          </Link>

          <nav
            aria-label={t.nav.mainNavigation}
            className="-mx-1 flex min-w-0 flex-1 items-center gap-space-md overflow-x-auto px-1 md:justify-center md:gap-space-lg"
          >
            {sections.map((section) => (
              <Link
                key={section.key}
                href={section.href}
                className="shrink-0 whitespace-nowrap font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:text-primary-container"
              >
                {section.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-space-sm">
            <AdminLock t={t} />
            <LocaleSwitcher locale={locale} t={t} />
          </div>
        </div>
      </div>
    </header>
  );
}
