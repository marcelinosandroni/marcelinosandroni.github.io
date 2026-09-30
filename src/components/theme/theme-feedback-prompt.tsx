"use client";

import { useState, useTransition } from "react";

import { FEEDBACK_VERDICTS, type FeedbackTheme, type FeedbackVerdict } from "@/domain/feedback/theme-feedback";

/**
 * One-line question, three answers, no text box.
 *
 * ## Why it is this small
 *
 * A prompt competes with the page for attention, and the page is the product.
 * So: one line of question, three single-glyph answers, and it disappears
 * permanently once answered. No modal, no overlay, no "rate us" panel nobody
 * asked for.
 *
 * ## Why there is no comment field
 *
 * Because there is nowhere to put one. The storage is an enum and a counter, so
 * a word a reader typed cannot be saved. That is a deliberate limit rather than
 * a missing feature: a comment column plus a theme plus a timestamp is a record
 * of a stranger's opinions, and the question this table answers is "which theme
 * do people prefer", which a vote answers completely.
 *
 * The cost is stated in `src/domain/feedback/theme-feedback.ts` and is real —
 * someone with something to say in words cannot say it. Accepting the limit is
 * the same decision as the click aggregate's.
 */
export function ThemeFeedbackPrompt({
  theme,
  question,
  keepLabel,
  unsureLabel,
  leaveLabel,
  dismissLabel,
}: {
  theme: FeedbackTheme;
  question: string;
  keepLabel: string;
  unsureLabel: string;
  leaveLabel: string;
  dismissLabel: string;
}): React.ReactElement {
  const [answered, setAnswered] = useState(false);
  const [isPending, startTransition] = useTransition();

  /*
   * Optimistic: the prompt closes on the click, and the request goes after it.
   *
   * Waiting for a round trip to hide a one-line question would make it feel like
   * a dialog with a loading state, which is heavier than the question deserves.
   * A failed write is a lost data point, not a broken page — and the server log
   * is where an unapplied migration shows up anyway.
   */
  function send(verdict: FeedbackVerdict): void {
    setAnswered(true);

    startTransition(async () => {
      await fetch("/api/feedback/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ theme, verdict }),
        keepalive: true,
      }).catch(() => undefined);
    });
  }

  if (answered) {
    return <span aria-hidden="true" className="h-0" />;
  }

  return (
    <div
      role="group"
      aria-label={question}
      data-theme-feedback="prompt"
      className="flex flex-wrap items-center gap-space-xs font-label-mono text-label-mono text-text-muted"
    >
      <span className="inline-flex items-center gap-space-xs">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-container" aria-hidden="true" />
        {question}
      </span>

      {FEEDBACK_VERDICTS.map((verdict) => {
        const label =
          verdict === "keep" ? keepLabel : verdict === "leave" ? leaveLabel : unsureLabel;

        return (
          <button
            key={verdict}
            type="button"
            disabled={isPending}
            onClick={() => send(verdict)}
            aria-label={label}
            title={label}
            data-theme-verdict={verdict}
            className="tap-target min-w-11 justify-center border border-border-subtle px-2 py-1 uppercase tracking-widest text-text-muted transition-colors hover:border-text-secondary hover:text-text-secondary disabled:opacity-60"
          >
            {GLYPH[verdict]}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setAnswered(true)}
        aria-label={dismissLabel}
        title={dismissLabel}
        data-theme-feedback="dismiss"
        className="tap-target min-w-11 justify-center px-1 uppercase tracking-widest text-text-muted transition-colors hover:text-text-secondary"
      >
        {DISMISS_GLYPH}
      </button>
    </div>
  );
}

/** Single glyphs: a three-button row stays one line at every width. */
const GLYPH: Record<FeedbackVerdict, string> = {
  keep: "✓",
  leave: "✕",
  unsure: "–",
};

const DISMISS_GLYPH = "×";
