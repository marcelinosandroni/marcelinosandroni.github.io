import Link from "next/link";

import { HeaderThemeControl } from "@/components/theme/header-theme-control";
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
        {/*
         * The header is two rows on a phone and one from tablet up.
         *
         * Sharing a single row put the brand, six nav labels and two controls
         * into 390px, which left room for two of the six labels and cut the rest
         * off mid-word. Wrapping the nav onto its own full-width row is the
         * honest arrangement: the reader sees most of the navigation, and the
         * remainder scrolls with a visible fade instead of being silently
         * truncated.
         */}
        <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 py-2 md:h-16 md:flex-nowrap md:gap-space-md md:py-0">
          <Link
            href={localePath(locale, "home")}
            className="shrink-0 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary"
            aria-label={t.nav.backToTop}
          >
            MSD<span className="text-primary-container">.</span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-space-xs md:order-last">
            <HeaderThemeControl />
            <AdminLock t={t} />
            <LocaleSwitcher locale={locale} t={t} />
          </div>

          <nav
            aria-label={t.nav.mainNavigation}
            /*
             * `order-last` plus `w-full` puts the nav on the second row while
             * `md:` restores the single-row arrangement. The mask fades the
             * trailing edge so the scroller reads as scrollable rather than as a
             * label that got cut off.
             */
            className="nav-scroller order-last -mx-1 flex w-full min-w-0 items-center gap-space-md overflow-x-auto px-1 md:order-none md:w-auto md:flex-1 md:justify-center md:gap-space-lg"
          >
            {sections.map((section) => (
              <Link
                key={section.key}
                href={section.href}
                className="tap-target shrink-0 scroll-mx-1 whitespace-nowrap font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:text-primary-container"
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
