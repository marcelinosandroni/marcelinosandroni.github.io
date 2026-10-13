"use client";

import { useState } from "react";

import type {
  EditorCaseStudy,
  EditorExperience,
  ExperienceEditorDocument,
} from "@/infrastructure/repositories/resume-writer";
import type { Surface } from "@/domain/resume/types";
import { TechnologyPicker } from "@/components/admin/technology-picker";
import { toggleTag, useAdminWrite } from "@/components/admin/use-admin-write";

/**
 * The owner's experience editor.
 *
 * ## What this unlocks
 *
 * A targeted résumé can only keep the bullets that say what they used. Until
 * there is a way to say that, `highlight_technology` is a table with no rows and
 * the focused view has nothing to filter on — the catalog exists, but nothing
 * points at it from the document.
 *
 * So this is the missing half of the catalog migration: not "what tools exist"
 * but "which of them did this role use, and which did this specific bullet
 * describe".
 *
 * ## Why tagging is per bullet and not only per role
 *
 * Because the role-level answer is the easy one and the useless one. Every role
 * that used Kafka has Kafka as a chip, so a résumé filtered on role-level chips
 * would keep every bullet of every role that touched Kafka — including the ones
 * about the deployment pipeline. Tagging the bullet is what lets the Kafka
 * version keep three of five and drop the other two, which is the whole point.
 *
 * ## Why nothing here autosaves
 *
 * Same contract as the other editors. A résumé write touches the document of
 * record, has no undo and no version history, and a silent mis-click is something
 * the owner finds on the public page later, in front of a recruiter.
 */
export function ExperienceEditor({
  initialDocument,
  locale,
}: {
  initialDocument: ExperienceEditorDocument;
  locale: string;
}): React.ReactElement {
  const [experiences, setExperiences] = useState(initialDocument.experiences);
  const [open, setOpen] = useState<string | null>(initialDocument.experiences[0]?.id ?? null);
  const { status, pending, write } = useAdminWrite();

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">Experience</h2>
      <p className="mt-2 max-w-prose text-body-sm text-body-sm text-text-secondary">
        Each role, its bullets, and the stacks behind both. Tagging a bullet with the tools it
        describes is what lets a résumé focused on one stack keep that bullet and drop the rest —
        an untagged bullet is kept everywhere, because guessing that it is irrelevant is worse than
        showing it.
      </p>

      {status === null ? null : (
        <p
          role="status"
          className="mt-3 border border-border-subtle p-space-sm text-body-sm text-text-secondary"
        >
          {status}
        </p>
      )}

      <ul className="mt-space-md space-y-2">
        {experiences.map((experience) => (
          <li key={experience.id}>
            <ExperiencePanel
              experience={experience}
              document={initialDocument}
              locale={locale}
              pending={pending}
              expanded={open === experience.id}
              onToggleExpand={() => setOpen((current) => (current === experience.id ? null : experience.id))}
              onChange={(next) =>
                setExperiences((current) =>
                  current.map((candidate) => (candidate.id === experience.id ? next : candidate)),
                )
              }
              write={write}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExperiencePanel({
  experience,
  document: doc,
  locale,
  pending,
  expanded,
  onToggleExpand,
  onChange,
  write,
}: {
  experience: EditorExperience;
  document: ExperienceEditorDocument;
  locale: string;
  pending: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (next: EditorExperience) => void;
  write: ReturnType<typeof useAdminWrite>["write"];
}): React.ReactElement {
  const patchExperience = (values: Record<string, unknown>): void => {
    void write(
      { kind: "update", table: "resume_experience", id: experience.id, values },
      "Saved.",
      () => onChange({ ...experience, ...values } as EditorExperience),
    );
  };

  const toggleExperienceSurface = (surface: Surface): void =>
    patchExperience({
      surfaces: experience.surfaces.includes(surface)
        ? experience.surfaces.filter((candidate) => candidate !== surface)
        : [...experience.surfaces, surface],
    });

  const taggedHighlights = experience.highlights.filter((h) => h.technologyIds.length > 0).length;

  return (
    <div className="border border-border-subtle p-space-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <button type="button" onClick={onToggleExpand} className="text-left">
          <span className="text-text-primary">{experience.company}</span>
          <span className="ml-2 text-text-secondary">{experience.role}</span>
        </button>
        <span className="text-body-sm text-text-secondary">
          {experience.period} · {experience.highlights.length} bullets ({taggedHighlights} tagged) ·{" "}
          {experience.caseStudies.length} cases
        </span>
      </div>

      {expanded ? (
        <div className="mt-space-sm space-y-space-sm border-t border-border-subtle pt-space-sm">
          <div className="grid gap-2 md:grid-cols-2">
            {(
              [
                ["role", "Role"],
                ["period", "Period"],
                ["location", "Location"],
                ["scope", "Scope"],
              ] as const
            ).map(([field, caption]) => (
              <label key={field} className="block">
                <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
                  {caption}
                </span>
                <input
                  defaultValue={experience[field]}
                  onBlur={(event) => {
                    if (event.target.value !== experience[field]) {
                      patchExperience({ [field]: event.target.value });
                    }
                  }}
                  className="mt-1 w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Summary
            </span>
            <textarea
              defaultValue={experience.summary}
              rows={3}
              onBlur={(event) => {
                if (event.target.value !== experience.summary) {
                  patchExperience({ summary: event.target.value });
                }
              }}
              className="mt-1 w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
            />
          </label>

          <div className="flex gap-4">
            {(["home", "resume"] as const).map((surface) => (
              <label key={surface} className="flex items-center gap-1 text-body-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={experience.surfaces.includes(surface)}
                  disabled={pending}
                  onChange={() => toggleExperienceSurface(surface)}
                />
                On the {surface === "home" ? "home page" : "résumé"}
              </label>
            ))}
          </div>

          {/* --- Role stack ------------------------------------------------- */}
          <section className="border border-border-subtle p-2">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Stack used in this role
            </span>
            <ul className="mt-1 flex flex-wrap gap-1">
              {experience.technologies.map((chip) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    disabled={pending}
                    title="Remove from this role"
                    onClick={() =>
                      void write(
                        { kind: "delete", table: "resume_technology", id: chip.id },
                        `Removed "${chip.label}" from ${experience.company}.`,
                        () =>
                          onChange({
                            ...experience,
                            technologies: experience.technologies.filter((c) => c.id !== chip.id),
                          }),
                      )
                    }
                    className="border border-border-subtle px-2 py-0.5 text-body-sm text-text-secondary"
                  >
                    {chip.label} ×
                  </button>
                </li>
              ))}
            </ul>

            <ChipAdder
              experience={experience}
              doc={doc}
              locale={locale}
              pending={pending}
              onAdded={(label, id) =>
                onChange({
                  ...experience,
                  technologies: [
                    ...experience.technologies,
                    { id, label, sortOrder: experience.technologies.length, technologyId: id },
                  ],
                })
              }
              write={write}
            />
          </section>

          {/* --- Bullets ---------------------------------------------------- */}
          <section className="border border-border-subtle p-2">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Bullets
            </span>
            <ul className="mt-2 space-y-2">
              {experience.highlights.map((highlight) => (
                <li key={highlight.id} className="border border-border-subtle p-2">
                  <textarea
                    defaultValue={highlight.body}
                    rows={3}
                    disabled={pending}
                    onBlur={(event) => {
                      if (event.target.value !== highlight.body) {
                        void write(
                          { kind: "update", table: "resume_highlight", id: highlight.id, values: { body: event.target.value } },
                          "Saved.",
                          () =>
                            onChange({
                              ...experience,
                              highlights: experience.highlights.map((h) =>
                                h.id === highlight.id ? { ...h, body: event.target.value } : h,
                              ),
                            }),
                        );
                      }
                    }}
                    className="w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
                  />

                  <TechnologyPicker
                    label="Technologies this bullet describes"
                    technologies={doc.catalog.technologies}
                    categories={doc.catalog.categories}
                    selected={highlight.technologyIds}
                    disabled={pending}
                    onToggle={(technology) =>
                      void write(
                        toggleTag(
                          "highlight_technology",
                          "highlight_id",
                          highlight.id,
                          technology.id,
                          highlight.technologyIds.includes(technology.id),
                        ),
                        highlight.technologyIds.includes(technology.id) ? "Untagged." : "Tagged.",
                        () =>
                          onChange({
                            ...experience,
                            highlights: experience.highlights.map((h) =>
                              h.id !== highlight.id
                                ? h
                                : {
                                    ...h,
                                    technologyIds: toggle(h.technologyIds, technology.id),
                                  },
                            ),
                          }),
                      )
                    }
                  />

                  <button
                    type="button"
                    disabled={pending}
                    className="mt-2 text-body-sm text-text-secondary"
                    onClick={() =>
                      void write(
                        { kind: "delete", table: "resume_highlight", id: highlight.id },
                        "Bullet removed.",
                        () =>
                          onChange({
                            ...experience,
                            highlights: experience.highlights.filter((h) => h.id !== highlight.id),
                          }),
                      )
                    }
                  >
                    Delete bullet
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={pending}
              className="mt-2 border border-border-subtle px-2 py-1 text-body-sm text-text-primary"
              onClick={() =>
                void write(
                  {
                    kind: "insert",
                    table: "resume_highlight",
                    values: {
                      experience_id: experience.id,
                      locale,
                      body: "",
                      sort_order: experience.highlights.length,
                    },
                  },
                  "Bullet added — write it below.",
                  (body) =>
                    onChange({
                      ...experience,
                      highlights: [
                        ...experience.highlights,
                        {
                          id: String(body.entry?.["id"] ?? ""),
                          body: "",
                          sortOrder: experience.highlights.length,
                          technologyIds: [],
                        },
                      ],
                    }),
                )
              }
            >
              Add bullet
            </button>
          </section>

          {/* --- Case studies ----------------------------------------------- */}
          <section className="border border-border-subtle p-2">
            <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Case studies
            </span>
            <ul className="mt-2 space-y-2">
              {experience.caseStudies.map((caseStudy) => (
                <li key={caseStudy.id}>
                  <CaseStudyPanel
                    caseStudy={caseStudy}
                    experience={experience}
                    doc={doc}
                    pending={pending}
                    onChange={(next) =>
                      onChange({
                        ...experience,
                        caseStudies: experience.caseStudies.map((c) =>
                          c.id === caseStudy.id ? next : c,
                        ),
                      })
                    }
                    write={write}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function CaseStudyPanel({
  caseStudy,
  experience,
  doc,
  pending,
  onChange,
  write,
}: {
  caseStudy: EditorCaseStudy;
  experience: EditorExperience;
  doc: ExperienceEditorDocument;
  pending: boolean;
  onChange: (next: EditorCaseStudy) => void;
  write: ReturnType<typeof useAdminWrite>["write"];
}): React.ReactElement {
  const patch = (values: Record<string, unknown>): void => {
    void write(
      { kind: "update", table: "resume_case_study", id: caseStudy.id, values },
      "Saved.",
      () => onChange({ ...caseStudy, ...values } as EditorCaseStudy),
    );
  };

  return (
    <div className="border border-border-subtle p-2">
      <input
        defaultValue={caseStudy.title}
        placeholder="Case study title"
        disabled={pending}
        onBlur={(event) => {
          if (event.target.value !== caseStudy.title) {
            patch({ title: event.target.value });
          }
        }}
        className="w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
      />

      {(["challenge", "solution", "result"] as const).map((field) => (
        <textarea
          key={field}
          defaultValue={caseStudy[field]}
          placeholder={field}
          rows={2}
          disabled={pending}
          onBlur={(event) => {
            if (event.target.value !== caseStudy[field]) {
              patch({ [field]: event.target.value });
            }
          }}
          className="mt-1 w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
        />
      ))}

      <TechnologyPicker
        label="Technologies in this case"
        technologies={doc.catalog.technologies}
        categories={doc.catalog.categories}
        selected={caseStudy.technologyIds}
        disabled={pending}
        onToggle={(technology) =>
          void write(
            toggleTag(
              "case_study_technology",
              "case_study_id",
              caseStudy.id,
              technology.id,
              caseStudy.technologyIds.includes(technology.id),
            ),
            caseStudy.technologyIds.includes(technology.id) ? "Untagged." : "Tagged.",
            () =>
              onChange({
                ...caseStudy,
                technologyIds: toggle(caseStudy.technologyIds, technology.id),
              }),
          )
        }
      />

      {/* --- Imagery ------------------------------------------------------- */}
      <div className="mt-2 border border-border-subtle p-2">
        <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
          Images (optional)
        </span>
        <p className="mt-1 text-body-sm text-text-secondary">
          Zero is the normal case and renders nothing. A path under <code>public/</code>, or an
          https URL. Alt text is not optional — an image a screen reader cannot describe is an
          image a recruiter cannot use.
        </p>

        <ul className="mt-2 space-y-2">
          {caseStudy.media.map((item) => (
            <li key={item.id} className="grid gap-1 md:grid-cols-2">
              <input
                defaultValue={item.url}
                placeholder="/images/case-study.png"
                disabled={pending}
                onBlur={(event) => {
                  if (event.target.value !== item.url) {
                    void write(
                      { kind: "update", table: "case_study_media", id: item.id, values: { url: event.target.value } },
                      "Saved.",
                      () => onChange({ ...caseStudy, media: caseStudy.media.map((m) => (m.id === item.id ? { ...m, url: event.target.value } : m)) }),
                    );
                  }
                }}
                className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
              />
              <input
                defaultValue={item.alt}
                placeholder="alt text"
                disabled={pending}
                onBlur={(event) => {
                  if (event.target.value !== item.alt) {
                    void write(
                      { kind: "update", table: "case_study_media", id: item.id, values: { alt: event.target.value } },
                      "Saved.",
                      () => onChange({ ...caseStudy, media: caseStudy.media.map((m) => (m.id === item.id ? { ...m, alt: event.target.value } : m)) }),
                    );
                  }
                }}
                className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
              />
              <button
                type="button"
                disabled={pending}
                className="text-body-sm text-text-secondary"
                onClick={() =>
                  void write(
                    { kind: "delete", table: "case_study_media", id: item.id },
                    "Image removed.",
                    () => onChange({ ...caseStudy, media: caseStudy.media.filter((m) => m.id !== item.id) }),
                  )
                }
              >
                Remove image
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={pending}
          className="mt-2 border border-border-subtle px-2 py-1 text-body-sm text-text-primary"
          onClick={() =>
            void write(
              {
                kind: "insert",
                table: "case_study_media",
                values: {
                  case_study_id: caseStudy.id,
                  locale: "pt-BR",
                  url: "",
                  alt: "",
                  caption: "",
                  surfaces: ["resume"],
                  sort_order: caseStudy.media.length,
                },
              },
              "Image slot added.",
              (body) =>
                onChange({
                  ...caseStudy,
                  media: [
                    ...caseStudy.media,
                    {
                      id: String(body.entry?.["id"] ?? ""),
                      url: "",
                      alt: "",
                      caption: "",
                      sortOrder: caseStudy.media.length,
                      surfaces: ["resume"],
                    },
                  ],
                }),
            )
          }
        >
          Add image
        </button>
      </div>

      <p className="mt-2 text-body-sm text-text-secondary">
        In {experience.company}. {caseStudy.metrics.length} metric(s).
      </p>
    </div>
  );
}

function ChipAdder({
  experience,
  doc,
  locale,
  pending,
  onAdded,
  write,
}: {
  experience: EditorExperience;
  doc: ExperienceEditorDocument;
  locale: string;
  pending: boolean;
  onAdded: (label: string, id: string) => void;
  write: ReturnType<typeof useAdminWrite>["write"];
}): React.ReactElement {
  const [adding, setAdding] = useState(false);

  const linked = new Set(
    experience.technologies.map((chip) => chip.technologyId).filter((id): id is string => id !== null),
  );

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setAdding((value) => !value)}
        className="mt-2 text-body-sm text-text-primary"
      >
        {adding ? "Cancel" : "+ add a technology to this role"}
      </button>

      {adding ? (
        <TechnologyPicker
          label="Add to this role"
          technologies={doc.catalog.technologies.filter((entry) => !linked.has(entry.id))}
          categories={doc.catalog.categories}
          selected={[]}
          disabled={pending}
          onToggle={(technology) => {
            setAdding(false);

            void write(
              {
                kind: "insert",
                table: "resume_technology",
                values: {
                  experience_id: experience.id,
                  locale,
                  label: technology.label,
                  technology_id: technology.id,
                  sort_order: experience.technologies.length,
                },
              },
              `Added "${technology.label}" to ${experience.company}. It is on the résumé, the PDF and this role.`,
              (body) => onAdded(technology.label, String(body.entry?.["id"] ?? technology.id)),
            );
          }}
        />
      ) : null}
    </>
  );
}

function toggle(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((candidate) => candidate !== value) : [...values, value];
}