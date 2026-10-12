"use client";

import { useState } from "react";

import type { StackProfileSummary } from "@/domain/resume/resume-repository";
import type {
  TechnologyCatalogEntry,
  TechnologyCategory,
} from "@/domain/resume/resume-repository";
import { TechnologyPicker } from "@/components/admin/technology-picker";
import { useAdminWrite } from "@/components/admin/use-admin-write";

/**
 * The owner's stack-profile editor.
 *
 * ## What the two lists mean
 *
 * **Primary** is what the profile is *for*: those lead the skills section, and
 * their bullets are the ones that survive the filter. **Listed** is everything
 * else worth a line on the same page.
 *
 * That split is the feature. "Focus more on React, Node, TypeScript, JavaScript,
 * Next.js, NestJS and Express, but still list the others" is two instructions,
 * and one ordered list cannot carry both — React either buries the others or
 * shares the top with them.
 *
 * ## Why it stores slugs, not names
 *
 * A profile is about the tool, not about this locale's row for it, so one profile
 * serves both languages and renaming a member does not require re-saving every
 * profile. The label is assembled from the members at render time for the same
 * reason — a stored name would go stale the moment a member changed.
 */
export function StackProfileEditor({
  initialProfiles,
  catalog,
  categories,
  locale,
}: {
  initialProfiles: StackProfileSummary[];
  catalog: ReadonlyArray<TechnologyCatalogEntry>;
  categories: ReadonlyArray<TechnologyCategory>;
  locale: string;
}): React.ReactElement {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [draft, setDraft] = useState("");
  const { status, pending, notify, write } = useAdminWrite();

  const slugById = new Map(catalog.map((entry) => [entry.id, entry.slug]));
  const labelBySlug = new Map(catalog.map((entry) => [entry.slug, entry.label]));

  const describe = (slugs: readonly string[]): string =>
    slugs
      .map((slug) => labelBySlug.get(slug) ?? slug)
      .filter((label, index, all) => all.indexOf(label) === index)
      .join(" + ");

  const saveProfile = (slug: string, values: Partial<StackProfileSummary>): void => {
    void write(
      {
        kind: "update",
        table: "resume_stack_profile",
        id: profiles.find((profile) => profile.slug === slug)?.id ?? "",
        values,
      },
      "Saved.",
      () =>
        setProfiles((current) =>
          current.map((profile) => (profile.slug === slug ? { ...profile, ...values } : profile)),
        ),
    );
  };

  /** Moves a technology into `weight`, from whichever list it was in. */
  const setWeight = (slug: string, weight: "primary" | "listed", profileId: string, from: readonly string[]): void => {
    const technologySlug = profileSlugOf(slug, catalog);

    if (technologySlug === null) {
      return;
    }

    if (from.includes(technologySlug)) {
      void write(
        {
          kind: "deleteWhere",
          table: "resume_stack_profile_member",
          filters: { profile_id: profileId, technology_slug: technologySlug },
        },
        `Removed ${labelBySlug.get(technologySlug) ?? technologySlug}.`,
        () =>
          setProfiles((current) =>
            current.map((profile) =>
              profile.id === profileId
                ? {
                    ...profile,
                    primary: profile.primary.filter((entry) => entry !== technologySlug),
                    listed: profile.listed.filter((entry) => entry !== technologySlug),
                  }
                : profile,
            ),
          ),
      );
      return;
    }

    void write(
      {
        kind: "insert",
        table: "resume_stack_profile_member",
        values: { profile_id: profileId, technology_slug: technologySlug, weight, sort_order: 0 },
      },
      `Added ${labelBySlug.get(technologySlug) ?? technologySlug} to ${weight}.`,
      () =>
        setProfiles((current) =>
          current.map((profile) =>
            profile.id === profileId
              ? {
                  ...profile,
                  primary: weight === "primary" ? [...profile.primary, technologySlug] : profile.primary,
                  listed: weight === "listed" ? [...profile.listed, technologySlug] : profile.listed,
                }
              : profile,
          ),
        ),
    );
  };

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">Stack profiles</h2>
      <p className="mt-2 max-w-prose text-body-sm text-body-sm text-text-secondary">
        A profile is a named selection the résumé can be narrowed to — &ldquo;React + Node&rdquo;
        — not a second document. <strong>Primary</strong> leads the skills and survives the bullet
        filter; <strong>listed</strong> is shown without being promoted. A technology listed as
        primary also brings in what it is built on, so naming React and Node is enough to reach
        TypeScript and JavaScript.
      </p>

      {status === null ? null : (
        <p role="status" className="mt-3 border border-border-subtle p-space-sm text-body-sm text-text-secondary">
          {status}
        </p>
      )}

      <div className="mt-space-md flex flex-wrap items-end gap-2 border border-border-subtle p-space-sm">
        <label className="block">
          <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
            New profile slug
          </span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="react-node"
            className="mt-1 border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
          />
        </label>
        <button
          type="button"
          disabled={pending}
          className="border border-border-subtle px-3 py-1 text-body-sm text-text-primary"
          onClick={() => {
            const slug = draft.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

            if (slug === "") {
              notify("A profile needs a slug — it becomes the ?stack= value in the URL.");
              return;
            }

            if (profiles.some((profile) => profile.slug === slug)) {
              notify(`"${slug}" already exists.`);
              return;
            }

            void write(
              {
                kind: "insert",
                table: "resume_stack_profile",
                values: { slug, description: "", sort_order: profiles.length, surfaces: ["resume"] },
              },
              `Created "${slug}". Now choose what it promotes.`,
              (body) => {
                const id = String(body.entry?.["id"] ?? "");

                if (id === "") {
                  return;
                }

                setProfiles((current) => [
                  ...current,
                  { id, slug, label: slug, description: "", surfaces: ["resume"], primary: [], listed: [] },
                ]);
                setDraft("");
              },
            );
          }}
        >
          Create
        </button>
      </div>

      <ul className="mt-space-md space-y-2">
        {profiles.map((profile) => (
          <li key={profile.id} className="border border-border-subtle p-space-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-text-primary">{describe(profile.primary) || profile.slug}</span>
              <span className="text-body-sm text-text-secondary">
                ?stack={profile.slug}
                {profile.primary.length === 0
                  ? " — nothing promoted yet, so this view equals the full résumé"
                  : ` — promotes ${profile.primary.length}`}
              </span>
            </div>

            {profile.listed.length > 0 ? (
              <p className="mt-1 text-body-sm text-text-secondary">Also lists: {describe(profile.listed)}</p>
            ) : null}

            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
                  Primary
                </span>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {profile.primary.map((slug) => (
                    <li key={slug}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setWeight(slug, "listed", profile.id, profile.primary)}
                        className="border border-border-subtle px-2 py-0.5 text-body-sm text-text-secondary"
                        title="Demote to listed"
                      >
                        {labelBySlug.get(slug) ?? slug} ↓
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
                  Listed
                </span>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {profile.listed.map((slug) => (
                    <li key={slug}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setWeight(slug, "primary", profile.id, profile.listed)}
                        className="border border-border-subtle px-2 py-0.5 text-body-sm text-text-secondary"
                        title="Promote to primary"
                      >
                        {labelBySlug.get(slug) ?? slug} ↑
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="mt-2 block">
              <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
                Description (shown under the selector)
              </span>
              <input
                defaultValue={profile.description}
                onBlur={(event) => {
                  if (event.target.value !== profile.description) {
                    saveProfile(profile.slug, { description: event.target.value });
                  }
                }}
                className="mt-1 w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
              />
            </label>

            <TechnologyPicker
              label={`Add to ${profile.slug}`}
              technologies={catalog}
              categories={categories}
              selected={[]}
              disabled={pending}
              onToggle={(technology) =>
                setWeight(technology.slug, "primary", profile.id, [
                  ...profile.primary,
                  ...profile.listed,
                ])
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The catalog slug for a technology, or `null` if it is not in the catalog. */
function profileSlugOf(slug: string, catalog: ReadonlyArray<TechnologyCatalogEntry>): string | null {
  return catalog.some((entry) => entry.slug === slug) ? slug : null;
}