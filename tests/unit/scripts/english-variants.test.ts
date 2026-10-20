import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { VARIANTS_EN } from "../../../scripts/data/stack-variants.en-us";
import { variants } from "../../../scripts/data/stack-variants.pt-br";

/**
 * The English variants are translations of the Portuguese ones, and the two have to
 * stay the same shape.
 *
 * The build already refuses a Portuguese sentence that survives into an English
 * document — that is the `LEFTOVERS` check, and it runs on every build. What it
 * cannot catch is the other direction: a variant that exists in Portuguese and is
 * *missing* from English, or one whose roles stopped lining up with the Portuguese
 * document's. Those produce a complete, correct, English document that is about a
 * different career, and nothing on the page says so.
 *
 * So this checks the two sets against each other, by slug.
 */
describe("the English variants mirror the Portuguese ones", () => {
  it("carries a variant for every Portuguese variant", () => {
    const ptSlugs = variants.map((variant) => variant.slug).sort();
    const enSlugs = VARIANTS_EN.map((variant) => variant.slug).sort();

    expect(enSlugs).toEqual(ptSlugs);
  });

  it("names every English variant's document after the same role", () => {
    /*
      The title is the first thing a recruiter reads and the filename is built from
      it. A variant whose English title names a different role than the Portuguese
      one is two documents claiming different jobs.
      */
    for (const en of VARIANTS_EN) {
      const pt = variants.find((variant) => variant.slug === en.slug);

      expect(`${en.slug}: pt-BR title: ${pt !== undefined}`).toBe(`${en.slug}: pt-BR title: true`,);

      if (pt === undefined) {
        continue;
      }

      /*
        The Portuguese title is "Marcelino Sandroni - Engenheiro <stack>" and the
        English one is "Marcelino Sandroni - <stack> Software Engineer". So the
        English title has to end with "Software Engineer" and carry the same stack.
      */
      expect(`${en.slug}: ends with Software Engineer: ${en.title.endsWith("Software Engineer")}`).toBe(`${en.slug}: ends with Software Engineer: true`,);
    }
  });

  it("declares roles for exactly the variants the Portuguese set declares them for", () => {
    /*
      The property that decides whether the shell's experience survives into the
      English document. `enterprise-java` declares none in both languages, because
      its experience is the shared one; the other four declare their own in both.
      */
    for (const en of VARIANTS_EN) {
      const pt = variants.find((variant) => variant.slug === en.slug);

      if (pt === undefined) {
        continue;
      }

      expect(`${en.slug}: declares roles iff the Portuguese one does: ${(en.roles === undefined) === (pt.roles === undefined)}`).toBe(`${en.slug}: declares roles iff the Portuguese one does: true`,);
    }
  });

  it("keeps the same five roles and the same bullet gradient in both languages", () => {
    /*
      The 3/3/3/2/1 gradient is what makes page two scannable, and it is the
      document's rather than the language's. A variant whose English roles drifted
      from the Portuguese ones would paginate differently for a reason that has
      nothing to do with translation.
      */
    const expected = ["dgt", "bnp-paribas", "itau", "zup", "consultoria"];

    for (const en of VARIANTS_EN) {
      if (en.roles === undefined) {
        continue;
      }

      const keys = en.roles.map((role) => role.key).sort();

      expect(`${en.slug}: role keys: ${JSON.stringify(keys) === JSON.stringify([...expected].sort())}`).toBe(`${en.slug}: role keys: ${JSON.stringify(keys) === JSON.stringify([...expected].sort())}`);

      const counts = en.roles.map((role) => role.bullets.length);

      expect(`${en.slug}: 3/3/3/2/1: ${JSON.stringify(counts) === JSON.stringify([3, 3, 3, 2, 1])}`).toBe(`${en.slug}: 3/3/3/2/1: ${JSON.stringify(counts) === JSON.stringify([3, 3, 3, 2, 1])}`);
    }
  });

  it("builds every English document free of reader-facing Portuguese", () => {
    /*
      The `LEFTOVERS` list inside `translateResumeToEnglish` is the build-time
      version of this, and it is the one that stops a build. This is the version that
      is committed, so it still holds when the build is not being run — which is when
      a generated document is most likely to be believed.

      Comments are stripped first. They are not reader-facing, and the stylesheet
      carries Portuguese comments in every document including the general one; a
      check that counted them would fail a correct document.
      */
    const leftovers = [
      "Engenheiro",
      "Sênior",
      "Pleno",
      "Gestão",
      "Liquidação",
      "Bacharelado",
      "Custódia",
      "Idiomas",
      "Formação",
      "Espanhol",
      "Remoto",
      "Híbrido",
    ];

    for (const en of VARIANTS_EN) {
      const path = join(process.cwd(), `resume-recruiter-en-us-${en.slug}.html`);

      expect(`${en.slug}: the built document exists: ${exists(path)}`).toBe(`${en.slug}: the built document exists: true`,);

      const body = readFileSync(path, "utf8").slice(0);
      const visible = body
        .slice(body.indexOf("<body"))
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

      for (const word of leftovers) {
        expect(`${en.slug}: no "${word}" in the visible text: ${!visible.includes(word)}`).toBe(`${en.slug}: no "${word}" in the visible text: true`,);
      }
    }
  });
});

function exists(path: string): boolean {
  try {
    readFileSync(path);

    return true;
  } catch {
    return false;
  }
}
