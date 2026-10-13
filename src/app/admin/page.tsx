import type { Metadata } from "next";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { GetThemeFeedback } from "@/application/feedback/theme-feedback";
import { getThemeFeedbackRepository } from "@/infrastructure/feedback/repository";
import type { FeedbackCounts } from "@/domain/feedback/theme-feedback";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/domain/i18n";
import { AdminSignIn } from "@/components/admin/admin-sign-in";
import { DatabaseStatusPanel } from "@/components/admin/database-status-panel";
import {
  databaseStatusClient,
  readDatabaseStatus,
  type DatabaseStatus,
} from "@/infrastructure/supabase/database-status";
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
import { getPostRepository, readTechnologyCatalog } from "@/infrastructure/repositories";
import { TechStackEditor } from "@/components/admin/tech-stack-editor";
import { TechnologyCatalogEditor } from "@/components/admin/technology-catalog-editor";
import { StackProfileEditor } from "@/components/admin/stack-profile-editor";
import { ExperienceEditor } from "@/components/admin/experience-editor";
import { JobMatchPanel } from "@/components/admin/job-match-panel";
import type {
  StackProfileSummary,
  TechnologyCatalog,
} from "@/domain/resume/resume-repository";
import {
  readStackForEditor,
  readStackProfileEditor,
  readExperienceEditor,
  type EditorCluster,
  type ExperienceEditorDocument,
} from "@/infrastructure/repositories/resume-writer";

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
  /*
    The tech stack, read on the server for the same reason as the post list.

    `null` means "this deployment has no database", which is a different fact
    from "the stack is empty" — so the two are kept apart rather than collapsed,
    and the editor says which one it is instead of rendering an empty form that
    looks like the owner deleted everything.
  */
  let stack: EditorCluster[] | null = null;

  try {
    stack = await readStackForEditor(DEFAULT_LOCALE);
  } catch {
    stack = null;
  }

  /*
    The technology catalog, read separately from the stack above.

    Two different things that used to look like one. The stack is what the home
    page *shows* — four clusters of chips, curated for a first impression. The
    catalog is what a tool *is* — one entity per tool, which the roles, the
    bullets, the skills and the job matcher all point at.

    The catalog is read through the repository rather than a writer helper
    because it is the one read here that has no fallback: see
    `VersionedResumeRepository.readTechnologyCatalog`. `null` therefore means
    "needs the database", and the panel says exactly that rather than rendering
    an empty catalog, which would read as "you have no technologies".
  */
  let catalog: TechnologyCatalog | null = null;

  try {
    catalog = await readTechnologyCatalog(DEFAULT_LOCALE);
  } catch {
    catalog = null;
  }

  /*
    The experience editor, read with the catalog rather than separately.

    They travel together because the editor's job is to attach the catalog to
    the document: a bullet list built from one moment and a technology list from
    another produce a chip that cannot be untagged, because the option it refers
    to had not loaded. One read, one consistent snapshot.
  */
  let experienceDocument: ExperienceEditorDocument | null = null;

  try {
    experienceDocument = await readExperienceEditor(DEFAULT_LOCALE);
  } catch {
    experienceDocument = null;
  }

  /*
    The profiles, read alongside the catalog rather than after it.

    The editor's job is to move technologies between a profile's two lists, so it
    needs both in the same render: fetched apart, a picker could offer a tool the
    profile already lists, and the owner would toggle it and watch nothing
    change.
  */
  let profiles: StackProfileSummary[] | null = null;

  try {
    profiles = await readStackProfileEditor(DEFAULT_LOCALE);
  } catch {
    profiles = null;
  }

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

  /*
    The database status, read after the session is confirmed and with the same
    "a diagnostic must not take the page down" arrangement as the three reads above.

    "Not configured" and "unreachable" are kept apart, because they are different
    failures with different fixes: the first is two environment variables, the second
    is the network or the project being paused.
   */
  let database: DatabaseStatus = { reachable: false, reason: "the status was not read" };

  try {
    const client = databaseStatusClient();

    if ("reason" in client) {
      database = { reachable: false, reason: client.reason };
    } else {
      database = await readDatabaseStatus(client.client);
    }
  } catch {
    database = { reachable: false, reason: "the status could not be read" };
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

      {/*
        Before the feedback panel, and for the same reason the CMS is first below the
        header: this is the question an owner opens the page to answer — is what
        stored here the same as what I just deployed — and the feedback counts are
        the thing they look at second.
      */}
      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <DatabaseStatusPanel status={database} />
      </div>

      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <ThemeFeedbackPanel counts={counts} />
      </div>

      {/*
        Rendered only after the session is confirmed — the early return above
        handles the unauthenticated case — so an anonymous request never receives
        a post title, a slug or a status in its payload.
      */}
      {/*
        Before the CMS, because the tech stack is what actually changes: a new
        tool, a dropped one, a chip that belongs on the résumé and not on the
        summary. The blog is written on the order of a month; this is edited on
        the order of a week.
      */}
      {stack === null ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <p className="text-body-sm text-body-sm text-text-secondary">
            The tech stack editor needs Supabase. Run <code>npm run db:setup</code> locally, or
            set the deployment&apos;s Supabase variables.
          </p>
        </div>
      ) : (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <TechStackEditor initialClusters={stack} locale={DEFAULT_LOCALE} />
        </div>
      )}

      {/*
        Before the stack editor, not after: the catalog is what the chips and the
        roles are *made of*, so it is the thing you fix when a chip is wrong. An
        owner who opens this page to add a tool should not have to scroll past
        the thing they were about to add.
      */}
      {experienceDocument === null ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <p className="text-body-sm text-body-sm text-text-secondary">
            The experience editor needs the database. Run <code>npm run db:migrate</code> and{" "}
            <code>npm run db:bootstrap</code> locally.
          </p>
        </div>
      ) : (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <ExperienceEditor
            initialDocument={experienceDocument}
            locale={DEFAULT_LOCALE}
          />
        </div>
      )}

      {catalog === null ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <p className="text-body-sm text-body-sm text-text-secondary">
            The technology catalog needs the database. Run <code>npm run db:migrate</code> to
            create it, then <code>npm run db:bootstrap</code> to fill it from the existing résumé.
          </p>
        </div>
      ) : (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <TechnologyCatalogEditor initialCatalog={catalog} locale={DEFAULT_LOCALE} />

          {profiles === null ? (
            <p className="mt-space-md text-body-sm text-text-secondary">
              The stack profiles need the database too — they reference technologies by slug.
            </p>
          ) : (
            <div className="mt-space-lg border-t border-border-subtle pt-space-md">
              <StackProfileEditor
                initialProfiles={profiles}
                catalog={catalog.technologies}
                categories={catalog.categories}
                locale={DEFAULT_LOCALE}
              />
            </div>
          )}
        </div>
      )}

      {/*
    After the editors and before the CMS.

    It reads what the experience editor writes, so it sits below it: the panel
    is only as good as the tagging above it, and an owner who has just tagged
    bullets wants to see what they are now worth on a real posting.
  */}
      <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
        <JobMatchPanel locale={DEFAULT_LOCALE} />
      </div>

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
