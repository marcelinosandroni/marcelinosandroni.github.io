import { SectionShell } from "@/components/home/section-shell";
import { Icon } from "@/components/ui/icon";
import type { HomeLeadershipSection } from "@/domain/portfolio";

export interface HowILeadSectionProps {
  section: HomeLeadershipSection;
}

/**
 * How I lead.
 *
 * ## Why this section exists at all
 *
 * Everything above it on the page is an achievement list: 24 case studies, 96
 * metrics, every one of them a thing that was built. That answers "what has this
 * person shipped", which is the wrong question for a tech lead role. The question
 * a hiring manager is actually asking is "what does this person *do* — in a
 * review, in a crisis, when the deadline moves", and no amount of throughput
 * numbers answers it.
 *
 * It sits directly under the track record rather than on the resume page because
 * this is the page a recruiter reads. The resume is the document of record; the
 * home page is the pitch.
 *
 * ## Why each item carries an `evidence` line
 *
 * Because a leadership claim without a specific thing attached to it is
 * indistinguishable from a leadership claim anybody could write. Every evidence
 * line here is traceable to a case study already on the resume — the point is not
 * to introduce new claims, it is to attach each practice to the result it
 * produced, so the reader is never asked to take a practice on faith.
 *
 * The visual separation matters for the same reason: `practice` is what he does,
 * `evidence` is what happened when he did it. Setting them as one paragraph would
 * blur exactly the distinction the section is built on.
 */
export function HowILeadSection({ section }: HowILeadSectionProps) {
  return (
    <SectionShell id={section.id} surface="raised" artwork={null}>
      <div className="space-y-space-xl">
        <div className="max-w-2xl space-y-space-xs">
          <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
            {section.kicker}
          </span>
          <h2
            id={`${section.id}-heading`}
            className="font-headline-lg text-headline-lg text-text-primary"
          >
            {section.title}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary">{section.note}</p>
        </div>

        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
          {section.items.map((item) => (
            <article
              key={item.id}
              className="space-y-space-md rounded-xl border border-border-subtle bg-surface-base p-space-xl transition-colors duration-300 hover:border-primary-container/40"
            >
              <div className="flex items-center gap-space-sm">
                <Icon name={item.icon} size={20} className="shrink-0 text-primary-container" />
                <h3 className="font-headline-sm text-headline-sm text-text-primary">{item.title}</h3>
              </div>

              <p className="font-body-sm text-body-sm text-text-secondary">{item.practice}</p>

              {/*
                Set apart from the practice above it on purpose: this is the result
                the practice produced, and it is the only part of the card that a
                sceptical reader should check against the resume.
              */}
              <p className="border-l-2 border-primary-container/50 pl-space-sm font-body-sm text-body-sm text-text-primary">
                {item.evidence}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}