import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { paginate } from "./paginate-resume";
import { renderVariant, injectTimeline } from "./data/variant-render";
import { variants as PT_VARIANTS, TIMELINE as PT_TIMELINE } from "./data/stack-variants.br";
import { VARIANTS_EN } from "./data/stack-variants.en";
import { TIMELINE_EN, GENERAL_ONLY, translateResumeToEnglish } from "./build-english-resume";
import { convertHtmlToPdf } from "./html-to-pdf";

type Locale = "pt-br" | "en-us";

/**
 * `locale` is `null` when the caller did not ask for one, which means "every
 * language that has this slug" - see `localesFor`. It used to default to
 * `en-us`, so the documented `-- <slug>` invocation silently produced only the
 * English document of a variant that exists in both languages.
 */
function parseArgs(argv: string[]): { slug: string; locale: Locale | null; pdfOut?: string } {
  const positional: string[] = [];
  let locale: Locale | null = null;
  let pdfOut: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--locale" || arg === "-l") {
      const value = argv[++i];
      if (value === "pt-br" || value === "pt-BR" || value === "pt") locale = "pt-br";
      else if (value === "en-us" || value === "en-US" || value === "en") locale = "en-us";
      else throw new Error(`unknown locale: ${value}`);
    } else if (arg === "--en" || arg === "--english") {
      locale = "en-us";
    } else if (arg === "--pt" || arg === "--portuguese") {
      locale = "pt-br";
    } else if (arg === "--pdf" || arg === "--out") {
      pdfOut = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  return { slug: positional[0], locale, pdfOut };
}

function printUsage(): void {
  console.log(
    [
      "Usage: npm run resume:build:slug -- <slug> [--locale pt-br|en-us] [--pdf <output.pdf>]",
      "",
      "Generates the HTML for a resume variant (by slug) and then the PDF from it.",
      "Without --locale it builds every language that has the slug: a variant that",
      "exists in both writes the pt-BR and the en-US document, one after the other.",
      "",
      "Slugs (variants): enterprise-java, enterprise-java-react, enterprise-dotnet,",
      "                  enterprise-dotnet-react, modern-web, java-azure, java-ia, node-ia,",
      "                  python-ia, csharp-ia",
      "Special slug:     document (or 'general') — the general resume",
      "",
      "Examples:",
      "  npm run resume:build:slug -- enterprise-java              # pt-BR + en-US",
      "  npm run resume:build:slug -- modern-web --locale en-us",
      "  npm run resume:build:slug -- document --locale pt-br --pdf out.pdf",
    ].join("\n"),
  );
}

function isGeneral(slug: string): boolean {
  return slug === "document" || slug === "general" || slug === "geral";
}

/**
 * The languages this slug exists in, in the order the build writes them.
 *
 * A variant is written twice - `variants/<slug>-br.ts` and `<slug>-en.ts` - and
 * the two are separate documents, so asking for the slug without a language is
 * asking for both. A slug that only exists in one language is built once.
 */
function localesFor(slug: string): Locale[] {
  const locales: Locale[] = [];

  if (isGeneral(slug) || PT_VARIANTS.some((variant) => variant.slug === slug)) locales.push("pt-br");
  if (isGeneral(slug) || VARIANTS_EN.some((variant) => variant.slug === slug)) locales.push("en-us");

  return locales;
}

function pdfTargetFor(locale: Locale, slug: string): string {
  const localeTag = locale === "pt-br" ? "pt-BR" : "en-US";

  return isGeneral(slug)
    ? `public/artifacts/fixed/resume-fixed-${localeTag}.pdf`
    : `public/artifacts/fixed/resume-fixed-${localeTag}-${slug}.pdf`;
}

async function buildPtBr(slug: string): Promise<{ htmlPath: string; pdfInput: string }> {
  const shell = await fs.readFile(resolve("resume-shell.html"), "utf8");

  if (isGeneral(slug)) {
    // assertRoles handled lightly
    const withTimeline = injectTimeline(shell, PT_TIMELINE, "document");
    const { html } = await paginate(withTimeline, { slug: "document" });
    const target = "resume-recruiter-pt-br.html";
    await fs.writeFile(resolve(target), html, "utf8");
    console.log(`wrote ${target}`);
    return { htmlPath: target, pdfInput: target };
  }

  const variant = PT_VARIANTS.find((v) => v.slug === slug);
  if (!variant) {
    throw new Error(`unknown pt-br slug: ${slug}. Available: ${PT_VARIANTS.map((v) => v.slug).join(", ")}`);
  }

  const flat = renderVariant(shell, variant);
  // basic assertion: malformed tag
  const malformed = /<\s*\d/.exec(flat);
  if (malformed) throw new Error(`[${slug}] unescaped "<digit"`);

  const { html } = await paginate(flat, { slug: variant.slug });
  const target = `resume-recruiter-pt-br-${variant.slug}.html`;
  await fs.writeFile(resolve(target), html, "utf8");
  console.log(`wrote ${target}`);
  return { htmlPath: target, pdfInput: target };
}

async function buildEnUs(slug: string): Promise<{ htmlPath: string; pdfInput: string }> {
  const shell = await fs.readFile(resolve("resume-shell.html"), "utf8");

  if (isGeneral(slug)) {
    const source = await fs.readFile(resolve("resume-shell.html"), "utf8");
    const { html } = await translateResumeToEnglish(source, "en-US", {
      extraRules: GENERAL_ONLY,
      shellContent: "all",
    });
    const target = "resume-recruiter-en-us.html";
    await fs.writeFile(resolve(target), html, "utf8");
    console.log(`wrote ${target}`);
    return { htmlPath: target, pdfInput: target };
  }

  const variant = VARIANTS_EN.find((v) => v.slug === slug);
  if (!variant) {
    throw new Error(`unknown en-us slug: ${slug}. Available: ${VARIANTS_EN.map((v) => v.slug).join(", ")}`);
  }

  const flat = renderVariant(shell, { ...variant, timeline: TIMELINE_EN });
  const shellContent = variant.roles === undefined ? "experience" : "none";
  const { html } = await translateResumeToEnglish(flat, variant.slug, { shellContent });
  const target = `resume-recruiter-en-us-${variant.slug}.html`;
  await fs.writeFile(resolve(target), html, "utf8");
  console.log(`wrote ${target}`);
  return { htmlPath: target, pdfInput: target };
}

async function main(): Promise<void> {
  const { slug, locale, pdfOut } = parseArgs(process.argv.slice(2));
  const locales: Locale[] = locale === null ? localesFor(slug) : [locale];

  if (locales.length === 0) {
    const available = [...PT_VARIANTS.map((variant) => variant.slug), "document"].join(", ");
    throw new Error(`unknown slug: ${slug}. Available: ${available}`);
  }

  if (pdfOut !== undefined && locales.length > 1) {
    throw new Error(
      `--pdf needs --locale: ${slug} exists in ${locales.join(" and ")}, so a single output file is ambiguous.`,
    );
  }

  await fs.mkdir(resolve("public/artifacts/fixed"), { recursive: true });

  for (const current of locales) {
    const built = current === "pt-br" ? await buildPtBr(slug) : await buildEnUs(slug);
    const pdfTarget = pdfOut ?? pdfTargetFor(current, slug);

    await convertHtmlToPdf({
      input: resolve(built.pdfInput),
      output: resolve(pdfTarget),
    });

    console.log(`done: ${built.htmlPath} -> ${pdfTarget}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
