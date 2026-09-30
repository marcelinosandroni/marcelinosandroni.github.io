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

/**
 * Resolves the canonical locale for the current route, or renders a 404.
 *
 * `undefined` is a real answer, not a type-checking formality. The site has two
 * root layouts — `app/[locale]` for the public tree and `app/admin` for the owner
 * area — and `next/root-params`' `locale()` reports `undefined` for the tree that
 * has no `[locale]` segment above it. Treating that as "no locale here" is what
 * makes the second root layout legitimate rather than a special case.
 */
export async function requireLocaleForRoute(): Promise<Locale> {
  const segment = await locale();
  const resolved = segment === undefined ? null : toLocale(segment);

  if (!resolved) {
    notFound();
  }

  return resolved;
}

export type { Dictionary };
