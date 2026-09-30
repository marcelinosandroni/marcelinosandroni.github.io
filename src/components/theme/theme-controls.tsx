"use client";

import { useState } from "react";

import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { ThemeFeedbackPrompt } from "@/components/theme/theme-feedback-prompt";
import type { FeedbackTheme } from "@/domain/feedback/theme-feedback";

/**
 * The theme control and the question it can raise, as one client island.
 *
 * They live together because the question only exists because of a switch: the
 * picker raises the theme, this holds it, and the prompt reads it. Split across
 * two islands they would need a shared store or a lifted prop tree, for a
 * component that is three buttons and a line of text.
 *
 * ## The prompt appears once per visit, and only after a switch
 *
 * It is never shown on page load. Asking a reader what they think of a theme
 * before they have touched it is a question with no answer, and putting it in
 * front of every visitor on every page is how a feedback prompt becomes an
 * obstacle. Here it arrives only after someone has used the control, so it is
 * answerable — and dismissing it is permanent for the visit, because `null` is
 * the dismissed state and nothing sets it back to a theme.
 */
export function ThemeControls({ labels }: { labels: ThemeControlLabels }): React.ReactElement {
  const [askFor, setAskFor] = useState<FeedbackTheme | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-space-md border-t border-border-subtle pt-space-sm">
        <p className="font-label-mono text-label-mono text-text-muted">{labels.caption}</p>
        <ThemeSwitcher onAsk={setAskFor} />
      </div>

      {askFor === null ? null : (
        <div className="flex min-h-11 flex-wrap items-center gap-space-sm">
          <ThemeFeedbackPrompt
            /*
             * Keyed on the theme so answering one theme's question and switching
             * to another starts a fresh prompt rather than reusing a component
             * that has already been dismissed.
             */
            key={askFor}
            theme={askFor}
            question={labels.question}
            keepLabel={labels.keep}
            unsureLabel={labels.unsure}
            leaveLabel={labels.leave}
            dismissLabel={labels.dismiss}
          />
        </div>
      )}
    </>
  );
}

export interface ThemeControlLabels {
  /** Static label beside the picker, e.g. "THEME". */
  caption: string;
  question: string;
  keep: string;
  unsure: string;
  leave: string;
  dismiss: string;
}
