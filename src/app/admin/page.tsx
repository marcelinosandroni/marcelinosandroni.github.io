import type { Metadata } from "next";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { GetThemeFeedback } from "@/application/feedback/theme-feedback";
import { getThemeFeedbackRepository } from "@/infrastructure/feedback/repository";
import type { FeedbackCounts } from "@/domain/feedback/theme-feedback";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { AdminSignIn } from "@/components/admin/admin-sign-in";
import { ThemeFeedbackPanel } from "@/components/admin/theme-feedback-panel";

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
 *
 * Reading the feedback happens on the server and **only after** the session is
 * confirmed. An unauthenticated request must not reach the repository, or the
 * counts would be readable by anyone who guessed the path.
 */
export default async function AdminPage() {
  const t = await getDictionary(DEFAULT_LOCALE);
  const session = await getOwnerSession();

  if (session === null) {
    return (
      <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
        <AdminSignIn t={t} isConfigured={isAuthEnabled()} />
      </main>
    );
  }

  /*
   * Read here rather than in a client component.
   *
   * The counts are live and the page is `no-store`, so a client fetch would be a
   * second request that arrives after the HTML and shows a spinner. The panel
   * then has nothing to do but render, and the numbers are in the first paint.
   */
  let counts: FeedbackCounts = [];

  try {
    counts = await new GetThemeFeedback(await getThemeFeedbackRepository()).execute();
  } catch {
    /*
     * An unapplied migration or an unreadable table must not take the whole page
     * down. The panel renders "no data yet", which is close enough to the truth
     * to be useful and does not claim a number that was never read.
     */
    counts = [];
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      <section className="border border-border-subtle bg-surface-raised p-space-md">
        <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
        <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
          {t.admin.signedInAs.replace("{email}", session.email)}
        </p>
      </section>

      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <ThemeFeedbackPanel counts={counts} />
      </div>
    </main>
  );
}
