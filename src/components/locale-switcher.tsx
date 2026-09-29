import Link from "next/link";

import { LOCALE_LABELS, getAlternateLocale, toLocaleSegment, type Locale } from "@/domain/i18n";
import { formatMessage, type Dictionary } from "@/i18n";

interface LocaleSwitcherProps {
  locale: Locale;
  t: Dictionary;
}

/**
 * Locale switcher rendered as a real link.
 *
 * Being an anchor (not a button with state) means the target is crawlable,
 * copyable, middle-clickable and prefetched by the router — a full progressive
 * enhancement win over a client-side state toggle.
 */
export function LocaleSwitcher({ locale, t }: LocaleSwitcherProps) {
  const alternate = getAlternateLocale(locale);
  const target = LOCALE_LABELS[alternate];

  return (
    <Link
      className="language tap-target"
      href={`/${toLocaleSegment(alternate)}`}
      hrefLang={alternate}
      aria-label={formatMessage(t.localeSwitcher.switchTo, { language: target.endonym })}
    >
      {target.short} <span aria-hidden="true">↗</span>
    </Link>
  );
}
