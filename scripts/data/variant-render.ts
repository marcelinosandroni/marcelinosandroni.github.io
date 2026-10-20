/**
 * Swaps a variant's content into the shared shell.
 *
 * ## Why this is a module and not part of the Portuguese build
 *
 * Because a variant in *any* language is the same shape: the shared shell with five
 * things replaced — the headline, the summary, the metrics, the inventory, and the
 * stack lines and bullets of each role. The English variants are the Portuguese ones
 * rewritten, so they swap the same way, and the only difference is the language of
 * the strings being put in.
 *
 * Two scripts need that: `build-stack-variants.ts` builds the Portuguese set from
 * `data/stack-variants.pt-br.ts`, and `build-english-variants.ts` builds the English
 * set from `data/stack-variants.en-us.ts`. A copy of this logic in the second script
 * would be a second answer to "what does this variant replace", and the two would
 * drift — the English document would start carrying a section the Portuguese one had
 * dropped, with nothing to notice.
 *
 * ## Why it replaces rather than supplies
 *
 * A variant that wrote its own role markup would turn one change to the shell into
 * five, and the fit measured for one document would say nothing about the others — the
 * page count would depend on which variant the author happened to be thinking about.
 * So the block stays the shell's and only the sentences inside it are swapped, which
 * keeps `data-rule`, `keep-together` and the layout contract measuring the same thing
 * in every document of every language.
 */
import {
  TIMELINE_CSS,
  assertTimelineMatchesRoles,
  buildTimeline,
  type TimelineRole,
} from "./career-timeline";
import { replaceVariantRoles } from "./variant-roles";
import type { Variant } from "./stack-variants.pt-br";

/** Section headings, mapped to the id a variant fills. */
export const HEADINGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/<h3 class="section-title">Resumo Profissional<\/h3>/, "summary"],
  [/<h3 class="section-title">Principais Métricas de Impacto em Produção<\/h3>/, "metrics"],
];

/**
 * Replaces one section's contents, keeping the section's own attributes.
 *
 * The attributes carry `keep-together` and the vertical rhythm, which are part of the
 * measured fit - a variant that dropped them would paginate differently for reasons
 * that have nothing to do with its content.
 */
export function replaceSection(out: string, replacement: string, id: string): string {
  for (const [heading, sectionId] of HEADINGS) {
    if (sectionId !== id) {
      continue;
    }

    const match = heading.exec(out);

    if (match === null || match.index === undefined) {
      throw new Error(`section not found: ${id}`);
    }

    const start = out.lastIndexOf("<section", match.index);
    const end = out.indexOf("</section>", match.index);

    if (start === -1 || end === -1) {
      throw new Error(`section boundaries not found: ${id}`);
    }

    /*
      The heading is kept and only what follows it is replaced, so the class on
      the heading is the shell's rather than whatever the variant happened to
      type. That is the same reason the section element is left alone.
    */
    const headingEnd = match.index + match[0].length;

    return out.slice(0, headingEnd) + replacement + out.slice(end);
  }

  throw new Error(`no heading maps to the section: ${id}`);
}

/**
 * The whole swap: sections, inventory, roles, timeline, title and headline.
 *
 * Returns a new string; the shell is never mutated.
 */
export function renderVariant(shell: string, variant: Variant): string {
  let out = shell;

  for (const [id, replacement] of [
    ["summary", variant.sections.summary],
    ["metrics", variant.sections.metrics],
  ] as const) {
    out = replaceSection(out, replacement, id);
  }

  out = replaceInventory(out, variant);
  out = replaceVariantRoles(out, variant.roles ?? [], variant.slug);
  out = injectTimeline(out, variant.timeline, variant.slug);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${variant.title}</title>`);

  /*
    The headline under the name, matched by the layout hook rather than by its text
    or its class.

    The general document's headline is the one thing that must not survive into a
    variant: a document that calls itself "Engenheiro de Software & IA" while
    arguing for Java is making two claims at once, and the broader one is the one
    that does not help the reader choose.

    Matched on `data-rule="cargo"` because that is the attribute the layout contract
    measures it by, so the rule and the replacement cannot drift apart - a variant
    whose headline stopped carrying the hook would fail the contract for a missing
    rule, which is a better failure than one the contract could not see.
  */
  const headline = /<h2[^>]*data-rule="cargo"[^>]*>[\s\S]*?<\/h2>/.exec(out);

  if (headline === null || headline.index === undefined) {
    throw new Error(
      `[${variant.slug}] headline not found - the shell's h2 has to carry data-rule="cargo"`,
    );
  }

  out =
    out.slice(0, headline.index) +
    `<h2 class="text-base font-bold text-slate-700" data-rule="cargo">${variant.headline}</h2>` +
    out.slice(headline.index + headline[0].length);

  return out;
}

/**
 * Fills the timeline placeholder, and teaches the stylesheet what it needs.
 *
 * The CSS is injected rather than hand-written into the shell so that the
 * proportions, the tones and the markup come from one module. Two files describing
 * the same bar is how a colour and a width end up disagreeing with nobody able to
 * say which one is right.
 */
export function injectTimeline(
  html: string,
  roles: ReadonlyArray<TimelineRole>,
  slug: string,
): string {
  const placeholder = '<div id="carreira-timeline"></div>';

  if (!html.includes(placeholder)) {
    throw new Error(`[${slug}] the shell has no timeline placeholder`);
  }

  const bar = buildTimeline(roles);

  /*
    Checked against the document that is about to be paginated, not against the
    data that produced the bar. The question is not "are these numbers right" but
    "are these the same jobs this page lists" - and only the rendered document can
    answer the second one.
  */
  assertTimelineMatchesRoles(slug, roles, html);

  const withMarkup = html.replace(placeholder, bar);

  if (withMarkup.includes(TIMELINE_CSS)) {
    return withMarkup;
  }

  return withMarkup.replace("</style>", `${TIMELINE_CSS}\n        </style>`);
}

/**
 * Replaces the technical inventory with the one written for this stack.
 *
 * Swapped rather than appended, because the general inventory is a list of
 * everything and the specialist's is a list of what this reader came for. Two
 * inventories on one page would be the general one with the specialist's as a
 * subset, which is exactly the redundancy that makes a reader stop.
 *
 * The section is removed outright when a variant declares no inventory, so it
 * cannot leave an empty heading behind.
 *
 * The markup is built here rather than carried as a string in the data module,
 * because the `data-item` and `data-rule` hooks are what pagination and the layout
 * contract both find elements by. A variant that wrote its own markup would be a
 * document the contract silently stopped checking - and a rule that matches nothing
 * passes, which is the failure that has to be designed out.
 */
export function replaceInventory(html: string, variant: Variant): string {
  const open = html.search(/<section[^>]*data-block="habilidades"/);

  if (open === -1) {
    throw new Error(`[${variant.slug}] the shell has no inventory section to replace`);
  }

  const close = html.indexOf("</section>", open);

  if (close === -1) {
    throw new Error(`[${variant.slug}] the inventory section is not closed`);
  }

  const replacement =
    variant.inventory === undefined
      ? ""
      : `<section class="keep-together" data-block="habilidades">
            <h3 class="section-title">Habilidades Técnicas &amp; Arquitetura de Software</h3>${renderInventory(variant.inventory)}
        </section>

        `;

  return html.slice(0, open) + replacement + html.slice(close + "</section>".length);
}

/** The inventory's paragraphs, one group per entry. */
export function renderInventory(groups: ReadonlyArray<readonly [string, string]>): string {
  const paragraphs = groups
    .map(
      ([label, items]) =>
        `                <p data-item data-rule="habilidade"><strong>${label}:</strong> ${items}</p>`,
    )
    .join("\n");

  return `
            <div class="fact-list">
${paragraphs}
            </div>`;
}
