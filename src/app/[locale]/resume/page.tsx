import type { Metadata } from "next";

import { ResumeDocument } from "@/components/resume/resume-document";
import {
  LOCALE_SEGMENTS,
  getAlternateLanguageMap,
  getAlternateOpenGraphLocales,
  toLocale,
  toOpenGraphLocale,
} from "@/domain/i18n";
import { readResume, readResolvedProfiles } from "@/infrastructure/repositories";
import { resolveResumePdfSource } from "@/domain/publication/resume-pdf-source";
import {
  RESUME_VARIANT_LABELS,
  availableResumeVariants,
  type ResumeVariant,
} from "@/infrastructure/pdf/fixed-resume-artifact";
import { applyFocus, narrowDocument, type FocusExpansion } from "@/domain/resume/focus";
import { getDictionary } from "@/i18n";

const SUFFIX = "/resume";

/**
 * Time-based revalidation, and the reason this page still counts as static.
 *
 * The document now comes from the database, so the page cannot be finished at
 * build time or an admin edit would need a redeploy to appear. But reading it
 * on every request is the other extreme: a page view spent waiting on a network
 * round trip is a page view that costs a recruiter.
 *
 * So the page stays prerendered and regenerates at most hourly, and an admin
 * save calls `revalidatePath` to make the change visible immediately. The
 * hourly figure is the safety net for the case where that call is missed — a
 * restore, a direct database edit, a webhook that did not arrive — not the
 * expected path to an edit going live.
 */
export const revalidate = 3_600;

/**
 * Resume document route.
 *
 * This route is the document of record: every role, deliverable and measured
 * outcome from the original resume content, in full. The home route summarises
 * it; nothing here is derived from the home configuration.
 *
 * `alternates` and `openGraph` are restated in full — including the `hreflang`
 * set and the `og:locale` pair — because Next.js replaces those objects rather
 * than merging them, and a page declaring only `canonical` would strip the
 * alternate-language links the layout provides.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/resume">): Promise<Metadata> {
  const locale = toLocale((await params).locale);

  if (!locale) {
    return {};
  }

  const t = await getDictionary(locale);
  const title = `${t.resume.title} | ${t.metadata.title}`;
  const canonical = `/${LOCALE_SEGMENTS[locale]}${SUFFIX}`;

  return {
    title,
    description: t.resume.subtitle,
    alternates: { canonical, languages: getAlternateLanguageMap(SUFFIX) },
    openGraph: {
      type: "article",
      siteName: t.metadata.siteName,
      title,
      description: t.resume.subtitle,
      url: canonical,
      locale: toOpenGraphLocale(locale),
      alternateLocale: getAlternateOpenGraphLocales(locale),
    },
  };
}

/**
 * The stack to narrow to, from `?stack=`.
 *
 * Read through `searchParams` rather than a typed segment, and that is not an
 * oversight: the stack is a *query parameter* so a narrowed résumé is one
 * addressable URL rather than a client-side variant of a page. A URL that can be
 * pasted into a follow-up email is the entire reason for the feature; a
 * `<select>` holding the choice in component state would lose it on reload.
 */
export default async function Page({
  params,
  searchParams,
}: PageProps<"/[locale]/resume"> & { searchParams: Promise<{ stack?: string }> }) {
  const { locale: segment } = await params;
  const { stack } = await searchParams;
  const locale = toLocale(segment);

  if (!locale) {
    return null;
  }

  /*
    Which résumé the reader is looking at.

    With the fixed source a stack selects a *document*, not a slice of one: the
    specialised versions are written for their stack rather than narrowed out of
    the general one. So the selector offers the documents that actually exist
    rather than the profiles the database happens to hold - a selector that
    offers something the endpoint cannot serve is worse than no selector, because
    the reader picks it and gets something else.
  */
  const focusable = resolveResumePdfSource() === "fixed";

  /*
    One element type for both sources, so `find` returns a single shape rather
    than a union. `focus` is present only on the database path, which is what
    makes "can this stack narrow the page" a question about the value instead of
    about the type it came from.
  */
  type PageProfile = {
    readonly slug: string;
    readonly label: string;
    readonly description: string;
    readonly focus?: FocusExpansion;
  };

  const profiles: ReadonlyArray<{ profile: PageProfile }> = focusable
    ? (await availableResumeVariants(locale)).map((slug: ResumeVariant) => ({
        profile: { slug, label: RESUME_VARIANT_LABELS[slug], description: "" },
      }))
    : (await readResolvedProfiles(locale)).map((entry) => ({ profile: entry.profile }));

  /*
    A selector with one entry is not a choice.

    On the fixed source only the general document is rendered today, so offering a
    control with a single "Completo" button would be decoration dressed as a
    choice - it implies a specialisation is available and none is. It stays hidden
    until a second document exists, and then appears on its own.

    On the database path the selector stays a single-entry control as before: there
    it drives narrowing as well as the download, so it keeps its own history.
  */
  const selectable = focusable && profiles.length < 2 ? [] : profiles;

  /*
    An unrecognised `stack` falls back to the generic résumé rather than 404ing.

    Three reasons, and the third is the one that settles it. A shareable URL must
    not break when a profile is renamed; the generic view is the default and is
    always correct, so it is a safe answer rather than a wrong one; and a 404 on
    a query parameter teaches a reader that this page has rules, which invites
    them to guess at others.

    The selector below the download button always offers "all", so the generic
    view is one click away from anywhere.
  */
  const selected = profiles.find((entry) => entry.profile.slug === stack);

  /*
    `"resume"` rather than `"both"`: this is the document of record, so every row
    the owner has written appears here regardless of where it is also shown. A
    role marked résumé-only is invisible for exactly this reason — it is not on
    the summary and it does not belong to be removed from the document.
  */
  const resume = await readResume(locale, "resume");

  /*
    Narrowing is the domain's, not the page's.

    `applyFocus` reads positions out of `stackIndex` and returns them; turning
    those positions back into a `ResumeContent` is the one piece of assembly that
    lives here, because it is the only place that has both the document and the
    result. Doing it in the domain would mean the domain could rebuild a document
    it was only ever given positions into.
  */
  let narrowed: ReturnType<typeof applyFocus> | null = null;

  /*
    Narrowing exists only on the database path, where the stack index can actually
    decide which roles and bullets belong. On the fixed path the specialised
    documents are separate files, and narrowing this page would produce a third
    thing that is neither.
  */
  if (!focusable && selected !== undefined && selected.profile.focus !== undefined) {
    narrowed =
      resume.stackIndex === undefined
        ? null
        : applyFocus(resume.stackIndex, resume, selected.profile.focus);
  }

  /*
    The same `narrowDocument` the PDF route uses.

    Two copies of this would agree today and drift the first time one gained a
    field, and the drift would be a download that is not the page the reader was
    looking at — with nothing in either to say so.
  */
  const focused = narrowed === null ? undefined : narrowDocument(resume, narrowed);

  /*
    On the fixed source the page shows the general document whatever stack is
    selected.

    The specialised versions are separate documents, not narrowed views of this
    one, so narrowing this page by the stack index would produce a *third* thing:
    neither the general résumé nor the specialised one. It would look like the
    choice worked while the download returned something else entirely.

    So the selector here chooses the download, and this page stays the general
    document - which is also the honest reading, since it is the complete record.
  */
  const focusedForPage = narrowed === null ? undefined : narrowDocument(resume, narrowed);

  return (
    <ResumeDocument
      locale={locale}
      resume={resume}
      profiles={selectable.map((entry) => ({
        slug: entry.profile.slug,
        label: entry.profile.label,
        description: entry.profile.description,
      }))}
      selectedProfile={selected?.profile.slug ?? null}
      focused={focusedForPage}
      narrowedRoles={narrowed?.narrowedRoles ?? 0}
      untaggedDropped={narrowed?.untaggedDropped ?? 0}
    />
  );
}
