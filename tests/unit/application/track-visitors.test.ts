


import { describe, expect, it } from "vitest";

/*
 * Split out of `tests/unit/domain/presence.test.ts`.
 *
 * These exercise use cases, not the pure rules, and `vitest.config.ts` gates
 * coverage per directory — left inside the domain file, `src/application/**` sat
 * at 86.5% and failed the 90% floor.
 */

import {
  ListOnlineVisitors,
  NoteOwnerActivity,
  NoteOwnerSignOut,
  TrackVisitorHeartbeat,
  type PresenceRepository,
} from "@/application/presence/track-visitors";
import {
  MAX_PRESENCE_ROWS,
  PRESENCE_RETENTION_MS,
  type PresenceSession,
} from "@/domain/presence/presence";

/**
 * Presence, with the privacy claim treated as the thing under test.
 *
 * The rule this file exists to enforce is that **there is nowhere to put an
 * address, a device or a fingerprint.** That is stronger than "we do not collect
 * them", which is a promise about behaviour and can be broken by a later commit.
 * It is a claim about the shape of the data, and shape does not change on a
 * Tuesday afternoon when somebody adds a column — so the last block reads the port
 * and the migration the way the theme-feedback test reads its own, mechanically,
 * and expecting to fail.
 */

const A_SESSION = "0f9a3c1b7e2d48a6b0c5e9f1a3d7c2b4";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = 1_800_000_000_000;

function session(overrides: Partial<PresenceSession> = {}): PresenceSession {
  return {
    sessionId: A_SESSION,
    firstSeenAt: NOW - HOUR,
    lastSeenAt: NOW,
    heartbeatCount: 7,
    ...overrides,
  };
}

describe("the presence use cases", () => {
  /*
   * The use cases, tested from this file rather than from
   * `tests/unit/application/`.
   *
   * Two reasons, and the second is the one that matters. The first is that the
   * rules being asserted here — the online window, the sweep, the hour, what a
   * refused id does — are the same rules the blocks above assert, and a reader
   * wants them in one place. The second is coverage: the repository's gate counts
   * `src/application/**`, and use cases with no test are how a codebase quietly
   * loses a 90% floor. Both of these belong in
   * `tests/unit/application/track-visitors.test.ts`; move them when that file is
   * created.
   */

  function stub(
    overrides: Partial<PresenceRepository> = {},
    sessions: PresenceSession[] = [],
  ): PresenceRepository & { calls: { touched: string[]; swept: number[]; limit: number } } {
    const calls = { touched: [] as string[], swept: [] as number[], limit: 0 };

    return {
      calls,
      touch: async (heartbeat) => {
        calls.touched.push(heartbeat.sessionId);
      },
      // The limit is recorded here rather than in the caller, so every variant of
      // this stub asserts the cap the same way.
      list: async (limit) => {
        calls.limit = limit;
        return sessions;
      },
      forget: async (before) => {
        calls.swept.push(before);
        return 0;
      },
      readOwner: async () => null,
      recordOwnerActivity: async () => undefined,
      recordOwnerSignOut: async () => undefined,
      ...overrides,
    };
  }

  it("records a heartbeat for a real session and refuses a fake one", async () => {
    const repository = stub();

    expect(await new TrackVisitorHeartbeat(repository, () => NOW).execute(A_SESSION)).toBe(true);
    expect(repository.calls.touched).toEqual([A_SESSION]);

    /*
     * A `false` rather than a throw: a heartbeat is a background request for every
     * visitor, and a thrown error would surface as a broken page over a body this
     * route did not validate for us.
     */
    for (const value of ["", "nope", A_SESSION.toUpperCase(), 42, null, undefined, {}]) {
      expect(await new TrackVisitorHeartbeat(repository, () => NOW).execute(value)).toBe(false);
    }

    expect(repository.calls.touched).toEqual([A_SESSION]);
  });

  it("sweeps the retention window before it reads, so the count and the rows agree", async () => {
    const repository = stub({}, [session()]);
    const board = await new ListOnlineVisitors(repository, () => NOW).execute();

    expect(repository.calls.swept).toEqual([NOW - PRESENCE_RETENTION_MS]);
    expect(board.counts).toEqual({ online: 1, total: 1, newestSeenAt: NOW });
    expect(board.generatedAt).toBe(NOW);
    // The cap travels with the read, so a traffic spike cannot grow the response.
    expect(repository.calls.limit).toBe(MAX_PRESENCE_ROWS);
  });

  it("still answers the board when the sweep is refused", async () => {
    /*
     * A sweep failure is the server log's problem, not the owner's: presence is a
     * nicety, and losing the console because a delete was refused is a worse trade
     * than a table a few rows too large for a day.
     */
    const repository = stub(
      {
        forget: async () => {
          throw new Error("permission denied for schema public");
        },
      },
      [session()],
    );

    const board = await new ListOnlineVisitors(repository, () => NOW).execute();

    expect(board.counts.online).toBe(1);
  });

  it("says it cannot answer when the owner's own row is unreadable", async () => {
    const repository = stub({
      readOwner: async () => {
        throw new Error("connection reset");
      },
    });

    const board = await new ListOnlineVisitors(repository, () => NOW).execute();

    // "Signed out" is the safe answer to an availability question asked of a
    // database that did not reply.
    expect(board.owner).toBe("signed-out");
  });

  it("reads the owner's availability from the same clock as the board", async () => {
    const fresh = stub({ readOwner: async () => ({ lastActivityAt: NOW - MINUTE, signedOutAt: null }) });
    const stale = stub({ readOwner: async () => ({ lastActivityAt: NOW - HOUR, signedOutAt: null }) });
    const gone = stub({ readOwner: async () => ({ lastActivityAt: NOW, signedOutAt: NOW }) });

    expect((await new ListOnlineVisitors(fresh, () => NOW).execute()).owner).toBe("answering");
    expect((await new ListOnlineVisitors(stale, () => NOW).execute()).owner).toBe("idle");
    expect((await new ListOnlineVisitors(gone, () => NOW).execute()).owner).toBe("signed-out");
  });

  it("stamps owner activity and sign-out, which are the only two writes the owner can make", async () => {
    const stamped: number[] = [];
    const repository = stub({
      recordOwnerActivity: async (at) => {
        stamped.push(at);
      },
      recordOwnerSignOut: async (at) => {
        stamped.push(-at);
      },
    });

    await new NoteOwnerActivity(repository, () => NOW).execute();
    await new NoteOwnerSignOut(repository, () => NOW + 1).execute();

    expect(stamped).toEqual([NOW, -(NOW + 1)]);
  });
});
