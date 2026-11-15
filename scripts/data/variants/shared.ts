/**
 * The shape every stack variant has, and the pieces its sections are built from.
 *
 * ## What a variant carries
 *
 * The headline under the name, the summary, the four headline metrics, the
 * technical inventory, and - when the document argues a different stack - each
 * role's stack line and bullets. The experience, the degrees, the languages and
 * the contact details are not here: they live in the shell, because the thing that
 * makes the documents credible as a set is that they are one set, and a variant
 * that declared its own roles would be a fifth place for a date to go stale in.
 *
 * ## Why the type lives here
 *
 * One module per document needs the type and the two HTML fragments its sections
 * are made of. Keeping them in the Portuguese aggregate would make every variant
 * import the aggregate that imports the variant - a cycle that only works while
 * nobody runs it.
 */
import { TONES, type TimelineRole } from "../career-timeline";
import type { RoleContent } from "../variant-roles";
import type { TechnologyCategory } from "../technology-categories";

export type { RoleContent };

/*
  The career timeline - one bar, because the experience is one.

  It restates the technology roles and nothing else. The fifteen years of finance
  before them are real and are in the document, but putting them on this bar would
  squeeze six years of engineering into a twentieth of the width and turn the shape
  into a claim that the bar contradicts.

  Ordered oldest first, because a timeline reads left to right and the career did
  not start on the right. There is one of these for the whole set now: the experience is
  the same in every document, so a variant bar that differed would be showing a
  career the page does not contain.

  The periods are written out rather than derived, which is a second copy of a
  fact that also lives in the roles - so `assertTimelineMatchesRoles` fails the
  build if the two stop agreeing. Writing the dates twice and checking them is
  cheaper than threading structured data through a renderer that was built to take
  strings.
*/
export const TIMELINE: ReadonlyArray<TimelineRole> = [
  { label: "ZUP", period: "Mar/2019 – Jun/2020 · Remoto", level: "Júnior → Pleno", tone: TONES.lightest },
  { label: "ITAÚ", period: "Jul/2020 – Nov/2022 · Híbrido", level: "Pleno", tone: TONES.light },
  { label: "BNP Paribas", period: "Dez/2022 – Set/2025 · Híbrido", level: "Sênior", tone: TONES.mid },
  { label: "DGT", period: "Out/2025 – Set/2026 · Remoto", level: "Tech Lead", tone: TONES.dark },
];

/**
 * The four headline metric cards.
 *
 * `data-rule` on each of the three parts is what the layout contract measures: the
 * value is one line, the green name of the achievement is one line, and the caption
 * is two. A card that does not fit that shape is a card whose row no longer lines
 * up, and the build says which caption went over rather than leaving it to be found
 * on the printed page.
 */
export const metrics = (
  cards: ReadonlyArray<readonly [string, string, string]>,
): string => `
            <div class="grid grid-cols-4 gap-3 text-center">
${cards
  .map(
    ([value, label, caption]) => `
                <div class="bg-white border border-slate-200 rounded p-2 flex flex-col justify-start items-center shadow-sm">
                    <div class="font-black text-slate-800 text-[16px] leading-none mb-1.5" data-rule="metrica-valor">${value}</div>
                    <div class="text-[9px] text-emerald-700 uppercase font-black tracking-wide leading-tight mb-1" data-rule="metrica-destaque">${label}</div>
                    <div class="text-[9px] text-slate-500 font-medium leading-tight" data-rule="metrica-descricao">${caption}</div>
                </div>`,
  )
  .join("\n")}
            </div>`;

/**
 * The summary: five lines, the same size as everything else.
 *
 * `data-rule="resumo"` and the five-line budget are why the second sentence here is
 * a sentence and not a paragraph. A summary is the argument the whole document
 * rests on, and past five lines a reader is reading prose rather than a précis.
 */
export const summary = (lead: string, body: string): string => `
            <p class="text-[12.5px] leading-relaxed text-slate-700 text-justify" data-rule="resumo">
                <strong>${lead}</strong>${body}</p>`;

/** One variant's reader-facing differences from the shared document. */
export type Variant = {
  readonly slug: string;
  /** The reader-facing label the selector shows. */
  readonly label: string;
  /** The document title, which is also the first thing a recruiter reads. */
  readonly title: string;
  /**
   * The line under the name.
   *
   * This is the one place a variant states what it is *for*, and it is the only
   * sentence a recruiter is certain to read. The general résumé gets a broad
   * description here because it has to answer for everything; a specialist gets
   * its stack named, because a reader who is choosing between these documents is
   * looking for exactly that and should not have to infer it.
   *
   * One line, under the layout contract - so the stack is named here rather than
   * running into a second line that pushes the summary off its own budget.
   */
  readonly headline: string;
  /**
   * The technical inventory, as label-and-items pairs.
   *
   * The general résumé has no inventory of its own: every role above already
   * carries its own stack, and a list that repeats them is the part of a résumé a
   * recruiter stops reading.
   *
   * A specialist document is the case where the trade goes the other way - the
   * reader arrived asking "does this person run Java in production", and an
   * inventory answers that faster than any paragraph. So it is allowed here, and
   * the layout contract decides whether each group actually fits in two lines
   * rather than anyone guessing in advance.
   */
  readonly inventory?: ReadonlyArray<readonly [string, string]>;
  /** The summary and the four metric cards. */
  readonly sections: {
    readonly summary: string;
    readonly metrics: string;
  };
  /**
   * Each role's stack line and bullets, when this variant argues a different stack.
   *
   * ## What stays shared, and why that is not a compromise
   *
   * The role, the company, the dates and the tenure are one set across every
   * document, because they are facts rather than arguments: a date that exists in
   * five places is five places to let it go stale, and `assertTimelineMatchesRoles`
   * would catch the drift only after it had already shipped in a document or two.
   *
   * The stack line and the bullets are the argument, though, and they were reading
   * as the general résumé's argument - a document that names Node, Go and React under
   * the name and then credits Spring Boot and RxJS through the middle of its
   * experience reads as carelessness rather than breadth. So those move here.
   *
   * Declaring `roles` opts a variant in completely: a variant that declares some of
   * them and not the others fails the build, because a partial declaration is
   * indistinguishable at a glance from a complete one and leaves half the experience
   * arguing for the other stack. A variant that declares none inherits all of them,
   * which is what the variants written before this field existed still do.
   */
  readonly roles?: ReadonlyArray<RoleContent>;
  /**
   * Parameter overrides applied to `{{param}}` placeholders in this variant's
   * stacks and bullets.
   *
   * A variant that declares no `roles` can still carry `params`, in which case
   * the shell's own stacks and bullets are kept and only the placeholders are
   * resolved against these values (falling back to the technology classified in
   * the shell's stack when a value is not given). This is what lets a variant
   * vary the cloud (or the language, the backend, ...) without rewriting every
   * role's stack and bullets.
   */
  readonly params?: Partial<Record<TechnologyCategory, string>>;
  /** The roles the career timeline shows, oldest first. */
  readonly timeline: ReadonlyArray<TimelineRole>;
};
