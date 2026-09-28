import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, resolveLocale, type Locale } from "@/domain/i18n";

/**
 * Resolves the best supported locale from an `Accept-Language` header.
 *
 * Uses RFC 4647 lookup semantics with proper q-value parsing, as recommended by
 * the Next.js internationalization guide. Runs on the edge runtime: only pure
 * computation, no Node.js APIs.
 *
 * Never throws. A missing or malformed header falls back to the default locale.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage || acceptLanguage.trim() === "") {
    return DEFAULT_LOCALE;
  }

  try {
    const languages = new Negotiator({ headers: { "accept-language": acceptLanguage } }).languages();
    const matched = match(languages as string[], [...SUPPORTED_LOCALES], DEFAULT_LOCALE);
    return resolveLocale(matched) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}
