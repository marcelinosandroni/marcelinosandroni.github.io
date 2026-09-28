import type { Metadata } from "next";
import Link from "next/link";

import { DEFAULT_LOCALE, LOCALE_SEGMENTS } from "@/domain/i18n";
import { getDictionary } from "@/i18n";
import "./globals.css";

/**
 * Global 404 for URLs that match no route at all (for example `/fr` or
 * `/en-us/unknown`).
 *
 * Because the root layout lives under the `[locale]` dynamic segment, Next.js
 * cannot compose a 404 from `layout` + `not-found`, so this convention is used
 * instead. It bypasses the normal rendering, therefore it declares its own
 * `<html>`/`<body>` and imports the global stylesheet itself.
 *
 * Rendered in the default locale since no locale could be resolved.
 */
export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: false },
};

export default async function GlobalNotFound() {
  const t = await getDictionary(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
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
      </body>
    </html>
  );
}
