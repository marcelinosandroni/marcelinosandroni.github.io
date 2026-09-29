import { describe, expect, it } from "vitest";

import {
  ADMIN_EMAIL_ENV,
  adminGateFromEnv,
  createAdminGate,
  isSyntacticallyValidEmail,
  normalizeEmail,
  parseAllowlist,
} from "@/domain/admin";

const OWNER = "owner@example.com";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
  });
});

describe("parseAllowlist", () => {
  it("accepts a single address", () => {
    expect([...parseAllowlist(OWNER)]).toEqual([OWNER]);
  });

  it("accepts several, comma separated, with stray whitespace", () => {
    expect([...parseAllowlist(` ${OWNER} , second@example.com `)]).toEqual([
      OWNER,
      "second@example.com",
    ]);
  });

  it("deduplicates case-insensitively", () => {
    expect([...parseAllowlist(`${OWNER},${OWNER.toUpperCase()}`)]).toEqual([OWNER]);
  });

  it("fails closed on an unset or empty variable", () => {
    // Failing open here would put the admin area behind no check at all.
    expect([...parseAllowlist(undefined)]).toEqual([]);
    expect([...parseAllowlist(null)]).toEqual([]);
    expect([...parseAllowlist("")]).toEqual([]);
    expect([...parseAllowlist("   ")]).toEqual([]);
    expect([...parseAllowlist(",, ,")]).toEqual([]);
  });

  it("discards entries that are not addresses", () => {
    expect([...parseAllowlist(`${OWNER},not-an-email,@,`)]).toEqual([OWNER]);
  });
});

describe("isSyntacticallyValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isSyntacticallyValidEmail(OWNER)).toBe(true);
  });

  it("rejects the classic injection shapes", () => {
    for (const bad of [
      "not-an-email",
      "@example.com",
      "owner@",
      "owner @@example.com",
      "owner@example.com extra",
      "owner@exam ple.com",
      "a@b@c.com",
      "",
      "   ",
    ]) {
      expect(isSyntacticallyValidEmail(bad), `must reject "${bad}"`).toBe(false);
    }
  });

  it("rejects an absurdly long address", () => {
    expect(isSyntacticallyValidEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});

describe("AdminGate authorisation", () => {
  const gate = createAdminGate(OWNER);

  it("admits the owner regardless of casing and padding", () => {
    expect(gate.isAllowed(OWNER)).toBe(true);
    expect(gate.isAllowed(OWNER.toUpperCase())).toBe(true);
    expect(gate.isAllowed(`  ${OWNER}  `)).toBe(true);
  });

  it("refuses everyone else", () => {
    expect(gate.isAllowed("attacker@example.com")).toBe(false);
    expect(gate.isAllowed("")).toBe(false);
    expect(gate.isAllowed(null)).toBe(false);
    expect(gate.isAllowed(undefined)).toBe(false);
  });

  /**
   * The reason this module exists. A substring check would pass every one of
   * these, which is the standard allowlist bypass.
   */
  it("refuses substring near-misses", () => {
    for (const attack of [
      "xa@b.com",
      "owner@example.com.attacker.test",
      "notowner@example.com",
      "owner@example.como",
      "@owner@example.com",
      "owner@example.com,attacker@example.com",
      "x.owner@example.com",
    ]) {
      const crafted = attack.replace("a@b.com", OWNER);
      expect(gate.isAllowed(crafted), `must refuse "${crafted}"`).toBe(false);
    }
  });

  it("refuses everyone when the allowlist is empty", () => {
    const closed = createAdminGate(undefined);

    expect(closed.isAllowed(OWNER)).toBe(false);
    expect(closed.allowed.size).toBe(0);
  });

  it("exposes the allowlist without leaking anything else", () => {
    expect([...gate.allowed]).toEqual([OWNER]);
  });
});

describe("adminGateFromEnv", () => {
  it("reads the allowlist from the documented variable", () => {
    const gate = adminGateFromEnv({ [ADMIN_EMAIL_ENV]: OWNER } as unknown as NodeJS.ProcessEnv);

    expect(gate.isAllowed(OWNER)).toBe(true);
  });

  it("denies everything when the variable is absent", () => {
    const gate = adminGateFromEnv({} as unknown as NodeJS.ProcessEnv);

    expect(gate.isAllowed(OWNER)).toBe(false);
  });
});
