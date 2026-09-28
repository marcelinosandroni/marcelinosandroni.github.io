import type { Locale } from "@/domain/i18n";
import type { Dictionary } from "./en-US";

/**
 * Locale to message catalog registry, free of any Next.js dependency so it can
 * also be used by the standalone PDF compilation script.
 *
 * Catalogs are loaded through dynamic `import()` keyed by locale, so each one
 * lands in its own server chunk and only the active language is materialised.
 */
const CATALOGS: Readonly<Record<Locale, () => Promise<Dictionary>>> = {
  "en-US": () => import("./en-US").then((module) => module.enUS),
  "pt-BR": () => import("./pt-BR").then((module) => module.ptBR),
};

export function hasCatalog(locale: Locale): boolean {
  return locale in CATALOGS;
}

export async function loadDictionary(locale: Locale): Promise<Dictionary> {
  return CATALOGS[locale]();
}
