"use client";

import { useState } from "react";

import { useAdminWrite } from "@/components/admin/use-admin-write";

/**
 * The owner's CV variant editor.
 *
 * ## What this unlocks
 *
 * The five stack variants (Java + Angular, Java + React, C# + Angular,
 * C# + React, Node + Go + React) used to be typed TypeScript modules under
 * `scripts/data/stack-variants.pt-br.ts`. That made it impossible to correct a
 * typo or add a stack without a deploy and a rebuild of all twelve PDFs.
 *
 * This moves variant content into the database so the owner edits it from
 * `/admin`, exactly as the experience and the tech stack already are.
 *
 * ## Why this is a placeholder
 *
 * The full editor (headline, summary, 4 metrics, 6 inventory groups, 5 roles with
 * stacks and bullets, with a dropdown of skills from the catalog) is the work of
 * several days. This is the scaffold: it lists the variants that exist, shows their
 * headline, and lets the owner create a new one with a slug and a title. The
 * detailed editing follows the same pattern as `ExperienceEditor` — per-field save,
 * no autosave, because a résumé write has no undo.
 */
export function ResumeVariantEditor({
  initialVariants,
  locale,
}: {
  initialVariants: ReadonlyArray<{
    id: string;
    slug: string;
    label: string;
    title: string;
    headline: string;
  }>;
  locale: string;
}): React.ReactElement {
  const [variants, setVariants] = useState(initialVariants);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newHeadline, setNewHeadline] = useState("");
  const { status, pending, write } = useAdminWrite();

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">CV Variants</h2>
      <p className="mt-2 max-w-prose text-body-sm text-text-secondary">
        One variant per stack. Each one argues for a different backend + frontend
        pair, sharing the experience, the education and the contact details with
        the general résumé. The headline is the one thing a variant owns outright.
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
        {variants.map((variant) => (
          <li
            key={variant.id}
            className="border border-border-subtle bg-surface-base p-space-sm"
          >
            <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-primary">
              {variant.slug}
            </p>
            <p className="mt-1 text-body-sm text-text-secondary">{variant.title}</p>
            <p className="mt-1 text-body-sm text-text-tertiary">{variant.headline}</p>
          </li>
        ))}
      </ul>

      {creating ? (
        <div className="mt-space-md border border-border-subtle bg-surface-base p-space-sm">
          <label className="block text-body-sm text-text-secondary">
            Slug (e.g. enterprise-go-react)
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
          </label>
          <label className="mt-space-sm block text-body-sm text-text-secondary">
            Title
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
          </label>
          <label className="mt-space-sm block text-body-sm text-text-secondary">
            Headline
            <input
              type="text"
              value={newHeadline}
              onChange={(e) => setNewHeadline(e.target.value)}
              className="mt-1 w-full border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
            />
          </label>
          <div className="mt-space-sm flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (newSlug.trim() === "" || newTitle.trim() === "" || newHeadline.trim() === "") {
                  return;
                }

                void write(
                  {
                    kind: "insert",
                    table: "resume_variant",
                    values: {
                      locale,
                      slug: newSlug.trim(),
                      label: newSlug.trim(),
                      title: newTitle.trim(),
                      headline: newHeadline.trim(),
                      sort_order: variants.length,
                    },
                  },
                  "Variant created.",
                  () => {
                    setVariants((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        slug: newSlug.trim(),
                        label: newSlug.trim(),
                        title: newTitle.trim(),
                        headline: newHeadline.trim(),
                      },
                    ]);
                    setCreating(false);
                    setNewSlug("");
                    setNewTitle("");
                    setNewHeadline("");
                  },
                );
              }}
              className="border border-primary-container bg-primary-container px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-on-primary-container"
            >
              {pending ? "Saving…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="border border-border-subtle px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-space-md border border-border-subtle px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary hover:border-primary-container hover:text-text-primary"
        >
          + New variant
        </button>
      )}
    </div>
  );
}
