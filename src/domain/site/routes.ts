import { toLocaleSegment, type Locale } from "@/domain/i18n";

/**
 * Canonical internal route table.
 *
 * Every link between pages is built here, so a route rename is a one-line change
 * and no component can end up pointing a pt-BR reader at an English page (or at a
 * path that no longer exists). Segments are locale-relative; the locale prefix
 * and any anchor are applied by the helpers.
 */
export const ROUTE_SEGMENTS = {
  home: "",
  resume: "resume",
  blog: "blog",
} as const;

export type RouteName = keyof typeof ROUTE_SEGMENTS;

export function localePath(locale: Locale, route: RouteName): string {
  const segment = toLocaleSegment(locale);
  return ROUTE_SEGMENTS[route] ? `/${segment}/${ROUTE_SEGMENTS[route]}` : `/${segment}`;
}

export const homePath = (locale: Locale): string => localePath(locale, "home");
export const resumePath = (locale: Locale): string => localePath(locale, "resume");
export const blogPath = (locale: Locale): string => localePath(locale, "blog");

/** Owner area. Locale-independent on purpose: it is a private tool, not a document. */
export const adminPath = (): string => "/admin";

export function articlePath(locale: Locale, slug: string): string {
  return `${blogPath(locale)}/${slug}`;
}
