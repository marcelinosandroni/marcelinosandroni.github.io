"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import type { OwnerActivityState } from "@/domain/presence/presence";
import type { ChatMessage, ConversationSummary, MessageAuthor } from "@/domain/chat/message";
import type { PresenceBoard } from "@/application/presence/track-visitors";
import { formatMessage } from "@/i18n/format-message";

/**
 * The owner's console: who is reading, and the conversations.
 *
 * ## The first snapshot arrives on the server
 *
 * The board is read by `src/app/admin/page.tsx` and handed over as a prop, for
 * the same reason the theme-feedback counts and the post list are: the page is
 * dynamic and this data is live, so a fetch-on-mount would be a second request
 * that lands after the HTML and shows a spinner for a number the server already
 * had. After that the component polls, because "who is online" is a question whose
 * answer is stale the moment it is rendered.
 *
 * ## The rule this screen exists to enforce
 *
 * **The owner starts every conversation.** The button next to a visitor is the
 * only thing in this codebase that offers a chat to a stranger, and it is a
 * deliberate act on a session that is already listed. There is no way to reply to
 * somebody who has not been contacted first, because there is nothing to reply to
 * until this console says so.
 *
 * ## Availability
 *
 * The badge is `OwnerActivityState` verbatim: answering while this page is open
 * and looked at, idle after an hour, signed out the moment the session ends. It
 * is rendered from the server's answer rather than recomputed in the browser,
 * because the browser cannot know when the *server* last saw an authenticated
 * request — and a badge that lies about being available is the one thing this
 * whole mechanism is trying to prevent.
 *
 * ## What the screen deliberately does not show
 *
 * No address, no device, no viewport, no referrer, no "returning visitor" flag. A
 * session id and a time. The list is short partly because that is all there is
 * and partly because a list of strangers' metadata is a thing nobody needs to be
 * able to scroll through.
 */

export interface ChatConsoleLabels {
  sectionTitle: string;
  sectionDescription: string;
  online: string;
  onlineNone: string;
  lastSeenNow: string;
  lastSeenMinutes: string;
  lastSeenHours: string;
  visitorsLabel: string;
  noVisitors: string;
  availabilityLabel: string;
  availabilityAnswering: string;
  availabilityIdle: string;
  availabilitySignedOut: string;
  availabilityHint: string;
  startChat: string;
  reopenChat: string;
  openTranscript: string;
  started: string;
  closeChat: string;
  closeChatWarning: string;
  conversationLabel: string;
  replyPlaceholder: string;
  sendReply: string;
  transcriptLabel: string;
  emptyConversation: string;
  stateLabel: string;
  stateUnopened: string;
  stateOpen: string;
  stateClosed: string;
  youLabel: string;
  visitorLabel: string;
  failed: string;
  rateLimited: string;
  sessionEnded: string;
  loadFailed: string;
  /** The one string shared with the visitor's widget: the automated label. */
  agentNotice: string;
}

export interface ChatConsoleProps {
  labels: ChatConsoleLabels;
  /** The board, read on the server. `null` means the read failed. */
  initialBoard: PresenceBoard | null;
  initialConversations: ReadonlyArray<ConversationSummary> | null;
}

type Notice = { tone: "ok" | "error"; text: string } | null;

/** How often the board and the transcripts are re-read. */
const POLL_MS = 10_000;

export function ChatConsole({
  labels,
  initialBoard,
  initialConversations,
}: ChatConsoleProps) {
  const [board, setBoard] = useState<PresenceBoard | null>(initialBoard);
  const [conversations, setConversations] = useState<ReadonlyArray<ConversationSummary>>(
    initialConversations ?? [],
  );
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Re-reads everything.
   *
   * Only ever called from an event handler or a timer, never from a mount effect:
   * the first snapshot is a prop, so a fetch on mount would be the second request
   * for a number the server already had, arriving after the HTML and replacing it
   * with a spinner.
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/chat/messages", { cache: "no-store" });

      if (response.status === 401) {
        /*
         * The session ended while this page was open. The guard has already
         * recorded the sign-out, so the next sign-in starts from "signed out"
         * rather than from a stale hour of claimed availability — but the page
         * itself is a server render and cannot be downgraded from here, so it says
         * what happened and asks for a reload.
         */
        setNotice({ tone: "error", text: labels.sessionEnded });
        setBoard((previous) => (previous === null ? previous : { ...previous, owner: "signed-out" }));

        return;
      }

      if (!response.ok) {
        setNotice({ tone: "error", text: labels.failed });
        return;
      }

      const payload = (await response.json()) as {
        board?: PresenceBoard;
        conversations?: ConversationSummary[];
      };

      setBoard(payload.board ?? null);
      setConversations(Array.isArray(payload.conversations) ? payload.conversations : []);
    } catch {
      setNotice({ tone: "error", text: labels.failed });
    }
  }, [labels.failed, labels.sessionEnded]);

  useEffect(() => {
    const timer = setInterval(() => {
      /*
       * A background tab is throttled to roughly one timer a minute, and the board
       * is only interesting while somebody is looking at it — so the poll is
       * simply late, never wrong, and the first tick after a return to the tab is
       * the one that refreshes.
       */
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [refresh]);

  /*
   * The owner opens a conversation. This is the whole admin-initiates rule at the
   * UI layer: the button exists per visitor, and `PATCH /api/chat/messages` is the
   * only call that turns a chat on.
   */
  const start = useCallback(
    (session: string) => {
      startTransition(async () => {
        const response = await fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session }),
        });

        if (response.status === 401) {
          setNotice({ tone: "error", text: labels.sessionEnded });
          return;
        }

        if (!response.ok) {
          setNotice({ tone: "error", text: labels.failed });
          return;
        }

        setNotice({ tone: "ok", text: labels.started });
        setOpenSession(session);
        await refresh();
      });
    },
    [labels.failed, labels.sessionEnded, labels.started, refresh],
  );

  const close = useCallback(
    (session: string) => {
      startTransition(async () => {
        const response = await fetch(`/api/chat/messages?session=${session}`, {
          method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
          setNotice({ tone: "error", text: labels.failed });
          return;
        }

        setNotice({ tone: "ok", text: labels.closeChat });
        setOpenSession((current) => (current === session ? null : current));
        await refresh();
      });
    },
    [labels.closeChat, labels.failed, refresh],
  );

  const reply = useCallback(
    (session: string) => {
      const body = draft.trim();

      if (body === "") {
        return;
      }

      startTransition(async () => {
        const response = await fetch("/api/chat/messages", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session, text: body }),
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "60");

          setNotice({
            tone: "error",
            text: formatMessage(labels.rateLimited, {
              seconds: Number.isFinite(retryAfter) ? retryAfter : 60,
            }),
          });

          return;
        }

        if (response.status === 401) {
          setNotice({ tone: "error", text: labels.sessionEnded });
          return;
        }

        if (response.status === 409) {
          setNotice({ tone: "error", text: labels.stateClosed });
          return;
        }

        if (!response.ok) {
          setNotice({ tone: "error", text: labels.failed });
          return;
        }

        setDraft("");
        setNotice({ tone: "ok", text: labels.sendReply });
        await refresh();
      });
    },
    [draft, labels.failed, labels.rateLimited, labels.sendReply, labels.sessionEnded, labels.stateClosed, refresh],
  );

  const online = board?.counts.online ?? 0;
  const conversationFor = (session: string): ConversationSummary | undefined =>
    conversations.find((entry) => entry.sessionId === session);

  return (
    <section aria-labelledby="chat-console-heading" data-chat-console="presence">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <div>
          <h2 id="chat-console-heading" className="font-headline-sm text-headline-sm text-text-primary">
            {labels.sectionTitle}
          </h2>
          <p className="mt-1 max-w-2xl text-body-sm text-body-sm text-text-secondary">
            {labels.sectionDescription}
          </p>
        </div>

        <AvailabilityBadge state={board?.owner ?? "signed-out"} labels={labels} />
      </header>

      <p className="mt-2 font-label-mono text-label-mono text-text-muted">{labels.availabilityHint}</p>

      {/* Present from the first render, so an announcement has somewhere to go. */}
      <p role="status" aria-live="polite" className="mt-space-sm min-h-5 text-body-sm text-body-sm text-text-secondary">
        {notice?.text ?? ""}
      </p>

      <p className="mt-space-sm font-label-mono text-label-mono text-text-secondary" data-chat-online={online}>
        {online === 0
          ? labels.onlineNone
          : formatMessage(labels.online, { count: online })}
      </p>

      {initialBoard === null ? (
        <p className="mt-space-sm text-body-sm text-body-sm text-text-secondary">{labels.loadFailed}</p>
      ) : null}

      <h3 className="mt-space-md font-label-mono text-label-mono uppercase text-text-muted">
        {labels.visitorsLabel}
      </h3>

      {board === null || board.visitors.length === 0 ? (
        <p className="mt-space-sm text-body-sm text-body-sm text-text-secondary">{labels.noVisitors}</p>
      ) : (
        <ul className="mt-space-sm space-y-space-sm">
          {board.visitors.map((visitor) => {
            const conversation = conversationFor(visitor.sessionId);
            const isOpen = openSession === visitor.sessionId;
            const state = conversation?.state ?? "unopened";

            return (
              <li key={visitor.sessionId} className="border border-border-subtle bg-surface-base p-space-md">
                <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
                  <div className="flex flex-wrap items-baseline gap-space-sm">
                    <PresenceDot isOnline={visitor.isOnline} />
                    <p className="font-label-mono text-label-mono text-text-primary">
                      {/* A prefix of the id, never the whole thing: it identifies nothing. */}
                      {visitor.sessionId.slice(0, 8)}
                    </p>
                    <span className="font-label-mono text-label-mono text-text-muted">
                      {lastSeen(visitor.lastSeenAt, labels, board.generatedAt)}
                    </span>
                  </div>

                  <span className="font-label-mono text-label-mono text-text-muted">
                    {`${labels.stateLabel}: ${stateLabel(state, labels)}`}
                  </span>
                </div>

                <div className="mt-space-sm flex flex-wrap items-center gap-space-sm">
                  {state === "open" ? (
                    <button
                      type="button"
                      className="button button-quiet"
                      aria-expanded={isOpen}
                      // Only when the transcript exists: an `aria-controls`
                      // pointing at an absent element is a reference a screen
                      // reader has nothing to resolve.
                      aria-controls={isOpen ? "chat-console-transcript" : undefined}
                      onClick={() => setOpenSession(isOpen ? null : visitor.sessionId)}
                      disabled={isPending}
                    >
                      {labels.openTranscript}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button-primary"
                      data-click="console-start-chat"
                      onClick={() => start(visitor.sessionId)}
                      disabled={isPending}
                    >
                      {state === "closed" ? labels.reopenChat : labels.startChat}
                    </button>
                  )}

                  {state === "open" && isOpen ? (
                    <button
                      type="button"
                      className="button button-quiet"
                      data-click="console-close-chat"
                      onClick={() => close(visitor.sessionId)}
                      disabled={isPending}
                    >
                      {labels.closeChat}
                    </button>
                  ) : null}
                </div>

                {state === "open" && isOpen && conversation !== undefined ? (
                  <Transcript
                    id="chat-console-transcript"
                    conversation={conversation}
                    draft={draft}
                    labels={labels}
                    disabled={isPending}
                    onDraft={setDraft}
                    onSend={() => reply(visitor.sessionId)}
                  />
                ) : null}

                {state === "open" && isOpen ? (
                  <p className="mt-space-sm text-body-sm text-body-sm text-text-muted">
                    {labels.closeChatWarning}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * The availability badge.
 *
 * `aria-live` is deliberately absent: it changes at most once an hour and is read
 * in the same glance as the count above it. Announcing it would interrupt
 * whatever the screen reader was saying for information nobody asked for.
 */
function AvailabilityBadge({
  state,
  labels,
}: {
  state: OwnerActivityState;
  labels: ChatConsoleLabels;
}) {
  const text =
    state === "answering"
      ? labels.availabilityAnswering
      : state === "idle"
        ? labels.availabilityIdle
        : labels.availabilitySignedOut;

  return (
    <p className="font-label-mono text-label-mono text-text-secondary" data-owner-availability={state}>
      {`${labels.availabilityLabel} ${text}`}
    </p>
  );
}

/** A filled square when the heartbeat is inside the online window, hollow when not. */
function PresenceDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-presence-state={isOnline ? "online" : "offline"}
      className={
        isOnline
          ? "inline-block h-2 w-2 bg-primary-container"
          : "inline-block h-2 w-2 border border-border-prominent"
      }
    />
  );
}

function Transcript({
  id,
  conversation,
  draft,
  labels,
  disabled,
  onDraft,
  onSend,
}: {
  id: string;
  conversation: ConversationSummary;
  draft: string;
  labels: ChatConsoleLabels;
  disabled: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
}) {
  const inputId = `${id}-input`;

  return (
    <div className="mt-space-md border border-border-subtle bg-surface-raised p-space-sm">
      <h4 className="font-label-mono text-label-mono uppercase text-text-muted">
        {labels.transcriptLabel}
      </h4>

      {/*
        `role="log"` here too, for the same reason as the visitor's panel: a new
        message is announced, and the history is not read out again on every poll.
      */}
      <div
        id={id}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={formatMessage(labels.conversationLabel, { session: conversation.sessionId.slice(0, 8) })}
        className="mt-space-sm max-h-72 overflow-y-auto"
      >
        {conversation.messages.length === 0 ? (
          <p className="text-body-sm text-body-sm text-text-muted">{labels.emptyConversation}</p>
        ) : (
          conversation.messages.map((message) => (
            <ConsoleMessage key={message.id} message={message} labels={labels} />
          ))
        )}
      </div>

      <form
        className="mt-space-sm flex items-center gap-space-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          {labels.replyPlaceholder}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          placeholder={labels.replyPlaceholder}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 border border-border-subtle bg-surface-base px-space-sm py-space-sm font-body-sm text-body-sm text-text-primary outline-none focus:border-primary-container"
        />
        <button
          type="submit"
          className="button button-primary"
          data-click="console-send-reply"
          disabled={disabled || draft.trim() === ""}
        >
          {labels.sendReply}
        </button>
      </form>
    </div>
  );
}

/**
 * One message in the console.
 *
 * The owner must never mistake the queue for themselves, and the owner must never
 * mistake themselves for the queue — so `agent` is rendered with the same notice
 * the visitor sees, in the same slot, and it is keyed off `author` rather than
 * off the text.
 */
function ConsoleMessage({
  message,
  labels,
}: {
  message: ChatMessage;
  labels: ChatConsoleLabels;
}) {
  const authorLabel = authorName(message.author, labels);

  return (
    <p className="mt-space-sm whitespace-pre-line text-body-sm text-text-secondary">
      <span className="font-label-mono text-[10px] uppercase tracking-widest text-text-muted">
        {authorLabel}
      </span>
      {message.author === "agent" ? (
        <span className="ml-space-xs font-label-mono text-[10px] uppercase tracking-widest text-text-muted">
          {`// ${message.automatedNotice ?? labels.agentNotice}`}
        </span>
      ) : null}
      <span className="sr-only">{`: `}</span>
      {message.body}
    </p>
  );
}

function authorName(author: MessageAuthor, labels: ChatConsoleLabels): string {
  if (author === "owner") {
    return labels.youLabel;
  }

  return labels.visitorLabel;
}

function stateLabel(
  state: ConversationSummary["state"],
  labels: ChatConsoleLabels,
): string {
  return state === "open" ? labels.stateOpen : state === "closed" ? labels.stateClosed : labels.stateUnopened;
}

/**
 * "just now", "3m ago", "2h ago".
 *
 * Relative, because a board's job is to answer "is this person here now", and an
 * absolute timestamp makes the reader do the subtraction. Three granularities and
 * then nothing: past three hours a session is a day-old row and the owner does not
 * need a fourth, and every extra granularity would be another string in two
 * catalogs for a number nobody reads closely.
 */
function lastSeen(
  lastSeenAt: number,
  labels: ChatConsoleLabels,
  now: number,
): string {
  const minutes = Math.max(0, Math.round((now - lastSeenAt) / 60_000));

  if (minutes < 1) {
    return labels.lastSeenNow;
  }

  if (minutes < 60) {
    return formatMessage(labels.lastSeenMinutes, { minutes });
  }

  return formatMessage(labels.lastSeenHours, { hours: Math.round(minutes / 60) });
}
