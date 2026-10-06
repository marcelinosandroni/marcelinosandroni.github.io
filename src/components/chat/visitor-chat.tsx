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
  /** The two lines on the notification: what arrived, and from where. */
  toastBadge: string;
  toastBody: string;
  toastLabel: string;
  /**
   * The opening message, one entry per line, in the order they are typed.
   *
   * Lines rather than one string so the transcript can hold them as separate rows
   * the way the film holds them, and so a translation can be a different number of
   * lines without the component knowing.
   */
  opening: readonly string[];
}

export interface VisitorChatProps {
  labels: VisitorChatLabels;
}

const STORAGE_KEY = "msd:visitor-session:v1";

/** How often a message is asked for while the panel is open and idle. */
const TRANSCRIPT_POLL_MS = 5_000;

/** Every one of these closes the panel, because that is what they all mean. */
const EXIT_KEYS = new Set(["c", "d", "z"]);

/** How long the notification sits in the corner before it retires on its own. */
const TOAST_LIFETIME_MS = 11_000;

/** How long the corner stays empty before the notification is allowed to appear. */
const TOAST_DELAY_MS = 2_200;

/** How long before the first character of the opening message lands. */
const OPENING_LEAD_MS = 900;

/** Per character. Slow enough to read as being typed rather than revealed. */
const OPENING_CHARACTER_MS = 45;

/** The pause between one line and the next, which is what the film actually is. */
const OPENING_LINE_PAUSE_MS = 850;

/** After the last line, before the input is theirs. */
const OPENING_SETTLE_MS = 500;

type Notice = { tone: "error"; text: string } | null;

/**
 * Types the opening message out, one character at a time.
 *
 * ## Why a hook and not a CSS animation
 *
 * Because the transcript is a list of lines and the reveal has to land on a line
 * boundary: a caret is drawn at the end of a *line*, not smeared across one. The
 * schedule is therefore a character budget and three waits — before the first
 * character, between lines, after the last — rather than a width transition, which
 * is all a CSS animation can express and would be the wrong shape the moment a
 * translation is a different length.
 *
 * ## `prefers-reduced-motion` gets the whole message at once
 *
 * A typewriter is motion. For a visitor who has asked the operating system not to
 * animate things, the same message arrives instantly, which costs nothing: the
 * words are the content and the reveal is decoration.
 */
function useOpening(lines: readonly string[], run: boolean): {
  typed: readonly string[];
  isComplete: boolean;
} {
  const [typed, setTyped] = useState<readonly string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!run || lines.length === 0) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /*
       * On the next task rather than inside the effect body, for the same reason
       * the heartbeat is: `react-hooks/set-state-in-effect` is right that an answer
       * must not arrive as a render cascading out of a mount. There is no animation
       * to wait for, so the delay is one tick rather than five seconds — but it is
       * still a task, not a render.
       */
      const immediate = window.setTimeout(() => {
        setTyped(lines);
        setIsComplete(true);
      }, 0);

      return () => {
        window.clearTimeout(immediate);
      };
    }

    let index = 0;
    let character = 0;
    let isSettled = false;
    const timers: number[] = [];

    const settle = (): void => {
      isSettled = true;
      setIsComplete(true);
    };

    const typeNext = (): void => {
      if (isSettled) {
        return;
      }

      const line = lines[index];
      character += 1;
      setTyped([...lines.slice(0, index), line.slice(0, character)]);

      if (character < line.length) {
        timers.push(window.setTimeout(typeNext, OPENING_CHARACTER_MS));

        return;
      }

      index += 1;

      if (index >= lines.length) {
        timers.push(window.setTimeout(settle, OPENING_SETTLE_MS));

        return;
      }

      character = 0;
      timers.push(window.setTimeout(typeNext, OPENING_LINE_PAUSE_MS));
    };

    timers.push(window.setTimeout(typeNext, OPENING_LEAD_MS));

    return () => {
      isSettled = true;

      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [lines, run]);

  /*
   * Derived rather than reset in the effect: a hook that has not run has typed
   * nothing and owes nothing, and saying that here means the caller never has to
   * know the difference between "not started" and "finished empty".
   */
  return run ? { typed, isComplete } : { typed: [], isComplete: true };
}

export function VisitorChat({ labels }: VisitorChatProps) {
  const [isOffered, setIsOffered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
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

  /*
   * The opening message plays only into a transcript that has nothing in it. A
   * visitor who already has words on screen did not arrive to be summoned, and a
   * stranger's message typed over their own history would be the site pretending
   * to be the person they were talking to.
   */
  const isOpening = isOpen && messages.length === 0;
  const opening = useOpening(labels.opening, isOpening);

  /*
   * One flag for "the input is the visitor's", and the reason it is not simply
   * `opening.isComplete`: a transcript with words in it never runs the opening at
   * all, and a visitor who has already written must not be locked out of writing
   * again because there was nothing to summon them with.
   */
  const isInputReady = !isOpening || opening.isComplete;

  const close = useCallback(() => setIsOpen(false), []);

  /** The notification both opens and retires the panel, so it is gone either way. */
  const openFromNotification = useCallback((): void => {
    setIsToastVisible(false);
    setIsOpen(true);
  }, []);

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

  /*
   * The notification, once the page has stopped moving.
   *
   * The delay is the point. This site opens with a curtain that stays down for
   * several seconds on a first visit, and a notification that slides in underneath
   * it and is simply uncovered when it rises is a better entrance than one that
   * waits its turn and arrives after the visitor has already read the page.
   *
   * It also retires on its own. A message that never goes away is a thing asking
   * for an answer, and this one is an invitation — it does not need to be answered
   * to stop existing.
   */
  useEffect(() => {
    if (!isOffered || isOpen) {
      return;
    }

    let retire = 0;
    const arrive = setTimeout(() => {
      setIsToastVisible(true);
      retire = window.setTimeout(() => setIsToastVisible(false), TOAST_LIFETIME_MS);
    }, TOAST_DELAY_MS);

    return () => {
      window.clearTimeout(arrive);
      window.clearTimeout(retire);
    };
  }, [isOffered, isOpen]);

  /*
   * The input takes focus the moment it stops being disabled.
   *
   * The dialog holds focus while the opening message is arriving, because `focus()`
   * on a disabled element is a no-op and a modal that promises the page behind it
   * is unreachable while focus sits on `body` is making a promise it cannot keep.
   * Handing over here means the panel ends with the caret where the visitor expects
   * it, without either effect having to know about the other.
   */
  useEffect(() => {
    if (isInputReady && isOpen) {
      inputRef.current?.focus();
    }
  }, [isInputReady, isOpen]);

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

    /*
     * Into the input, unless the opening message is still arriving — the input is
     * disabled for that stretch, and `focus()` on a disabled element is a no-op,
     * which would leave a keyboard user with focus on `body` *inside* a modal that
     * promises the rest of the page is unreachable. The dialog takes it instead,
     * and the input takes it over when the message lands.
     */
    (inputRef.current?.disabled === true ? dialogRef.current : inputRef.current)?.focus();

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
   * Nothing at all until the server says a chat is offered.
   *
   * Not a disabled launcher, not a "message me" link, not a hidden panel. A
   * visitor with no conversation available sees the site they saw yesterday, and
   * there is nothing in the DOM for them to find.
   */
  if (!isOffered) {
    return null;
  }

  return (
    <>
      {/*
        One control, two states.

        A notification that expires and takes the only way in with it is not an
        invitation, it is a trap with a keyboard: `aria-live` announces a thing
        that can no longer be reached with Tab. So the corner holds a terminal
        button at all times and the notification is what it looks like for eleven
        seconds — a machine interrupting you, which then settles back into the
        control you could have pressed anyway.

        `data-click` is the same in both states because the analytics vocabulary
        already has `chat-open`, and a second name for the same act would be a
        second place to be wrong.
      */}
      <div
        className={
          isToastVisible
            ? "fixed bottom-4 right-4 z-[90] w-[min(20rem,calc(100vw-2rem))]"
            : "fixed bottom-4 right-4 z-[90]"
        }
      >
        <button
          ref={launcherRef}
          type="button"
          onClick={() => (isToastVisible ? openFromNotification() : setIsOpen(true))}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={isToastVisible ? labels.toastLabel : labels.openLabel}
          data-click="chat-open"
          className={
            isToastVisible
              ? "tap-target w-full animate-[fade-in_180ms_ease-out] border border-primary-container bg-surface-overlay/95 px-space-md py-space-sm text-left font-mono shadow-[0_18px_40px_-18px_rgba(0,0,0,0.95)] backdrop-blur-md transition-colors hover:bg-surface-raised"
              : "tap-target flex h-11 w-11 items-center justify-center border border-border-subtle bg-surface-overlay/90 font-mono text-text-secondary backdrop-blur-md transition-colors hover:border-primary-container hover:text-primary-container"
          }
        >
          {isToastVisible ? (
            <>
              <span className="flex items-center gap-space-xs text-[10px] uppercase tracking-widest text-primary-container">
                <span aria-hidden="true">▣</span>
                {labels.toastBadge}
              </span>
              <span className="mt-1 block text-body-sm text-text-primary">{labels.toastBody}</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">▣</span>
              <span className="sr-only">{labels.open}</span>
            </>
          )}
        </button>
      </div>

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
            // Focusable only as the landing place for an opening message that has
            // not finished arriving. Without `tabIndex` the focus call above would
            // silently do nothing, and with a permanent `tabIndex` this would become
            // a stop in the Tab order that does nothing when pressed.
            tabIndex={-1}
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

              The opening message is in this region rather than beside it, and it is
              announced with `aria-live="off"` while it types: a screen reader
              repeating every fourth character of a four-line quotation is not a
              transcript, it is a seizure. It reads once, whole, at the end.
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
              {opening.typed.length > 0 ? (
                <div
                  aria-live="off"
                  aria-label={labels.opening.join(" ")}
                  className="mb-space-md border-l-2 border-primary-container pl-space-sm"
                >
                  {opening.typed.map((line, position) => (
                    /*
                     * Keyed by position, not by content: the content is the string
                     * being typed, so a content key would remount this paragraph on
                     * every single character and restart the caret's animation with
                     * it.
                     */
                    <p key={position} className="text-body-sm text-primary-container">
                      {line}
                      {/*
                        The caret sits on the line still being written, and only on
                        that one — a block cursor on every line at once reads as a
                        list that failed to render rather than a machine typing.
                      */}
                      {position === opening.typed.length - 1 && !opening.isComplete ? (
                        <span aria-hidden="true" className="ml-0.5 animate-pulse">
                          ▍
                        </span>
                      ) : null}
                    </p>
                  ))}
                </div>
              ) : null}

              {messages.length === 0 && isInputReady ? (
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
                /*
                  Held until the opening message has finished arriving. In the film
                  the last line is the last thing said before Neo answers, and a
                  cursor blinking over an unfinished quotation lets a visitor type
                  into the middle of it.
                */
                disabled={!isInputReady}
                className="min-w-0 flex-1 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted disabled:opacity-60"
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
