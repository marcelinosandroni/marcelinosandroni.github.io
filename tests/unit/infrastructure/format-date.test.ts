import { describe, expect, it } from "vitest";

import {
  formatArticleDate,
  toDateTimeAttribute,
} from "@/infrastructure/format/format-date";

/**
 * The date is pinned to UTC midnight on purpose: rendering a `YYYY-MM-DD` column
 * in a timezone behind UTC would show Brazilian readers the previous day, which
 * is the kind of bug nobody notices until a launch date is wrong.
 */
describe("formatArticleDate", () => {
  it("formats the same date differently per locale", () => {
    const en = formatArticleDate("en-US", "2026-06-18");
    const pt = formatArticleDate("pt-BR", "2026-06-18");

    expect(en).toContain("2026");
    expect(pt).toContain("2026");
    expect(en).not.toBe(pt);
  });

  it("does not shift the day for a timezone-behind-UTC reader", () => {
    // A naive `new Date("2026-01-01")` is UTC midnight and renders as 31 Dec in
    // any negative offset, which is the bug this guard exists to prevent.
    expect(formatArticleDate("en-US", "2026-01-01")).toContain("1");
    expect(formatArticleDate("pt-BR", "2026-01-01")).not.toContain("31");
  });

  it("accepts a full ISO timestamp and reduces it to the date part", () => {
    expect(formatArticleDate("en-US", "2026-06-18T00:00:00.000Z")).toBe(
      formatArticleDate("en-US", "2026-06-18"),
    );
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatArticleDate("en-US", "not-a-date")).toBe("not-a-date");
  });

  it("reuses one formatter per locale", () => {
    const first = formatArticleDate("en-US", "2026-06-18");
    const second = formatArticleDate("en-US", "2026-04-02");

    expect(typeof first).toBe("string");
    expect(second).not.toBe(first);
  });
});

describe("toDateTimeAttribute", () => {
  it("reduces a value to the machine-readable date part", () => {
    expect(toDateTimeAttribute("2026-06-18")).toBe("2026-06-18");
    expect(toDateTimeAttribute("2026-06-18T00:00:00.000Z")).toBe("2026-06-18");
  });
});
