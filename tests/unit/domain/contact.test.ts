import { describe, expect, it } from "vitest";

import { toWhatsAppHref, toWhatsAppNumber } from "@/domain/portfolio";

/**
 * The WhatsApp link is the site's primary contact affordance, and it is built
 * by string surgery at module load. Every branch below is a way that surgery
 * could have gone wrong: a `+` left in, a space breaking the path, a prefilled
 * message that arrives mojibake'd. None of those are visible in a screenshot.
 */
describe("toWhatsAppNumber", () => {
  it("strips the formatting a human reads", () => {
    expect(toWhatsAppNumber("+55 11 91446-1993")).toBe("5511914461993");
    expect(toWhatsAppNumber("+55 (11) 91446-1993")).toBe("5511914461993");
  });

  it("keeps the country code, because a local number reaches nobody", () => {
    expect(toWhatsAppNumber("+1 (415) 555-0132")).toBe("14155550132");
  });

  it("refuses a number too short to address a WhatsApp account", () => {
    expect(() => toWhatsAppNumber("91446-1993")).toThrow(/cannot form a WhatsApp link/);
    expect(() => toWhatsAppNumber("")).toThrow(/cannot form a WhatsApp link/);
  });
});

describe("toWhatsAppHref", () => {
  it("builds a click-to-chat link", () => {
    expect(toWhatsAppHref("+55 11 91446-1993")).toBe("https://wa.me/5511914461993");
  });

  it("omits the query string when there is no message", () => {
    expect(toWhatsAppHref("+55 11 91446-1993", "")).toBe("https://wa.me/5511914461993");
  });

  it("percent-encodes a prefilled message", () => {
    const href = toWhatsAppHref("+55 11 91446-1993", "Olá\nEmpresa: —");

    expect(href).toBe(
      "https://wa.me/5511914461993?text=Ol%C3%A1%0AEmpresa%3A%20%E2%80%94",
    );
    // Round-trips: a reader receives the exact line breaks that were written.
    const message = new URL(href).searchParams.get("text");
    expect(message).toBe("Olá\nEmpresa: —");
  });
});
