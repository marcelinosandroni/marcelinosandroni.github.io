"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import type {
  TechnologyCatalog,
  TechnologyCatalogEntry,
  TechnologyCategory,
} from "@/domain/resume/resume-repository";
import { suspectedDuplicates, technologySlug } from "@/domain/resume/technology";
import type { Surface } from "@/domain/resume/types";
import { toSurfaces } from "@/domain/resume/types";

/**
 * Turns a row from the API into the shape this component holds.
 *
 * ## Why the row is not used directly
 *
 * PostgREST answers with the column names as the database stores them:
 * `category_id`, `is_published`, `sort_order`. The editor holds camelCase, and
 * spreading the row across the state would put an entry whose `categoryId` is
 * `undefined` into a list grouped by `categoryId` — which renders it in no
 * category at all, immediately after the owner added it and watched it vanish.
 *
 * The fallback is used only when the server sent nothing usable. An empty id
 * makes the chip read-only in practice (every later write names it) which is
 * visibly broken, and a broken chip is better than a silently unfiled one.
 */
function toEntry(
  row: Record<string, unknown> | undefined,
  fallback: TechnologyCatalogEntry,
): TechnologyCatalogEntry {
  if (row === undefined || typeof row["id"] !== "string") {
    return fallback;
  }

  return {
    id: row["id"],
    slug: String(row["slug"] ?? fallback.slug),
    label: String(row["label"] ?? fallback.label),
    categoryId: String(row["category_id"] ?? fallback.categoryId),
    categorySlug: fallback.categorySlug,
    categoryLabel: fallback.categoryLabel,
    aliases: Array.isArray(row["aliases"])
      ? (row["aliases"] as unknown[]).filter((a): a is string => typeof a === "string")
      : fallback.aliases,
    surfaces: Array.isArray(row["surfaces"])
      ? toSurfaces(row["surfaces"] as string[])
      : fallback.surfaces,
    isPublished: row["is_published"] !== false,
    sortOrder: typeof row["sort_order"] === "number" ? row["sort_order"] : fallback.sortOrder,
  };
}

/**
 * The owner's technology catalog editor.
 *
 * ## What this is for
 *
 * A tool becomes an entity once, and from then on it can be attached to a role, a
 * bullet, a skill and a case study. This is where that happens. The specific job
 * it does that nothing else can is **adding a tool in one place** — the request
 * that motivated the catalog was "I add NestJS and it should show up in the
 * résumé and the PDF", and that is only true if the addition is made once, here,
 * rather than typed into every role.
 *
 * ## Why it warns about duplicates instead of merging them
 *
 * Because "Node.js (NestJS)" and "NestJS" are one tool, and "Java" and "Java
 * Spring Boot" are two. A merge repoints every link — chips, skills, bullets —
 * so guessing wrong does not produce a wrong list, it produces a résumé that
 * quietly credits the wrong technology to a job. The diagnostic points; the
 * owner decides.
 *
 * ## Why every mutation is explicit
 *
 * Same contract as the stack editor above it: a résumé write touches the
 * document of record, has no undo, and a silent mis-click is something the owner
 * finds on the public page, later, in front of a recruiter. No autosave, no
 * optimistic UI.
 */
export function TechnologyCatalogEditor({
  initialCatalog,
  locale,
}: {
  initialCatalog: TechnologyCatalog;
  locale: string;
}): React.ReactElement {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState({ label: "", categoryId: initialCatalog.categories[0]?.id ?? "" });
  const [showDuplicates, setShowDuplicates] = useState(true);

  const duplicates = useMemo(
    () => suspectedDuplicates(initialCatalog.technologies.map((entry) => ({ label: entry.label }))),
    [initialCatalog.technologies],
  );

  /**
   * Performs one write and hands the server's answer to the caller.
   *
   * `mutate` receives the response body rather than closing over it, because the
   * caller needs a value that only exists *after* the request — an insert's
   * generated id. A closure that read `body` would be reading a variable from an
   * enclosing scope it no longer owns, and the id would be `undefined` at exactly
   * the moment the editor needs it.
   */
  const write = useCallback(
    async (
      payload: Record<string, unknown>,
      successMessage: string,
      mutate: (body: { entry?: TechnologyCatalogEntry }) => void,
    ): Promise<void> => {
      setStatus("Saving…");

      const response = await fetch("/api/admin/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = (await response.json().catch(() => ({}))) as {
        error?: string;
        entry?: TechnologyCatalogEntry;
      };

      if (!response.ok) {
        // The three causes need three different responses from the owner: no
        // session, no database, or a rejected payload. "Something went wrong"
        // answers none of them.
        setStatus(`Not saved: ${raw.error ?? response.status}`);
        return;
      }

      mutate(raw);
      setStatus(successMessage);
    },
    [],
  );

  const addTechnology = (): void => {
    const label = draft.label.trim();

    if (label === "" || draft.categoryId === "") {
      setStatus("A technology needs a label and a category.");
      return;
    }

    const slug = technologySlug(label);

    if (initialCatalog.technologies.some((entry) => entry.slug === slug)) {
      setStatus(`"${label}" already exists (slug "${slug}").`);
      return;
    }

    void write(
      {
        kind: "insert",
        table: "technology",
        values: {
          category_id: draft.categoryId,
          locale,
          slug,
          label,
          aliases: [],
          surfaces: ["resume"],
          sort_order: initialCatalog.technologies.length,
        },
      },
      `Added "${label}". Attach it to roles and bullets from the résumé editor.`,
      (body) => {
        // The server returns the created row so the id is real rather than
        // guessed. Re-reading the catalog instead would be a second round trip
        // that could disagree with the row just written.
        setCatalog((current) => ({
          categories: current.categories,
          technologies: [
            ...current.technologies,
            toEntry(body.entry, {
              id: "",
              slug,
              label,
              categoryId: draft.categoryId,
              categorySlug: null,
              categoryLabel: null,
              aliases: [],
              surfaces: ["resume"],
              isPublished: true,
              sortOrder: current.technologies.length,
            }),
          ],
        }));
        setDraft({ label: "", categoryId: draft.categoryId });
      },
    );
  };

  const update = (entry: TechnologyCatalogEntry, values: Record<string, unknown>): void => {
    void write(
      { kind: "update", table: "technology", id: entry.id, values },
      "Saved.",
      () =>
        setCatalog((current) => ({
          categories: current.categories,
          technologies: current.technologies.map((candidate) =>
            candidate.id === entry.id ? { ...candidate, ...values } : candidate,
          ),
        })),
    );
  };

  const byCategory = useMemo(
    () =>
      catalog.categories.map((category) => ({
        category,
        entries: catalog.technologies.filter((entry) => entry.categoryId === category.id),
      })),
    [catalog],
  );

  const orphans = catalog.technologies.filter(
    (entry) => !catalog.categories.some((category) => category.id === entry.categoryId),
  );

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">Technology catalog</h2>
      <p className="mt-2 max-w-prose text-body-sm text-body-sm text-text-secondary">
        Each tool is one entry. Everything else in the résumé — a role&apos;s chips, a bullet, a
        skill, a case study — points at it, so adding a tool here is the only time you have to
        add it. {catalog.technologies.length} in {catalog.categories.length} categories.
      </p>

      {status === null ? null : (
        <p role="status" className="mt-3 border border-border-subtle p-space-sm text-body-sm text-text-secondary">
          {status}
        </p>
      )}

      {/* --- Add ------------------------------------------------------- */}
      <div className="mt-space-md border border-border-subtle p-space-sm">
        <label className="block font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
          New technology
        </label>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={draft.label}
            onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            placeholder="NestJS"
            className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
          />
          <select
            value={draft.categoryId}
            onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}
            className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
          >
            {catalog.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addTechnology}
            disabled={pending}
            className="border border-border-subtle px-3 py-1 text-body-sm text-text-primary"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-body-sm text-text-secondary">
          Slug: <code>{technologySlug(draft.label) || "—"}</code>. It appears on the résumé but not on
          the home page until you tick it below, because a twentieth chip in the arsenal reads as
          padding.
        </p>
      </div>

      {/* --- Duplicates ------------------------------------------------- */}
      {duplicates.length === 0 ? null : (
        <div className="mt-space-md border border-primary-container p-space-sm">
          <button
            type="button"
            onClick={() => setShowDuplicates((value) => !value)}
            className="text-left font-label-mono text-label-mono uppercase tracking-widest text-text-primary"
          >
            {showDuplicates ? "Hide" : "Show"} {duplicates.length} possible duplicate
            {duplicates.length === 1 ? "" : "s"}
          </button>
          {showDuplicates ? (
            <div className="mt-2">
              <p className="text-body-sm text-text-secondary">
                The same tool written two ways. Left alone, a résumé focused on one of them will
                only show the roles whose label happened to use that spelling. Merging repoints
                every link, so this is yours to confirm — these are not changed automatically.
              </p>
              <ul className="mt-2 list-disc pl-5 text-body-sm text-text-secondary">
                {duplicates.map(([a, b]) => (
                  <li key={`${a}|${b}`}>
                    {a} · {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* --- By category ------------------------------------------------ */}
      {byCategory.map(({ category, entries }) => (
        <CategorySection
          key={category.id}
          category={category}
          entries={entries}
          onUpdate={update}
        />
      ))}

      {orphans.length === 0 ? null : (
        <div className="mt-space-md border border-primary-container p-space-sm">
          <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-primary">
            {orphans.length} unfiled
          </p>
          <p className="mt-1 text-body-sm text-text-secondary">
            Their category was deleted. They still render; they just belong nowhere.
          </p>
        </div>
      )}
    </div>
  );
}

function CategorySection({
  category,
  entries,
  onUpdate,
}: {
  category: TechnologyCategory;
  entries: readonly TechnologyCatalogEntry[];
  onUpdate: (entry: TechnologyCatalogEntry, values: Record<string, unknown>) => void;
}): React.ReactElement {
  return (
    <section className="mt-space-md">
      <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
        {category.label} <span className="opacity-60">({entries.length})</span>
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <TechnologyChip entry={entry} onUpdate={onUpdate} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TechnologyChip({
  entry,
  onUpdate,
}: {
  entry: TechnologyCatalogEntry;
  onUpdate: (entry: TechnologyCatalogEntry, values: Record<string, unknown>) => void;
}): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(entry.label);
  const [aliases, setAliases] = useState(entry.aliases.join(", "));

  const toggle = (surface: Surface): void =>
    onUpdate(entry, {
      surfaces: entry.surfaces.includes(surface)
        ? entry.surfaces.filter((candidate) => candidate !== surface)
        : [...entry.surfaces, surface],
    });

  return (
    <div
      className={`border px-2 py-1 text-body-sm ${
        entry.isPublished ? "border-border-subtle" : "border-primary-container opacity-70"
      }`}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEditing((value) => !value)} className="text-text-primary">
          {entry.label}
        </button>

        {(["home", "resume"] as const).map((surface) => (
          <label key={surface} className="flex items-center gap-1 text-body-sm text-text-secondary">
            <input
              type="checkbox"
              checked={entry.surfaces.includes(surface)}
              onChange={() => toggle(surface)}
            />
            {surface === "home" ? "Home" : "Résumé"}
          </label>
        ))}

        <button
          type="button"
          onClick={() => onUpdate(entry, { is_published: !entry.isPublished })}
          className="text-text-secondary"
          title={
            entry.isPublished
              ? "Retire: keeps every link, disappears from the pickers"
              : "Restore"
          }
        >
          {entry.isPublished ? "Retire" : "Restore"}
        </button>
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-1 border-t border-border-subtle pt-2">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
          />
          <input
            value={aliases}
            onChange={(event) => setAliases(event.target.value)}
            placeholder="aliases, comma separated — k8s, Amazon EKS"
            className="border border-border-subtle bg-surface-base px-2 py-1 text-body-sm text-text-primary"
          />
          <p className="text-body-sm text-text-secondary">
            Aliases are what a job posting calls the same thing. A posting asking for &ldquo;k8s&rdquo;
            or &ldquo;Amazon EKS&rdquo; will match this entry only if you add them here.
          </p>
          <button
            type="button"
            onClick={() => {
              onUpdate(entry, {
                label: label.trim(),
                aliases: aliases
                  .split(",")
                  .map((value) => value.trim())
                  .filter((value) => value !== ""),
              });
              setEditing(false);
            }}
            className="self-start border border-border-subtle px-2 py-1 text-text-primary"
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
}