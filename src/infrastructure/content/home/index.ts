import type { Locale } from "@/domain/i18n";
import type { HomeContent } from "@/domain/portfolio";

import { homeContentEnUS } from "./home-en-us";
import { homeContentPtBR } from "./home-pt-br";

/**
 * Locale to home-content registry.
 *
 * Mirrors the resume registry: keyed by canonical locale so a new language is a
 * one-line addition the compiler enforces, and only ever read from Server
 * Components, which keeps both catalogs out of the browser bundle.
 */
const HOME_BY_LOCALE = {
  "pt-BR": homeContentPtBR,
  "en-US": homeContentEnUS,
} as const satisfies Record<Locale, HomeContent>;

export function getHomeContent(locale: Locale): HomeContent {
  return HOME_BY_LOCALE[locale];
}
