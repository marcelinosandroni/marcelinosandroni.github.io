import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BODY_PX,
  CONTACT_PX,
  LAYOUT_RULES,
  type LayoutRule,
} from "../../../scripts/data/resume-layout-rules";

/**
 * The documented contract and the enforced one must be the same contract.
 *
 * The table in `docs/pdf-layout-contract.md` exists so that a person writing a
 * summary or a stack line knows the budget without running anything. That is only
 * worth anything if the numbers in it are the numbers the build uses — and a
 * document that drifts is worse than no document, because it is believed.
 *
 * So the table is parsed out of the prose and compared. A rule enforced but not
 * written down fails here, and so does a number changed in one place and not the
 * other.
 */
describe("the documented layout contract", () => {
  const doc = readFileSync(join(process.cwd(), "docs", "pdf-layout-contract.md"), "utf8");

  /*
    Parsed out of the table rather than restated. A second copy of the numbers in
    this file would be the same failure one file further from the code, and the
    failure it guards against is exactly the one where two copies disagree.

    Row shape: `| Part | lines | chars | typography | used |`. Labels are compared
    with the em dash normalised, because the prose writes "Métrica — valor" where
    the code writes "Métrica - valor" and the two are the same row.
  */
  const documented = new Map<string, { lines: number; chars: number }>();

  for (const line of doc.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());

    if (cells.length < 6 || !cells[0]!.startsWith("")) {
      continue;
    }

    const lines = Number(cells[2]);
    const chars = Number(cells[3]);

    if (Number.isFinite(lines) && Number.isFinite(chars)) {
      documented.set(cells[1]!.replace(/—/g, "-").trim(), { lines, chars });
    }
  }

  const key = (rule: LayoutRule): string => rule.label.replace(/—/g, "-");

  it("documents exactly the rules the build enforces", () => {
    const enforced = LAYOUT_RULES.map(key).sort();
    const written = [...documented.keys()].sort();

    /*
      Both directions. A rule the build enforces and nobody wrote down is a budget
      with no owner; a row promising a limit the build does not enforce is a
      promise the build does not keep, and it is the one a writer would trust.
    */
    expect(`documented: ${written.join(" | ")}`).toBe(`documented: ${enforced.join(" | ")}`);
  });

  it("agrees with the enforced limits on every row", () => {
    for (const rule of LAYOUT_RULES) {
      const row = documented.get(key(rule));

      if (row === undefined) {
        throw new Error(`no documented row for ${rule.id}`);
      }

      expect(`${rule.id}: lines ${row.lines}`).toBe(`${rule.id}: lines ${rule.maxLines}`);
      expect(`${rule.id}: chars ${row.chars}`).toBe(`${rule.id}: chars ${rule.maxChars}`);
    }
  });

  it("states the body size the document is actually set at", () => {
    /*
      The one number every character budget in the project was calibrated against.
      If it moves, every budget moves with it — so it is named in the prose, and
      this is what stops the two from drifting apart quietly.
    */
    expect(`body ${BODY_PX}`).toBe("body 12.5");
    expect(`contact ${CONTACT_PX}`).toBe("contact 11");
    expect(doc).toContain("12.5px");
    expect(doc).toContain("11px");
  });

  it("names both sanctioned reductions and claims no others", () => {
    /*
      The document says the body is one size and then lists two elements that are
      not it. That is the only honest way to write it — but only while it stays
      true, so the pair is asserted rather than trusted.
    */
    expect(doc).toContain("os dois únicos");
    expect(doc).toContain("Contacto — 11px");
    expect(doc).toContain("Legenda das métricas — 9px");
  });
});