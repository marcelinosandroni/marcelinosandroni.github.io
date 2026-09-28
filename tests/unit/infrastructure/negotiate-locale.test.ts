import { describe, expect, it } from "vitest";

import { negotiateLocale } from "@/infrastructure/i18n";

describe("negotiateLocale", () => {
  it("resolves the exact supported locale", () => {
    expect(negotiateLocale("pt-BR")).toBe("pt-BR");
    expect(negotiateLocale("en-US")).toBe("en-US");
  });

  it("honours q-value ordering", () => {
    expect(negotiateLocale("pt-BR,pt;q=0.9,en-US;q=0.8")).toBe("pt-BR");
    expect(negotiateLocale("en-US;q=0.8,pt-BR;q=0.9")).toBe("pt-BR");
    expect(negotiateLocale("en-US;q=0,pt-BR;q=0.1")).toBe("pt-BR");
  });

  it("maps close variants onto the supported locale", () => {
    expect(negotiateLocale("pt")).toBe("pt-BR");
    expect(negotiateLocale("pt-PT,pt;q=0.9")).toBe("pt-BR");
    expect(negotiateLocale("en-GB,en;q=0.9")).toBe("en-US");
  });

  it("falls back to the default locale for unsupported languages", () => {
    expect(negotiateLocale("de-DE,de;q=0.9")).toBe("en-US");
    expect(negotiateLocale("ja")).toBe("en-US");
  });

  it("falls back to the default locale for missing or malformed headers", () => {
    expect(negotiateLocale(null)).toBe("en-US");
    expect(negotiateLocale(undefined)).toBe("en-US");
    expect(negotiateLocale("")).toBe("en-US");
    expect(negotiateLocale("   ")).toBe("en-US");
  });
});
