"use client";

import { useCallback, useState } from "react";

/**
 * One authenticated write to the résumé tables, with the server's own answer.
 *
 * ## Why it is a hook and not a helper
 *
 * Three editors need it — the stack, the catalog and the experience editor — and
 * each of them needs the same two things: the status line an owner reads, and
 * the optimistic state change applied *only* on success. Copying that into three
 * components is how one of them ends up updating its state before the server
 * answers, which is the failure this codebase has refused everywhere else.
 *
 * ## Why the body is handed to `mutate`
 *
 * An insert has to come back with the id the database assigned. A `mutate` that
 * closed over the response would be reading a variable it does not own, so the
 * callback receives it instead.
 */
export function useAdminWrite(): {
  status: string | null;
  pending: boolean;
  /** Show a message without having written anything. */
  notify: (message: string) => void;
  write: (
    payload: Record<string, unknown>,
    successMessage: string,
    mutate: (body: { entry?: Record<string, unknown> }) => void,
  ) => Promise<void>;
} {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const notify = useCallback((message: string) => setStatus(message), []);

  const write = useCallback(
    async (
      payload: Record<string, unknown>,
      successMessage: string,
      mutate: (body: { entry?: Record<string, unknown> }) => void,
    ): Promise<void> => {
      setStatus("Saving…");
      setPending(true);

      try {
        const response = await fetch("/api/admin/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          entry?: Record<string, unknown>;
        };

        if (!response.ok) {
          /*
            The three causes need three different answers from the owner — no
            session, no database, or a payload the database refused — so the
            server's reason is shown rather than a generic failure.
          */
          setStatus(`Not saved: ${body.error ?? response.status}`);
          return;
        }

        mutate(body);
        setStatus(successMessage);
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { status, pending, notify, write };
}

/**
 * A tag toggle, as a single call.
 *
 * Both halves exist because the join tables have a composite primary key: there
 * is no `id` to delete by, so untagging is a `deleteWhere` on the pair. Split
 * into two call sites — an `if (on)` in each of the three editors — this is the
 * single most repeated piece of logic in the admin, and a divergence between the
 * three would mean one of them could not untag.
 */
export function toggleTag(
  table: "highlight_technology" | "case_study_technology",
  column: "highlight_id" | "case_study_id",
  ownerId: string,
  technologyId: string,
  currentlyOn: boolean,
): Record<string, unknown> {
  return currentlyOn
    ? { kind: "deleteWhere", table, filters: { [column]: ownerId, technology_id: technologyId } }
    : { kind: "insert", table, values: { [column]: ownerId, technology_id: technologyId } };
}