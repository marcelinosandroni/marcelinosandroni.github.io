import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_ADAPTER_ID,
  EMAIL_ADAPTER_IDS,
  EmailDeliveryError,
  MAGIC_LINK_PLACEHOLDER,
  isEmailAdapterId,
  renderMagicLinkBody,
} from "@/domain/email";
import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

/**
 * The seam, tested as a seam.
 *
 * The claims worth pinning are structural, not behavioural: that the domain
 * imports no framework, that the use case imports neither adapter, and that the
 * error type has nowhere to put an address. Each of those is a property of the
 * *shape* of the code, and a property of the shape cannot be checked by calling
 * it — only by reading it. The behavioural tests around them are one line each.
 */

const root = resolve(__dirname, "../../..");

/** The file's code, with its comments removed. */
function code(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/**
 * Every module the file imports.
 *
 * A specifier is what a file can reach, so it is the thing to assert on. Reading
 * the whole source instead would fail on prose — and prose is exactly where a
 * domain module should be free to explain itself.
 */
function moduleSpecifiers(relativePath: string): string[] {
  return [...code(relativePath).matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
}


describe("adapter vocabulary", () => {
  it("knows both adapters, so swapping is a configuration change", () => {
    expect([...EMAIL_ADAPTER_IDS].sort()).toEqual(["resend", "supabase"]);
  });

  it("defaults to resend, because Supabase's own SMTP caps the project at ~2/hour", () => {
    expect(DEFAULT_EMAIL_ADAPTER_ID).toBe("resend");
  });

  it("narrows a raw value, and refuses anything else", () => {
    expect(isEmailAdapterId("resend")).toBe(true);
    expect(isEmailAdapterId("supabase")).toBe(true);

    for (const value of ["", "Resend", "resend ", "postmark", "smtp", "null"]) {
      expect(`${value}:${isEmailAdapterId(value)}`).toBe(`${value}:false`);
    }
  });
});

describe("renderMagicLinkBody", () => {
  it("substitutes the link", () => {
    expect(renderMagicLinkBody("Sign in: {link}", "https://example.test/cb?code=1")).toBe(
      "Sign in: https://example.test/cb?code=1",
    );
  });

  it("substitutes every occurrence, because a body may mention the link twice", () => {
    expect(renderMagicLinkBody("{link}\n\nAgain: {link}", "L")).toBe("L\n\nAgain: L");
  });

  it("leaves other placeholders visible instead of blanking them", () => {
    expect(renderMagicLinkBody("{link} for {name}", "L")).toBe("L for {name}");
  });

  it("returns a body with no placeholder untouched, rather than dropping the link", () => {
    // A catalog that lost the placeholder would send a message with no link in
    // it. Better a visible gap in the body than a mail that cannot be used.
    expect(renderMagicLinkBody("no placeholder here", "L")).toBe("no placeholder here");
  });

  it("names the placeholder once, in the domain", () => {
    expect(MAGIC_LINK_PLACEHOLDER).toBe("{link}");
  });
});

describe("EmailDeliveryError", () => {
  it("is an Error with a stable name, so a caller can narrow it", () => {
    const error = new EmailDeliveryError("Resend refused the message (status 422).");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("EmailDeliveryError");
    expect(error.message).toBe("Resend refused the message (status 422).");
  });

  it("keeps the underlying cause without putting it in the message", () => {
    const cause = new Error("validation_error: to is invalid");
    const error = new EmailDeliveryError("Resend refused the message (status 422).", { cause });

    expect(error.cause).toBe(cause);
    expect(error.message).not.toContain("validation_error");
  });
});

/**
 * The catalogs are part of the port's contract: the body template is what the
 * adapter substitutes into, so a locale that lost `{link}` would typecheck and
 * would ship a message with nothing in it.
 */
describe("translated copy", () => {
  for (const [locale, catalog] of Object.entries({ "en-US": enUS, "pt-BR": ptBR })) {
    it(`${locale} carries the link placeholder exactly once`, () => {
      const { magicLinkBody: body } = catalog.admin.email;

      expect(body.split(MAGIC_LINK_PLACEHOLDER)).toHaveLength(2);
    });

    it(`${locale} has a subject, and it is not a sentence`, () => {
      const { magicLinkSubject: subject } = catalog.admin.email;

      expect(subject.trim().length).toBeGreaterThan(0);
      expect(subject).not.toContain(MAGIC_LINK_PLACEHOLDER);
      expect(subject.length).toBeLessThan(80);
    });
  }

  it("is actually translated, not copied", () => {
    expect(ptBR.admin.email.magicLinkSubject).not.toBe(enUS.admin.email.magicLinkSubject);
    expect(ptBR.admin.email.magicLinkBody).not.toBe(enUS.admin.email.magicLinkBody);
  });
});

/**
 * The layering claims, read from the source.
 *
 * Each of these is a promise about what a file is allowed to import. A promise
 * enforced by convention is a promise a later commit breaks, and a promise about
 * imports is only checkable by reading the imports.
 */
describe("layering", () => {
  it("the domain imports nothing at all", () => {
    /*
     * Zero, not "nothing forbidden". The seam has to be a value: the adapter
     * name, the message, the error, the substitution. Anything it needs from
     * outside is a dependency this module does not have, which is what makes it
     * the one file both the use case and the adapters are allowed to agree on.
     */
    expect(moduleSpecifiers("src/domain/email/email.ts")).toEqual([]);
  });

  it("the use case imports neither adapter, and no provider by name", () => {
    const specifiers = moduleSpecifiers("src/application/email/send-owner-magic-link.ts");

    expect(specifiers.sort()).toEqual(["@/domain/admin", "@/domain/email"]);
  });

  it("the use case reaches the provider only through the port", () => {
    expect(code("src/application/email/send-owner-magic-link.ts")).toContain(
      "this.sender.sendMagicLink(",
    );
  });

  it("the port is one method, because an adapter that cannot return a link cannot fake it", () => {
    const source = code("src/domain/email/email.ts");

    const methods = [...source.matchAll(/^\s{2}(\w+)\(.*?\):\s*Promise<void>;$/gm)].map(
      (match) => match[1],
    );

    expect(methods).toEqual(["sendMagicLink"]);
  });
});

/**
 * The address must not be able to reach a log line or a response through the
 * error type, and the rate-limit store must not be able to hold one at all.
 * Both are absences, so they are asserted structurally.
 */
describe("the address has nowhere to go", () => {
  it("the delivery error takes no address", () => {
    const signature = /constructor\(([^)]*)\)/.exec(code("src/domain/email/email.ts"));

    expect(signature).not.toBeNull();
    expect(signature?.[1]).not.toMatch(/email|recipient|address|\bto\b/i);
  });

  it("the rate limiter holds two numbers, and no collection to key anything by", () => {
    const source = code("src/application/email/send-owner-magic-link.ts");
    const limiter = source.slice(
      source.indexOf("class MagicLinkRateLimiter"),
      source.indexOf("let sharedLimiter"),
    );

    const fields = [...limiter.matchAll(/private\s+(?:readonly\s+)?(\w+)/g)].map(
      (match) => match[1],
    );

    // Five fields, and the only two that change are a timestamp and a count.
    expect(fields).toEqual(["windowStart", "used", "limit", "windowMs", "now"]);

    // A key would have to be stored somewhere in order to be counted, and a Map
    // or a record is the only place it could live.
    expect(limiter).not.toMatch(/Map|Set|Record|\bstring\b|\[\]/);
  });
});
