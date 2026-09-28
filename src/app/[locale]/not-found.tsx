import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { homePath } from "@/domain/site/routes";
import { getDictionaryForRoute, requireLocaleForRoute } from "@/i18n";

/**
 * 404 boundary for `notFound()` raised inside a valid locale segment (for
 * example `/en-us/unknown` or an unpublished article). Top-level unmatched paths
 * never reach this file and are served by `app/global-not-found.tsx`.
 *
 * Rendered in the same design language as the rest of the site, because a 404 is
 * still a first impression — frequently the very first one.
 */
export default async function LocaleNotFound() {
  const [t, locale] = await Promise.all([getDictionaryForRoute(), requireLocaleForRoute()]);

  return (
    <main className="flex min-h-screen items-center bg-surface-base">
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-3xl md:px-margin-tablet lg:px-margin-desktop">
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
          <Link className="button button-primary" href={homePath(locale)}>
            {t.notFound.backHome}
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
