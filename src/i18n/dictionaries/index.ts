import { locale } from "next/root-params";
import { notFound } from "next/navigation";

import { toLocale, type Locale } from "@/domain/i18n";
import { loadDictionary } from "./loader";
import type { Dictionary } from "./en-US";

/**
 * Server-only message catalog access.
 *
 * Because every consumer is a Server Component, translated copy never reaches
 * the browser JavaScript bundle — only the rendered HTML does.
 *
 * No `import "server-only"` is needed: importing `next/root-params` below
 * already fails the build if this module is pulled into a Client Component.
 */

/** Loads the catalog for an explicit locale. */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loadDictionary(locale);
}

/**
 * Resolves the dictionary for the current route's locale segment.
 *
 * Uses `next/root-params` so nested components read the locale directly instead
 * of receiving it through prop drilling. The getter is named after the dynamic
 * segment (`app/[locale]`), and the root parameter carries the raw URL segment
 * (`pt-br`), so it is normalized to the canonical tag before lookup.
 * Importing this module from a Client Component is a build error by design.
 */
export async function getDictionaryForRoute(): Promise<Dictionary> {
  const resolved = await requireLocaleForRoute();
  return loadDictionary(resolved);
}

/** Resolves the canonical locale for the current route, or renders a 404. */
export async function requireLocaleForRoute(): Promise<Locale> {
  const segment = await locale();
  const resolved = toLocale(segment);

  if (!resolved) {
    notFound();
  }

  return resolved;
}

export type { Dictionary };
