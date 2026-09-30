import {
  MAX_PRESENCE_ROWS,
  NO_OWNER_PRESENCE,
  forgettableBefore,
  isPresenceSessionId,
  ownerActivityState,
  summarisePresence,
  toVisitorPresence,
  type OwnerActivityState,
  type OwnerPresence,
  type PresenceCounts,
  type PresenceHeartbeat,
  type PresenceSession,
  type VisitorPresence,
} from "@/domain/presence/presence";

/**
 * Presence, as an application service.
 *
 * Three use cases over one port: a heartbeat from a browser, the board the owner
 * reads, and the owner's own availability. The port is the interesting part —
 * look at its signature and note what a caller *cannot* pass. There is no
 * argument for an address, a user agent, a referrer, a viewport, a device or a
 * fingerprint, on any method, because those are not parameters the port has. The
 * privacy claim is therefore enforced by a type rather than by a review comment,
 * which is the same move `theme_feedback` makes and the reason it survives a
 * year of commits.
 */

/**
 * The presence port.
 *
 * `touch` is the only write a visitor can cause, and it takes a heartbeat: an id
 * the browser generated and a time. It does not take a `firstSeenAt` or a count,
 * because both are the repository's to derive — a caller that could set them
 * could claim a session has been around since last week.
 */
export interface PresenceRepository {
  /** Creates or refreshes one session row. */
  touch(heartbeat: PresenceHeartbeat): Promise<void>;
  /** Every session row, newest first, capped by the repository. */
  list(limit: number): Promise<PresenceSession[]>;
  /** Deletes rows last seen before the cutoff. Resolves to how many went. */
  forget(before: number): Promise<number>;
  /** The owner's own row, or `null` when there has never been one. */
  readOwner(): Promise<OwnerPresence | null>;
  /** Stamps owner activity, which is what keeps the console "answering". */
  recordOwnerActivity(at: number): Promise<void>;
  /** Records a sign-out, which ends availability immediately. */
  recordOwnerSignOut(at: number): Promise<void>;
}

/** What the board renders: who is here, and whether the owner can answer. */
export type PresenceBoard = {
  readonly visitors: ReadonlyArray<VisitorPresence>;
  readonly counts: PresenceCounts;
  readonly owner: OwnerActivityState;
  /** Epoch milliseconds the board was computed at, so the UI can say "as of". */
  readonly generatedAt: number;
};

/**
 * Records that a browser is still on the page.
 *
 * A heartbeat from an anonymous caller, so the only thing it validates is the id.
 * The return value is a boolean rather than a throw: a heartbeat must never be
 * able to fail a page, and the theme-feedback route's comment applies verbatim —
 * a counter that cannot be written must not surface as a broken site. A caller
 * that needs to know whether it worked can, and the answer is only ever about
 * the id it sent.
 */
export class TrackVisitorHeartbeat {
  constructor(
    private readonly repository: PresenceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(sessionId: unknown): Promise<boolean> {
    if (!isPresenceSessionId(sessionId)) {
      return false;
    }

    await this.repository.touch({ sessionId, sentAt: this.now() });

    return true;
  }
}

/**
 * The owner's board: who is reading, and whether they can be answered.
 *
 * The sweep runs *before* the read rather than after it, so the number on screen
 * and the rows underneath it are from the same pass. A sweep that ran afterwards
 * would leave the console claiming someone is online for one more render after
 * they had gone, which is the kind of small wrongness that makes a board stop
 * being believed.
 *
 * A sweep failure does not fail the board. Presence is a nicety; the owner losing
 * the ability to see the console because a delete was refused is a worse trade
 * than a table that is a few rows too large for a day.
 */
export class ListOnlineVisitors {
  constructor(
    private readonly repository: PresenceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(): Promise<PresenceBoard> {
    const at = this.now();

    try {
      await this.repository.forget(forgettableBefore(at));
    } catch {
      // Reported by the caller's own logging, if it cares. Not worth a 503.
    }

    const [sessions, owner] = await Promise.all([
      this.repository.list(MAX_PRESENCE_ROWS),
      this.readOwnerSafely(),
    ]);

    const visitors = toVisitorPresence(sessions, at);

    return {
      visitors,
      counts: summarisePresence(visitors),
      owner,
      generatedAt: at,
    };
  }

  private async readOwnerSafely(): Promise<OwnerActivityState> {
    try {
      const presence = (await this.repository.readOwner()) ?? NO_OWNER_PRESENCE;

      return ownerActivityState(presence, this.now());
    } catch {
      /*
       * "Cannot answer" is the safe answer to an availability question asked of a
       * database that did not reply. A console that says "answering" when it
       * cannot know is the one failure this whole rule exists to prevent.
       */
      return "signed-out";
    }
  }
}

/**
 * Stamps the owner as active.
 *
 * Called by every authenticated owner request, so "activity" is the console being
 * open and looked at rather than a claim somebody has to maintain. This is what
 * makes the hour in `ownerActivityState` mean something: it is an hour without
 * the console being looked at, not an hour without a message being written.
 */
export class NoteOwnerActivity {
  constructor(
    private readonly repository: PresenceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(): Promise<void> {
    await this.repository.recordOwnerActivity(this.now());
  }
}

/**
 * Records that the owner's session is gone.
 *
 * Called from the guard that answers `401`, which is the only place that knows.
 * The alternative — waiting for the console to notice — cannot work, because the
 * console is unmounted the moment the session ends and a stale row would keep
 * advertising an available owner for up to an hour.
 */
export class NoteOwnerSignOut {
  constructor(
    private readonly repository: PresenceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async execute(): Promise<void> {
    await this.repository.recordOwnerSignOut(this.now());
  }
}
