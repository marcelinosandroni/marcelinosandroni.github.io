import type { Metadata } from "next";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { AdminSignIn } from "@/components/admin/admin-sign-in";

/**
 * Never indexable. A private area that a search engine can read the existence of
 * is a private area with a discoverability problem.
 */
export const metadata: Metadata = {
  title: "Owner",
  robots: { index: false, follow: false },
};

/**
 * Owner area.
 *
 * The guard is **server-side** and `getOwnerSession` re-derives authorisation
 * from the allowlist on every request, so a session that was valid before
 * `ADMIN_EMAIL` changed stops working immediately. A client-side check would be
 * a suggestion, not a boundary: the page is static output that anyone can read
 * from the HTML.
 */
export default async function AdminPage() {
  const t = await getDictionary(DEFAULT_LOCALE);
  const session = await getOwnerSession();

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      {session === null ? (
        <AdminSignIn t={t} isConfigured={isAuthEnabled()} />
      ) : (
        <section className="border border-border-subtle bg-surface-raised p-space-md">
          <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
          <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
            {t.admin.signedInAs.replace("{email}", session.email)}
          </p>
        </section>
      )}
    </main>
  );
}

