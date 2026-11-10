"use client";

import { useState } from "react";

import type { EditorCluster, ExperienceEditorDocument } from "@/infrastructure/repositories/resume-writer";
import type { Dictionary } from "@/i18n/dictionaries/en-US";
import type { StackProfileSummary, TechnologyCatalog } from "@/domain/resume/resume-repository";
import type { PresenceBoard } from "@/application/presence/track-visitors";
import type { ConversationSummary } from "@/domain/chat/message";
import type { PostSummary } from "@/domain/blog/post-draft";
import type { FeedbackCounts } from "@/domain/feedback/theme-feedback";
import type { DatabaseStatus } from "@/infrastructure/supabase/database-status";
import type { ResumeSourceReport } from "@/infrastructure/repositories";

import { AdminNav, type AdminSection } from "@/components/admin/admin-nav";
// AdminSignIn handled in page.tsx for unauthenticated case.
import { DatabaseStatusPanel } from "@/components/admin/database-status-panel";
import { ResumeSourcePanel } from "@/components/admin/resume-source-panel";
import { ThemeFeedbackPanel } from "@/components/admin/theme-feedback-panel";
import { PostEditor } from "@/components/admin/post-editor";
import { ChatConsole } from "@/components/admin/chat-console";
import { TechStackEditor } from "@/components/admin/tech-stack-editor";
import { TechnologyCatalogEditor } from "@/components/admin/technology-catalog-editor";
import { StackProfileEditor } from "@/components/admin/stack-profile-editor";
import { ExperienceEditor } from "@/components/admin/experience-editor";
import { JobMatchPanel } from "@/components/admin/job-match-panel";
import { ResumeVariantEditor } from "@/components/admin/resume-variant-editor";

/**
 * The client-side dashboard that owns the active section.
 *
 * The server component reads everything once and passes it down; this component
 * only decides which panel is visible. That keeps the data fetching on the
 * server (where the credentials are) and the navigation in the browser.
 */
export function AdminDashboard({
  t,
  sessionEmail,
  bypassed,
  bypassTitle,
  bypassBody,
  counts,
  postList,
  stack,
  catalog,
  profiles,
  experienceDocument,
  board,
  conversationList,
  database,
  resumeSource,
  variants,
}: {
  t: Dictionary;
  sessionEmail: string;
  bypassed: boolean;
  bypassTitle: string;
  bypassBody: string;
  counts: FeedbackCounts;
  postList: PostSummary[] | null;
  stack: EditorCluster[] | null;
  catalog: TechnologyCatalog | null;
  profiles: StackProfileSummary[] | null;
  variants: ReadonlyArray<{
    id: string;
    slug: string;
    label: string;
    title: string;
    headline: string;
  }>;
  experienceDocument: ExperienceEditorDocument | null;
  board: PresenceBoard | null;
  conversationList: ReadonlyArray<ConversationSummary> | null;
  database: DatabaseStatus;
  resumeSource: ResumeSourceReport | null;
}): React.ReactElement {
  const [active, setActive] = useState<AdminSection>("overview");

  return (
    <main className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
      <section className="border border-border-subtle bg-surface-raised p-space-md">
        <h1 className="font-headline-sm text-headline-sm text-text-primary">Owner</h1>
        <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
          Signed in as {sessionEmail}
        </p>

        {bypassed ? (
          <div
            role="status"
            className="mt-space-md border border-primary-container bg-surface-base p-space-sm"
          >
            <p className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {bypassTitle}
            </p>
            <p className="mt-1 text-body-sm text-body-sm text-text-secondary">{bypassBody}</p>
          </div>
        ) : null}
      </section>

      <div className="mt-space-lg">
        <AdminNav active={active} onChange={setActive} />
      </div>

      {active === "overview" ? (
        <div className="mt-space-lg space-y-space-md">
          <div className="border border-border-subtle bg-surface-raised p-space-md">
            <DatabaseStatusPanel status={database} />
          </div>
          {resumeSource === null ? null : (
            <div className="border border-border-subtle bg-surface-raised p-space-md">
              <ResumeSourcePanel report={resumeSource} />
            </div>
          )}
          <div className="border border-border-subtle bg-surface-raised p-space-md">
            <ThemeFeedbackPanel counts={counts} />
          </div>
        </div>
      ) : null}

      {active === "resume" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          {experienceDocument === null ? (
            <p className="text-body-sm text-text-secondary">
              The experience editor needs the database. Run <code>npm run db:migrate</code> and{" "}
              <code>npm run db:bootstrap</code> locally.
            </p>
          ) : (
            <ExperienceEditor initialDocument={experienceDocument} locale="pt-BR" />
          )}
        </div>
      ) : null}

      {active === "variants" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <ResumeVariantEditor initialVariants={variants} locale="pt-BR" />
        </div>
      ) : null}

      {active === "tech-stack" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          {stack === null ? (
            <p className="text-body-sm text-text-secondary">
              The tech stack editor needs Supabase. Run <code>npm run db:setup</code> locally.
            </p>
          ) : (
            <TechStackEditor initialClusters={stack} locale="pt-BR" />
          )}
        </div>
      ) : null}

      {active === "catalog" ? (
        <div className="mt-space-lg">
          {catalog === null ? (
            <div className="border border-border-subtle bg-surface-raised p-space-md">
              <p className="text-body-sm text-text-secondary">
                The technology catalog needs the database. Run <code>npm run db:migrate</code> to
                create it, then <code>npm run db:bootstrap</code> to fill it.
              </p>
            </div>
          ) : (
            <div className="border border-border-subtle bg-surface-raised p-space-md">
              <TechnologyCatalogEditor initialCatalog={catalog} locale="pt-BR" />
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
                    locale="pt-BR"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {active === "profiles" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          {profiles === null ? (
            <p className="text-body-sm text-text-secondary">
              The stack profiles need the database. Run <code>npm run db:setup</code> locally.
            </p>
          ) : catalog === null ? (
            <p className="text-body-sm text-text-secondary">
              The technology catalog must be loaded first to use stack profiles.
            </p>
          ) : (
            <StackProfileEditor
              initialProfiles={profiles}
              catalog={catalog.technologies}
              categories={catalog.categories}
              locale="pt-BR"
            />
          )}
        </div>
      ) : null}

      {active === "job-match" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <JobMatchPanel locale="pt-BR" />
        </div>
      ) : null}

      {active === "blog" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <PostEditor t={t} locale="pt-BR" initialPosts={postList} />
        </div>
      ) : null}

      {active === "chat" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <ChatConsole
            labels={{ ...t.admin.chat, agentNotice: t.chat.agentNotice }}
            initialBoard={board}
            initialConversations={conversationList}
          />
        </div>
      ) : null}

      {active === "feedback" ? (
        <div className="mt-space-lg border border-border-subtle bg-surface-raised p-space-md">
          <ThemeFeedbackPanel counts={counts} />
        </div>
      ) : null}
    </main>
  );
}
