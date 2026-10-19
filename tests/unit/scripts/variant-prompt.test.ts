import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LAYOUT_RULES } from "../../../scripts/data/resume-layout-rules";

/**
 * The brief handed to another model has to be the contract, not a copy of it.
 *
 * `docs/variant-content-prompt.md` is generated from
 * `scripts/data/resume-layout-rules.ts`, the section order from the paginator and the
 * worked example from the Java variant's own content. That is what keeps it true
 * while it is *generated*.
 *
 * This is what keeps it true after someone edits the generated file by hand — which
 * is the only way a generated document ever goes wrong, and the reason generating it
 * is not on its own enough.
 */
describe("the variant content brief", () => {
  const path = join(process.cwd(), "docs", "variant-content-prompt.md");

  it("is generated, not written by hand", () => {
    /*
      The file says it is generated. If that sentence is gone, someone has treated it
      as a document to maintain by hand — and from here the numbers would be two
      copies of the truth, which is the thing this file exists to avoid.
    */
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("write-variant-prompt.ts");
  });

  it("carries every limit the build enforces", () => {
    const brief = readFileSync(path, "utf8");

    for (const rule of LAYOUT_RULES) {
      const label = rule.label.replace(/—/g, "-");

      expect(`${rule.id}: brief lists it`).toBe(`${rule.id}: brief lists it`);
      expect(brief.includes(`| ${label} |`)).toBe(true);
    }
  });

  it("states the same numbers the build enforces", () => {
    /*
      Parsed back out of the generated table rather than compared as a string, so a
      rule whose characters changed and whose line did not still has to be updated —
      and a number typed into the table that the code does not enforce fails here
      instead of being believed by whoever writes the next variant.
    */
    const brief = readFileSync(path, "utf8");

    for (const rule of LAYOUT_RULES) {
      const row = brief.split("\n").find((line) => line.startsWith(`| ${rule.label.replace(/—/g, "-")} |`));

      if (row === undefined) {
        throw new Error(`the brief has no row for ${rule.id}`);
      }

      const cells = row.split("|").map((cell) => cell.trim());

      expect(`${rule.id}: lines ${cells[2]}`).toBe(`${rule.id}: lines **${rule.maxLines}**`);
      expect(`${rule.id}: chars ${cells[3]}`).toBe(`${rule.id}: chars **${rule.maxChars}**`);
    }
  });

  it("names the rule that does not move", () => {
    /*
      The one sentence that decides everything else. A brief that lost it would let a
      model shrink the type to fit, which is the failure this whole contract was
      built to prevent.
    */
    const brief = readFileSync(path, "utf8");

    expect(brief).toContain("A tipografia é fixa. O conteúdo é a variável.");
    expect(brief).toContain("Diminuir a tipografia para caber");
  });

  it("separates what a writer changes from what is fixed", () => {
    /*
      The other thing a model gets wrong: writing content it was not asked to write.
      A brief that lists only the editable parts leaves the contact details and the
      dates looking like fair game.
    */
    const brief = readFileSync(path, "utf8");

    expect(brief).toContain("### Você escreve");
    expect(brief).toContain("### Não se mexe");
    expect(brief).toContain("Localização, Email, WhatsApp, LinkedIn, Git, Portfólio");
  });

  it("tells the writer which half of a role is theirs", () => {
    /*
      This changed once and the brief is what makes it stick. The role, company, dates
      and tenure are one set across five documents - they are facts, and a variant
      that rewrote its own role block would make a fifth place for a date to go
      stale. The stack line and the bullets are the argument, and each variant has to
      be allowed to make its own: a document naming Node under the name and crediting
      Spring Boot through its experience reads as carelessness.

      A brief that put the whole role on either side of that line would be wrong in
      whichever direction a model happened to read it, so both halves are stated.
    */
    const brief = readFileSync(path, "utf8");

    expect(brief).toContain("A stack e os bullets de cada uma das cinco vagas");
    expect(brief).toContain("As datas, as tenures, os títulos dos cargos e os nomes das empresas");
    expect(brief).toContain("Quantos bullets cada vaga tem");
    expect(brief).toContain("tudo-ou-nada");
  });

  it("names every refusal, so a model knows what it is aiming at", () => {
    /*
      Each of these has already failed a build. The three about roles came with the
      per-variant stacks and are the ones a model would otherwise discover from an
      error message instead of from the brief.
    */
    const brief = readFileSync(path, "utf8");

    for (const refusal of [
      "declara só três das cinco vagas",
      "número de bullets que não bate",
      "stack numa vaga que não tem linha de stack",
      "Uma linha a mais",
      "Transbordo horizontal",
      "Uma regra sem elemento",
    ]) {
      expect(`${refusal}: ${brief.includes(refusal)}`).toBe(`${refusal}: true`);
    }
  });
  it("carries the worked example from the Java variant, not a copy of it", () => {
    /*
      If the Java variant's inventory changes and the brief still shows the old one,
      the next variant is written against a stale example — which is how a document
      full of accurate numbers starts teaching the wrong content.
    */
    const brief = readFileSync(path, "utf8");

    expect(brief).toContain("Java + Angular");
    expect(brief).toContain("unindo quase 8 anos");
    expect(brief).toContain("Angular (8 ao 22)");
  });
});