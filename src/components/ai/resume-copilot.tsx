"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MatrixRain } from "@/components/effects/matrix-rain";
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
  closeLabel: string;
  examplesLabel: string;
  examples: readonly string[];
  error: string;
  exitHint: string;
  welcome: string;
}

export interface ResumeCopilotProps {
  locale: string;
  labels: CopilotLabels;
}

type Line =
  | { kind: "input"; text: string }
  | { kind: "output"; text: string }
  | { kind: "citations"; citations: Citation[] }
  | { kind: "error"; text: string };

/** Every one of these closes the terminal, because that is what they all mean. */
const EXIT_KEYS = new Set(["c", "d", "z"]);

/**
 * How long the boot rain is on screen.
 *
 * Matched to the longest animation in the CSS (the slower of the two column sets,
 * 880ms) plus a little, so the layer is never cut off mid-fall. The effect is
 * decorative and this is its whole budget — long enough to read as a screen
 * waking up, short enough that it is not in the way of a question.
 */
const BOOT_RAIN_MS = 920;

/**
 * Grounded resume copilot, presented as a terminal.
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
  const [isBooting, setIsBooting] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const logId = useId();

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * Opens the terminal behind a one-shot boot animation.
   *
   * The dialog is mounted and focusable immediately and the rain is drawn on top
   * of it, rather than the dialog waiting for the rain to finish. A reader who
   * typed fast should find a working prompt under the effect, not a locked one
   * waiting out a decoration — and the effect clears itself, so there is nothing
   * to get stuck behind.
   */
  const open = useCallback(() => {
    setIsOpen(true);
    setIsBooting(true);
  }, []);

  useEffect(() => {
    if (!isBooting) {
      return;
    }

    /*
     * Cleared rather than left to a CSS `animationend`: a backgrounded tab never
     * fires that event, and the layer would then sit over the dialog until the tab
     * was focused again.
     */
    const timer = setTimeout(() => setIsBooting(false), BOOT_RAIN_MS);
    return () => clearTimeout(timer);
  }, [isBooting]);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, []);

  const ask = useCallback(
    async (next: string) => {
      const trimmed = next.trim();
      if (trimmed === "" || isBusy) {
        return;
      }

      setLines((previous) => [...previous, { kind: "input", text: trimmed }]);
      setDraft("");
      setIsBusy(true);
      scrollToEnd();

      try {
        const response = await fetch("/api/copilot", {
          method: "POST",
          headers: { "content-type": "application/json", "accept-language": locale },
          body: JSON.stringify({ question: trimmed }),
        });

        const payload = response.ok ? ((await response.json()) as CopilotAnswer) : null;

        if (payload === null) {
          setLines((previous) => [...previous, { kind: "error", text: labels.error }]);
          return;
        }

        // A rejected or not-found answer is still an answer the corpus produced,
        // so it renders like any other output. The point is that it says so
        // rather than guessing.
        const produced: Line[] = [{ kind: "output", text: payload.text }];
        if (payload.status === "answered" && payload.citations.length > 0) {
          produced.push({ kind: "citations", citations: payload.citations });
        }
        setLines((previous) => [...previous, ...produced]);
      } catch {
        setLines((previous) => [...previous, { kind: "error", text: labels.error }]);
      } finally {
        setIsBusy(false);
        scrollToEnd();
      }
    },
    [isBusy, labels.error, locale, scrollToEnd],
  );

  /*
   * Escape, the terminal exit keys, and a focus trap.
   *
   * The trap is the part that has to be real. `aria-modal="true"` promises a
   * screen reader user that the content behind the dialog is unreachable, and
   * without a trap Tab walks straight out of the dialog into the page — so the
   * promise is a lie. It also has to return focus where it came from on close,
   * or a keyboard user is dropped at the top of the document with no idea they
   * were ever in a dialog.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

    function focusableElements(): HTMLElement[] {
      if (!dialogRef.current) {
        return [];
      }

      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      // Ctrl+C / Ctrl+Z / Ctrl+D are how a user with keyboard muscle memory
      // tries to leave a terminal. Honour them, and stop the browser's own
      // handling of Ctrl+D (which does nothing useful) and Ctrl+Z.
      if (event.ctrlKey && EXIT_KEYS.has(event.key.toLowerCase())) {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = focusableElements();

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Wrap at both ends. Without this, Tab off the last control silently
      // continues into the page behind the dialog.
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, close]);

  // Lock the page behind the dialog.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <section aria-labelledby={titleId} className="border-t border-border-subtle">
      <div className="mx-auto w-full max-w-[1320px] px-margin py-space-lg md:px-margin-tablet lg:px-margin-desktop">
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={dialogId}
          aria-label={labels.openLabel}
          data-click="copilot-open"
          className="tap-target inline-flex items-center gap-space-sm rounded-full border border-border-prominent px-space-md py-space-sm font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container"
        >
          <span aria-hidden="true">&gt;_</span>
          {labels.title}
        </button>

        {isOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-surface-base/80 p-0 backdrop-blur-sm sm:items-center sm:p-space-lg"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                close();
              }
            }}
          >
            <div
              ref={dialogRef}
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative flex max-h-[85vh] w-full max-w-3xl flex-col border border-border-prominent bg-surface-base font-mono shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
            >
              {/*
                The same rain the site loads under, drawn over the dialog. It is
                one component and one stylesheet rather than a lookalike, so
                "the effect I liked in the terminal" and "the effect I see when
                the site loads" cannot drift apart.
              */}
              {isBooting ? <MatrixRain className="absolute inset-0" /> : null}
              <div className="flex items-center justify-between gap-space-md border-b border-border-subtle bg-surface-raised px-space-md py-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span aria-hidden="true" className="text-primary-container">
                    {">_"}
                  </span>
                  <h2 id={titleId} className="text-label-mono uppercase tracking-widest text-text-primary">
                    {labels.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={labels.closeLabel}
                  data-click="copilot-close"
                  className="flex h-8 w-8 items-center justify-center border border-border-subtle text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div
                ref={scrollRef}
                id={logId}
                role="log"
                aria-live="polite"
                aria-label={labels.title}
                className="flex-1 overflow-y-auto px-space-md py-space-md"
              >
                {lines.length === 0 ? (
                  <p className="text-body-sm text-text-muted">{labels.welcome}</p>
                ) : null}

                {lines.map((line, index) => {
                  if (line.kind === "citations") {
                    return (
                      <Citations
                        key={index}
                        citations={line.citations}
                        sourcesLabel={labels.sourcesLabel}
                      />
                    );
                  }

                  return (
                    <p
                      key={index}
                      className={
                        line.kind === "input"
                          ? "mt-space-sm text-body-sm text-primary-container"
                          : line.kind === "error"
                            ? "mt-space-sm text-body-sm text-secondary"
                            : "mt-space-sm whitespace-pre-line text-body-sm text-text-secondary"
                      }
                    >
                      {line.kind === "input" ? `> ${line.text}` : line.text}
                    </p>
                  );
                })}

                {isBusy ? <p className="mt-space-sm text-body-sm text-text-muted">{labels.thinking}</p> : null}

                {lines.length === 0 ? (
                  <ul className="mt-space-md flex flex-col gap-space-xs">
                    {labels.examples.map((example) => (
                      <li key={example}>
                        <button
                          type="button"
                          onClick={() => void ask(example)}
                          data-click="copilot-example"
                          className="text-left text-body-sm text-text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-primary-container"
                        >
                          {example}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <form
                className="flex items-center gap-space-sm border-t border-border-subtle px-space-md py-space-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  // "exit" is typed into a terminal to leave it. Honour it here.
                  if (draft.trim().toLowerCase() === "exit") {
                    close();
                    return;
                  }
                  void ask(draft);
                }}
              >
                <label htmlFor={`${dialogId}-input`} className="sr-only">
                  {labels.placeholder}
                </label>
                <span aria-hidden="true" className="shrink-0 text-primary-container">
                  &gt;
                </span>
                <input
                  id={`${dialogId}-input`}
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={labels.placeholder}
                  maxLength={280}
                  autoComplete="off"
                  aria-describedby={`${dialogId}-hint`}
                  className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  data-click="copilot-send"
                  className="shrink-0 border border-border-subtle px-space-sm py-1 text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container disabled:opacity-50"
                >
                  {labels.send}
                </button>
              </form>

              <p
                id={`${dialogId}-hint`}
                className="border-t border-border-subtle px-space-md py-2 text-label-mono text-text-muted"
              >
                {labels.exitHint}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Citations({
  citations,
  sourcesLabel,
}: {
  citations: Citation[];
  sourcesLabel: string;
}) {
  return (
    <div className="mt-space-sm border-l border-border-subtle pl-space-sm">
      <p className="text-label-mono uppercase tracking-widest text-text-muted">{sourcesLabel}</p>
      <ul className="mt-space-xs flex flex-col gap-space-xs">
        {citations.map((citation) => (
          <li key={citation.label}>
            <p className="text-body-sm text-primary-container">{citation.label}</p>
            <p className="text-body-sm text-text-muted">{citation.excerpt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
