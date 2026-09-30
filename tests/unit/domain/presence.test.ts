import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";


import {
  InvalidPresenceSessionIdError,
  MAX_PRESENCE_ROWS,
  NO_OWNER_PRESENCE,
  OWNER_IDLE_AFTER_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_ONLINE_WINDOW_MS,
  PRESENCE_RETENTION_MS,
  PRESENCE_SESSION_ID_LENGTH,
  PRESENCE_SESSION_ID_PATTERN,
  PRESENCE_STATES,
  canOwnerAnswer,
  forgettableBefore,
  isForgettable,
  isOnline,
  isPresenceSessionId,
  ownerActivityState,
  presenceState,
  recordOwnerActivity,
  recordOwnerSignOut,
  summarisePresence,
  toVisitorPresence,
  type OwnerPresence,
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

const root = resolve(__dirname, "../../..");

const A_SESSION = "0f9a3c1b7e2d48a6b0c5e9f1a3d7c2b4";
const OTHER_SESSION = "1a2b3c4d5e6f70819293a4b5c6d7e8f9";
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

describe("the session id", () => {
  it("is 32 lowercase hex characters, and only that", () => {
    expect(PRESENCE_SESSION_ID_LENGTH).toBe(32);
    expect(PRESENCE_SESSION_ID_PATTERN.source).toBe("^[0-9a-f]{32}$");

    for (const valid of [A_SESSION, "0".repeat(32), "abcdef0123456789abcdef0123456789"]) {
      expect(isPresenceSessionId(valid)).toBe(true);
    }
  });

  it("refuses everything else, including near misses", () => {
    for (const value of [
      "",
      "abc",
      "0".repeat(31),
      "0".repeat(33),
      A_SESSION.toUpperCase(),
      `${A_SESSION}0`,
      ` ${A_SESSION}`,
      "../../etc/passwd",
      "00000000-0000-0000-0000-000000000000",
      "z".repeat(32),
      42,
      null,
      undefined,
      {},
      [],
    ]) {
      expect(isPresenceSessionId(value)).toBe(false);
    }
  });

  it("refuses an id that is not a session at all", () => {
    /*
     * The name exists so a caller that skipped the predicate still has to write
     * something. `String(value)` in the message is deliberate: the value came from
     * a request, and the message is logged, never returned.
     */
    const error = new InvalidPresenceSessionIdError(undefined);

    expect(error.name).toBe("InvalidPresenceSessionIdError");
    expect(error.message).toContain(String(PRESENCE_SESSION_ID_LENGTH));
  });
});

describe("presence state", () => {
  it("is one of exactly two values", () => {
    expect(PRESENCE_STATES).toEqual(["online", "offline"]);
  });

  it("counts a heartbeat as online for three beats, not one", () => {
    /*
     * A background tab has its timers throttled to about once a minute and a
     * sleeping laptop sends nothing at all, so a one-beat window would report a
     * reader who is still reading as gone the instant they switched tabs.
     */
    expect(PRESENCE_ONLINE_WINDOW_MS).toBe(3 * MINUTE);
    expect(PRESENCE_HEARTBEAT_MS).toBe(MINUTE);
    expect(PRESENCE_ONLINE_WINDOW_MS).toBeGreaterThan(PRESENCE_HEARTBEAT_MS);
  });

  it("is online at the moment of the heartbeat and just before the window closes", () => {
    expect(presenceState(session({ lastSeenAt: NOW }), NOW)).toBe("online");
    expect(isOnline(session({ lastSeenAt: NOW }), NOW)).toBe(true);

    expect(
      presenceState(session({ lastSeenAt: NOW - (PRESENCE_ONLINE_WINDOW_MS - 1) }), NOW),
    ).toBe("online");
  });

  it("is offline at the window boundary itself, not a second later", () => {
    // An inclusive boundary would keep somebody online for an extra window.
    expect(presenceState(session({ lastSeenAt: NOW - PRESENCE_ONLINE_WINDOW_MS }), NOW)).toBe(
      "offline",
    );
  });

  it("treats a heartbeat from the future as online rather than as an accident", () => {
    // A browser whose clock is ahead is far likelier than a visitor from the future.
    expect(presenceState(session({ lastSeenAt: NOW + HOUR }), NOW)).toBe("online");
  });

  it("is offline for anything older, however old", () => {
    for (const age of [PRESENCE_ONLINE_WINDOW_MS, HOUR, PRESENCE_RETENTION_MS, 10 * PRESENCE_RETENTION_MS]) {
      expect(presenceState(session({ lastSeenAt: NOW - age }), NOW)).toBe("offline");
    }
  });
});

describe("forgetting a session", () => {
  it("keeps a row for a day and deletes it after", () => {
    expect(isForgettable(session({ lastSeenAt: NOW - MINUTE }), NOW)).toBe(false);
    expect(isForgettable(session({ lastSeenAt: NOW - (PRESENCE_RETENTION_MS - 1) }), NOW)).toBe(false);
    expect(isForgettable(session({ lastSeenAt: NOW - PRESENCE_RETENTION_MS }), NOW)).toBe(true);
  });

  it("hands the delete a cutoff of exactly the retention window", () => {
    expect(forgettableBefore(NOW)).toBe(NOW - PRESENCE_RETENTION_MS);
  });

  it("drops a forgotten row from the board even before the sweep reaches it", () => {
    /*
     * The delete and the filter are both needed. The delete keeps the table small;
     * this keeps the answer honest in the window between a visitor going quiet and
     * the sweep catching up.
     */
    const visitors = toVisitorPresence(
      [
        session(),
        session({ sessionId: OTHER_SESSION, lastSeenAt: NOW - PRESENCE_RETENTION_MS - 1 }),
      ],
      NOW,
    );

    expect(visitors.map((visitor) => visitor.sessionId)).toEqual([A_SESSION]);
  });
});

describe("the board", () => {
  it("derives the state and the boolean from the same read", () => {
    const [online, offline] = toVisitorPresence(
      [session(), session({ sessionId: OTHER_SESSION, lastSeenAt: NOW - HOUR })],
      NOW,
    );

    expect(online).toMatchObject({ state: "online", isOnline: true });
    expect(offline).toMatchObject({ state: "offline", isOnline: false });
  });

  it("counts what the list shows, so the number and the rows cannot disagree", () => {
    const visitors = toVisitorPresence(
      [
        session(),
        session({ sessionId: OTHER_SESSION }),
        session({ sessionId: "b".repeat(32), lastSeenAt: NOW - HOUR }),
      ],
      NOW,
    );

    expect(summarisePresence(visitors)).toEqual({ online: 2, total: 3, newestSeenAt: NOW });
  });

  it("reports no visitors at all as zero rather than as nothing", () => {
    expect(summarisePresence([])).toEqual({ online: 0, total: 0, newestSeenAt: null });
  });

  it("caps the read, so a traffic spike cannot grow the response", () => {
    const sessions = Array.from({ length: MAX_PRESENCE_ROWS + 50 }, (_, index) =>
      session({ sessionId: index.toString(16).padStart(32, "0"), lastSeenAt: NOW - index }),
    );

    expect(toVisitorPresence(sessions, NOW)).toHaveLength(MAX_PRESENCE_ROWS);
  });
});

describe("owner availability", () => {
  function owner(overrides: Partial<OwnerPresence> = {}): OwnerPresence {
    return { lastActivityAt: NOW - MINUTE, signedOutAt: null, ...overrides };
  }

  it("goes idle after an hour and not a second before", () => {
    expect(OWNER_IDLE_AFTER_MS).toBe(HOUR);

    expect(canOwnerAnswer(owner(), NOW)).toBe(true);
    expect(canOwnerAnswer(owner({ lastActivityAt: NOW - (HOUR - 1) }), NOW)).toBe(true);

    expect(canOwnerAnswer(owner({ lastActivityAt: NOW - HOUR }), NOW)).toBe(false);
    expect(ownerActivityState(owner({ lastActivityAt: NOW - HOUR }), NOW)).toBe("idle");
  });

  it("is signed out before anything has ever happened", () => {
    /*
     * The state an unconfigured deployment is in, and the state a console shows on
     * a read that failed. Both are the same answer: it cannot answer, and saying
     * "answering" about a database that did not reply is the failure this rule
     * exists to prevent.
     */
    expect(ownerActivityState(NO_OWNER_PRESENCE, NOW)).toBe("signed-out");
    expect(canOwnerAnswer(NO_OWNER_PRESENCE, NOW)).toBe(false);
  });

  it("ends immediately on a sign-out, even with activity a second ago", () => {
    const afterSignOut = recordOwnerSignOut(owner(), NOW);

    expect(ownerActivityState(afterSignOut, NOW)).toBe("signed-out");
    expect(canOwnerAnswer(afterSignOut, NOW)).toBe(false);
    // Still signed out a moment later: this is immediate, not "until the hour is up".
    expect(canOwnerAnswer(afterSignOut, NOW + 1)).toBe(false);
  });

  it("lets a later sign-in revive it, because activity outranks a stale sign-out", () => {
    const signedOut = recordOwnerSignOut(owner(), NOW);
    const signedIn = recordOwnerActivity(signedOut, NOW + MINUTE);

    expect(canOwnerAnswer(signedIn, NOW + MINUTE)).toBe(true);
  });

  it("ignores an out-of-order sign-out rather than resurrecting a session", () => {
    /*
     * The guard that writes this runs on a 401 that can race with a poll that
     * succeeded. A sign-out stamped with an earlier clock than the last activity
     * must not make the console claim the owner has left — and must not make it
     * claim they are still there either, which is why the rule is on the *state*
     * and not on the write: `signedOutAt` is kept, and it simply does not outrank
     * a later activity.
     */
    const active = recordOwnerActivity(NO_OWNER_PRESENCE, NOW);
    const late = recordOwnerSignOut(active, NOW - HOUR);

    expect(ownerActivityState(late, NOW)).toBe("answering");
    expect(canOwnerAnswer(late, NOW)).toBe(true);
  });

  it("keeps a sign-out that is already newer", () => {
    const signedOut = recordOwnerSignOut(NO_OWNER_PRESENCE, NOW);

    expect(recordOwnerSignOut(signedOut, NOW + HOUR).signedOutAt).toBe(NOW + HOUR);
  });

  it("ignores a second sign-out stamped earlier than the first", () => {
    // The other half of the ordering rule: two 401s can race, and the one that
    // arrives with the earlier clock must not walk the timestamp backwards.
    const signedOut = recordOwnerSignOut(NO_OWNER_PRESENCE, NOW);

    expect(recordOwnerSignOut(signedOut, NOW - HOUR)).toBe(signedOut);
  });

  it("clears the sign-out when activity is recorded", () => {
    expect(recordOwnerActivity(recordOwnerSignOut(NO_OWNER_PRESENCE, NOW), NOW).signedOutAt).toBeNull();
  });
});


describe("privacy invariants", () => {
  it("the port cannot carry anything but an id and a time", () => {
    /*
     * Read from the source rather than trusted. A privacy claim in a comment is
     * worth nothing if the signature permits the thing it claims to forbid, and the
     * signature is what an implementation is bound by.
     */
    const source = readFileSync(
      resolve(root, "src/application/presence/track-visitors.ts"),
      "utf8",
    );

    const signatures = [...source.matchAll(/^\s{2}\w+\(.*?\):\s*Promise<.*?>;/gm)].map(
      (match) => match[0],
    );

    expect(signatures.length).toBeGreaterThan(0);

    for (const signature of signatures) {
      expect(signature).toMatch(/PresenceSessionId|PresenceSession|OwnerPresence|number|void/);
      // Word-bounded so `list` does not trip on the substring in "list(".
      expect(signature).not.toMatch(/\bip\b|\baddress\b|user_?agent|referrer|viewport|device|fingerprint|cookie|email|\bua\b/i);
    }
  });

  it("the presence table has no column a device or an address could go in", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    /*
     * The column definitions only — up to the statement's closing paren, not the
     * comments that follow. A test that read the prose would be testing the
     * migration's spelling, and the comments are allowed to say "browsers" and
     * "device" while explaining that neither is stored.
     */
    const start = migration.indexOf("create table if not exists public.visitor_presence");
    const table = migration.slice(start, migration.indexOf(");", start));

    for (const forbidden of [
      "ip",
      "address",
      "user_agent",
      "useragent",
      "referrer",
      "referer",
      "device",
      "viewport",
      "screen",
      "fingerprint",
      "cookie",
      "email",
      "geo",
      "country",
      "city",
    ]) {
      expect(
        new RegExp(`\\b${forbidden}\\b`, "i").test(table),
        `visitor_presence mentions "${forbidden}"`,
      ).toBe(false);
    }

    // The four things it does hold, so the test is not vacuously true.
    for (const expected of ["session_id", "first_seen_at", "last_seen_at", "heartbeat_count"]) {
      expect(table).toContain(expected);
    }
  });

  it("mirrors the session id pattern everywhere it is checked", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    const pattern = new RegExp(PRESENCE_SESSION_ID_PATTERN.source);

    // Both primary keys and both function bodies, because all four are places a
    // value becomes a row.
    const checks = migration.match(/~ '\^\[0-9a-f\]\{32\}\$'/g) ?? [];

    expect(checks.length).toBe(4);
    expect(pattern.test(A_SESSION)).toBe(true);
  });

  it("denies the anonymous role every table, and grants it two functions", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    for (const table of [
      "visitor_presence",
      "owner_presence",
      "chat_conversations",
      "chat_messages",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(
        `revoke all on table public.${table} from anon, authenticated;`,
      );
    }

    // No policy at all: RLS with zero policies is default deny.
    expect(migration).not.toMatch(/create policy/i);

    // And the anonymous minimum is exactly two functions.
    expect(migration.match(/grant execute on function/g) ?? []).toHaveLength(2);
    expect(migration).toMatch(/grant execute on function public\.touch_visitor_session\(text\) to anon;/);
    expect(migration).toMatch(
      /grant execute on function public\.append_visitor_message\([^\n]*\) to anon;/,
    );
  });

  it("defines the two functions the adapter calls, and no others", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    const source = readFileSync(
      resolve(root, "src/infrastructure/supabase/presence-realtime.ts"),
      "utf8",
    );

    const functions = [
      ...migration.matchAll(/create or replace function public\.(\w+)\(/g),
    ].map((match) => match[1]);

    expect(functions.sort()).toEqual(["append_visitor_message", "touch_visitor_session"]);

    // The adapter's names, so a rename on one side fails a test rather than a heartbeat.
    expect(source).toContain('export const TOUCH_FUNCTION = "touch_visitor_session";');
    expect(source).toContain('export const APPEND_VISITOR_FUNCTION = "append_visitor_message";');
  });

  it("raises exactly the two refusals the adapter translates", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000300_presence_and_chat.sql"),
      "utf8",
    );

    for (const code of ["chat_not_open", "chat_rate_limited"]) {
      expect(migration).toContain(`raise exception '${code}'`);
    }

    /*
     * The function also raises `invalid_session`, `invalid_body`, `invalid_locale`
     * and `invalid_policy`, and the adapter does *not* translate those: they can
     * only happen when the application has already refused the same value, so
     * reaching them means a bug, and a bug should surface as a generic failure
     * rather than as a confident "rate limited" aimed at a visitor. The assertion
     * is that no *third* chat refusal exists, because one would be raised and
     * silently mistranslated.
     */
    const refusals = [...migration.matchAll(/raise exception '(chat_[a-z_]+)'/g)].map(
      (match) => match[1],
    );

    expect(refusals.sort()).toEqual(["chat_not_open", "chat_rate_limited"]);
  });
});
