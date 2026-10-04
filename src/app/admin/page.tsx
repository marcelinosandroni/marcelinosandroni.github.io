import type { Metadata } from "next";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { GetThemeFeedback } from "@/application/feedback/theme-feedback";
import { getThemeFeedbackRepository } from "@/infrastructure/feedback/repository";
import type { FeedbackCounts } from "@/domain/feedback/theme-feedback";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { AdminSignIn } from "@/components/admin/admin-sign-in";
import { ThemeFeedbackPanel } from "@/components/admin/theme-feedback-panel";
import { PostEditor } from "@/components/admin/post-editor";
import { ChatConsole } from "@/components/admin/chat-console";
import { ListOnlineVisitors } from "@/application/presence/track-visitors";
import type { PresenceBoard } from "@/application/presence/track-visitors";
import { ListConversations } from "@/application/chat/conversation";
import { createPresenceRealtime } from "@/infrastructure/supabase/presence-realtime";
import type { ConversationSummary } from "@/domain/chat/message";
import { ListPosts } from "@/application/blog/manage-posts";
import type { PostSummary } from "@/domain/blog/post-draft";
import { getPostRepository } from "@/infrastructure/repositories";

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

  /*
   * The post list is read on the server for the same reason, and with one extra
   * consequence: the editor then refetches only after a mutation, so there is no
   * fetch-on-mount effect to cascade a render after hydration.
   *
   * Unlike the counts, a failure here is reported rather than rendered as an
   * empty list. "You have written nothing" and "the CMS is broken" need opposite
   * reactions, and a CMS that looked empty would be indistinguishable from a
   * fresh one.
   */
  let postList: PostSummary[] | null = null;

  try {
    const repository = getPostRepository();

    postList =
      repository === null
        ? null
        : await new ListPosts(repository).execute();
  } catch {
    postList = null;
  }

  /*
   * The presence board, read on the server for the same reason as the two lists
   * above and with one extra consequence: the console then polls only, so there is
   * no fetch-on-mount effect to cascade a render after hydration.
   *
   * Like the counts and unlike the post list, a failure is rendered as an empty
   * state rather than reported as an error — but "nobody is online" and "the
   * presence table is unreadable" are different facts, so the console is handed
   * `null` and says the second one itself. That is the PostEditor's arrangement
   * inverted on purpose: an empty visitor list is a plausible reading of a working
   * site, so claiming it would be a guess.
   */
  let board: PresenceBoard | null = null;
  let conversationList: ReadonlyArray<ConversationSummary> | null = null;

  try {
    const realtime = createPresenceRealtime();

    if (realtime !== null) {
      [board, conversationList] = await Promise.all([
        new ListOnlineVisitors(realtime.presence).execute(),
        new ListConversations(realtime.chat).execute(),
      ]);
    }
  } catch {
    board = null;
    conversationList = null;
  }

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      <section className="border border-border-subtle bg-surface-raised p-space-md">
        <h1 className="font-headline-sm text-headline-sm text-text-primary">{t.admin.signInTitle}</h1>
        <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
          {t.admin.signedInAs.replace("{email}", session.email)}
        </p>

        {/*
          Only when the session was granted by `ADMIN_AUTH_BYPASS`, and the reason it
          is a banner rather than a console warning is that it has to survive the thing
          it is warning about: a person who walks away from a local server and comes
          back to a Vercel preview built from the same branch. On screen, in the
          payload, in the screenshot they might paste into an issue.

          `role="status"` rather than `alert`: this is not an error, it is a statement
          about the deployment, and an assertive announcement on every page load would
          interrupt whatever the owner was already doing.
        */}
        {session.bypassed ? (
          <div
            role="status"
            className="mt-space-md border border-primary-container bg-surface-base p-space-sm"
          >
            <p className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {t.admin.bypassTitle}
            </p>
            <p className="mt-1 text-body-sm text-body-sm text-text-secondary">
              {t.admin.bypassBody}
            </p>
          </div>
        ) : null}
      </section>

      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <ThemeFeedbackPanel counts={counts} />
      </div>

      {/*
        Rendered only after the session is confirmed — the early return above
        handles the unauthenticated case — so an anonymous request never receives
        a post title, a slug or a status in its payload.
      */}
      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <PostEditor t={t} locale={DEFAULT_LOCALE} initialPosts={postList} />
      </div>

      {/*
        Last, and for the same reason: a session id and a last-seen time are the
        only things in this section, and they are the owner's. Rendered after the
        CMS so the writing surface — the thing an owner opens this page for — is
        still the first thing below the sign-in header.
      */}
      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <ChatConsole
          /*
           * `agentNotice` is composed rather than declared twice.
           *
           * The owner and the visitor have to read the *same* words over an
           * automated message — two catalogs holding two versions of a sentence
           * that exists to say "this is not a person" is exactly the kind of drift
           * that eventually produces a machine calling itself a colleague. So the
           * label lives in the visitor's catalog, where it is written, and the
           * console borrows it.
           */
          labels={{ ...t.admin.chat, agentNotice: t.chat.agentNotice }}
          initialBoard={board}
          initialConversations={conversationList}
        />
      </div>
    </main>
  );
}
