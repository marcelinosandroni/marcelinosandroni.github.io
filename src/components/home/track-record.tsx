import Link from "next/link";

import { Chip, Section, SectionHeading } from "@/components/ui";
import { ACCENT_TEXT, Icon } from "@/components/ui/icon";
import { toLocaleSegment, type Locale } from "@/domain/i18n";
import type { AccentTone, HomeExperienceAnnotation, HomeTrackRecordSection } from "@/domain/portfolio";
import type { ResumeExperience } from "@/domain/resume/types";

export interface TrackRecordSectionProps {
  section: HomeTrackRecordSection;
  /** Reused verbatim from the resume, which stays the document of record. */
  experiences: ResumeExperience[];
  locale: Locale;
  /** Localized chip/label copy for the stack blueprint. */
  openResumeLabel: string;
}

/**
 * Executive track record.
 *
 * The narrative, period, role, highlights and technologies all come from the
 * resume. The *framing* — impact badge, curated stack blueprint, team line — is
 * home configuration, joined by `company`. A test proves the join is total and
 * unambiguous for both locales, so a badge can never end up on the wrong role.
 */
export function TrackRecordSection({
  section,
  experiences,
  locale,
  openResumeLabel,
}: TrackRecordSectionProps) {
  const annotationsByCompany = new Map(
    section.annotations.map((annotation) => [annotation.company, annotation]),
  );

  return (
    <Section id={section.id} surface="raised">
      <div className="space-y-space-2xl">
        <SectionHeading
          id={`${section.id}-heading`}
          kicker={section.kicker}
          title={section.title}
          note={section.note}
        />

        <div className="space-y-space-xl">
          {experiences.map((experience) => {
            const annotation = annotationsByCompany.get(experience.company);
            if (!annotation) {
              return null;
            }
            return (
              <ExperienceRow
                key={`${experience.company}-${experience.period}`}
                experience={experience}
                annotation={annotation}
                isCurrent={section.currentCompany === experience.company}
              />
            );
          })}
        </div>

        <div className="pt-space-sm">
          <Link
            href={`/${toLocaleSegment(locale)}/resume`}
            className="button button-quiet"
          >
            <Icon name="document" size={18} />
            {openResumeLabel}
          </Link>
        </div>
      </div>
    </Section>
  );
}

function ExperienceRow({
  experience,
  annotation,
  isCurrent,
}: {
  experience: ResumeExperience;
  annotation: HomeExperienceAnnotation;
  isCurrent: boolean;
}) {
  return (
    <article className="relative overflow-hidden rounded-xl bg-surface-raised p-space-xl shadow-lg">
      <div className="flex flex-col justify-between gap-space-md pb-space-md lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-space-xs">
            {isCurrent ? (
              <span className="msd-pulse h-2 w-2 shrink-0 rounded-full bg-primary-container" />
            ) : null}
            <span
              className={`font-label-mono text-label-mono font-bold uppercase ${
                isCurrent ? "text-primary-container" : "text-text-muted"
              }`}
            >
              {`${experience.period} // ${experience.location}`}
            </span>
          </div>
          <h3 className="mt-1 font-headline-md text-headline-md text-text-primary">
            {experience.company}
          </h3>
          <p
            className={`font-headline-sm text-headline-sm font-medium ${
              isCurrent ? "text-primary-container" : ACCENT_TEXT.secondary
            }`}
          >
            {experience.role}
          </p>
        </div>

        <div
          className={`self-start rounded-lg bg-surface-overlay px-space-md py-space-xs font-label-mono text-label-mono font-bold ${
            ACCENT_TEXT[annotation.impact.accent]
          }`}
        >
          {annotation.impact.label}: {annotation.impact.value}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-space-lg pt-space-xs lg:grid-cols-12">
        <ul className="space-y-space-sm font-body-md text-body-md text-text-secondary lg:col-span-8">
          {experience.highlights.map((highlight) => {
            const [lead, rest] = splitLead(highlight);
            return (
              <li key={highlight} className="flex gap-space-sm">
                <span aria-hidden="true" className="text-primary-container">
                  •
                </span>
                <p>
                  {lead ? (
                    <strong className="font-semibold text-on-surface">{lead} </strong>
                  ) : null}
                  {rest}
                </p>
              </li>
            );
          })}
        </ul>

        <aside className="flex flex-col justify-between gap-space-md rounded-lg bg-surface-base p-space-md lg:col-span-4">
          <div>
            <span className="font-label-mono text-label-mono uppercase text-text-muted">
              {annotation.blueprintLabel}
            </span>
            <div className="mt-space-xs flex flex-wrap gap-1.5">
              {annotation.blueprint.map((tech) => (
                <Chip
                  key={tech}
                  label={tech}
                  size="sm"
                  tone={blueprintTone(tech, annotation.blueprint)}
                />
              ))}
            </div>
          </div>
          <p className="font-label-mono text-[11px] leading-4 text-text-muted">
            {annotation.teamLine}
          </p>
        </aside>
      </div>
    </article>
  );
}

/**
 * Highlights the technologies that carry the accent and leaves the supporting
 * stack muted, reproducing the reference's two-weight chip treatment. The
 * leading technologies are those mentioned in the first two blueprint slots.
 */
function blueprintTone(tech: string, blueprint: string[]): AccentTone {
  return blueprint.indexOf(tech) < 2 ? "primary" : "tertiary";
}

/**
 * Splits a highlight into a lead clause and the remainder, so the first claim
 * reads bright and the supporting detail recedes — the reference's typographic
 * hierarchy, achieved without duplicating a single word of the resume.
 *
 * The boundary is the end of the first sentence. A highlight without sentence
 * punctuation is returned whole, so short fragments are never mangled.
 */
export function splitLead(text: string): [string, string] {
  const match = /^(.+?[.!?])(\s|$)/.exec(text);
  if (!match) {
    return ["", text];
  }
  return [match[1], text.slice(match[1].length).trimStart()];
}
