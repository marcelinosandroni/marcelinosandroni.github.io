"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MAX_MESSAGE_LENGTH, type ChatMessage, type VisitorIntent } from "@/domain/chat/message";
import { PRESENCE_HEARTBEAT_MS, PRESENCE_SESSION_ID_LENGTH } from "@/domain/presence/presence";
import { formatMessage } from "@/i18n/format-message";

/**
 * The visitor's chat.
 *
 * ## It is not offered. That is the feature.
 *
 * This component renders **nothing at all** until the owner has opened a
 * conversation with this browser. There is no launcher, no placeholder, no "we
 * usually reply quickly" — a visitor who has not been contacted sees a page with
 * no chat on it, which is the same experience they have today.
 *
 * So the component does two jobs for every visitor and shows one widget to
 * almost none of them: it heartbeats (so the owner can see who is reading, which
 * is what makes offering a chat possible in the first place) and it asks, once a
 * minute, whether a conversation exists. The ask rides on the heartbeat rather
 * than being a second request, because one request a minute for every reader is
 * already the cost and two would double it for a boolean.
 *
 * ## What the browser holds
 *
 * One string: 32 hex characters from `crypto.getRandomValues`, in `localStorage`.
 * No cookie, no fingerprint, no address, no device — and nothing derived from the
 * machine, so two browsers are two strangers as far as this site is concerned. The
 * key is versioned (`msd:visitor-session:v1`) so a change of contract can start a
 * new id rather than inheriting an old one.
 *
 * ## Accessibility, which is the part with no shortcuts
 *
 * - A real live region: the transcript is `role="log"` with `aria-live="polite"`
 *   and `aria-relevant="additions"`, so a new message is announced without
 *   re-reading the whole history.
 * - Focus moves into the panel on open and returns to the launcher on close, so a
 *   keyboard user is never dropped at the top of the document.
 * - `aria-modal` is a promise, so the focus trap has to be real: without it Tab
 *   walks out of the panel into the page behind it, and the promise is a lie.
 * - Three ways out — Esc, a click outside, and a visible × — plus the terminal
 *   chords (Ctrl+C/Z/D) this site's copilot honours, because that is the muscle
 *   memory a visitor of a Matrix-themed site has.
 */

export interface VisitorChatLabels {
  title: string;
  open: string;
  openLabel: string;
  closeLabel: string;
  sendLabel: string;
  placeholder: string;
  transcriptLabel: string;
  messageLabel: string;
  privacyNote: string;
  exitHint: string;
  waiting: string;
  youLabel: string;
  ownerLabel: string;
  agentNotice: string;
  failed: string;
  rateLimited: string;
  withdrawn: string;
}

export interface VisitorChatProps {
  labels: VisitorChatLabels;
}

const STORAGE_KEY = "msd:visitor-session:v1";

/** How often a message is asked for while the panel is open and idle. */
const TRANSCRIPT_POLL_MS = 5_000;

/** Every one of these closes the panel, because that is what they all mean. */
const EXIT_KEYS = new Set(["c", "d", "z"]);

type Notice = { tone: "error"; text: string } | null;

export function VisitorChat({ labels }: VisitorChatProps) {
  const [isOffered, setIsOffered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isBusy, setIsBusy] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const logId = useId();
  const inputId = useId();

  const close = useCallback(() => setIsOpen(false), []);

  /**
   * The session id: read from `localStorage`, or minted once.
   *
   * `crypto.getRandomValues` rather than `Math.random`, and no fallback: a
   * predictable session id is a session id somebody else can guess, and a browser
   * that cannot provide it is a browser whose `localStorage` is unavailable too.
   * A private window that refuses both simply has no chat.
   */
  const sessionId = useCallback((): string | null => {
    if (sessionRef.current !== null) {
      return sessionRef.current;
    }

    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);

      if (existing !== null && /^[0-9a-f]{32}$/.test(existing)) {
        sessionRef.current = existing;
        return existing;
      }

      const bytes = new Uint8Array(PRESENCE_SESSION_ID_LENGTH / 2);
      window.crypto.getRandomValues(bytes);

      const minted = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

      window.localStorage.setItem(STORAGE_KEY, minted);
      sessionRef.current = minted;

      return minted;
    } catch {
      return null;
    }
  }, []);

  /**
   * The heartbeat, and the offer check that rides on it.
   *
   * Fire and forget, like the click counter: presence must never be able to fail
   * or slow down a real interaction, and a `catch` that swallows the failure is
   * the whole error handling. The one thing that is *not* swallowed is the offer
   * flag, because that is the entire feature.
   */
  const beat = useCallback(async (): Promise<void> => {
    const session = sessionId();

    if (session === null) {
      return;
    }

    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session }),
        keepalive: true,
      });

      if (response.status !== 200) {
        // `204` is the unconfigured or unwritable deployment, and it carries no
        // body. Parsing it anyway would throw once a minute for nothing.
        return;
      }

      const payload = (await response.json()) as { offered?: unknown };

      /*
       * One direction only. A heartbeat that fails, or a deployment with no chat
       * behind it, must never *withdraw* a conversation the visitor can see — the
       * transcript read is what withdraws it, and it does so with an answer that
       * actually says so. The reverse would make a database hiccup delete the
       * widget out from under somebody mid-conversation.
       */
      if (payload.offered === true) {
        setIsOffered(true);
      }
    } catch {
      // Nothing. See above.
    }
  }, [sessionId]);

  /** The transcript, while the panel is open. */
  const refresh = useCallback(async (): Promise<void> => {
    const session = sessionId();

    if (session === null) {
      return;
    }

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session, intent: "read" satisfies VisitorIntent }),
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as {
        offered?: boolean;
        messages?: ChatMessage[];
      };

      if (payload.offered !== true) {
        // The owner closed it. Stop pretending the widget exists.
        setIsOffered(false);
        setIsOpen(false);

        return;
      }

      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch {
      setNotice({ tone: "error", text: labels.failed });
    }
  }, [labels.failed, sessionId]);

  const send = useCallback(
    async (text: string): Promise<void> => {
      const session = sessionId();
      const body = text.trim();

      if (session === null || body === "" || isBusy) {
        return;
      }

      setIsBusy(true);
      setNotice(null);

      try {
        const response = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session, intent: "send", text: body }),
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "60");

          setNotice({
            tone: "error",
            text: formatMessage(labels.rateLimited, { seconds: Number.isFinite(retryAfter) ? retryAfter : 60 }),
          });

          return;
        }

        if (response.status === 403 || response.status === 409) {
          setNotice({ tone: "error", text: labels.withdrawn });
          setIsOffered(false);
          setIsOpen(false);

          return;
        }

        if (!response.ok) {
          setNotice({ tone: "error", text: labels.failed });

          return;
        }

        setDraft("");

        // The stored row, echoed back by the server. Appending the response rather
        // than the draft keeps one source of truth for the transcript: the copy on
        // screen is always what the database holds, normalised the same way.
        const payload = (await response.json()) as { message?: ChatMessage };

        if (payload.message !== undefined) {
          setMessages((previous) => [...previous, payload.message as ChatMessage]);
        }
      } catch {
        setNotice({ tone: "error", text: labels.failed });
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, labels.failed, labels.rateLimited, labels.withdrawn, sessionId],
  );

  /*
   * The heartbeat, forever, for every visitor. See the header comment.
   *
   * The first beat goes out on the next task rather than inside the effect body:
   * a fetch during the commit phase is work React cannot show progress for, and
   * `react-hooks/set-state-in-effect` is right that the answer must not arrive
   * as a render cascading out of a mount. It is a task, not a render, and the
   * difference is a millisecond nobody can see.
   */
  useEffect(() => {
    const first = setTimeout(() => void beat(), 0);
    const timer = setInterval(() => void beat(), PRESENCE_HEARTBEAT_MS);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [beat]);

  // The transcript, only while the panel is open: a poll for a panel nobody is
  // looking at is a request per visitor for no reader.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), TRANSCRIPT_POLL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [isOpen, refresh]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /*
   * Focus, the trap, and every way out.
   *
   * The trap is the part that has to be real. `aria-modal="true"` promises a
   * screen reader user that the content behind the panel is unreachable, and
   * without the trap Tab walks straight out of it — so the promise is a lie. It
   * also returns focus to the launcher on close, or a keyboard user is dropped at
   * the top of the document with no idea they were ever in a panel.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Captured while the panel is open, when the launcher is definitely in the
    // document, rather than read from the ref in the cleanup — the node React
    // hands back can differ by then, and a keyboard user who pressed Esc has to
    // land on the button they came from.
    const launcher = launcherRef.current;

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
      // Only when the panel is closing, not when the component unmounts with it
      // already closed: focusing a launcher that is about to disappear would move
      // focus to `body`.
      launcher?.focus();
    };
  }, [isOpen, close]);

  /*
   * Nothing at all until the owner has opened a conversation.
   *
   * Not a disabled launcher, not a "message me" link, not a hidden panel. A
   * visitor who has not been contacted sees the site they saw yesterday, and
   * there is nothing in the DOM for them to find.
   */
  if (!isOffered) {
    return null;
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={labels.openLabel}
        data-click="chat-open"
        className="tap-target fixed bottom-4 right-4 z-[90] min-w-11 justify-center gap-space-xs rounded-full border border-border-subtle bg-surface-overlay/90 px-space-md py-space-sm font-label-mono text-label-mono uppercase tracking-widest text-text-secondary shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors hover:border-primary-container hover:text-primary-container"
      >
        <span aria-hidden="true">▣</span>
        {labels.open}
      </button>

      {isOpen ? (
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
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col border border-border-prominent bg-surface-base font-mono shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center justify-between gap-space-md border-b border-border-subtle bg-surface-raised px-space-md py-space-sm">
              <div className="flex items-center gap-space-sm">
                <span aria-hidden="true" className="text-primary-container">
                  ▣
                </span>
                <h2 id={titleId} className="text-label-mono uppercase tracking-widest text-text-primary">
                  {labels.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={labels.closeLabel}
                data-click="chat-close"
                className="flex h-8 w-8 items-center justify-center border border-border-subtle text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/*
              The live region. `role="log"` with `aria-relevant="additions"` is the
              honest form for a transcript: a new message is announced, and the
              history is not read out again on every poll.
            */}
            <div
              ref={logRef}
              id={logId}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label={labels.transcriptLabel}
              className="flex-1 overflow-y-auto px-space-md py-space-md"
            >
              {messages.length === 0 ? (
                <p className="text-body-sm text-text-muted">{labels.waiting}</p>
              ) : null}

              {messages.map((message) => (
                <Message key={message.id} message={message} labels={labels} />
              ))}
            </div>

            <form
              className="flex items-center gap-space-sm border-t border-border-subtle px-space-md py-space-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <label htmlFor={inputId} className="sr-only">
                {labels.messageLabel}
              </label>
              <span aria-hidden="true" className="shrink-0 text-primary-container">
                &gt;
              </span>
              <input
                id={inputId}
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={labels.placeholder}
                maxLength={MAX_MESSAGE_LENGTH}
                autoComplete="off"
                aria-describedby={`${panelId}-note`}
                className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <button
                type="submit"
                disabled={isBusy}
                data-click="chat-send"
                className="shrink-0 border border-border-subtle px-space-sm py-1 text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-primary-container hover:text-primary-container disabled:opacity-50"
              >
                {labels.sendLabel}
              </button>
            </form>

            {/*
              Present from the first render, like the notice region in the CMS, so
              an announcement has somewhere to go instead of a screen reader
              discovering a new element mid-sentence.
            */}
            <p role="status" aria-live="polite" className="min-h-5 px-space-md text-body-sm text-text-secondary">
              {notice?.text ?? ""}
            </p>

            <p id={`${panelId}-note`} className="border-t border-border-subtle px-space-md py-2 text-label-mono text-text-muted">
              {labels.privacyNote}
            </p>
            <p className="px-space-md pb-space-sm text-label-mono text-text-muted">{labels.exitHint}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

/**
 * One message.
 *
 * The rendering branches on `author` — never on the text — and the automated
 * branch puts the notice in a visible badge *and* in an `sr-only` run before the
 * body, so a screen reader user hears the label as well as seeing it. The domain
 * guarantees the notice exists for an `agent` message, so the `??` below is a
 * type guard rather than a fallback that could ever render an unlabelled machine
 * message.
 */
function Message({
  message,
  labels,
}: {
  message: ChatMessage;
  labels: VisitorChatLabels;
}) {
  if (message.author === "agent") {
    return (
      <article className="mt-space-sm border-l-2 border-border-prominent pl-space-sm">
        <p className="font-label-mono text-[10px] uppercase tracking-widest text-text-muted">
          {message.automatedNotice ?? labels.agentNotice}
        </p>
        <p className="mt-1 whitespace-pre-line text-body-sm text-text-secondary">
          <span className="sr-only">{`${message.automatedNotice ?? labels.agentNotice}: `}</span>
          {message.body}
        </p>
      </article>
    );
  }

  const isOwner = message.author === "owner";

  return (
    <article className="mt-space-sm">
      <p className="font-label-mono text-[10px] uppercase tracking-widest text-text-muted">
        {isOwner ? labels.ownerLabel : labels.youLabel}
      </p>
      <p
        className={
          isOwner
            ? "mt-1 whitespace-pre-line text-body-sm text-primary-container"
            : "mt-1 whitespace-pre-line text-body-sm text-text-secondary"
        }
      >
        {message.body}
      </p>
    </article>
  );
}
