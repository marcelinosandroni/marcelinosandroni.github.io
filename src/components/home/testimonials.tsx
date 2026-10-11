import type { ResumeTestimonial } from "@/domain/resume/resume-repository";

/**
 * Named references.
 *
 * ## Why this renders nothing by default
 *
 * Two independent gates, and both are deliberate. The flag decides whether the
 * *site* offers the section; the data decides whether there is anything true to
 * put in it. The second matters more: turning the flag on does not create a
 * quote, it only allows the ones the owner has actually entered to appear.
 *
 * ## Why the empty state says what it says
 *
 * "No references yet" would be a claim about the owner — that they have none,
 * which is not true and not something this component can know. The real reason
 * is that the table is empty, and the copy says that instead of implying a
 * verdict on the person being hired.
 */
export function TestimonialSection({
  testimonials,
  enabled,
  labels,
}: {
  testimonials: readonly ResumeTestimonial[];
  enabled: boolean;
  labels: { kicker: string; title: string; note: string; empty: string; itemsLabel: string };
}): React.ReactElement | null {
  if (!enabled) {
    return null;
  }

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="border-t border-border-subtle py-space-2xl"
    >
      <div className="mx-auto w-full max-w-[1320px] px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="max-w-2xl space-y-space-xs">
          <span className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
            {labels.kicker}
          </span>
          <h2
            id="testimonials-heading"
            className="font-headline-lg text-headline-lg text-text-primary"
          >
            {labels.title}
          </h2>
          <p className="font-body-md text-body-md text-text-secondary">{labels.note}</p>
        </div>

        {/*
          Reachable only when the flag is on, and this is the state that means
          "nobody has written one yet" rather than "the section is broken" —
          which is why it is rendered at all instead of the component returning
          null. An empty section the owner is looking for is more useful than no
          section.
        */}
        {testimonials.length === 0 ? (
          <p className="mt-space-lg border border-border-subtle p-space-md font-body-sm text-body-sm text-text-muted">
            {labels.empty}
          </p>
        ) : (
          <ul className="mt-space-lg grid grid-cols-1 gap-space-lg md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.id}
                className="space-y-space-sm border border-border-subtle bg-surface-raised p-space-xl"
              >
                {/*
                  `figure` rather than a bare `<p>`: a quotation with attribution
                  is a figure in the accessibility tree, and a screen reader
                  announces it as one instead of as a run of sentences.
                */}
                <figure className="space-y-space-sm">
                  <blockquote className="font-editorial-quote text-editorial-quote text-text-primary">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="font-label-mono text-label-mono text-text-secondary">
                    {testimonial.authorName}
                    {/*
                      Rendered only when there is something to say. An empty
                      role or company line reads as a formatting failure, so the
                      attribution shows only the parts that exist.
                    */}
                    {testimonial.authorRole !== "" ? `, ${testimonial.authorRole}` : ""}
                    {testimonial.authorCompany !== "" ? ` · ${testimonial.authorCompany}` : ""}
                    {testimonial.linkUrl !== null ? (
                      <>
                        {" · "}
                        <a
                          href={testimonial.linkUrl}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="underline underline-offset-4 hover:text-primary-container"
                        >
                          {testimonial.linkUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </>
                    ) : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}

        {testimonials.length > 0 ? (
          <p className="sr-only" aria-live="polite">
            {labels.itemsLabel}: {testimonials.length}
          </p>
        ) : null}
      </div>
    </section>
  );
}