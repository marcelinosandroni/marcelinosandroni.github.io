"use client";

import { useMemo, useState } from "react";

import type {
  TechnologyCatalogEntry,
  TechnologyCategory,
} from "@/domain/resume/resume-repository";

/**
 * Picks technologies out of the catalog.
 *
 * ## Why a search box and not a long checkbox list
 *
 * The catalog is 120 rows and growing. A scrolling wall of them would make
 * tagging a bullet slower than writing the bullet, and the feature would be used
 * once and abandoned. Searching by label is what makes "which of these 120 is
 * the one I used for the message queue" a two-keystroke question.
 *
 * ## Why categories are shown while typing
 *
 * Because the category is the only context that distinguishes "Redis" (a cache,
 * under Data) from "Redis" (a cache, under Backend Core) if the owner ever files
 * it twice — and because it lets the owner see at a glance whether the thing they
 * are about to tag belongs where they think it does.
 *
 * ## Why it renders only what was asked for
 *
 * The catalog is filtered by a substring match on label, slug and alias, and the
 * result is capped. A cap is not a performance measure — it is a claim: after
 * typing "re", "React", "Redis", "Redux" and "Red Hat" are all equally correct
 * answers, and a list of four hundred is a list nobody reads.
 */
export function TechnologyPicker({
  technologies,
  categories,
  selected,
  onToggle,
  label,
  disabled = false,
}: {
  technologies: readonly TechnologyCatalogEntry[];
  categories: readonly TechnologyCategory[];
  selected: readonly string[];
  onToggle: (technology: TechnologyCatalogEntry) => void;
  label: string;
  disabled?: boolean;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const pool = needle === ""
      ? technologies
      : technologies.filter((entry) =>
          [entry.label, entry.slug, ...entry.aliases].some((value) =>
            value.toLowerCase().includes(needle),
          ),
        );

    return pool.slice(0, 40);
  }, [technologies, query]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, TechnologyCatalogEntry[]>();

    for (const entry of matches) {
      const bucket = byCategory.get(entry.categoryId) ?? [];

      bucket.push(entry);
      byCategory.set(entry.categoryId, bucket);
    }

    return [...byCategory.entries()].map(([id, entries]) => ({
      category: categories.find((candidate) => candidate.id === id) ?? null,
      entries,
    }));
  }, [matches, categories]);

  return (
    <div className="border border-border-subtle p-2">
      <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
        {label}
      </span>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="filter technologies"
        disabled={disabled}
        aria-label={`${label}: filter technologies`}
        className="mt-1 w-full border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
      />

      {query.trim() === "" && selected.length === 0 ? (
        <p className="mt-1 text-body-sm text-text-secondary">
          Nothing tagged yet. A focused résumé can only keep the bullets that say what they used —
          an untagged bullet is kept in every version.
        </p>
      ) : null}

      <div className="mt-2 max-h-64 overflow-y-auto">
        {grouped.length === 0 ? (
          <p className="text-body-sm text-text-secondary">Nothing matches “{query}”.</p>
        ) : (
          grouped.map(({ category, entries }) => (
            <div key={category?.id ?? "unfiled"} className="mb-2">
              <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
                {category?.label ?? "Unfiled"}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {entries.map((entry) => {
                  const on = selectedSet.has(entry.id);

                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={on}
                        onClick={() => onToggle(entry)}
                        title={entry.aliases.length > 0 ? `Also: ${entry.aliases.join(", ")}` : undefined}
                        className={`border px-2 py-0.5 text-body-sm ${
                          on
                            ? "border-primary-container text-text-primary"
                            : "border-border-subtle text-text-secondary"
                        }`}
                      >
                        {entry.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {query.trim() !== "" && matches.length === 40 ? (
        <p className="mt-1 text-body-sm text-text-secondary">
          Showing the first 40. Keep typing to narrow it.
        </p>
      ) : null}
    </div>
  );
}