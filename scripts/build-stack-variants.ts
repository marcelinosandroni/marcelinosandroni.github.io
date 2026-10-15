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
 * Phrases that identify the general résumé.
 *
 * Asserted absent from every variant. Not cosmetic: the summary and the
 * experience are where a leftover general phrase is least visible to the person
 * reading it and most visible to the recruiter - it is the one place where a
 * document can claim a specialisation it does not have.
 */
const GENERAL_MARKERS: ReadonlyArray<string> = [
  "Engenheiro Full Stack de verdade",
  "+R$ 500 Bi",
  "100M+ msgs/dia",
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

  return out;
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});