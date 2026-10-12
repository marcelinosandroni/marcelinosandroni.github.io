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
import { applyFocus, type FocusResult } from "@/domain/resume/focus";
import type { ResumeContent, ResumeExperience } from "@/domain/resume/types";
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

  const profiles = await readResolvedProfiles(locale);

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
  const narrowed =
    selected === undefined || resume.stackIndex === undefined
      ? null
      : applyFocus(resume.stackIndex, resume, selected.focus);

  const focused =
    narrowed === null
      ? undefined
      : {
          ...resume,
          experiences: resume.experiences.map((experience, experienceIndex): ResumeExperience => {
            const entry = narrowed.experiences.find((candidate) => candidate.experienceIndex === experienceIndex);

            if (entry === undefined) {
              return experience;
            }

            /*
              Filtered rather than mapped through `title`, because the case study
              is an object with its challenge, solution and metrics, and rebuilding
              it from the title would throw away the measured result — the part
              that argues the work was worth doing.

              The `filter(Boolean)` drops an index the document no longer has.
              `applyFocus` only returns positions it read from the document, so
              this cannot happen; it is there so the type is right without an
              assertion, rather than because the case is expected.
            */
            const caseStudies = entry.caseStudies
              .map((caseStudy) => experience.caseStudies?.[caseStudy.index])
              .filter((study): study is NonNullable<typeof study> => study !== undefined);

            return {
              ...experience,
              highlights: entry.highlights.map((highlight) => highlight.body),
              caseStudies,
            };
          }),
          skillGroups: focusSkillGroups(resume, narrowed),
        };

  return (
    <ResumeDocument
      locale={locale}
      resume={resume}
      profiles={profiles.map((entry) => ({
        slug: entry.profile.slug,
        label: entry.profile.label,
        description: entry.profile.description,
      }))}
      selectedProfile={selected?.profile.slug ?? null}
      focused={focused}
      narrowedRoles={narrowed?.narrowedRoles ?? 0}
      untaggedDropped={narrowed?.untaggedDropped ?? 0}
    />
  );
}

/**
 * Promotes the focused skills within each group, keeping every one.
 *
 * A stable partition rather than a sort: the résumé's own order is the owner's
 * arrangement, and a focused view that reshuffled the section would be
 * reordering the document rather than prioritising it.
 */
function focusSkillGroups(
  resume: ResumeContent,
  narrowed: FocusResult,
): ResumeContent["skillGroups"] {
  return resume.skillGroups.map((group) => {
    const promoted = new Set(
      narrowed.skillPositions
        .filter((entry) => entry.group === group.label && entry.primary)
        .map((entry) => entry.index),
    );

    if (promoted.size === 0) {
      return group;
    }

    const primary = group.skills.filter((_, index) => promoted.has(index));
    const rest = group.skills.filter((_, index) => !promoted.has(index));

    return { ...group, skills: [...primary, ...rest] };
  });
}
