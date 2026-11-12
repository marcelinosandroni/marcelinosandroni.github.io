import type { Metadata } from "next";

import { getCheatsheetContent } from "@/infrastructure/content/cheatsheet";
import { readCheatsheetContent } from "@/infrastructure/repositories/resume-writer";
import { CheatsheetView } from "@/components/cheatsheet/cheatsheet-view";
import { DEFAULT_LOCALE, toLocale } from "@/domain/i18n";
import type { CheatsheetContent } from "@/infrastructure/content/cheatsheet/cheatsheet-content";

export const metadata: Metadata = {
  title: "Cheatsheet SRE + AI Engineer",
  description:
    "Termos, conceitos e arquiteturas de engenharia de software — leitura rápida, referência pronta.",
};

export default async function CheatsheetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale) ?? DEFAULT_LOCALE;
  const typed = getCheatsheetContent(locale);

  // Read from DB first; fall back to the typed catalog when the database is
  // unreachable, exactly as the résumé page does. An admin edit therefore
  // appears immediately after revalidation, and a missing database never takes
  // the page down.
  let content: CheatsheetContent = typed;
  try {
    const fromDb = await readCheatsheetContent(locale);
    if (fromDb !== null && fromDb.categories.length > 0) {
      content = {
        locale,
        title: typed.title,
        subtitle: typed.subtitle,
        categories: fromDb.categories.map((cat) => ({
          id: cat.id,
          title: cat.title,
          icon: cat.icon,
          terms: cat.terms.map((t) => ({ term: t.term, definition: t.definition, example: t.example, level: t.level as any, tags: t.tags })),
        })),
      };
    }
  } catch {
    // DB unreachable — keep the typed catalog.
  }

  return <CheatsheetView content={content} />;
}
