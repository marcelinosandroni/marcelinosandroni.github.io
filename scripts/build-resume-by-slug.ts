import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import { paginate } from "./paginate-resume";
import { renderVariant, injectTimeline } from "./data/variant-render";
import { variants as PT_VARIANTS, TIMELINE as PT_TIMELINE } from "./data/stack-variants.pt-br";
import { VARIANTS_EN } from "./data/stack-variants.en-us";
import { TIMELINE_EN, GENERAL_ONLY, translateResumeToEnglish } from "./build-english-resume";
import { convertHtmlToPdf } from "./html-to-pdf";

function parseArgs(argv: string[]): { slug: string; locale: "pt-br" | "en-us"; pdfOut?: string } {
  const positional: string[] = [];
  let locale: "pt-br" | "en-us" = "pt-br";
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
      "Generates the HTML for a single resume variant (by slug) and then the PDF from it.",
      "",
      "Slugs (variants): enterprise-java, enterprise-java-react, enterprise-dotnet,",
      "                  enterprise-dotnet-react, modern-web",
      "Special slug:     document (or 'general') — the general resume",
      "",
      "Examples:",
      "  npm run resume:build:slug -- enterprise-java",
      "  npm run resume:build:slug -- modern-web --locale en-us",
      "  npm run resume:build:slug -- document --pdf out.pdf",
    ].join("\n"),
  );
}

function isGeneral(slug: string): boolean {
  return slug === "document" || slug === "general" || slug === "geral";
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

  const built = locale === "pt-br" ? await buildPtBr(slug) : await buildEnUs(slug);

  const pdfTarget =
    pdfOut ??
    (locale === "pt-br"
      ? isGeneral(slug)
        ? "public/artifacts/fixed/resume-fixed-pt-BR.pdf"
        : `public/artifacts/fixed/resume-fixed-pt-BR-${slug}.pdf`
      : isGeneral(slug)
        ? "public/artifacts/fixed/resume-fixed-en-US.pdf"
        : `public/artifacts/fixed/resume-fixed-en-US-${slug}.pdf`);

  await fs.mkdir(resolve("public/artifacts/fixed"), { recursive: true });

  await convertHtmlToPdf({
    input: resolve(built.pdfInput),
    output: resolve(pdfTarget),
  });

  console.log(`done: ${built.htmlPath} -> ${pdfTarget}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
