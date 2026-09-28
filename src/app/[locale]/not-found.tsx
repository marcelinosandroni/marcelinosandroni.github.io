import Link from "next/link";

import { DEFAULT_LOCALE, LOCALE_SEGMENTS } from "@/domain/i18n";
import { getDictionaryForRoute } from "@/i18n";

/**
 * 404 boundary for `notFound()` raised inside a valid locale segment (for
 * example `/en-us/anything`). Top-level unmatched paths never reach this file
 * and are served by `app/global-not-found.tsx`.
 */
export default async function LocaleNotFound() {
  const t = await getDictionaryForRoute();

  return (
    <main className="section shell">
      <div className="section-heading">
        <span className="section-number">404</span>
        <h1>{t.notFound.title}</h1>
        <p>{t.notFound.description}</p>
      </div>
      <div className="hero-actions">
        <Link className="button button-primary" href={`/${LOCALE_SEGMENTS[DEFAULT_LOCALE]}`}>
          {t.notFound.backHome} <span>↗</span>
        </Link>
      </div>
    </main>
  );
}
