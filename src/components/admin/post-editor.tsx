"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";

import { ArticleBody } from "@/components/blog/article-body";
import { compileMarkdown } from "@/application/blog/markdown";
import {
  InvalidPostDraftError,
  POST_CATEGORIES,
  composePostDocument,
  estimateReadingTimeMinutes,
  parsePostDocument,
  readPostInput,
  type PostDraft,
  type PostFrontMatter,
  type PostIssue,
  type PostStatus,
  type PostSummary,
} from "@/domain/blog/post-draft";
import type { ArticleBlock, ArticleCategory } from "@/domain/blog";
import { LOCALE_SEGMENTS, type Locale } from "@/domain/i18n";
import type { Dictionary } from "@/i18n";
import { formatMessage } from "@/i18n/format-message";

/**
 * The blog CMS.
 *
 * ## Why the preview is the article renderer
 *
 * The preview below is `ArticleBody` — the same component the published page
 * uses — fed by the same `compileMarkdown` the publish path uses. That is the
 * whole answer to "will this look right": it is not an approximation of the
 * article, it *is* the article, minus the header. A separate preview renderer
 * would drift from the real one within a release, and the owner would find out
 * on the public page.
 *
 * Importing an application-layer module into a client component is not a layering
 * accident: `compileMarkdown` is a pure function with no framework import, and
 * `soundtrack-toggle.tsx` already reaches into `@/application` for the same
 * reason — running it in the browser is the feature.
 *
 * ## Why this list arrives as a prop rather than being fetched on mount
 *
 * The theme-feedback counts on this page are read on the server and the comment
 * there explains why; the same reasoning applies here, and it is also what keeps
 * the editor free of a fetch-on-mount effect — which cascades a render after
 * hydration, shows a spinner for a list the server already had, and is exactly
 * what the `react-hooks/set-state-in-effect` rule exists to stop. So the page
 * reads the list and hands it over, and this component refetches only from
 * event handlers, after a mutation that could have changed it.
 *
 * The refetch after a mutation is the part that makes it live: a list describing
 * a pre-save state is worse than no list, because the row the owner just edited
 * would be the one that looks wrong.
 *
 * ## Accessibility notes that are not obvious
 *
 * - Every control has a real `<label for>`. The placeholder is still there, but
 *   it disappears on the first keystroke, which is the whole reason a `<label>`
 *   exists.
 * - The notice region is a single `role="status"` node that is in the DOM before
 *   any notice exists, so a screen reader has somewhere to announce to instead of
 *   discovering a new element mid-sentence.
 * - Per-field errors are plain elements referenced by `aria-describedby`, and
 *   only the *summary* is a `role="alert"`. Both being alerts would announce every
 *   problem twice.
 * - Delete is two inline steps rather than `window.confirm`. A native dialog is
 *   keyboard operable, but it is a browser surface the theme cannot reach, it
 *   cannot be labelled, and it cannot be asserted on.
 */

type FormState = {
  title: string;
  slug: string;
  locale: Locale;
  category: ArticleCategory;
  excerpt: string;
  tags: string;
  featured: boolean;
  publishedAt: string;
  markdown: string;
};

type Notice = { tone: "ok" | "error"; text: string } | null;

/** The sentinel for "the editor is open on a post that does not exist yet". */
const NEW_POST = "new";

/**
 * `min-h-11` on every raw control.
 *
 * 44px is the floor the rest of this site holds itself to (`globals.css` §
 * TOUCH TARGETS), and it is applied here rather than left to the coarse-pointer
 * media query: the admin surface is used on a phone often enough that relying on
 * a stylesheet to catch a control added later is not a plan.
 */
const CONTROL =
  "min-h-11 w-full border border-border-subtle bg-surface-base px-space-sm py-space-sm font-body-sm text-body-sm text-text-primary outline-none focus:border-primary-container";

export interface PostEditorProps {
  t: Dictionary;
  /** The admin page's own locale, used as the default for a new post. */
  locale: Locale;
  /**
   * The list, read on the server. `null` means the read failed, which is
   * reported rather than rendered as "you have written nothing" — the two
   * facts need completely different reactions from the person looking at them.
   */
  initialPosts: PostSummary[] | null;
}

export function PostEditor({ t, locale, initialPosts }: PostEditorProps) {
  const labels = t.admin.posts;

  const [posts, setPosts] = useState<PostSummary[]>(initialPosts ?? []);
  const [loadFailed, setLoadFailed] = useState(initialPosts === null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Re-reads the list after a mutation.
   *
   * Only ever called from an event handler, never from an effect: the state it
   * sets is the state the handler just invalidated, so this is a response to the
   * user's own action rather than a synchronisation with the outside world.
   */
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/posts", { cache: "no-store" });
      const payload = (await response.json()) as { posts?: PostSummary[] };

      setPosts(Array.isArray(payload.posts) ? payload.posts : []);
      setLoadFailed(false);
    } catch {
      /*
       * A network failure is not an empty list, and saying so is the difference
       * between "you have written nothing" and "this is broken" — the same
       * reason the admin page catches rather than throws when the feedback counts
       * cannot be read.
       */
      setLoadFailed(true);
    }
  }, []);

  /**
   * The document the form currently describes, and what is wrong with it.
   *
   * Recomputed on every keystroke, which is the point: the issues and the preview
   * are the same read of the same text the server will read, so a field this
   * editor marks is a field the server will also refuse. The document is a few
   * hundred lines and the work is a single pass, so there is nothing to debounce.
   */
  const source = useMemo(() => (form === null ? null : toDocument(form)), [form]);
  const inspection = useMemo(() => (source === null ? null : inspect(source)), [source]);

  const editing = openId === null ? undefined : posts.find((post) => post.id === openId);

  const submit = (): void => {
    if (source === null || openId === null) {
      return;
    }

    if (inspection !== null && inspection.issues.length > 0) {
      setNotice({ tone: "error", text: labels.issuesLabel });
      return;
    }

    const creating = openId === NEW_POST;

    startTransition(async () => {
      const response = await fetch(creating ? "/api/admin/posts" : `/api/admin/posts/${openId}`, {
        method: creating ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document: source }),
      });

      if (response.status === 409) {
        setNotice({ tone: "error", text: labels.slugTaken });
        return;
      }

      if (!response.ok) {
        setNotice({ tone: "error", text: labels.failed });
        return;
      }

      setNotice({
        tone: "ok",
        // A published post is republished by the same call, so the message has to
        // say which of the two things just happened.
        text: editing?.status === "published" ? labels.savedPublished : labels.savedDraft,
      });

      setOpenId(null);
      setForm(null);
      await refresh();
    });
  };

  const changeLifecycle = (id: string, change: { published?: true; archived?: boolean }): void => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(change),
      });

      if (!response.ok) {
        setNotice({ tone: "error", text: labels.failed });
        return;
      }

      setNotice({
        tone: "ok",
        text: "published" in change ? labels.published : change.archived === true ? labels.archived : labels.restored,
      });

      // The editor may be open on the post that just changed state, and the copy
      // of the status it is showing would now be a lie.
      if (openId === id) {
        setOpenId(null);
        setForm(null);
      }

      await refresh();
    });
  };

  const remove = (id: string): void => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });

      setDeleteTarget(null);

      if (!response.ok) {
        setNotice({ tone: "error", text: labels.failed });
        return;
      }

      setNotice({ tone: "ok", text: labels.removed });
      setOpenId(null);
      setForm(null);
      await refresh();
    });
  };

  const open = (id: string): void => {
    setNotice(null);
    setDeleteTarget(null);

    if (id === NEW_POST) {
      setForm(blankForm(locale));
      setOpenId(NEW_POST);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/posts/${id}`, { cache: "no-store" });
        const payload = (await response.json()) as { post?: PostDraft };

        if (!response.ok || payload.post === undefined) {
          setNotice({ tone: "error", text: labels.loadFailed });
          return;
        }

        setForm(toForm(payload.post));
        setOpenId(id);
      } catch {
        setNotice({ tone: "error", text: labels.loadFailed });
      }
    });
  };

  return (
    <section aria-labelledby="post-editor-heading" data-post-editor="cms">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <div>
          <h2 id="post-editor-heading" className="font-headline-sm text-headline-sm text-text-primary">
            {labels.sectionTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-body-sm text-text-secondary">
            {labels.sectionDescription}
          </p>
        </div>

        <button type="button" className="button button-quiet" onClick={() => open(NEW_POST)}>
          {labels.newPost}
        </button>
      </header>

      {/* Present from the first render so an announcement has somewhere to go. */}
      <p
        role="status"
        aria-live="polite"
        className="mt-space-sm min-h-5 text-body-sm text-body-sm text-text-secondary"
      >
        {notice?.text ?? ""}
      </p>

      {loadFailed ? (
        <p className="mt-space-sm text-body-sm text-body-sm text-text-secondary">{labels.loadFailed}</p>
      ) : null}

      <h3 className="mt-space-md font-label-mono text-label-mono uppercase text-text-muted">
        {labels.listLabel}
      </h3>

      <ul className="mt-space-sm space-y-space-sm">
        {/*
          "No posts yet" is suppressed when the read failed. Both are an empty
          list, and telling the owner they have written nothing when the CMS is
          simply unreachable is the one message that would make them doubt the
          work rather than the deployment.
        */}
        {posts.length === 0 ? (
          loadFailed ? null : (
            <li className="text-body-sm text-body-sm text-text-secondary">{labels.empty}</li>
          )
        ) : (
          posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              t={t}
              isOpen={openId === post.id}
              isPending={isPending}
              isConfirmingDelete={deleteTarget === post.id}
              onOpen={() => open(post.id)}
              onPublish={() => changeLifecycle(post.id, { published: true })}
              onArchive={() => changeLifecycle(post.id, { archived: true })}
              onRestore={() => changeLifecycle(post.id, { archived: false })}
              onRequestDelete={() => {
                setDeleteTarget(post.id);
                setNotice(null);
              }}
              onCancelDelete={() => setDeleteTarget(null)}
              onConfirmDelete={() => remove(post.id)}
            />
          ))
        )}
      </ul>

      {form !== null && source !== null && inspection !== null ? (
        <PostForm
          t={t}
          form={form}
          issues={inspection.issues}
          blocks={inspection.blocks}
          heading={
            openId === NEW_POST
              ? labels.createTitle
              : formatMessage(labels.editTitle, {
                  title: form.title === "" ? labels.createTitle : form.title,
                })
          }
          isPending={isPending}
          onChange={setForm}
          onSubmit={submit}
          onCancel={() => {
            setOpenId(null);
            setForm(null);
          }}
        />
      ) : null}
    </section>
  );
}

interface PostRowProps {
  post: PostSummary;
  t: Dictionary;
  isOpen: boolean;
  isPending: boolean;
  isConfirmingDelete: boolean;
  onOpen: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function PostRow({
  post,
  t,
  isOpen,
  isPending,
  isConfirmingDelete,
  onOpen,
  onPublish,
  onArchive,
  onRestore,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: PostRowProps) {
  const labels = t.admin.posts;
  const localeSegment = LOCALE_SEGMENTS[post.frontMatter.locale];

  return (
    <li className="border border-border-subtle bg-surface-base p-space-md">
      <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <p className="font-headline-sm text-headline-sm text-text-primary">
          {post.frontMatter.title}
        </p>
        <StatusBadge status={post.status} t={t} />
      </div>

      <p className="mt-1 font-label-mono text-label-mono text-text-muted">
        {`/${localeSegment}/blog/${post.frontMatter.slug}`}
      </p>

      {/*
        A row of controls, not a link. A link wrapping the title would put four
        buttons inside an anchor — invalid, and unusable from the keyboard. The
        one real link here is to the published page.
      */}
      <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
        <button
          type="button"
          className="button button-quiet"
          onClick={onOpen}
          aria-expanded={isOpen}
          // Only when the form exists: an `aria-controls` pointing at an absent
          // element is a reference a screen reader has nothing to resolve.
          aria-controls={isOpen ? "post-editor-form" : undefined}
        >
          {labels.edit}
        </button>

        {post.status === "published" ? (
          <button type="button" className="button button-quiet" onClick={onArchive} disabled={isPending}>
            {labels.withdraw}
          </button>
        ) : (
          <button type="button" className="button button-quiet" onClick={onPublish} disabled={isPending}>
            {labels.publish}
          </button>
        )}

        {post.status === "archived" ? (
          <button type="button" className="button button-quiet" onClick={onRestore} disabled={isPending}>
            {labels.restore}
          </button>
        ) : null}

        {post.status === "published" ? (
          <Link href={`/${localeSegment}/blog/${post.frontMatter.slug}`} className="button button-quiet">
            {labels.viewOnBlog}
          </Link>
        ) : null}

        {isConfirmingDelete ? (
          <>
            <button
              type="button"
              className="button button-quiet"
              onClick={onConfirmDelete}
              disabled={isPending}
            >
              {labels.removeConfirm}
            </button>
            <button type="button" className="button button-quiet" onClick={onCancelDelete}>
              {labels.removeCancel}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button button-quiet"
            onClick={onRequestDelete}
            disabled={isPending}
          >
            {labels.remove}
          </button>
        )}
      </div>

      {isConfirmingDelete ? (
        <p className="mt-space-sm text-body-sm text-body-sm text-text-secondary">
          {labels.removeWarning}
        </p>
      ) : null}
    </li>
  );
}

function StatusBadge({ status, t }: { status: PostStatus; t: Dictionary }) {
  const labels = t.admin.posts;
  const text =
    status === "published"
      ? labels.statusPublished
      : status === "archived"
        ? labels.statusArchived
        : labels.statusDraft;

  /*
   * The word "Status" is visually hidden rather than absent. A screen reader
   * announcing a bare "Published" gives no clue what it is about, and a visible
   * label on every row would be three words repeated down a list the owner
   * already knows the shape of.
   */
  return (
    <span
      data-post-status={status}
      className="border border-border-subtle bg-surface-overlay px-2 py-0.5 font-label-mono text-[10px] uppercase text-text-secondary"
    >
      <span className="sr-only">{labels.statusLabel}: </span>
      {text}
    </span>
  );
}

interface PostFormProps {
  t: Dictionary;
  form: FormState;
  issues: PostIssue[];
  blocks: ArticleBlock[];
  heading: string;
  isPending: boolean;
  onChange: (form: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function PostForm({
  t,
  form,
  issues,
  blocks,
  heading,
  isPending,
  onChange,
  onSubmit,
  onCancel,
}: PostFormProps) {
  const labels = t.admin.posts;

  const field = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    onChange({ ...form, [key]: value });

  const errorFor = (name: string): PostIssue | undefined =>
    issues.find((issue) => issue.field === name);

  /**
   * The error element is referenced only when there is an error, so a
   * `aria-describedby` never points at an empty node — some screen readers
   * announce that as a bare "description", which is worse than silence.
   */
  const describedBy = (name: string, hintId?: string): string | undefined => {
    const error = errorFor(name);

    if (error === undefined) {
      return hintId;
    }

    return hintId === undefined ? `${name}-error` : `${hintId} ${name}-error`;
  };

  const border = (name: string): string =>
    errorFor(name) === undefined ? "" : " border-primary-container";

  return (
    <form
      id="post-editor-form"
      className="mt-space-lg space-y-space-md border border-border-subtle bg-surface-base p-space-md"
      aria-label={labels.formLabel}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <h3 className="font-headline-sm text-headline-sm text-text-primary">{heading}</h3>

      <Field label={labels.fieldTitle} id="post-title">
        <input
          id="post-title"
          className={CONTROL}
          value={form.title}
          onChange={(event) => field("title", event.target.value)}
          aria-invalid={errorFor("title") !== undefined}
        />
        <FieldError name="title" issue={errorFor("title")} t={t} />
      </Field>

      <Field label={labels.fieldSlug} id="post-slug" hint={labels.fieldSlugHint} hintId="post-slug-hint">
        <input
          id="post-slug"
          className={`${CONTROL}${border("slug")}`}
          value={form.slug}
          onChange={(event) => field("slug", event.target.value)}
          aria-invalid={errorFor("slug") !== undefined}
          aria-describedby={describedBy("slug", "post-slug-hint")}
        />
        <FieldError name="slug" issue={errorFor("slug")} t={t} />
      </Field>

      <div className="grid gap-space-md md:grid-cols-2">
        <Field label={labels.fieldLocale} id="post-locale">
          <select
            id="post-locale"
            className={CONTROL}
            value={form.locale}
            onChange={(event) => field("locale", event.target.value as Locale)}
          >
            <option value="en-US">{labels.localeEnUS}</option>
            <option value="pt-BR">{labels.localePtBR}</option>
          </select>
        </Field>

        <Field label={labels.fieldCategory} id="post-category">
          <select
            id="post-category"
            className={CONTROL}
            value={form.category}
            onChange={(event) => field("category", event.target.value as ArticleCategory)}
          >
            {POST_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label={labels.fieldExcerpt}
        id="post-excerpt"
        hint={labels.fieldExcerptHint}
        hintId="post-excerpt-hint"
      >
        <textarea
          id="post-excerpt"
          rows={3}
          className={`${CONTROL}${border("excerpt")}`}
          value={form.excerpt}
          onChange={(event) => field("excerpt", event.target.value)}
          aria-invalid={errorFor("excerpt") !== undefined}
          aria-describedby={describedBy("excerpt", "post-excerpt-hint")}
        />
        <FieldError name="excerpt" issue={errorFor("excerpt")} t={t} />
      </Field>

      <div className="grid gap-space-md md:grid-cols-2">
        <Field label={labels.fieldTags} id="post-tags" hint={labels.fieldTagsHint} hintId="post-tags-hint">
          <input
            id="post-tags"
            className={`${CONTROL}${border("tags")}`}
            value={form.tags}
            onChange={(event) => field("tags", event.target.value)}
            aria-invalid={errorFor("tags") !== undefined}
            aria-describedby={describedBy("tags", "post-tags-hint")}
          />
          <FieldError name="tags" issue={errorFor("tags")} t={t} />
        </Field>

        {/*
          `type="date"` rather than a text box with a `YYYY-MM-DD` placeholder.
          It gives a real picker, a locale-correct display, and — the part that
          matters here — a value the browser already constrains to the shape the
          `publishedAt` column and the domain's date check both require.
        */}
        <Field label={labels.fieldPublishedAt} id="post-date">
          <input
            id="post-date"
            type="date"
            className={CONTROL}
            value={form.publishedAt}
            onChange={(event) => field("publishedAt", event.target.value)}
          />
        </Field>
      </div>

      {/*
        A checkbox, not a `<select>` of true/false. The native control is the one
        a screen reader and a keyboard both already know, and it is a binary
        decision: `false` is the default, so an unchecked box is the ordinary case
        rather than a value the owner has to remember to clear.
      */}
      <div className="flex items-center gap-space-sm">
        <input
          id="post-featured"
          type="checkbox"
          className="h-5 w-5 accent-primary-container"
          checked={form.featured}
          onChange={(event) => field("featured", event.target.checked)}
        />
        <label htmlFor="post-featured" className="text-body-sm text-body-sm text-text-secondary">
          {labels.fieldFeatured}
        </label>
      </div>

      <Field label={labels.fieldBody} id="post-body" hint={bodyHint(labels)} hintId="post-body-hint">
        <textarea
          id="post-body"
          rows={18}
          spellCheck
          className={`${CONTROL} font-code-inline text-code-inline${border("body")}`}
          value={form.markdown}
          onChange={(event) => field("markdown", event.target.value)}
          aria-invalid={errorFor("body") !== undefined}
          aria-describedby={describedBy("body", "post-body-hint")}
        />
        <FieldError name="body" issue={errorFor("body")} t={t} />
      </Field>

      <p className="font-label-mono text-label-mono text-text-muted">
        {`${formatMessage(labels.wordCount, { count: countWords(form.markdown) })} · ${formatMessage(
          labels.estimatedReading,
          { minutes: estimateReadingTimeMinutes(form.markdown) },
        )}`}
      </p>

      <IssueList issues={issues} t={t} />

      <div aria-labelledby="post-preview-heading">
        <h4 id="post-preview-heading" className="font-label-mono text-label-mono uppercase text-text-muted">
          {labels.previewLabel}
        </h4>
        {blocks.length === 0 ? (
          <p className="mt-space-sm text-body-sm text-body-sm text-text-secondary">
            {labels.previewEmpty}
          </p>
        ) : (
          <div className="mt-space-sm border border-border-subtle p-space-md">
            <ArticleBody blocks={blocks} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-space-sm">
        <button type="submit" className="button button-primary" disabled={isPending}>
          {isPending ? labels.saving : labels.save}
        </button>
        <button type="button" className="button button-quiet" onClick={onCancel}>
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}

/** The three sentences an author needs before typing, as one described-by target. */
function bodyHint(labels: Dictionary["admin"]["posts"]): string {
  return `${labels.bodyHint} ${labels.inlineFormattingNote} ${labels.bodySafetyNote}`;
}

interface FieldProps {
  label: string;
  id: string;
  hint?: string;
  hintId?: string;
  children: React.ReactNode;
}

/**
 * A label, its control, an optional hint and an optional error.
 *
 * The hint is only rendered when there is one to render, so `aria-describedby`
 * is never a dangling reference. The error element is always rendered, empty when
 * there is nothing wrong, so the id `describedBy` computes exists either way.
 */
function Field({ label, id, hint, hintId, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-label-mono text-label-mono uppercase text-text-muted">
        {label}
      </label>
      {children}
      {hint === undefined ? null : (
        <p id={hintId} className="text-body-sm text-body-sm text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The error sentence for one field.
 *
 * Not a `role="alert"`: it is already reachable through `aria-describedby` on the
 * control, and an alert here *and* in the summary list would announce every
 * problem twice.
 */
function FieldError({ name, issue, t }: { name: string; issue: PostIssue | undefined; t: Dictionary }) {
  return (
    <p id={`${name}-error`} className="text-body-sm text-body-sm text-text-secondary">
      {issue === undefined ? "" : describeIssue(issue, t)}
    </p>
  );
}

function IssueList({ issues, t }: { issues: PostIssue[]; t: Dictionary }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="border border-border-subtle p-space-sm">
      <p className="font-label-mono text-label-mono uppercase text-text-muted">
        {t.admin.posts.issuesLabel}
      </p>
      <ul className="mt-1 list-disc pl-space-lg text-body-sm text-body-sm text-text-secondary">
        {issues.map((issue) => (
          <li key={`${issue.field}:${issue.code}`}>{describeIssue(issue, t)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Resolves a domain issue code to a translated sentence. */
function describeIssue(issue: PostIssue, t: Dictionary): string {
  return formatMessage(t.admin.posts.issues[issue.code], { field: issue.field });
}

/* -------------------------------------------------------------------------
 * Form ↔ document
 * ---------------------------------------------------------------------- */

function blankForm(locale: Locale): FormState {
  return {
    title: "",
    slug: "",
    locale,
    // `leadership` rather than an empty string: the enum has no neutral member,
    // and a blank `<select>` needs a `""` option the domain would then have to
    // special-case. Picking one is one click; typing a value the database would
    // reject is a save that fails for a reason nobody can act on.
    category: "leadership",
    excerpt: "",
    tags: "",
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 10),
    markdown: "",
  };
}

function toForm(post: PostDraft): FormState {
  return {
    title: post.frontMatter.title,
    slug: post.frontMatter.slug,
    locale: post.frontMatter.locale,
    category: post.frontMatter.category,
    excerpt: post.frontMatter.excerpt,
    tags: post.frontMatter.tags.join(", "),
    featured: post.frontMatter.featured,
    publishedAt: post.frontMatter.publishedAt,
    markdown: post.markdown,
  };
}

function toDocument(form: FormState): string {
  const frontMatter: PostFrontMatter = {
    title: form.title,
    slug: form.slug,
    locale: form.locale,
    category: form.category,
    excerpt: form.excerpt,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== ""),
    featured: form.featured,
    publishedAt: form.publishedAt,
  };

  return composePostDocument({ frontMatter, markdown: form.markdown });
}

/**
 * Validates and previews, without ever throwing at the caller.
 *
 * The preview falls back to whatever body *can* be parsed while a field is being
 * typed, so fixing a title does not blank the preview until the whole document is
 * valid. Everything is recomputed on every keystroke: the document is a few
 * hundred lines, the pass is linear, and a preview that lags behind the caret is
 * a preview nobody trusts.
 */
function inspect(document: string): { issues: PostIssue[]; blocks: ArticleBlock[] } {
  try {
    const { markdown } = readPostInput(document);

    return { issues: [], blocks: compileMarkdown(markdown) };
  } catch (error) {
    if (!(error instanceof InvalidPostDraftError)) {
      throw error;
    }

    let blocks: ArticleBlock[] = [];

    try {
      blocks = compileMarkdown(parsePostDocument(document).markdown);
    } catch {
      // The front matter itself is broken, so there is no body to preview. An
      // empty preview under the list of issues is a truthful screen.
      blocks = [];
    }

    return { issues: [...error.issues], blocks };
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
