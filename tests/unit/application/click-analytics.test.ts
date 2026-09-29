import { describe, expect, it } from "vitest";

import { GetClickHeatmap, RecordClick } from "@/application/analytics/click-analytics";
import { InMemoryClickAggregateRepository } from "@/infrastructure/analytics/in-memory-click-repository";
import { SupabaseClickAggregateRepository } from "@/infrastructure/analytics/supabase-click-repository";
import { TRACKABLE_ELEMENTS, isTrackableElement } from "@/domain/analytics";

describe("click element allowlist", () => {
  it("accepts only the declared elements", () => {
    for (const element of TRACKABLE_ELEMENTS) {
      expect(isTrackableElement(element)).toBe(true);
    }

    expect(isTrackableElement("anything-else")).toBe(false);
    expect(isTrackableElement("../etc/passwd")).toBe(false);
    expect(isTrackableElement(42)).toBe(false);
    expect(isTrackableElement(null)).toBe(false);
    expect(isTrackableElement(undefined)).toBe(false);
  });
});

describe("RecordClick", () => {
  it("increments an allowlisted element", async () => {
    const repository = new InMemoryClickAggregateRepository();
    const record = new RecordClick(repository);

    await record.execute("download-pdf");
    await record.execute("download-pdf");
    await record.execute("contact-email");

    const rows = await new GetClickHeatmap(repository).execute();
    expect(rows).toEqual([
      { element: "download-pdf", count: 2 },
      { element: "contact-email", count: 1 },
    ]);
  });

  it("silently refuses anything outside the allowlist", async () => {
    const repository = new InMemoryClickAggregateRepository();
    const record = new RecordClick(repository);

    await record.execute("unknown-element");
    await record.execute({ x: 10, y: 20 });
    await record.execute("<script>");

    expect(await new GetClickHeatmap(repository).execute()).toEqual([]);
  });
});

describe("InMemoryClickAggregateRepository", () => {
  it("caps a counter so a loop cannot grow it without bound", async () => {
    const repository = new InMemoryClickAggregateRepository();

    for (let i = 0; i < 10_050; i++) {
      await repository.increment("download-pdf");
    }

    const [row] = await repository.list();
    expect(row.count).toBe(10_000);
  });

  it("omits elements that were never clicked", async () => {
    const repository = new InMemoryClickAggregateRepository();
    await repository.increment("contact-phone");

    expect(await repository.list()).toEqual([{ element: "contact-phone", count: 1 }]);
  });

  it("resets", async () => {
    const repository = new InMemoryClickAggregateRepository();
    await repository.increment("blog-article");
    await repository.reset();

    expect(await repository.list()).toEqual([]);
  });
});

describe("privacy invariants", () => {
  /**
   * These are the guarantees that make collecting anything at all defensible on
   * a portfolio. They are asserted structurally, because the whole design rests
   * on a shape that cannot carry personal data.
   */
  it("the storage port cannot express personal data", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile("src/application/analytics/click-aggregate-repository.ts", "utf8");

    // The guarantee is structural: the only things that can cross this boundary
    // are an element id and a number. If a coordinate or an address ever appears
    // in this interface, re-identification becomes representable, so the shape
    // itself is the assertion.
    const methodSignatures = source.match(/^\s{2}\w+\(.*?\):\s*Promise<.*?>;/gm) ?? [];

    expect(methodSignatures.length).toBeGreaterThan(0);
    for (const signature of methodSignatures) {
      expect(signature).toMatch(/TrackableElement|number|ClickAggregates|void/);
      for (const forbidden of ["string", "x", "y", "Point", "Position", "Ip", "Session"]) {
        // Word-bounded: a bare "x" must not match the x in "TrackableElement".
        expect(
          new RegExp(`\\b${forbidden}\\b`, "i").test(signature),
          `port method must not accept ${forbidden}`,
        ).toBe(false);
      }
    }
  });

  it("the migration declares no column that could hold personal data", async () => {
    const { readFile } = await import("node:fs/promises");
    const sql = await readFile("supabase/migrations/20260929000100_click_aggregates.sql", "utf8");

    // Columns must be the counter only. A coordinate, viewport, address, user
    // agent or session column appearing here would break the guarantee.
    const createTable = sql.slice(sql.indexOf("create table"), sql.indexOf("comment on table"));
    for (const forbidden of ["x_coordinate", "y_coordinate", "viewport", "ip", "user_agent", "referrer", "session", "cookie"]) {
      expect(createTable.toLowerCase(), `column "${forbidden}" must not exist`).not.toContain(forbidden);
    }
  });

  it("the anonymous role can read but never write", async () => {
    const { readFile } = await import("node:fs/promises");
    const sql = (await readFile("supabase/migrations/20260929000100_click_aggregates.sql", "utf8")).toLowerCase();

    expect(sql).toContain("for select");
    // A scraper posting to the endpoint with the anon key must be refused by RLS.
    expect(sql).not.toContain("for insert");
    expect(sql).not.toContain("for update");
  });
});

describe("SupabaseClickAggregateRepository", () => {
  function stub() {
    const calls: { table: string; values: unknown[] }[] = [];
    const client = {
      from: (table: string) => ({
        upsert: async (values: Record<string, unknown>[], options: { onConflict: string }) => {
          calls.push({ table, values });
          return { error: null, options };
        },
        select: () => ({
          order: async () => ({
            data: [
              { element: "download-pdf", count: 9 },
              { element: "not-in-allowlist", count: 99 },
            ],
            error: null,
          }),
        }),
      }),
    };

    return { client, calls };
  }

  it("upserts on the element conflict target", async () => {
    const { client, calls } = stub();
    await new SupabaseClickAggregateRepository(client).increment("download-pdf");

    expect(calls[0].table).toBe("click_aggregates");
    expect(calls[0].values[0]).toMatchObject({ element: "download-pdf", count: 1 });
  });

  it("filters unknown elements out of the read path", async () => {
    const { client } = stub();
    const rows = await new SupabaseClickAggregateRepository(client).list();

    // A row that is not on the allowlist must never reach the dashboard.
    expect(rows).toEqual([{ element: "download-pdf", count: 9 }]);
  });

  it("surfaces a write failure", async () => {
    const client = {
      from: () => ({
        upsert: async () => ({ error: { message: "boom" } }),
        select: () => ({ order: async () => ({ data: null, error: null }) }),
      }),
    };

    await expect(
      new SupabaseClickAggregateRepository(client).increment("download-pdf"),
    ).rejects.toThrow(/boom/);
  });
});
