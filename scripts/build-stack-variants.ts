import { promises as fs } from "node:fs";
import { resolve } from "node:path";

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
 */
type SectionId = "summary" | "metrics" | "experienceA" | "experienceB" | "extras";

type Variant = {
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
   */
  readonly headline: string;
  /**
   * An optional section inserted after the experience, carrying the technical
   * skill inventory.
   *
   * Inserted rather than swapped, because the general résumé has no such section
   * and should not grow an empty heading to accommodate the variants that do. The
   * general one was once 55mm longer for exactly this block, and it was cut on
   * purpose: every role above already carries its own technology box, and a list
   * that repeats them is the part of a résumé a recruiter stops reading.
   *
   * A specialist document is the case where the trade goes the other way - the
   * reader arrived asking "does this person run Java in production", and an
   * inventory answers that faster than any paragraph. So it is allowed here, and
   * the page-count assertion decides whether it actually fits rather than anyone
   * guessing in advance.
   */
  readonly skills?: string;
  /**
   * Which page the inventory lands on.
   *
   * Not cosmetic. The two pages are separate fixed-height boxes, so an overflow on
   * one cannot borrow space from the other, and which side of the break a block
   * falls on decides whether the document fits at all. Measured: the same content
   * overflowed by 16mm with the inventory after the last role and fit with 47mm
   * to spare one block earlier, with nothing removed.
   *
   * So this is the knob that decides whether the page-count assertion passes, and
   * it is set per variant rather than globally because each one has a different
   * experience shape.
   */
  readonly skillsAfter?: "experienceA" | "experienceB";
  /**
   * The opening line of the summary. It leads with the specialisation because the
   * reader is here to find out whether this person fits one specific stack, and
   * the first sentence is what they read before deciding to read the rest.
   */
  readonly sections: Partial<Record<SectionId, string>>;
};

/**
 * Section headings, mapped to the id a variant fills.
 *
 * Matching on the heading text rather than on line numbers is what lets the shell
 * be edited freely: reformatting the document does not break the build, and a
 * renamed heading fails loudly instead of silently producing a variant with the
 * general résumé's summary still in it.
 */
const HEADINGS: ReadonlyArray<readonly [RegExp, SectionId]> = [
  [/<h3 class="section-title">Resumo Profissional<\/h3>/, "summary"],
  [/<h3 class="section-title">Principais Métricas de Impacto em Produção<\/h3>/, "metrics"],
  [/<h3 class="section-title">Experiência Profissional<\/h3>/, "experienceA"],
  [/<h3 class="section-title mt-0">Experiência Profissional \(Continuação\)<\/h3>/, "experienceB"],
  [
    /<h3 class="section-title">Informações Adicionais &amp; Perfil Profissional<\/h3>/,
    "extras",
  ],
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
  const shell = await fs.readFile(resolve("resume-recruiter-pt-br.html"), "utf8");
  const variants = await loadVariants();

  for (const variant of variants) {
    const out = render(shell, variant);
    assertComplete(variant, out);

    const target = `resume-recruiter-pt-br-${variant.slug}.html`;
    await fs.writeFile(resolve(target), out, "utf8");
    console.log(`wrote ${target} (${out.length} chars)`);
  }
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
    const replacement = variant.sections[id];

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

  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${variant.title}</title>`);

  /*
    The headline under the name, matched by its classes rather than by its text.

    The general document's headline is the one thing that must not survive into a
    variant: a document that calls itself "Engenheiro de Software & IA" while
    arguing for Java is making two claims at once, and the broader one is the one
    that does not help the reader choose.
  */
  const headline = /<h2 class="[^"]*">[\s\S]*?<\/h2>/.exec(out);

  if (headline === null || headline.index === undefined) {
    throw new Error(`[${variant.slug}] headline not found`);
  }

  out =
    out.slice(0, headline.index) +
    `<h2 class="text-base font-bold text-slate-700 mt-1 mb-3">${variant.headline}</h2>` +
    out.slice(headline.index + headline[0].length);

  if (variant.skills !== undefined) {
    out = insertSkills(out, variant.skills, variant.slug, variant.skillsAfter ?? "experienceB");
  }

  return out;
}

/**
 * Inserts the technical inventory after the chosen experience section.
 *
 * Anchored to the *end* of a section, so the inventory reads as a summary of the
 * roles above it rather than interrupting them.
 */
function insertSkills(
  html: string,
  skills: string,
  slug: string,
  after: "experienceA" | "experienceB",
): string {
  const headings: Record<typeof after, RegExp> = {
    experienceA: /<h3 class="section-title">Experiência Profissional<\/h3>/,
    experienceB: /<h3 class="section-title mt-0">Experiência Profissional \(Continuação\)<\/h3>/,
  };

  const heading = headings[after].exec(html);

  if (heading === null || heading.index === undefined) {
    throw new Error(`[${slug}] ${after} anchor not found`);
  }

  const end = html.indexOf("</section>", heading.index);

  if (end === -1) {
    throw new Error(`[${slug}] ${after} section end not found`);
  }

  const at = end + "</section>".length;

  return (
    html.slice(0, at) +
    `

        <section class="mb-4 keep-together">
            <h3 class="section-title">Habilidades Técnicas &amp; Arquitetura de Software</h3>
${skills}
        </section>` +
    html.slice(at)
  );
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

  if (!out.includes("CLT R$ 8.000 / PJ R$ 12.000")) {
    throw new Error(`[${variant.slug}] lost the agreed compensation expectation`);
  }

  if (out.includes("Sênior")) {
    throw new Error(`[${variant.slug}] reintroduced a seniority prefix`);
  }

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