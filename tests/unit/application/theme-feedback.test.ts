import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RecordThemeFeedback, GetThemeFeedback } from "@/application/feedback/theme-feedback";
import { InMemoryThemeFeedbackRepository } from "@/infrastructure/feedback/in-memory-theme-feedback-repository";
import { SupabaseThemeFeedbackRepository, type FeedbackClient } from "@/infrastructure/feedback/supabase-theme-feedback-repository";
import { THEME_IDS } from "@/domain/theme/theme";
import {
  FEEDBACK_THEMES,
  FEEDBACK_VERDICTS,
  isFeedbackTheme,
  isFeedbackVerdict,
  netPreference,
  summariseByTheme,
  type FeedbackCounts,
} from "@/domain/feedback/theme-feedback";

/**
 * Theme feedback, with the privacy claim treated as the thing under test.
 *
 * The rule this file exists to enforce is that **a word a reader typed has
 * nowhere to go.** That is stronger than "we do not collect comments", which is
 * a promise about behaviour and can be broken by a later commit. It is a claim
 * about the shape of the data, and shape does not change on a Tuesday afternoon
 * when someone adds a column.
 *
 * So the last block reads the port and the migration the same way the click
 * aggregate does: mechanically, and expecting to fail.
 */

const root = resolve(__dirname, "../../..");

describe("feedback allowlists", () => {
  it("accepts every declared theme and verdict", () => {
    for (const theme of FEEDBACK_THEMES) {
      expect(isFeedbackTheme(theme)).toBe(true);
    }
    for (const verdict of FEEDBACK_VERDICTS) {
      expect(isFeedbackVerdict(verdict)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of ["neon", "", "CARBON", "../../etc", "paper ", 42, null, undefined, {}]) {
      expect(isFeedbackTheme(value)).toBe(false);
    }
    for (const value of ["good", "bad", "", "KEEP", null, undefined]) {
      expect(isFeedbackVerdict(value)).toBe(false);
    }
  });

  it("agrees with the theme module, so a rename cannot desynchronise them", () => {
    /*
     * The database enum is a mirror of `THEME_IDS`, not an import, precisely so
     * that a mismatch is detectable. A theme added to the app and forgotten here
     * would otherwise accept the switch and then have nowhere to store it.
     */
    expect([...FEEDBACK_THEMES].sort()).toEqual([...THEME_IDS].sort());
  });
});

describe("RecordThemeFeedback", () => {
  it("stores a valid verdict and accumulates", async () => {
    const repository = new InMemoryThemeFeedbackRepository();

    expect(await new RecordThemeFeedback(repository).execute("matrix", "keep")).toBe(true);
    expect(await new RecordThemeFeedback(repository).execute("matrix", "keep")).toBe(true);
    expect(await new RecordThemeFeedback(repository).execute("matrix", "leave")).toBe(true);

    const counts = await new GetThemeFeedback(repository).execute();

    expect(counts).toEqual([
      { theme: "matrix", verdict: "keep", count: 2 },
      { theme: "matrix", verdict: "leave", count: 1 },
    ]);
  });

  it("drops an unknown value silently", async () => {
    const repository = new InMemoryThemeFeedbackRepository();

    expect(await new RecordThemeFeedback(repository).execute("neon", "keep")).toBe(false);
    expect(await new RecordThemeFeedback(repository).execute("paper", "excellent")).toBe(false);
    expect(await new RecordThemeFeedback(repository).execute(null, null)).toBe(false);

    expect(await new GetThemeFeedback(repository).execute()).toEqual([]);
  });

  it("rejects a free-text comment outright", async () => {
    /*
     * The point of the whole design. A visitor is never offered a text field, so
     * there is no text to send; and if one is sent anyway it is refused at the
     * use case rather than quietly stored.
     */
    const repository = new InMemoryThemeFeedbackRepository();

    const accepted = await new RecordThemeFeedback(repository).execute(
      { theme: "paper", verdict: "keep", comment: "love it" },
      "keep",
    );

    expect(accepted).toBe(false);
    expect(await new GetThemeFeedback(repository).execute()).toEqual([]);
  });
});

describe("InMemoryThemeFeedbackRepository", () => {
  it("caps a cell so a loop cannot exhaust memory", async () => {
    const repository = new InMemoryThemeFeedbackRepository();

    for (let i = 0; i < 10_050; i += 1) {
      await repository.increment("carbon", "keep");
    }

    const counts = await repository.list();

    expect(counts).toEqual([{ theme: "carbon", verdict: "keep", count: 10_000 }]);
  });

  it("omits themes nobody has answered", async () => {
    const repository = new InMemoryThemeFeedbackRepository();
    await repository.increment("paper", "unsure");

    expect(await repository.list()).toEqual([{ theme: "paper", verdict: "unsure", count: 1 }]);
  });

  it("clears on reset", async () => {
    const repository = new InMemoryThemeFeedbackRepository();
    await repository.increment("matrix", "leave");
    await repository.reset();

    expect(await repository.list()).toEqual([]);
  });
});

describe("derived readings", () => {
  it("excludes unsure from both sides of the net score", () => {
    /*
     * Someone who saw the control and did nothing is not evidence that the theme
     * is good. Counting them as approval would make a theme look popular for
     * being ignored, which is how a control ends up optimised for impressions
     * rather than for use.
     */
    const counts: FeedbackCounts = [
      { theme: "carbon", verdict: "keep", count: 10 },
      { theme: "carbon", verdict: "leave", count: 5 },
      { theme: "carbon", verdict: "unsure", count: 1000 },
    ];

    expect(netPreference(counts)).toBe(33);
  });

  it("returns zero rather than dividing by nothing", () => {
    expect(netPreference([])).toBe(0);
    expect(netPreference([{ theme: "carbon", verdict: "unsure", count: 4 }])).toBe(0);
  });

  it("zero-fills every theme, so a panel bar is never missing", () => {
    const summary = summariseByTheme([{ theme: "matrix", verdict: "keep", count: 2 }]);

    expect(summary).toHaveLength(FEEDBACK_THEMES.length);
    expect(summary.find((row) => row.theme === "carbon")).toMatchObject({
      keep: 0,
      leave: 0,
      unsure: 0,
      total: 0,
      net: 0,
    });
    expect(summary.find((row) => row.theme === "matrix")).toMatchObject({ keep: 2, total: 2 });
  });
});

describe("SupabaseThemeFeedbackRepository", () => {
  function stub(rows: Array<Record<string, unknown>> = []): FeedbackClient & {
    calls: Array<{ table: string; rows: Array<Record<string, unknown>> }>;
  } {
    const calls: Array<{ table: string; rows: Array<Record<string, unknown>> }> = [];

    return {
      calls,
      from(table: string) {
        return {
          upsert: async (values: Array<Record<string, unknown>>) => {
            calls.push({ table, rows: values });
            return { error: null };
          },
          select: () => ({
            order: async () => ({ data: rows, error: null }),
          }),
        };
      },
    };
  }

  it("upserts on the composite key", async () => {
    const client = stub();

    await new SupabaseThemeFeedbackRepository(client).increment("paper", "keep");

    expect(client.calls[0].table).toBe("theme_feedback");
    expect(client.calls[0].rows[0]).toMatchObject({ theme: "paper", verdict: "keep", count: 1 });
  });

  it("discards a row whose theme or verdict is not known", async () => {
    const client = stub([
      { theme: "neon", verdict: "keep", count: 5 },
      { theme: "paper", verdict: "excellent", count: 5 },
      { theme: "matrix", verdict: "leave", count: 3 },
    ]);

    const counts = await new SupabaseThemeFeedbackRepository(client).list();

    expect(counts).toEqual([{ theme: "matrix", verdict: "leave", count: 3 }]);
  });

  it("propagates a write failure", async () => {
    const client: FeedbackClient = {
      from: () => ({
        upsert: async () => ({ error: { message: "boom" } }),
        select: () => ({ order: async () => ({ data: [], error: null }) }),
      }),
    };

    await expect(
      new SupabaseThemeFeedbackRepository(client).increment("carbon", "keep"),
    ).rejects.toThrow(/boom/);
  });
});

describe("privacy invariants", () => {
  it("the port cannot carry anything but enums and numbers", () => {
    /*
     * Read from the source rather than trusted. A privacy claim in a comment is
     * worth nothing if the signature permits the thing it claims to forbid, and
     * the signature is what an implementation is bound by.
     */
    const source = readFileSync(
      resolve(root, "src/application/feedback/theme-feedback-repository.ts"),
      "utf8",
    );

    const signatures = [...source.matchAll(/^\s{2}\w+\(.*?\):\s*Promise<.*?>;/gm)].map(
      (match) => match[0],
    );

    expect(signatures.length).toBeGreaterThan(0);

    for (const signature of signatures) {
      expect(signature).toMatch(/FeedbackTheme|FeedbackVerdict|number|FeedbackCounts|void/);
      // Word-bounded so `list` does not trip on the substring in "list()".
      expect(signature).not.toMatch(/\bstring\b|\bx\b|\by\b|Point|Position|Ip|Session|Comment/i);
    }
  });

  it("the table has no column a comment could go in", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000100_theme_feedback.sql"),
      "utf8",
    );

    const table = migration.slice(
      migration.indexOf("create table"),
      migration.indexOf("comment on table"),
    );

    /*
     * Checked against the identifiers a comment column could plausibly take. The
     * point is not to enumerate every possible name — it is that the table is
     * two enums and a number, and any of these appearing in it is a failure.
     */
    for (const forbidden of [
      "comment",
      "text",
      "note",
      "body",
      "message",
      "email",
      "address",
      "ip",
      "user_agent",
      "referrer",
      "session",
      "cookie",
      "device",
      "viewport",
    ]) {
      expect(
        new RegExp(`\\b${forbidden}\\b`, "i").test(table),
        `the theme_feedback table mentions "${forbidden}"`,
      ).toBe(false);
    }
  });

  it("keeps the anonymous role read-only, so a loop cannot vote", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000100_theme_feedback.sql"),
      "utf8",
    );

    expect(migration).toMatch(/for select/);
    expect(migration).not.toMatch(/for insert/);
    expect(migration).not.toMatch(/for update/);
  });

  it("the enum in the database matches the domain, and no more", () => {
    const migration = readFileSync(
      resolve(root, "supabase/migrations/20260930000100_theme_feedback.sql"),
      "utf8",
    );

    const themeEnum = migration.slice(
      migration.indexOf("feedback_theme as enum"),
      migration.indexOf(");", migration.indexOf("feedback_theme as enum")),
    );

    const sqlThemes = [...themeEnum.matchAll(/'([a-z-]+)'/g)].map((match) => match[1]).sort();

    expect(sqlThemes).toEqual([...FEEDBACK_THEMES].sort());
  });

  it("holds no state that could identify a reader", () => {
    /*
     * The fallback is a Map of two enums to a number. Asserting the *absence* of
     * request-shaped state is awkward to express in a test, so this reads the
     * class and checks it has exactly one field.
     */
    const source = readFileSync(
      resolve(root, "src/infrastructure/feedback/in-memory-theme-feedback-repository.ts"),
      "utf8",
    );

    const fields = [...source.matchAll(/^\s{2}private\s+(?!static)(?:readonly\s+)?(\w+)/gm)].map(
      (match) => match[1],
    );

    expect(fields).toEqual(["counts"]);
  });
});
