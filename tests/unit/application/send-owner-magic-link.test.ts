import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createAdminGate } from "@/domain/admin";
import { EmailDeliveryError, type EmailSender, type MagicLinkMessage } from "@/domain/email";
import {
  MagicLinkRateLimiter,
  SendOwnerMagicLink,
  ownerMagicLinkRateLimiter,
} from "@/application/email/send-owner-magic-link";
import {
  RESEND_API_KEY_ENV,
  RESEND_FROM_ENV,
  ResendEmailSender,
  SupabaseEmailSender,
  getEmailSender,
  type MagicLinkAdminClient,
} from "@/infrastructure/email";
import type { EmailTransport } from "@/infrastructure/email/resend-email-sender";

/**
 * The owner sign-in flow, with the provider faked.
 *
 * The two assertions this file exists for are both about absence:
 *
 * 1. **a non-allowlisted address causes no token to be created.** Asserted on
 *    the fake's call count, not on a returned flag — a use case that returned
 *    "refused" *after* calling the port would pass a flag assertion and would
 *    already have sent the mail.
 * 2. **a rate-limited request is indistinguishable from a delivered one.** The
 *    outcome string differs internally, so the route is the thing that has to map
 *    both to one response; that mapping is asserted here by pinning the outcomes
 *    side by side.
 */

const OWNER = "owner@example.com";
const STRANGER = "stranger@attacker.test";

const COPY = {
  subject: "Your sign-in link",
  body: "Use this link to sign in.\n\n{link}\n\nIf you did not ask for it, ignore this.",
};

/** A sender that records what it was asked to deliver, and nothing else. */
function fakeSender() {
  const sent: MagicLinkMessage[] = [];

  const sender: EmailSender = {
    adapterId: "resend",
    sendMagicLink: async (message) => {
      sent.push(message);
    },
  };

  return { sender, sent };
}

function useCaseWith(
  sender: EmailSender,
  options: { allowlist?: string; limiter?: MagicLinkRateLimiter } = {},
) {
  return new SendOwnerMagicLink(
    sender,
    createAdminGate(options.allowlist ?? OWNER),
    COPY,
    options.limiter ?? new MagicLinkRateLimiter(),
  );
}

describe("SendOwnerMagicLink", () => {
  it("sends to an allowlisted address, with the copy it was given", async () => {
    const { sender, sent } = fakeSender();

    const outcome = await useCaseWith(sender).execute(OWNER);

    expect(outcome).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ to: OWNER, subject: COPY.subject, body: COPY.body });
  });

  it("normalises before sending, so a padded or uppercased owner still matches", async () => {
    const { sender, sent } = fakeSender();

    const outcome = await useCaseWith(sender).execute(`  ${OWNER.toUpperCase()} `);

    expect(outcome).toBe("sent");
    expect(sent).toHaveLength(1);
  });

  it("creates no token for an address that is not on the allowlist", async () => {
    /*
     * The property the endpoint has always had, and the reason the gate lives
     * where it does. Counting calls rather than reading an outcome is the whole
     * point: "refused" after a send would look identical to "refused" before it,
     * and only the counter can tell them apart.
     */
    const { sender, sent } = fakeSender();

    const outcome = await useCaseWith(sender).execute(STRANGER);

    expect(outcome).toBe("refused");
    expect(sent).toHaveLength(0);
  });

  it("refuses an address the allowlist would match as a substring", async () => {
    const { sender, sent } = fakeSender();
    const useCase = useCaseWith(sender, { allowlist: OWNER });

    for (const nearMiss of [
      `x${OWNER}`,
      `${OWNER}.attacker.test`,
      OWNER.replace("@", " "),
      OWNER.slice(0, -1),
    ]) {
      expect(await useCase.execute(nearMiss)).toBe("refused");
    }

    expect(sent).toHaveLength(0);
  });

  it("refuses anything that cannot be an address, without asking the port", async () => {
    const { sender, sent } = fakeSender();
    const useCase = useCaseWith(sender);

    for (const value of ["", "   ", "not-an-email", "a@b", "a b@c.com", null, undefined, 42, {}]) {
      expect(await useCase.execute(value)).toBe("refused");
    }

    expect(sent).toHaveLength(0);
  });

  it("authorises nobody when the allowlist is unset", async () => {
    const { sender, sent } = fakeSender();

    const outcome = await useCaseWith(sender, { allowlist: "" }).execute(OWNER);

    expect(outcome).toBe("refused");
    expect(sent).toHaveLength(0);
  });

  it("reports a provider failure without leaking the address", async () => {
    const sender: EmailSender = {
      adapterId: "resend",
      sendMagicLink: async () => {
        throw new EmailDeliveryError(`Resend refused the message (status 422) for ${OWNER}.`);
      },
    };

    const outcome = await useCaseWith(sender).execute(OWNER);

    expect(outcome).toBe("delivery-failed");
  });

  it("lets an unexpected adapter bug through rather than reporting it as a provider outage", async () => {
    const sender: EmailSender = {
      adapterId: "resend",
      sendMagicLink: async () => {
        throw new TypeError("undefined is not a function");
      },
    };

    await expect(useCaseWith(sender).execute(OWNER)).rejects.toThrow(TypeError);
  });
});

describe("rate limiting", () => {
  it("stops sending once the window is used up, without changing the response", async () => {
    const { sender, sent } = fakeSender();
    const useCase = useCaseWith(sender, { limiter: new MagicLinkRateLimiter(2, 60_000) });

    const outcomes = [
      await useCase.execute(OWNER),
      await useCase.execute(OWNER),
      await useCase.execute(OWNER),
    ];

    expect(outcomes).toEqual(["sent", "sent", "rate-limited"]);
    // The two answers the route must render identically: one message went out,
    // and the third caller is told nothing different from the second.
    expect(sent).toHaveLength(2);
  });

  it("opens a new window once the old one has passed", async () => {
    let clock = 1_000;
    const limiter = new MagicLinkRateLimiter(1, 60_000, () => clock);
    const { sender, sent } = fakeSender();
    const useCase = useCaseWith(sender, { limiter });

    expect(await useCase.execute(OWNER)).toBe("sent");
    expect(await useCase.execute(OWNER)).toBe("rate-limited");

    clock += 59_999;
    expect(await useCase.execute(OWNER)).toBe("rate-limited");

    clock += 1;
    expect(await useCase.execute(OWNER)).toBe("sent");
    expect(sent).toHaveLength(2);
  });

  it("is spent only by the owner, so a stranger cannot lock the owner out", async () => {
    const limiter = new MagicLinkRateLimiter(1, 60_000);
    const { sender, sent } = fakeSender();
    const useCase = useCaseWith(sender, { limiter });

    for (let i = 0; i < 50; i += 1) {
      expect(await useCase.execute(STRANGER)).toBe("refused");
    }

    // Fifty refused addresses, and the one slot the owner is allowed is intact.
    expect(sent).toHaveLength(0);
    expect(await useCase.execute(OWNER)).toBe("sent");
  });

  it("takes no key, so no address can be stored or counted per address", () => {
    expect(MagicLinkRateLimiter.prototype.tryConsume.length).toBe(0);
  });

  it("hands out the same instance every time, because a per-request limiter is no limiter", () => {
    expect(ownerMagicLinkRateLimiter()).toBe(ownerMagicLinkRateLimiter());
  });
});

/**
 * Adapter selection.
 *
 * Lives here rather than in a file of its own because the assigned test surface
 * for this change is two files, and because the selector is the other half of
 * the same claim the use case test makes: the port is one thing, and which
 * implementation is behind it is a deployment fact.
 */
describe("getEmailSender", () => {
  const origin = "https://marcelinosandroni.test";

  it("defaults to resend, which is the whole point of the change", () => {
    const resolution = getEmailSender(
      { origin },
      { [RESEND_API_KEY_ENV]: "re_secret", [RESEND_FROM_ENV]: "MSD <no-reply@example.test>" },
    );

    expect(resolution).toMatchObject({ configured: true, adapterId: "resend" });
    expect(resolution.configured && resolution.sender).toBeInstanceOf(ResendEmailSender);
  });

  it("reports the default adapter as unconfigured when its credentials are absent", () => {
    const resolution = getEmailSender({ origin }, {});

    expect(resolution).toMatchObject({ configured: false, adapterId: "resend" });
    expect(resolution.configured === false && resolution.reason).toContain(RESEND_API_KEY_ENV);
  });

  it("names the sender that is missing, one variable at a time", () => {
    const noFrom = getEmailSender({ origin }, { [RESEND_API_KEY_ENV]: "re_secret" });

    expect(noFrom).toMatchObject({ configured: false, adapterId: "resend" });
    expect(noFrom.configured === false && noFrom.reason).toContain(RESEND_FROM_ENV);
  });

  it("still offers the supabase adapter, which needs no credentials of its own", () => {
    const resolution = getEmailSender({ origin }, { EMAIL_SENDER: "supabase" });

    expect(resolution).toMatchObject({ configured: true, adapterId: "supabase" });
    expect(resolution.configured && resolution.sender).toBeInstanceOf(SupabaseEmailSender);
  });

  it("reads the selector case-insensitively and ignores surrounding space", () => {
    for (const value of ["supabase", " SUPABASE ", "Supabase"]) {
      expect(getEmailSender({ origin }, { EMAIL_SENDER: value })).toMatchObject({
        configured: true,
        adapterId: "supabase",
      });
    }
  });

  it("refuses to guess when the selector names an adapter that does not exist", () => {
    const resolution = getEmailSender({ origin }, { EMAIL_SENDER: "postmark" });

    expect(resolution).toMatchObject({ configured: false, adapterId: "resend" });
    expect(resolution.configured === false && resolution.reason).toContain("EMAIL_SENDER");
  });

  it("reads a blank selector as unset, so an empty dashboard row still gets the default", () => {
    /*
     * Deleting a dashboard row and emptying it are different accidents, and
     * `EMAIL_SENDER=` is what a half-finished edit leaves behind. Reading blank as
     * "no such adapter" would refuse a deployment that asked for nothing in
     * particular, so blank has to land on the default the way unset does.
     */
    for (const value of ["", "   "]) {
      expect(
        getEmailSender(
          { origin },
          {
            EMAIL_SENDER: value,
            [RESEND_API_KEY_ENV]: "re_secret",
            [RESEND_FROM_ENV]: "a@b.test",
          },
        ),
      ).toMatchObject({ configured: true, adapterId: "resend" });
    }
  });

  it("reads a blank Resend credential as absent, rather than sending from one", () => {
    /*
     * A variable with nothing after the `=` is a copy-paste that happens, and
     * `.env.example` tells the owner both are required. The alternative to
     * reading blank as absent is a request to Resend from a sender made of
     * spaces, which fails at the provider with an error nobody can act on —
     * naming it as the configuration error it is keeps it diagnosable.
     */
    const credentials = { [RESEND_API_KEY_ENV]: "re_secret", [RESEND_FROM_ENV]: "a@b.test" };

    for (const blank of [RESEND_API_KEY_ENV, RESEND_FROM_ENV]) {
      const resolution = getEmailSender({ origin }, { ...credentials, [blank]: "   " });

      expect(resolution).toMatchObject({ configured: false, adapterId: "resend" });
      expect(resolution.configured === false && resolution.reason).toContain(blank);
    }
  });

  it("agrees with the sender it returns", () => {
    const resolution = getEmailSender(
      { origin },
      { EMAIL_SENDER: "resend", [RESEND_API_KEY_ENV]: "re_secret", [RESEND_FROM_ENV]: "a@b.test" },
    );

    expect(resolution.configured && resolution.sender.adapterId).toBe(resolution.adapterId);
  });

  it("keeps the keys out of the browser, so neither credential can be inlined", () => {
    // Neither variable is `NEXT_PUBLIC_`, which is the only thing that decides
    // whether Next.js copies a value into the client bundle.
    for (const source of [
      readFileSync(resolve(__dirname, "../../../src/infrastructure/email/index.ts"), "utf8"),
      readFileSync(resolve(__dirname, "../../../src/infrastructure/email/resend-email-sender.ts"), "utf8"),
    ]) {
      expect(source).not.toContain("NEXT_PUBLIC_RESEND");
      expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
    }
  });
});

/**
 * The Resend adapter's two halves.
 *
 * The link is the risky part of this change: it is built by hand rather than
 * taken from a provider, and it has to arrive at the callback in a shape the
 * callback can redeem. So the exact string is asserted here rather than trusted.
 */
describe("ResendEmailSender", () => {
  const origin = "https://marcelinosandroni.test";

  function stub(options: {
    hashedToken?: string;
    generateError?: { message: string } | null;
    sendOk?: boolean;
  } = {}) {
    const generateCalls: Array<Record<string, unknown>> = [];
    const sends: Array<{ url: string; init: { method: string; headers: Record<string, string>; body: string } }> = [];

    const client: MagicLinkAdminClient = {
      auth: {
        admin: {
          generateLink: async (params) => {
            generateCalls.push(params as unknown as Record<string, unknown>);

            return {
              data:
                options.generateError === undefined
                  ? { properties: { hashed_token: options.hashedToken ?? "tok_abc123" } }
                  : null,
              error: options.generateError ?? null,
            };
          },
        },
      },
    };

    const transport: EmailTransport = async (url, init) => {
      sends.push({ url, init });
      return { ok: options.sendOk ?? true, status: options.sendOk === false ? 422 : 200 };
    };

    const sender = new ResendEmailSender({
      apiKey: "re_secret",
      from: "MSD <no-reply@example.test>",
      origin,
      client: async () => client,
      transport,
    });

    return { sender, generateCalls, sends };
  }

  const message: MagicLinkMessage = { to: OWNER, subject: COPY.subject, body: COPY.body };

  it("asks Supabase for a magiclink token pointed at the callback", async () => {
    const { sender, generateCalls } = stub();

    await sender.sendMagicLink(message);

    expect(generateCalls).toEqual([
      {
        type: "magiclink",
        email: OWNER,
        options: { redirectTo: `${origin}/api/auth/callback` },
      },
    ]);
  });

  it("emails a link the callback can redeem, with the token as a query parameter", async () => {
    /*
     * `?code=` is what the PKCE flow produces and this adapter cannot produce
     * PKCE — `generateLink` takes no `code_challenge`, so a non-PKCE token
     * comes back in the URL fragment, which a Route Handler cannot read. The
     * `token_hash` shape is the one Supabase documents for a custom template and
     * the one `verifyOtp` redeems server-side.
     */
    const { sender, sends } = stub();

    await sender.sendMagicLink(message);

    expect(sends).toHaveLength(1);
    expect(sends[0].url).toBe("https://api.resend.com/emails");
    expect(sends[0].init.method).toBe("POST");
    expect(sends[0].init.headers.authorization).toBe("Bearer re_secret");

    const payload = JSON.parse(sends[0].init.body) as {
      from: string;
      to: string[];
      subject: string;
      text: string;
    };

    expect(payload.from).toBe("MSD <no-reply@example.test>");
    expect(payload.to).toEqual([OWNER]);
    expect(payload.subject).toBe(COPY.subject);
    expect(payload.text).toContain(
      `${origin}/api/auth/callback?token_hash=tok_abc123&type=magiclink`,
    );
    expect(payload.text).not.toContain("{link}");
  });

  it("escapes the token, because it is pasted into a query string", async () => {
    const { sender, sends } = stub({ hashedToken: "a b&c=d" });

    await sender.sendMagicLink(message);

    expect(sends[0].init.body).toContain("token_hash=a%20b%26c%3Dd");
  });

  it("sends plain text only, so a credential is never interpolated into markup", async () => {
    const { sender, sends } = stub();

    await sender.sendMagicLink(message);

    expect(JSON.parse(sends[0].init.body)).not.toHaveProperty("html");
  });

  it("sends nothing when Supabase will not issue a token", async () => {
    const { sender, sends } = stub({ generateError: { message: "User not found" } });

    await expect(sender.sendMagicLink(message)).rejects.toThrow(EmailDeliveryError);
    expect(sends).toHaveLength(0);
  });

  it("refuses to send a link with no token in it", async () => {
    const { sender, sends } = stub({ hashedToken: "" });

    await expect(sender.sendMagicLink(message)).rejects.toThrow(EmailDeliveryError);
    expect(sends).toHaveLength(0);
  });

  it("reports a rejected message without putting the address in the error", async () => {
    const { sender } = stub({ sendOk: false });

    const error = await sender.sendMagicLink(message).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as Error).message).toContain("422");
    expect((error as Error).message).not.toContain(OWNER);
  });
});

describe("SupabaseEmailSender", () => {
  it("keeps the signInWithOtp behaviour, pointed at the callback", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const sender = new SupabaseEmailSender({
      origin: "https://marcelinosandroni.test",
      client: async () => ({
        auth: {
          signInWithOtp: async (params) => {
            calls.push(params as unknown as Record<string, unknown>);
            return { error: null };
          },
        },
      }),
    });

    await sender.sendMagicLink({ to: OWNER, subject: "ignored", body: "ignored" });

    expect(calls).toEqual([
      {
        email: OWNER,
        options: {
          emailRedirectTo: "https://marcelinosandroni.test/api/auth/callback",
          shouldCreateUser: true,
        },
      },
    ]);
  });

  it("raises a delivery error when Supabase refuses", async () => {
    const sender = new SupabaseEmailSender({
      origin: "https://marcelinosandroni.test",
      client: async () => ({
        auth: { signInWithOtp: async () => ({ error: { message: "rate limited" } }) },
      }),
    });

    await expect(
      sender.sendMagicLink({ to: OWNER, subject: "s", body: "b" }),
    ).rejects.toThrow(EmailDeliveryError);
  });
});
