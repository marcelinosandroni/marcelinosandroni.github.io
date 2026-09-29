"use client";

import { useId, useState } from "react";

import type { Citation, CopilotAnswer } from "@/domain/ai";

export interface CopilotLabels {
  open: string;
  title: string;
  subtitle: string;
  placeholder: string;
  send: string;
  thinking: string;
  sourcesLabel: string;
  openLabel: string;
  examplesLabel: string;
  examples: readonly string[];
  error: string;
}

export interface ResumeCopilotProps {
  locale: string;
  labels: CopilotLabels;
}

/**
 * Grounded resume copilot.
 *
 * The only interactive island added for this feature, and it holds no data of its
 * own: every string arrives translated, the corpus stays on the server, and the
 * answer is whatever the retrieval layer could actually support. When retrieval
 * finds nothing the component says so — it never fills the gap with a guess.
 *
 * Local `useState` is deliberate. A global store would put a client-side
 * dependency and a provider around the whole tree to remember one string, on a
 * page whose main achievement is that almost nothing ships to the browser.
 */
export function ResumeCopilot({ locale, labels }: ResumeCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const inputId = useId();
  const transcriptId = useId();

  async function ask(next: string) {
    const trimmed = next.trim();
    if (trimmed === "" || isBusy) {
      return;
    }

    setQuestion(trimmed);
    setIsBusy(true);
    setNetworkError(null);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json", "accept-language": locale },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok) {
        setNetworkError(labels.error);
        return;
      }

      setAnswer((await response.json()) as CopilotAnswer);
    } catch {
      setNetworkError(labels.error);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${transcriptId}-heading`} className="border-t border-border-subtle">
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={transcriptId}
          aria-label={isOpen ? labels.open : labels.openLabel}
          data-click="copilot-open"
          className="tap-target gap-space-sm rounded-full border border-border-prominent px-space-md py-space-sm font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container"
        >
          <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
          {isOpen ? labels.open : labels.title}
        </button>

        {isOpen && (
          <div id={transcriptId} className="mt-space-md border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-space-md py-space-sm">
              <h2 id={`${transcriptId}-heading`} className="font-headline-sm text-headline-sm text-text-primary">
                {labels.title}
              </h2>
              <p className="mt-1 text-body-sm text-body-sm text-text-secondary">{labels.subtitle}</p>
            </div>

            {answer && <Transcript answer={answer} sourcesLabel={labels.sourcesLabel} />}

            <form
              className="flex flex-col gap-space-sm border-t border-border-subtle p-space-md sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void ask(question);
              }}
            >
              <label htmlFor={inputId} className="sr-only">
                {labels.placeholder}
              </label>
              <input
                id={inputId}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={labels.placeholder}
                maxLength={280}
                autoComplete="off"
                className="min-w-0 flex-1 border border-border-subtle bg-surface-base px-space-sm py-space-sm font-body-sm text-body-sm text-text-primary outline-none focus:border-primary-container"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex items-center justify-center bg-primary-container px-space-md py-space-sm font-label-mono text-label-mono text-on-primary-container uppercase tracking-widest disabled:opacity-70"
              >
                {isBusy ? labels.thinking : labels.send}
              </button>
            </form>

            {networkError && (
              <p role="alert" className="border-t border-border-subtle px-space-md py-space-sm text-body-sm text-secondary">
                {networkError}
              </p>
            )}

            {!answer && (
              <div className="border-t border-border-subtle px-space-md py-space-sm">
                <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
                  {labels.examplesLabel}
                </p>
                <ul className="mt-space-sm flex flex-wrap gap-space-sm">
                  {labels.examples.map((example) => (
                    <li key={example}>
                      <button
                        type="button"
                        onClick={() => void ask(example)}
                        data-click="copilot-example"
                        className="border border-border-subtle px-space-sm py-1 text-body-sm text-body-sm text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container"
                      >
                        {example}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Transcript({ answer, sourcesLabel }: { answer: CopilotAnswer; sourcesLabel: string }) {
  return (
    <div aria-live="polite" className="border-b border-border-subtle p-space-md">
      {answer.status === "rejected" ? (
        <p className="text-body-sm text-body-sm text-text-secondary">{answer.text}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {answer.status === "not-found" ? (
            <p className="text-body-sm text-body-sm text-text-secondary">{answer.text}</p>
          ) : (
            answer.text
              .split("\n\n")
              .map((paragraph, index) => (
                <p key={paragraph.slice(0, 24)} className={index === 0 ? "text-body-sm text-body-sm text-primary-container" : "text-body-sm text-body-sm text-text-secondary"}>
                  {paragraph}
                </p>
              ))
          )}

          {answer.citations.length > 0 && (
            <div>
              <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
                {sourcesLabel}
              </p>
              <ul className="mt-space-sm flex flex-col gap-2">
                {answer.citations.map((citation: Citation) => (
                  <li key={citation.label} className="border-l-2 border-border-prominent pl-space-sm">
                    <p className="font-label-mono text-label-mono text-text-primary">{citation.label}</p>
                    <p className="mt-1 text-body-sm text-body-sm text-text-muted">{citation.excerpt}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
