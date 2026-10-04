import { describe, expect, it } from "vitest";

import {
  readDatabaseStatus,
  type DatabaseStatusClient,
} from "@/infrastructure/supabase/database-status";

/**
 * The status read, away from a database.
 *
 * The three states this function can be in are genuinely different facts, and the
 * panel renders all three. So the tests are about the mapping rather than about
 * PostgREST: that an error becomes `unreachable` with a reason, that a rejection
 * becomes the same, that a good row becomes numbers, and that nothing it is handed
 * can produce `NaN` or a leaked object on the page.
 */

const ok = (data: unknown): DatabaseStatusClient => ({
  rpc: () => Promise.resolve({ data, error: null }),
});

const failing = (message: string, code?: string): DatabaseStatusClient => ({
  rpc: () => Promise.resolve({ data: null, error: { message, code } }),
});

describe("readDatabaseStatus", () => {
  it("reports what the function returned", async () => {
    const status = await readDatabaseStatus(
      ok([{ applied_count: 7, latest_version: "20261004000100", server_version: "17.6", schema_version: "1.3" }]),
    );

    expect(status).toEqual({
      reachable: true,
      appliedCount: 7,
      latestVersion: "20261004000100",
      serverVersion: "17.6",
      extensionVersion: "1.3",
    });
  });

  /*
    PostgREST returns a single-row function result as an array, but a future SDK or a
    proxy in front of it might unwrap it. Accepting both is a line of code and means
    the panel does not go blank for a reason nobody can see.
   */
  it("accepts the row as an object as well as an array", async () => {
    const status = await readDatabaseStatus(
      ok({ applied_count: 3, latest_version: "x", server_version: "17", schema_version: "1.3" }),
    );

    expect(status.reachable).toBe(true);
    if (status.reachable) {
      expect(status.appliedCount).toBe(3);
    }
  });

  /*
    "Cannot reach" and "reached it, all fine" are different facts. A panel that
    rendered nothing for the first would report a healthy database whenever the
    network happened to be up, which is the failure this function's shape exists to
    avoid.
   */
  it("turns a PostgREST error into an unreachable state with the reason", async () => {
    const status = await readDatabaseStatus(failing("Invalid schema: supabase_migrations", "PGRST106"));

    expect(status).toEqual({ reachable: false, reason: "Invalid schema: supabase_migrations" });
  });

  /*
    A fetch failure rejects rather than resolving with an error, so the try/catch is
    not belt-and-braces: without it an unreachable database takes the whole admin
    page down, and a diagnostic that can take the page down is not a diagnostic.
   */
  it("turns a rejected request into an unreachable state rather than throwing", async () => {
    const throwing: DatabaseStatusClient = {
      rpc: () => Promise.reject(new Error("fetch failed")),
    };

    const status = await readDatabaseStatus(throwing);

    expect(status).toEqual({ reachable: false, reason: "fetch failed" });
  });

  it("says so when the function answers with nothing", async () => {
    expect(await readDatabaseStatus(ok([]))).toEqual({
      reachable: false,
      reason: "the status function returned no row",
    });

    expect(await readDatabaseStatus(ok(null))).toEqual({
      reachable: false,
      reason: "the status function returned no row",
    });
  });

  /*
    Nothing handed to this function may put `NaN`, `undefined` or an object on the
    page. A count is a number, a version is a string, and an unreadable field reads
    as empty rather than as a rendering error.
   */
  it("normalises every field rather than passing it through", async () => {
    const status = await readDatabaseStatus(
      ok([{ applied_count: "4", latest_version: " v9 ", server_version: null, schema_version: undefined }]),
    );

    expect(status).toEqual({
      reachable: true,
      // The count arrives as a string from PostgREST for a bigint column.
      appliedCount: 4,
      latestVersion: "v9",
      serverVersion: "",
      extensionVersion: "",
    });
  });

  it("reports zero rather than a negative count", async () => {
    const status = await readDatabaseStatus(ok([{ applied_count: -3 }]));

    expect(status.reachable).toBe(true);
    if (status.reachable) {
      expect(status.appliedCount).toBe(0);
    }
  });

  it("falls back to the error code when there is no message", async () => {
    const status = await readDatabaseStatus({
      rpc: () => Promise.resolve({ data: null, error: { code: "42501" } }),
    });

    expect(status).toEqual({ reachable: false, reason: "42501" });
  });

  it("names the failure when the reason is not a string or an Error", async () => {
    const status = await readDatabaseStatus({
      rpc: () => Promise.reject({ odd: true }),
    });

    expect(status).toEqual({
      reachable: false,
      reason: "the request failed for an unknown reason",
    });
  });
});