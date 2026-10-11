"use client";

import { useCallback, useState, useTransition } from "react";

import type { Surface } from "@/domain/resume/types";

/**
 * The owner's tech-stack editor.
 *
 * ## What this is for
 *
 * The stack chips are the single most-edited thing on the site: they change
 * with every new tool, and until now a change meant a deploy. This is the
 * surface that makes "remove React from the home page, keep it on the résumé"
 * three clicks.
 *
 * ## Why the surfaces are checkboxes rather than a toggle
 *
 * Because the decision is per item, not per section. A chip that stays on the
 * résumé and leaves the home page is a normal outcome — the summary shows what
 * is load-bearing now, the document keeps what was ever true — and a
 * section-level switch cannot express it. That distinction is the reason
 * `surfaces` is a column on the item rather than on the cluster.
 *
 * ## Why every mutation is explicit
 *
 * There is no autosave and no optimistic UI. A résumé write touches the
 * document of record, which has no undo and no version history; a mis-click
 * that silently removed a chip would be a mistake the owner discovers on the
 * public page, some time later, to a recruiter. So each button says what it
 * will do and the change happens once, visibly, with the server's answer.
 */
export function TechStackEditor({
  initialClusters,
  locale,
}: {
  initialClusters: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; label: string; surfaces: Surface[] }>;
  }>;
  locale: string;
}): React.ReactElement {
  const [clusters, setClusters] = useState(initialClusters);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const write = useCallback(
    async (
      payload: Record<string, unknown>,
      successMessage: string,
      mutate: () => void,
    ): Promise<void> => {
      setStatus("Saving…");

      const response = await fetch("/api/admin/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        // The optimistic update is not applied on failure, and the message names
        // the server's reason rather than "something went wrong" — because the
        // three causes (no session, no database, bad payload) need three
        // different responses from the owner.
        setStatus(`Not saved: ${body.error ?? response.status}`);
        return;
      }

      mutate();
      setStatus(successMessage);
    },
    [],
  );

  const toggleSurface = (
    clusterIndex: number,
    itemId: string,
    surface: Surface,
    currently: Surface[],
  ): void => {
    const next = currently.includes(surface)
      ? currently.filter((candidate) => candidate !== surface)
      : [...currently, surface];

    void write(
      {
        kind: "update",
        table: "tech_stack_item",
        id: itemId,
        values: { locale, surfaces: next },
      },
      `${surface === "home" ? "Home page" : "Resume"} updated.`,
      () =>
        setClusters((current) =>
          current.map((cluster, index) =>
            index === clusterIndex
              ? {
                  ...cluster,
                  items: cluster.items.map((item) =>
                    item.id === itemId ? { ...item, surfaces: next } : item,
                  ),
                }
              : cluster,
          ),
        ),
    );
  };

  const removeChip = (clusterIndex: number, itemId: string, label: string): void => {
    void write(
      { kind: "delete", table: "tech_stack_item", id: itemId },
      `Removed ${label}.`,
      () =>
        setClusters((current) =>
          current.map((cluster, index) =>
            index === clusterIndex
              ? { ...cluster, items: cluster.items.filter((item) => item.id !== itemId) }
              : cluster,
          ),
        ),
    );
  };

  const addChip = (clusterIndex: number): void => {
    const label = window.prompt("Technology to add");

    if (label === null || label.trim() === "") {
      return;
    }

    /*
      The optimistic row needs a key that does not collide with an existing one.
      Derived from the cluster and its current length rather than a clock or a
      random source: both of those are impure from the render's point of view,
      and neither adds anything over "this is one past the end of the list".
    */
    const placeholder = `${clusters[clusterIndex]?.id ?? "cluster"}:new:${
      clusters[clusterIndex]?.items.length ?? 0
    }`;

    void write(
      {
        kind: "insert",
        table: "tech_stack_item",
        values: {
          locale,
          label: label.trim(),
          surfaces: ["home"],
        },
      },
      `Added ${label.trim()}.`,
      () =>
        setClusters((current) =>
          current.map((cluster, index) =>
            index === clusterIndex
              ? {
                  ...cluster,
                  items: [
                    ...cluster.items,
                    { id: placeholder, label: label.trim(), surfaces: ["home"] },
                  ],
                }
              : cluster,
          ),
        ),
    );
  };

  return (
    <section aria-labelledby="tech-stack-editor-heading" data-testid="tech-stack-editor">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <h2
          id="tech-stack-editor-heading"
          className="font-headline-sm text-headline-sm text-text-primary"
        >
          Tech stack
        </h2>
        <p
          role="status"
          className="font-label-mono text-label-mono text-text-muted"
          data-testid="tech-stack-status"
        >
          {status ?? "BOTH SURFACES"}
        </p>
      </header>

      <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
        Each technology can be shown on the home page, on the resume, or both. Removing a chip
        deletes it from the database — it is not hidden, it is gone.
      </p>

      <div className="mt-space-md space-y-space-lg">
        {clusters.map((cluster, clusterIndex) => (
          <fieldset key={cluster.id} className="border border-border-subtle p-space-sm">
            <legend className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              {cluster.title}
            </legend>

            <ul className="mt-space-sm space-y-space-xs">
              {cluster.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-space-sm"
                >
                  <span className="font-mono text-body-sm text-body-sm text-text-primary">
                    {item.label}
                  </span>

                  <span className="flex items-center gap-space-sm">
                    {(["home", "resume"] as const).map((surface) => (
                      <label
                        key={surface}
                        className="flex items-center gap-space-xs text-body-sm text-body-sm text-text-secondary"
                      >
                        <input
                          type="checkbox"
                          checked={item.surfaces.includes(surface)}
                          disabled={pending}
                          onChange={() =>
                            toggleSurface(clusterIndex, item.id, surface, item.surfaces)
                          }
                        />
                        {surface === "home" ? "Home" : "Resume"}
                      </label>
                    ))}

                    <button
                      type="button"
                      className="tap-target border border-border-subtle px-2 font-label-mono text-label-mono uppercase text-text-secondary hover:text-primary-container"
                      disabled={pending}
                      onClick={() => removeChip(clusterIndex, item.id, item.label)}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="tap-target mt-space-sm border border-primary-container px-2 font-label-mono text-label-mono uppercase text-primary-container"
              disabled={pending}
              onClick={() => addChip(clusterIndex)}
            >
              Add technology
            </button>
          </fieldset>
        ))}
      </div>
    </section>
  );
}