import type { Metadata } from "next";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { homePath } from "@/domain/site/routes";
import { getDictionary } from "@/i18n";
import "./globals.css";

/**
 * Global 404 for URLs that match no route at all (for example `/fr`).
 *
 * Because the root layout lives under the `[locale]` dynamic segment, Next.js
 * cannot compose a 404 from `layout` + `not-found`, so this convention is used
 * instead. It bypasses the normal rendering, therefore it declares its own
 * `<html>`/`<body>` and imports the global stylesheet itself. The font variables
 * are not applied here, so the type tokens fall back to the system stacks
 * declared in `globals.css`.
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
        <main className="flex min-h-screen items-center bg-surface-base">
          <div className="mx-auto w-full max-w-[1320px] px-margin py-space-3xl">
            <div className="max-w-2xl space-y-space-lg">
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
                [SYS_ERR] 404
              </span>
              <h1 className="font-display-hero text-display-hero-mobile font-extrabold tracking-tight text-text-primary md:text-display-hero">
                {t.notFound.title}
              </h1>
              <p className="font-body-lg text-body-lg text-text-secondary">
                {t.notFound.description}
              </p>
              <Link className="button button-primary" href={homePath(DEFAULT_LOCALE)}>
                {t.notFound.backHome}
                <Icon name="arrow-right" size={18} />
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
