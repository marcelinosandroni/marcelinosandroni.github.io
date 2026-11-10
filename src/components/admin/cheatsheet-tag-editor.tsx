"use client";

import { useState } from "react";

import { useAdminWrite } from "@/components/admin/use-admin-write";

/**
 * The owner's cheatsheet tag editor.
 *
 * ## What this unlocks
 *
 * Tags are the cross-cutting labels that make a 120-term cheatsheet navigable:
 * "show me everything tagged `interview-frequent`" is a different question from
 * "show me everything in the Backend category", and the second is the only one
 * the page could answer before this editor existed.
 *
 * ## Why tags are a separate catalog rather than free text
 *
 * Free text produces "backend", "Backend", "back-end" and "Back End" as four
 * tags that are the same tag. A closed catalog means the owner picks from
 * existing tags, renames one in one place, and never has to remember whether
 * they spelled it with a hyphen last time.
 */
export function CheatsheetTagEditor({
  initialTags,
  initialTerms,
  locale,
}: {
  initialTags: ReadonlyArray<{ id: string; slug: string; label: string; color: string }>;
  initialTerms: ReadonlyArray<{ id: string; term: string; tags: string[] }>;
  locale: string;
}): React.ReactElement {
  const [tags, setTags] = useState(initialTags);
  const [terms, setTerms] = useState(initialTerms);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("primary");
  const { status, pending, write } = useAdminWrite("/api/admin/resume/variants");

  const COLORS = ["primary", "blue", "green", "purple", "orange", "red", "violet", "yellow", "rose", "cyan", "amber", "emerald", "indigo"];

  const toggleTag = (termId: string, tagSlug: string) => {
    const term = terms.find((t) => t.id === termId);
    if (!term) return;

    const hasTag = term.tags.includes(tagSlug);
    const newTags = hasTag
      ? term.tags.filter((t) => t !== tagSlug)
      : [...term.tags, tagSlug];

    void write(
      {
        kind: hasTag ? "deleteWhere" : "insert",
        table: hasTag ? "cheatsheet_term_tag" : "cheatsheet_term_tag",
        ...(hasTag
          ? { filters: { term_id: termId, tag_id: tags.find((t) => t.slug === tagSlug)?.id ?? "" } }
          : { values: { term_id: termId, tag_id: tags.find((t) => t.slug === tagSlug)?.id ?? "" } }),
      },
      hasTag ? "Tag removed." : "Tag added.",
      () => {
        setTerms((current) =>
          current.map((t) => (t.id === termId ? { ...t, tags: newTags } : t)),
        );
      },
    );
  };

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">Cheatsheet Tags</h2>
      <p className="mt-2 max-w-prose text-body-sm text-text-secondary">
        Tags are cross-cutting labels that make the cheatsheet navigable. A term can
        have multiple tags. Click a tag on a term to toggle it.
      </p>

      {status === null ? null : (
        <p
          role="status"
          className="mt-3 border border-border-subtle p-space-sm text-body-sm text-text-secondary"
        >
          {status}
        </p>
      )}

      {/* Tag catalog */}
      <div className="mt-space-md">
        <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
          Tag catalog ({tags.length})
        </h3>
        <div className="mt-space-sm flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 border border-border-subtle bg-surface-base px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.label}
              <span className="text-text-tertiary">({tag.slug})</span>
            </span>
          ))}
        </div>

        {creating ? (
          <div className="mt-space-sm border border-border-subtle bg-surface-base p-space-sm">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Slug (e.g. interview-frequent)"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              />
              <input
                type="text"
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              />
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="border border-border-subtle bg-surface-raised px-space-sm py-space-xs text-body-sm"
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (newSlug.trim() === "" || newLabel.trim() === "") return;
                  void write(
                    {
                      kind: "insert",
                      table: "cheatsheet_tag",
                      values: {
                        locale,
                        slug: newSlug.trim(),
                        label: newLabel.trim(),
                        color: newColor,
                        sort_order: tags.length,
                      },
                    },
                    "Tag created.",
                    (body) => {
                      const entry = body.entry as { id?: string } | undefined;
                      setTags((current) => [
                        ...current,
                        { id: entry?.id ?? crypto.randomUUID(), slug: newSlug.trim(), label: newLabel.trim(), color: newColor },
                      ]);
                      setCreating(false);
                      setNewSlug(""); setNewLabel(""); setNewColor("primary");
                    },
                  );
                }}
                className="border border-primary-container bg-primary-container px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-on-primary-container"
              >
                {pending ? "Saving…" : "Create tag"}
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
            className="mt-space-sm border border-border-subtle px-space-sm py-space-xs text-label-mono uppercase tracking-widest text-text-secondary hover:border-primary-container hover:text-text-primary"
          >
            + New tag
          </button>
        )}
      </div>

      {/* Term tagging */}
      <div className="mt-space-lg">
        <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
          Tag terms ({terms.length})
        </h3>
        <p className="mt-1 text-body-sm text-text-secondary">
          Click a tag on a term to toggle it. Tags are shared across all terms.
        </p>
        <ul className="mt-space-sm space-y-2">
          {terms.map((term) => (
            <li
              key={term.id}
              className="border border-border-subtle bg-surface-base p-space-sm"
            >
              <p className="font-label-mono text-label-mono text-text-primary">
                {term.term}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = term.tags.includes(tag.slug);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(term.id, tag.slug)}
                      className={`rounded border px-2 py-0.5 text-[10px] uppercase tracking-widest transition-colors ${
                        active
                          ? "border-primary-container bg-primary-container text-on-primary-container"
                          : "border-border-subtle bg-surface-base text-text-secondary hover:border-primary-container"
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
