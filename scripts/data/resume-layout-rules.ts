/**
 * The layout contract for the recruiter documents.
 *
 * ## What this is
 *
 * A table of limits: for every part of the résumé, how many lines it may occupy
 * and how many characters it may contain. `scripts/check-layout.ts` measures the
 * rendered document against this table and fails the build on anything over.
 *
 * ## Why limits rather than a layout to adjust
 *
 * Because the alternative is a document whose typography moves every time the
 * content does. Two rounds of "savings" in this project shrank the type to make
 * content fit, and the result was a page that no longer said what it was meant to
 * say: a résumé whose body was set below its summary because the summary was the
 * only thing on the page still set at the size it was designed for.
 *
 * So the direction is fixed and the content is the variable. Type size does not
 * respond to length. When something is too long, the build stops and says which
 * item and by how much, and the fix is to write less - which is the only fix that
 * keeps the document's appearance identical across every variant in the set.
 *
 * ## Why two numbers per rule and not one
 *
 * Lines are what actually breaks the page, and they can only be known by
 * rendering. Characters can be counted without a browser, which makes them the
 * budget you can edit against: a writer can know they are at 185 of 200
 * characters without running anything, and stay inside it.
 *
 * The character limit is therefore calibrated from the measured line capacity at
 * this exact typography, minus a safety margin for where words happen to fall. It
 * is a conservative proxy - a paragraph of the limit's length can still wrap onto
 * an extra line - so it is the *lines* check that has the final word, and the
 * characters are the early warning.
 *
 * ## Changing a limit
 *
 * Raise `maxLines` freely: it changes what is allowed, and the build will say so
 * loudly if the page can no longer hold it. Changing a type size is the one thing
 * that invalidates every character figure in this file at once, because they were
 * all derived from how much text fits on a line - so it is also the one thing
 * that has to be done deliberately, with the table below re-measured after.
 */

/**
 * The one body size. Everything a reader reads as prose or as a list is this.
 *
 * Held in one place because the stylesheet, the build and this table all have to
 * agree on it, and three literals that happen to match today is not an agreement.
 */
export const BODY_PX = 12.5;

/**
 * The contact block, one step below the body.
 *
 * The only sanctioned reduction, and it exists for a reason that is not about
 * fitting: six contact details and their labels are reference material rather
 * than prose, they are the part of the page nobody reads closely, and setting
 * them a step down keeps the eye on the name and the summary. They are still
 * legible at 11px, which is what the limit is for - a rule that permitted 9px here
 * would permit unreadable, and this file is where that would be written down.
 */
export const CONTACT_PX = 11;

/**
 * The metric captions, a step below the body, and the second and last exception.
 *
 * Worth being explicit about, because "everything is 12.5px" is otherwise the
 * rule and this is the obvious hole in it. The four metric cards are 43mm wide
 * each. A two-line caption in 43mm at 12.5px holds about fifty characters, and
 * the captions say things like "Arquitetura de processamento assíncrono de
 * eventos" - which is the finding, and the reason the cards carry a heading, a
 * label and a sentence rather than a number alone.
 *
 * So the choice is between a caption that runs to four lines in a box built for
 * two, and a caption set at the size the box was designed for. The captions are
 * set at the size the box was designed for, and the two-line rule is enforced
 * above them - which means a caption can no longer be quietly trimmed by making
 * it smaller. That is the property worth having; the alternative is a rule
 * nothing checks.
 */
export const METRIC_CAPTION_PX = 9;

/**
 * A limit on one element of the document.
 *
 * `selector` matches by the `data-rule` hook the shell carries, never by class or
 * by position. The hook survives pagination and translation untouched, so a rule
 * cannot stop applying because a wrapper was renamed or a sheet was rebuilt - and
 * a selector that quietly matches nothing is reported as missing rather than
 * passing, which is the failure mode a check written against structure always has.
 */
export type LayoutRule = {
  /** Stable id, used in the error and in the report. */
  readonly id: string;
  /** What the reader calls this, so the error names a thing and not a selector. */
  readonly label: string;
  /** The `data-rule` value this applies to. */
  readonly hook: string;
  /** Line budget, counted on the rendered page. */
  readonly maxLines: number;
  /** Character budget, counted on the element's own text. */
  readonly maxChars: number;
  /** Why the budget is what it is. Written for whoever has to work inside it. */
  readonly why: string;
};

/**
 * The table.
 *
 * Order is the order the reader meets the parts, which is also the order the
 * report prints - a limit is easier to act on when it arrives with the section
 * around it.
 */
export const LAYOUT_RULES: ReadonlyArray<LayoutRule> = [
  {
    id: "nome",
    label: "Nome",
    hook: "nome",
    maxLines: 1,
    maxChars: 40,
    why: "A name that wraps reads as two words of a company name. Set at 30px it has room for a full name and no more.",
  },
  {
    id: "cargo",
    label: "Cargo (headline)",
    hook: "cargo",
    maxLines: 1,
    maxChars: 80,
    why: "The line under the name is the only sentence a recruiter is certain to read, and a two-line headline pushes everything below it down a line. The stack is named here when the document is a stack variant, so this is where it has to fit.",
  },
  {
    id: "tagline",
    label: "Tagline",
    hook: "tagline",
    maxLines: 1,
    maxChars: 120,
    why: "One sentence of positioning under the name. It repeats the headline if it grows, and the headline is the stronger of the two.",
  },
  {
    id: "contato",
    label: "Contacto (as duas linhas)",
    hook: "contato",
    maxLines: 2,
    maxChars: 230,
    why: "Six fixed fields in two rows of three, on one six-column grid so the labels align with the labels and the values with the values. These are not edited to fit a limit - they are facts, and they are the same in every document. Two lines, and no horizontal overflow: a field that grew would push the grid past the text measure and fail the build, which is the correct place for that to fail.",
  },
  {
    id: "resumo",
    label: "Resumo Profissional",
    hook: "resumo",
    maxLines: 5,
    maxChars: 500,
    why: "Five lines is what the summary is allowed to be on the page. It is the argument the whole document rests on, and past five lines a reader is reading a paragraph rather than a précis.",
  },
  {
    id: "metrica-valor",
    label: "Métrica - valor",
    hook: "metrica-valor",
    maxLines: 1,
    maxChars: 24,
    why: "A number and its unit. A metric that wraps into two lines is two metrics, and the eye reads it as a bigger claim than it is.",
  },
  {
    id: "metrica-destaque",
    label: "Métrica - destaque",
    hook: "metrica-destaque",
    maxLines: 1,
    maxChars: 26,
    why: "The green label is the name of the achievement, not a sentence. One word or two; never a phrase, or the card loses the shape that makes four of them comparable at a glance.",
  },
  {
    id: "metrica-descricao",
    label: "Métrica - descrição",
    hook: "metrica-descricao",
    maxLines: 2,
    maxChars: 64,
    why: "Two lines, in a card 43mm wide. This is the tightest budget in the document and the one that decides whether the four cards still line up as a row. Calibrated from what fits rather than from a round number: sixty-three characters still make two lines here, sixty-eight make three.",
  },
  {
    id: "tl-empresa",
    label: "Linha do tempo - empresa",
    hook: "tl-empresa",
    maxLines: 1,
    maxChars: 14,
    why: "A company name over its own segment. The segments are proportional to the months served, so the shortest is the narrowest - a name that wraps would print over its neighbour.",
  },
  {
    id: "tl-nivel",
    label: "Linha do tempo - nível",
    hook: "tl-nivel",
    maxLines: 2,
    maxChars: 26,
    why: "The level is what makes the bar a progression and not four rectangles. Two lines because the narrowest segment is a fourth of the widest, and a level is worth one extra line to keep the row aligned.",
  },
  {
    id: "tl-ano",
    label: "Linha do tempo - ano",
    hook: "tl-ano",
    maxLines: 1,
    maxChars: 4,
    why: "The year ruler. A tick label that wrapped would claim two years for one tick.",
  },
  {
    id: "habilidade",
    label: "Habilidades Técnicas (cada grupo)",
    hook: "habilidade",
    maxLines: 2,
    maxChars: 215,
    why: "Two lines per group is the whole reason this section is readable: six two-line groups are a list a recruiter can scan, and six four-line groups are a paragraph they will skip. The inventory is what answers 'does this person run my stack', so it has to stay scannable to be worth its place.",
  },
  {
    id: "formacao",
    label: "Formação Acadêmica (cada item)",
    hook: "formacao",
    maxLines: 1,
    maxChars: 80,
    why: "One line: degree, institution, years. Everything a reader needs is in those three things, and a wrapped entry is an entry the parser reads as two.",
  },
  {
    id: "idioma",
    label: "Idiomas (cada item)",
    hook: "idioma",
    maxLines: 1,
    maxChars: 100,
    why: "One line: language, level, what it is used for. Same reason as the degrees, and this section is the one most likely to be read by a keyword filter rather than an eye.",
  },
  {
    id: "cargo-titulo",
    label: "Experiência - título do cargo",
    hook: "cargo-titulo",
    maxLines: 1,
    maxChars: 60,
    why: "Title and company on the left, dates on the right, one line. A wrapped title pushes the dates onto a line of their own and breaks the scan: the eye reads roles by finding the company and the dates together.",
  },
  {
    id: "cargo-periodo",
    label: "Experiência - período",
    hook: "cargo-periodo",
    maxLines: 1,
    maxChars: 48,
    why: "Tenure and dates together. Held on one line by `white-space: nowrap` so that an over-long period is caught as an overflow rather than wrapping into the role's body. Calibrated from the English document, which is the wider of the two: the English form of a tenure is longer than the Portuguese one, and a budget set from the Portuguese alone would let the English one through.",
  },
  {
    id: "stack",
    label: "Experiência - stack",
    hook: "stack",
    maxLines: 1,
    maxChars: 112,
    why: "One line, no wrapping. A technology list that breaks over two lines stops being a list - and the break lands mid-phrase, which is the worst place for it.",
  },
  {
    id: "bullet",
    label: "Experiência - bullet",
    hook: "bullet",
    maxLines: 3,
    maxChars: 300,
    why: "Two to three lines. A bullet that runs to four is a paragraph, and the role below it loses its space: this is the limit that decides whether the experience holds two sheets or three. The newest three roles carry three bullets, the next two, and the oldest one.",
  },
];

/** The rule for one hook, or `undefined` - which the checker reports as a violation. */
export function ruleFor(hook: string): LayoutRule | undefined {
  return LAYOUT_RULES.find((rule) => rule.hook === hook);
}