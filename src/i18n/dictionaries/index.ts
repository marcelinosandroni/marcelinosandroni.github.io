import { locale } from "next/root-params";
import { notFound } from "next/navigation";

import { toLocale, type Locale } from "@/domain/i18n";
import type { Dictionary } from "./en-US";

/**
 * Server-only message catalog access.
 *
 * Dictionaries are loaded through dynamic `import()` calls keyed by locale, so
 * each catalog lands in its own server chunk. Because every consumer is a
 * Server Component, translated copy never reaches the browser JavaScript
 * bundle — only the rendered HTML does.
 *
 * No `import "server-only"` is needed: importing `next/root-params` below
 * already fails the build if this module is pulled into a Client Component.
 */
const CATALOGS: Readonly<Record<Locale, () => Promise<Dictionary>>> = {
  "en-US": () => import("./en-US").then((module) => module.enUS),
  "pt-BR": () => import("./pt-BR").then((module) => module.ptBR),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return CATALOGS[locale]();
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
  const locale = await requireLocaleForRoute();
  return getDictionary(locale);
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
