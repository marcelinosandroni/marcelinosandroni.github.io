import type { Metadata } from "next";

import { getOwnerSession } from "@/infrastructure/auth/owner-session";
import { GetThemeFeedback } from "@/application/feedback/theme-feedback";
import { getThemeFeedbackRepository } from "@/infrastructure/feedback/repository";
import type { FeedbackCounts } from "@/domain/feedback/theme-feedback";
import { getDictionary } from "@/i18n";
import { DEFAULT_LOCALE } from "@/domain/i18n";
// AdminSignIn removed: unauthenticated case handled by AdminDashboard's parent.
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  databaseStatusClient,
  readDatabaseStatus,
  type DatabaseStatus,
} from "@/infrastructure/supabase/database-status";
import { ListOnlineVisitors } from "@/application/presence/track-visitors";
import type { PresenceBoard } from "@/application/presence/track-visitors";
import { ListConversations } from "@/application/chat/conversation";
import { createPresenceRealtime } from "@/infrastructure/supabase/presence-realtime";
import type { ConversationSummary } from "@/domain/chat/message";
import { ListPosts } from "@/application/blog/manage-posts";
import type { PostSummary } from "@/domain/blog/post-draft";
import {
  getPostRepository,
  readResumeSource,
  readTechnologyCatalog,
  type ResumeSourceReport,
} from "@/infrastructure/repositories";
import {
  readStackForEditor,
  readStackProfileEditor,
  readExperienceEditor,
  readVariantList,
  type EditorCluster,
  type ExperienceEditorDocument,
} from "@/infrastructure/repositories/resume-writer";
import type {
  StackProfileSummary,
  TechnologyCatalog,
} from "@/domain/resume/resume-repository";

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
        <p className="text-body-sm text-text-secondary">
          Sign in required. Configure <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> or use{" "}
          <code>ADMIN_AUTH_BYPASS=1</code> for local development.
        </p>
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
    "needs the database", and the panel says exactly that rather than rendering an
    empty catalog, which would read as "you have no technologies".
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
    The CV variants, read alongside the experience editor. They are the same
    document of record in a different shape: a variant argues for one stack
    rather than all of them, but it is built from the same experience, the
    same education and the same contact details. Reading them together means
    the admin sees one consistent picture.
  */
  let variants: ReadonlyArray<{
    id: string;
    slug: string;
    label: string;
    title: string;
    headline: string;
  }> = [];

  try {
    const result = await readVariantList(DEFAULT_LOCALE);

    if (result !== null) {
      variants = result;
    }
  } catch {
    variants = [];
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

  /*
    Which adapter served the résumé, read through the same path a visitor takes.

    Not derived from `isSupabaseContentConfigured` and not derived from
    `database` above. Both of those are true statements about the environment
    that stay true when the database is reachable and the document still comes
    from the shipped catalog — a URL without `/rest/v1`, a paused project, a migration
    run without its bootstrap. The deployment once spent a stretch serving the
    shipped catalog while the panel above said CONNECTED, which is why the
    question is asked of the repository instead of the configuration.
  */
  let resumeSource: ResumeSourceReport | null = null;

  try {
    resumeSource = await readResumeSource(DEFAULT_LOCALE);
  } catch {
    resumeSource = null;
  }

  return (
    <AdminDashboard
      t={t}
      sessionEmail={session.email}
      bypassed={session.bypassed}
      bypassTitle={t.admin.bypassTitle}
      bypassBody={t.admin.bypassBody}
      counts={counts}
      postList={postList}
      stack={stack}
      catalog={catalog}
      profiles={profiles}
      experienceDocument={experienceDocument}
      variants={variants}
      board={board}
      conversationList={conversationList}
      database={database}
      resumeSource={resumeSource}
    />
  );
}
