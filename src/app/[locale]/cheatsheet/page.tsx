import type { Metadata } from "next";

import { getCheatsheetContent } from "@/infrastructure/content/cheatsheet";
import { CheatsheetView } from "@/components/cheatsheet/cheatsheet-view";
import { DEFAULT_LOCALE, LOCALE_SEGMENTS, toLocale } from "@/domain/i18n";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Cheatsheet SRE + AI Engineer",
  description:
    "Termos, conceitos e arquiteturas para entrevistas técnicas — leitura rápida, resposta pronta.",
};

export default async function CheatsheetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale) ?? DEFAULT_LOCALE;
  const content = getCheatsheetContent(locale);
  const t = await getDictionary(locale);

  return <CheatsheetView content={content} />;
}
