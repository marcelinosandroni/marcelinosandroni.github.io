import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { paginate } from "./paginate-resume";
import {
  TIMELINE_CSS,
  assertTimelineMatchesRoles,
  buildTimeline,
  type TimelineRole,
} from "./data/career-timeline";
import { TIMELINE, type Variant } from "./data/stack-variants.pt-br";
import { checkLayout, type LayoutDocument } from "./check-layout";

/**
 * Builds the stack-specific résumés from the approved general one.
 *
 * ## Why the structure is inherited instead of restated
 *
 * All four documents share one layout, and the thing that makes them credible as a
 * set is that they stay one layout. The print stylesheet, the grid, the typography,
 * the section order - all of it is carried over from the approved document
 * untouched, and only the reader-facing text inside a section is replaced.
 *
 * That is also the only way the page count keeps meaning anything. A variant that
 * declared its own markup would turn one change to the shell into four, and the
 * fit measured for one would say nothing about the others.
 *
 * ## Why every section is asserted
 *
 * A section that cannot be found is an error, and so is a variant that leaves a
 * phrase from the general résumé behind in a section it rewrote. Both fired while
 * this was being written. A silent partial rewrite produces the worst possible
 * document: one that argues for Java in the summary and still credits C# in the
 * middle of the experience, which reads as carelessness rather than breadth.
 *
 * ## Why the layout contract runs on the flat document
 *
 * Before pagination, not after. The line count of a paragraph is a property of the
 * text and the measure - the width of the column - and pagination changes neither:
 * a sheet is the same 182mm whether it holds the summary or the last role. Checking
 * afterwards would mean measuring the same thing five times and learning nothing,
 * and a failure would name a page rather than the sentence that caused it.
 */

/** Section headings, mapped to the id a variant fills. */
const HEADINGS: ReadonlyArray<readonly [RegExp, string]> = [
  [/<h3 class="section-title">Resumo Profissional<\/h3>/, "summary"],
  [/<h3 class="section-title">Principais Métricas de Impacto em Produção<\/h3>/, "metrics"],
];

/**
 * Phrases that belong to the general résumé alone.
 *
 * Asserted absent from every variant. What makes a phrase eligible to be on this
 * list is that it is *prose*: a sentence that could only have come from the general
 * document, never a value a specialist would also legitimately claim.
 *
 * That distinction is load-bearing. An earlier version of this list also carried
 * metric values like "+R$ 500 Bi", and it fired the moment a variant used the same
 * number on purpose - which is the whole point of a metric, that it is a fact about
 * the career rather than a choice about the document. A metric that only the
 * general résumé may state is not a specialisation guard, it is a fact guard, and
 * the two have opposite failure modes: this one blocks the truth and misses the
 * leftover.
 */
const GENERAL_MARKERS: ReadonlyArray<string> = [
  "Engenheiro Full Stack de verdade",
  "unindo visão estratégica e análise de negócio",
];

async function main(): Promise<void> {
  const shell = await fs.readFile(resolve("resume-shell.html"), "utf8");
  const variants = await loadVariants();

  /*
    Measured before anything is written.

    The contract is a statement about content, and content is what this build
    produces. Checking after the files were on disk would mean a build that wrote
    four documents and then failed, leaving four documents that look finished and
    are not inside their own limits.
  */
  const documents: LayoutDocument[] = [];

  for (const variant of variants) {
    const flat = render(shell, variant);
    assertComplete(variant, flat);

    documents.push({ slug: variant.slug, html: flat });

    /*
      Pagination is part of building the document, not a check run afterwards.

      The page count used to be a constraint the content was cut to meet. Now it
      is a fact about the content: blocks are measured and flowed, and a document
      that grew simply takes another sheet. The count that comes back is what the
      PDF assertion is given, so the two can never disagree.
    */
    const { html, pages } = await paginate(flat, { slug: variant.slug });

    const target = `resume-recruiter-pt-br-${variant.slug}.html`;
    await fs.writeFile(resolve(target), html, "utf8");
    console.log(`wrote ${target} (${pages} pages)`);
  }

  /*
    The general document goes through the same paginator and the same contract.

    It has to. The pages it ships are the ones it was measured into, and a source
    that says "Página 1 de 2" while its PDF says three is a lie the reader finds
    out about on the last sheet. And the contract has to apply to it because the
    general document is the one every other document is compared against - a rule
    that only the variants obey is a rule the set does not share.
  */
  assertRoles("document", shell);

  const withTimeline = injectTimeline(shell, TIMELINE, "document");

  documents.push({ slug: "document", html: withTimeline });

  const { html: general, pages: generalPages } = await paginate(withTimeline, {
    slug: "document",
  });

  await fs.writeFile(resolve("resume-recruiter-pt-br.html"), general, "utf8");
  console.log(`wrote resume-recruiter-pt-br.html (${generalPages} pages)`);

  await checkLayout(documents);
}

async function loadVariants(): Promise<ReadonlyArray<Variant>> {
  const data = (await import(`./data/stack-variants.${process.env.VARIANT_LOCALE ?? "pt-br"}.ts`)) as {
    variants: ReadonlyArray<Variant>;
  };

  return data.variants;
}

/**
 * Swaps one section's contents, keeping the section's own attributes.
 *
 * The attributes carry `keep-together` and the vertical rhythm, which are part of
 * the measured fit - a variant that dropped them would paginate differently for
 * reasons that have nothing to do with its content.
 */
function render(shell: string, variant: Variant): string {
  let out = shell;

  for (const [heading, id] of HEADINGS) {
    const replacement = variant.sections[id as "summary" | "metrics"];

    if (replacement === undefined) {
      continue;
    }

    const match = heading.exec(out);

    if (match === null || match.index === undefined) {
      throw new Error(`[${variant.slug}] section not found: ${id}`);
    }

    const start = out.lastIndexOf("<section", match.index);
    const end = out.indexOf("</section>", match.index);

    if (start === -1 || end === -1) {
      throw new Error(`[${variant.slug}] section boundaries not found: ${id}`);
    }

    /*
      The heading is kept and only what follows it is replaced, so the class on
      the heading is the shell's rather than whatever the variant happened to
      type. That is the same reason the section element is left alone.
    */
    const headingEnd = match.index + match[0].length;

    out = out.slice(0, headingEnd) + replacement + out.slice(end);
  }

  out = replaceInventory(out, variant);
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
    `<h2 class="text-base font-bold text-slate-700 mt-1 mb-3" data-rule="cargo">${variant.headline}</h2>` +
    out.slice(headline.index + headline[0].length);

  return out;
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
function replaceInventory(html: string, variant: Variant): string {
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
      : `<section class="mb-2 keep-together" data-block="habilidades">
            <h3 class="section-title">Habilidades Técnicas &amp; Arquitetura de Software</h3>${renderInventory(variant.inventory)}
        </section>

        `;

  return html.slice(0, open) + replacement + html.slice(close + "</section>".length);
}

/** The inventory's paragraphs, one group per entry. */
function renderInventory(groups: ReadonlyArray<readonly [string, string]>): string {
  const paragraphs = groups
    .map(
      ([label, items]) =>
        `                <p class="mb-1" data-item data-rule="habilidade"><strong>${label}:</strong> ${items}</p>`,
    )
    .join("\n");

  return `
            <div class="text-slate-700">
${paragraphs}
            </div>`;
}


/**
 * The two facts a reader is entitled to, checked on every document.
 *
 * Both of these were wrong in shipped documents and neither had a guard: the
 * levels came back in the titles, and two variants listed a 2019 role above a
 * 2022 one. A build that cannot fail is not a check, so these run for the general
 * document too - not only the variants, which is where they were first written.
 */
function assertRoles(slug: string, html: string): void {

  /*
    Every engineering role names its level.

    This used to be the other way round. The titles were stripped of their level
    so the document could be hired at any seniority, and the guard below existed to
    keep them stripped. Then the same levels came back on purpose - in the title,
    in the headline under the name and on the timeline - because a progression
    ("Júnior to Pleno to Sênior to Tech Lead") reads as a career, while a single
    title with no level reads as a document that has not decided.

    So the check flipped rather than disappeared: a level is now required on every
    engineering title, and a title that quietly loses it fails the build. A guard
    pointed the wrong way is worse than no guard, because it stops the work.

    The accounting role is exempt. "Analista Contábil & Gestor Financeiro" is a
    profession, not a level - there is no senior version of it to write down.
  */
  const titles = [...html.matchAll(/<h4[^>]*>([\s\S]*?)<\/h4>/g)].map((match) =>
    match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  );

  const unlevelled = titles.filter(
    (title) => !/(?:Analista|Cont[aá]bil)/i.test(title) && !LEVEL.test(title),
  );

  if (titles.length === 0) {
    throw new Error(`[${slug}] no role titles found - nothing was checked`);
  }

  if (unlevelled.length > 0) {
    throw new Error(
      `[${slug}] a role title lost its seniority level: ${unlevelled.join(" / ")}. ` +
        `Every engineering role names the level it was held at.`,
    );
  }

  assertChronological(slug, html);
}
/**
 * The levels a role title may carry.
 *
 * Every engineering title names one. The accounting title is a profession and has
 * no senior form, so it is matched separately where it is used.
 */
const LEVEL = /\b(?:S(?:ê|e)nior|Pleno|Plen[oa]|J(?:ú|u)nior|Tech\s?Lead)\b/i;

/**
 * The roles run newest first.
 *
 * A résumé lists experience in reverse chronology, and that is the one ordering a
 * reader never has to think about. It is also the ordering nothing else enforces:
 * the roles are a flat array in a content module, and appending a new one puts it
 * wherever the author put it. Two variants shipped a role from 2019 above one
 * from 2022, and it read as a mistake because it was one.
 *
 * Checked against the dates in the document rather than against the array, so it
 * holds for whatever the content ends up saying - including the shell.
 */
function assertChronological(slug: string, html: string): void {
  const MONTHS: Readonly<Record<string, number>> = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  };

  /*
    The first date inside each role's period span, which is where it starts.

    The tenure is baked into the same span before the dates - `1 ano e 1 mês
    (Fev/2021 – Fev/2022)` - so the month is not adjacent to the opening tag. A
    pattern that expected it to be matched nothing at all, and this check passed
    every document it was supposed to be checking: a guard that cannot fail is
    worse than no guard, because it reads like one.

    Only start dates are compared. Two roles can legitimately overlap -
    consulting beside a salaried post - and the mistake that actually happened was
    a role that *starts* before the one above it, not one that overlaps.
  */
  const roles = [
    ...html.matchAll(/class="role-when">[^<]*?([A-Za-zç]{3})\/(\d{4})/g),
  ].map((match) => {
    const month = MONTHS[match[1].toLowerCase()];

    return {
      raw: `${match[1]}/${match[2]}`,
      when: month === undefined ? Number.NaN : Number(match[2]) * 12 + month,
    };
  });

  if (roles.length === 0) {
    throw new Error(
      `[${slug}] no role periods were found - the chronological check matched ` +
        `nothing, so it approved the document without reading it.`,
    );
  }

  for (let i = 1; i < roles.length; i++) {
    /*
      Newer above older, so the error is a role that starts *later* than the one
      above it. Reading this the other way round - "starts before" - rejects the
      correct order and approves the wrong one, which is worse than not checking:
      the build stops on the first real document and nobody reads what it meant.
    */
    if (roles[i].when > roles[i - 1].when) {
      throw new Error(
        `[${slug}] roles are not newest first: "${roles[i].raw}" starts after ` +
          `"${roles[i - 1].raw}", which is listed above it. Order the roles by ` +
          `start date, newest at the top.`,
      );
    }
  }
}

/**
 * Fills the timeline placeholder, and teaches the stylesheet what it needs.
 *
 * The CSS is injected rather than hand-written into the shell so that the
 * proportions, the tones and the markup come from one module. Two files describing
 * the same bar is how a colour and a width end up disagreeing with nobody able to
 * say which one is right.
 */
function injectTimeline(
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
 * Refuses a variant that is not actually specialised.
 *
 * Each of these has already caught something real: a leftover marker found a
 * variant whose experience section had silently kept the general text, and the
 * title check caught a variant still shipping the general document's name.
 */
function assertComplete(variant: Variant, out: string): void {
  for (const marker of GENERAL_MARKERS) {
    if (out.includes(marker)) {
      throw new Error(
        `[${variant.slug}] still carries the general résumé phrase: "${marker}"`,
      );
    }
  }

  for (const [id, content] of Object.entries(variant.sections)) {
    if (!out.includes(content.trim().slice(0, 80))) {
      throw new Error(`[${variant.slug}] section ${id} did not survive the swap`);
    }
  }

  assertRoles(variant.slug, out);

  /*
    A `<` that cannot open a tag.

    Metric values are the trap: `24h → <1s` is what a person writes, and the
    browser reads it as the start of a `<1s` tag and swallows the rest of the card.
    The PDF then shows a metric with its number missing, which looks like a typo in
    a document whose whole job is to look precise. A digit can never begin a tag
    name, so this catches every such case without needing to know which values were
    meant to be markup.
  */
  const malformed = /<\s*\d/.exec(out);

  if (malformed !== null) {
    throw new Error(
      `[${variant.slug}] has an unescaped "<${out.slice(malformed.index + 1, malformed.index + 6)}" - the browser would read it as a tag`,
    );
  }

  if (out.includes("<title>") && !out.includes(variant.title)) {
    throw new Error(`[${variant.slug}] title was not applied`);
  }

  if (!out.includes(variant.headline)) {
    throw new Error(`[${variant.slug}] headline was not applied`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
