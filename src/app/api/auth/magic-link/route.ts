import { NextResponse } from "next/server";

import { adminGateFromEnv, isSyntacticallyValidEmail } from "@/domain/admin";
import {
  SendOwnerMagicLink,
  ownerMagicLinkRateLimiter,
  type MagicLinkCopy,
} from "@/application/email/send-owner-magic-link";
import { getEmailSender } from "@/infrastructure/email";
import { isSupabaseConfigured } from "@/infrastructure/supabase/server";
import { getSiteOrigin } from "@/infrastructure/supabase/site-origin";
import { DEFAULT_LOCALE, resolveLocale, type Locale } from "@/domain/i18n";
import { loadDictionary } from "@/i18n/dictionaries/loader";

/**
 * Requests a passwordless sign-in link.
 *
 * The allowlist is checked before the delivery port is reached, so a non-owner
 * never causes a token to be created and never causes an email to be sent. That
 * is the property that mattered when the provider was written inline in this
 * file, and it is preserved exactly: the gate is on token *creation*, not a check
 * afterwards. Which adapter sits behind the port is chosen in
 * `infrastructure/email`, and is invisible from here.
 *
 * ## The response is identical either way
 *
 * Both "address allowed" and "address not allowed" return `200` with the same
 * body. A distinct status or a distinct message would let an unauthenticated
 * caller enumerate who the owner is, and the only reason to reach this endpoint
 * is to find that out. The real error is only returned when the *deployment* is
 * misconfigured, which reveals nothing about any address.
 *
 * That is also why a rate-limited request returns the same `200` as a
 * delivered one. A `429` here would be a second oracle: burn the owner's
 * allowance, then read which addresses get refused. The limiter bounds what the
 * provider is asked for; it does not get a vote in the response.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return notConfigured("auth_not_configured");
  }

  // Must be absolute, and must be this deployment's origin, or Supabase rejects
  // the redirect. Derived from the request so local and preview work unchanged.
  const origin = getSiteOrigin(request);

  const resolution = getEmailSender({ origin });

  if (!resolution.configured) {
    return notConfigured("email_not_configured");
  }

  let email: string;
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email : "";
  } catch {
    return accepted();
  }

  if (!isSyntacticallyValidEmail(email)) {
    return accepted();
  }

  const copy = await magicLinkCopy(localeFor(request));
  const useCase = new SendOwnerMagicLink(
    resolution.sender,
    adminGateFromEnv(),
    copy,
    ownerMagicLinkRateLimiter(),
  );

  const outcome = await useCase.execute(email);

  if (outcome === "delivery-failed") {
    // A provider failure is a deployment problem, not a statement about the
    // address, so it is safe to report and useful to surface.
    return NextResponse.json(
      { error: "auth_provider_error" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  // "sent", "refused" and "rate-limited" are the same response on purpose.
  return accepted();
}

/**
 * The subject and body for the message, in the owner's language.
 *
 * Read through the framework-free loader rather than `getDictionaryForRoute`:
 * this route has no `[locale]` segment above it, and the copy is chosen from
 * `Accept-Language` so the mail speaks the language the browser asked for. A
 * header nobody sends falls back to the site's default locale.
 *
 * The body goes on as a template. The adapter fills `{link}`, because the
 * adapter is the party that generates the link and therefore the only one that
 * knows it.
 */
async function magicLinkCopy(locale: Locale): Promise<MagicLinkCopy> {
  const dictionary = await loadDictionary(locale);

  return {
    subject: dictionary.admin.email.magicLinkSubject,
    body: dictionary.admin.email.magicLinkBody,
  };
}

function localeFor(request: Request): Locale {
  return resolveLocale(request.headers.get("accept-language") ?? "") ?? DEFAULT_LOCALE;
}

/** The one response every non-deployed-failure path returns. */
function accepted(): Response {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

/**
 * A deployment that cannot send, named as such.
 *
 * Two codes, one meaning. `auth_not_configured` is the credential-less contract
 * an unconfigured deployment — CI, a fork — is expected to answer, and it comes
 * first so it is still the answer when nothing at all is set. `email_not_configured`
 * is the narrower case: Supabase works, the selected adapter does not.
 */
function notConfigured(error: "auth_not_configured" | "email_not_configured"): Response {
  return NextResponse.json({ error }, { status: 503, headers: { "cache-control": "no-store" } });
}
