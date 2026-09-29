import type { Metadata } from "next";

import { adminGateFromEnv } from "@/domain/admin";
import { auth, isAuthEnabled } from "@/infrastructure/auth/auth";
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
 * The guard is **server-side** and it re-derives authorisation from the
 * allowlist on every request, so a session that was valid before `ADMIN_EMAIL`
 * changed stops working immediately. A client-side check would be a suggestion,
 * not a boundary: the page is static output that anyone can read from the HTML.
 */
export default async function AdminPage() {
  const t = await getDictionary(DEFAULT_LOCALE);
  const gate = adminGateFromEnv();
  const session = isAuthEnabled() ? await auth() : null;

  // Two independent conditions, both required: a valid session *and* an address
  // that is still on the allowlist.
  const isOwner = Boolean(session?.user?.email) && gate.isAllowed(session?.user?.email);

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      {isOwner ? (
        <section className="border border-border-subtle bg-surface-raised p-space-md">
          <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
          <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
            {t.admin.signedInAs.replace("{email}", session?.user?.email ?? "")}
          </p>
        </section>
      ) : (
        <AdminSignIn t={t} isConfigured={isAuthEnabled()} />
      )}
    </main>
  );
}

