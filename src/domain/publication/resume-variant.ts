import type { Locale } from "@/domain/i18n";

/**
 * Which documents exist, and what each one is called.
 *
 * ## Why this is domain and not infrastructure
 *
 * Because a download filename is a decision, and a decision does not belong next to
 * the code that reads bytes off a disk. It also has to be reachable from the
 * browser: the download button fetches the PDF as a blob and saves it under a name
 * it composes itself, so the name it composes is the one the recruiter gets — and a
 * rule the server holds and the client does not is a rule the client can break.
 *
 * Infrastructure imports this. It is never the other way round.
 */

/** Every stack the fixed documents cover. `all` is the default. */
export const RESUME_VARIANTS = [
  "all",
  "enterprise-java",
  "enterprise-dotnet",
  "modern-web",
] as const;

export type ResumeVariant = (typeof RESUME_VARIANTS)[number];

/**
 * The stack each variant is written for, as backend plus frontend.
 *
 * ## Why every variant is named the same way
 *
 * Because the reader is choosing between these documents, and the comparison they
 * are making is "which backend, which frontend". A label that leads with a
 * seniority — `Enterprise Java + Angular`, `Modern Node + Go + React` — makes two
 * of the three documents look like they are for more senior work than the third,
 * which is not what separates them and not what anyone is choosing on.
 *
 * So the shape is fixed: **backend + frontend, and nothing else**. The third
 * variant covers Node, Go and React, and is named for the pair a reader scans
 * for rather than the full list, which lives in its headline.
 *
 * ## Why it is per locale
 *
 * Because it goes in a filename and in a button label, and both are read. `and`
 * and `e` are not the same word.
 */
export const RESUME_VARIANT_STACKS: Record<
  Exclude<ResumeVariant, "all">,
  Readonly<Record<Locale, string>>
> = {
  "enterprise-java": { "pt-BR": "Java e Angular", "en-US": "Java and Angular" },
  "enterprise-dotnet": { "pt-BR": "C# e Angular", "en-US": "C# and Angular" },
  "modern-web": { "pt-BR": "Node e React", "en-US": "Node and React" },
};

/** The stack a variant is written for, or `null` for the general document. */
export function resumeVariantStack(locale: Locale, variant: ResumeVariant): string | null {
  return variant === "all" ? null : RESUME_VARIANT_STACKS[variant][locale];
}

/**
 * What the selector calls each document.
 *
 * The stack for a variant, and `Completo` for the general one — which is not a
 * stack and is not pretending to be one. The point of the general document is that
 * it argues for everything, so calling it by a pair would be a smaller claim than
 * the document makes.
 */
export function resumeVariantLabel(
  locale: Locale,
  variant: ResumeVariant,
  generalLabel: string,
): string {
  return resumeVariantStack(locale, variant) ?? generalLabel;
}

/**
 * The variant a slug names, or `null` when it names none.
 *
 * `null` rather than a default: an unrecognised slug must not quietly become the
 * general résumé, because the reader asked for a specialised one and would get a
 * document that never mentions their stack. The route turns `null` into a 400
 * with the list of what there is.
 */
export function resolveResumeVariant(raw: string | null): ResumeVariant | null {
  if (raw === null || raw.trim() === "") {
    return "all";
  }

  const slug = raw.trim().toLowerCase();

  return (RESUME_VARIANTS as ReadonlyArray<string>).includes(slug)
    ? (slug as ResumeVariant)
    : null;
}