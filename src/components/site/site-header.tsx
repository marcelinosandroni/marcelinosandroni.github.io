import Link from "next/link";

import { HeaderThemeControl } from "@/components/theme/header-theme-control";
import { SoundtrackToggle } from "@/components/audio/soundtrack-toggle";
import { ScrollHeaderState } from "@/components/site/scroll-header-state";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AdminLock } from "@/components/admin/admin-lock";
import { localePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";
import type { Dictionary } from "@/i18n";

export interface SiteHeaderProps {
  locale: Locale;
  t: Dictionary;
  sections: Array<{ key: string; href: string; label: string }>;
}

/**
 * Sticky glass navigation rail (DESIGN.md §6).
 *
 * ## Why the controls got borders
 *
 * The theme, soundtrack, owner and language controls were bare glyphs in muted
 * text with no border and, in the owner's case, at half opacity. Asked to make
 * them "look clickable", the honest answer is that they did not look like
 * anything: a low-contrast glyph on a translucent sticky bar reads as decoration
 * until you try it, and the owner's link at `opacity-50` read as *disabled*.
 *
 * They are now uniform: a bordered, full-contrast control with a hover and a
 * focus state, at the same size, in the same order, next to each other. A row of
 * identical controls is legible as a group of controls, which is the thing that
 * was missing.
 *
 * Exactly one `<nav>` element carries the `mainNavigation` label: the mobile and
 * desktop arrangements are the same element, so duplicating the landmark for two
 * layouts would give a screen reader two navigation regions to choose between.
 *
 * Section links are plain fragment anchors, so in-page navigation works before
 * hydration and survives a JavaScript failure.
 */
export function SiteHeader({ locale, t, sections }: SiteHeaderProps) {
  return (
    <header
      id="site-header"
      className="site-header sticky top-0 z-50 border-b border-border-subtle bg-surface-base/82 backdrop-blur-xl"
    >
      <div className="mx-auto w-full max-w-[1320px] px-margin md:px-margin-tablet lg:px-margin-desktop">
        {/*
          The header is two rows on a phone and one from tablet up.

          Sharing a single row put the brand, six nav labels and four controls into
          390px, which left room for two of the six labels and cut the rest off
          mid-word. Wrapping the nav onto its own full-width row is the honest
          arrangement: the reader sees most of the navigation, and the remainder
          scrolls with a visible fade instead of being silently truncated.
        */}
        <div className="site-header__row flex flex-wrap items-center gap-x-space-md gap-y-1 py-2 md:h-16 md:flex-nowrap md:gap-space-md md:py-0">
          <Link
            href={localePath(locale, "home")}
            /*
              `site-header__brand` so the compact state can step the type down.
              The size is a token, not a literal — the compact rule reaches for a
              token too, and a pair of loose rem values would drift the moment
              either scale changed.
            */
            className="site-header__brand shrink-0 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary"
            aria-label={t.nav.backToTop}
          >
            MSD<span className="text-primary-container">.</span>
          </Link>

          {/*
            `ml-auto` pushes the controls right on the phone's first row, and
            `md:order-last` keeps them after the nav on one row from tablet up.
          */}
          <div className="ml-auto flex shrink-0 items-center gap-space-xs md:order-last">
            <SoundtrackToggle labels={t.soundtrack} />
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

      {/*
        Renders nothing. Exists to watch the scroll position and set
        `data-compact` on the header above, which is what lets the header stay a
        Server Component instead of becoming a client island for one boolean.
      */}
      <ScrollHeaderState headerId="site-header" />
    </header>
  );
}
