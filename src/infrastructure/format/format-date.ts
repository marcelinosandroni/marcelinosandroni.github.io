import type { Locale } from "@/domain/i18n";

/**
 * Locale-aware date formatting for the blog.
 *
 * `Intl.DateTimeFormat` is used rather than a hand-rolled format so a pt-BR
 * reader sees "18 de jun. de 2026" and an en-US reader sees "Jun 18, 2026" from
 * the same ISO string, with no locale-specific format strings in the content.
 *
 * Formatters are memoised because a blog index formats one date per card and
 * constructing a `DateTimeFormat` is the expensive part.
 */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(locale: Locale): Intl.DateTimeFormat {
  let formatter = FORMATTERS.get(locale);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    FORMATTERS.set(locale, formatter);
  }

  return formatter;
}

/**
 * Formats a `YYYY-MM-DD` string.
 *
 * The value is pinned to UTC midnight: a date-only column rendered in a
 * timezone behind UTC would otherwise show the previous day to part of the
 * audience.
 */
export function formatArticleDate(locale: Locale, isoDate: string): string {
  const parsed = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return formatterFor(locale).format(parsed);
}

/** Machine-readable value for the `datetime` attribute of `<time>`. */
export function toDateTimeAttribute(isoDate: string): string {
  return isoDate.slice(0, 10);
}
