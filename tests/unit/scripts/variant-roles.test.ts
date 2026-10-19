import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { variants } from "../../../scripts/data/stack-variants.pt-br";
import {
  replaceVariantRoles,
  roleKeys,
  type RoleContent,
} from "../../../scripts/data/variant-roles";

/** One block, as the shell has it: whether it carries a stack, and how many bullets. */
const BLOCKS: ReadonlyArray<{ key: string; stack: string | null; bullets: number }> = [
  { key: "dgt", stack: "Node.js", bullets: 3 },
  { key: "bnp-paribas", stack: "Go", bullets: 3 },
  { key: "itau", stack: "NestJS", bullets: 3 },
  { key: "zup", stack: "Node.js", bullets: 2 },
  { key: "consultoria", stack: null, bullets: 1 },
];

/** Character budgets, from `scripts/data/resume-layout-rules.ts`. */
const STACK_CHARS = 112;
const BULLET_CHARS = 300;

/**
 * An assertion that names itself when it fails.
 *
 * A bare `expect(found).toBe(true)` over a loop of eighteen bullets fails eighteen
 * times saying `expected false to be true`, which names none of them. Putting the
 * value on both sides makes the message say which one.
 */
function check(what: string, value: boolean): void {
  expect(`${what}: ${value}`).toBe(`${what}: true`);
}

/**
 * The guards that let a variant own the text of the experience.
 *
 * Each exists because of a specific way the mechanism fails quietly, and each is made
 * to fire here on purpose. A guard nobody has ever seen fire is a comment: these only
 * run on broken input, and the build script that calls them executes on import, so
 * this is the only place they can be exercised at all.
 */
describe("a variant's own stacks and bullets", () => {
  const shell = readFileSync(join(process.cwd(), "resume-shell.html"), "utf8");

  const role = (key: string, stack: string | null, bullets: number): RoleContent => ({
    key,
    stack,
    bullets: Array.from({ length: bullets }, (_, index) => [
      `Rótulo ${key} ${index}`,
      `Frase ${key} ${index}.`,
    ] as const),
  });

  const all = (
    overrides: Readonly<Record<string, { stack?: string | null; bullets?: number }>> = {},
  ): ReadonlyArray<RoleContent> =>
    BLOCKS.map((block) => {
      const override = overrides[block.key];

      return role(
        block.key,
        override === undefined || override.stack === undefined ? block.stack : override.stack,
        override?.bullets ?? block.bullets,
      );
    });

  /** One role block's own markup, which is what proves a replacement stayed local. */
  const blockOf = (html: string, key: string): string => {
    const start = html.indexOf(`data-role="${key}"`);

    return html.slice(start, html.indexOf("\n        </div>", start));
  };

  describe("what it replaces", () => {
    it("leaves the document alone for a variant that declares nothing", () => {
      /*
        The opt-in. A variant that does not own its stacks and bullets inherits the
        shell's whole, and the caller spells that `variant.roles ?? []` - so without
        this the all-or-nothing guard reads it as a variant that declared none of the
        five roles and therefore left all five arguing for the other stack. That is a
        real error, and it is the exact opposite of what the empty list means.
      */
      check(
        "a variant with no roles is returned unchanged",
        replaceVariantRoles(shell, [], "test") === shell,
      );
    });

    it("writes every role's stack and every bullet onto the page", () => {
      const out = replaceVariantRoles(shell, all(), "test");

      for (const content of all()) {
        if (content.stack !== null) {
          check(
            `${content.key}: its stack is on the page`,
            out.includes(`<strong>Stack:</strong> ${content.stack}<`),
          );
        }

        for (const [label] of content.bullets) {
          check(
            `${content.key}: "${label}" is on the page`,
            out.includes(`<strong>${label}:</strong>`),
          );
        }
      }
    });

    it("leaves the role itself alone", () => {
      /*
        The reason this replaces rather than supplies. Titles, companies, dates and
        tenures are facts and there is one of each in the project; a variant writing
        its own role markup would make a fifth place for a date to go stale.
      */
      const out = replaceVariantRoles(shell, all(), "test");

      for (const fact of [
        "Out/2025 – Set/2026",
        "Dez/2022 – Set/2025",
        "Jul/2020 – Nov/2022",
        "Mar/2019 – Jun/2020",
        "Jul/2003 – Dez/2018",
        "(1 ano) ·",
        "(2 anos e 10 meses) ·",
        "| DGT",
        "| BNP Paribas",
        "| ITAÚ",
        "| ZUP",
      ]) {
        check(`"${fact}" survives the swap`, out.includes(fact));
      }
    });

    it("removes the shell's text rather than adding beside it", () => {
      /*
        An append is the failure being checked. The general résumé's stack would still
        sit on the page under the variant's own, so the role would credit both stacks
        at once and read as two documents stapled together.
      */
      const out = replaceVariantRoles(shell, all(), "test");

      for (const leftover of [
        "Java, Spring Boot, Spring AI",
        "tuning de JVM",
        "COBOL, VB)",
        "RxJS/NgRx",
      ]) {
        check(`"${leftover}" is gone`, !out.includes(leftover));
      }
    });

    it("leaves a role the document gives no stack line with no stack line", () => {
      /*
        The accounting role is not an engineering job, so the document gives it no
        stack, and a variant handing it one would be asserting a stack for a
        profession that never had one.
      */
      const block = blockOf(replaceVariantRoles(shell, all(), "test"), "consultoria");

      check("consultoria has no stack line", !block.includes('data-rule="stack"'));
    });
  });

  describe("the guards", () => {
    it("refuses a variant that declares only some of the roles", () => {
      /*
        The one failure no downstream check can see. The layout contract measures each
        stack line and each bullet on its own terms and finds nothing wrong with a
        document arguing for Node in three roles and Spring in the fourth - both
        halves are individually legal. Only a declaration that stops early is wrong.
      */
      expect(() => replaceVariantRoles(shell, all().slice(0, 3), "test")).toThrow(
        /left zup, consultoria with the general résumé's text/,
      );
    });

    it("refuses a key the document does not have", () => {
      expect(() =>
        replaceVariantRoles(shell, [...all(), role("bradesco", "Java", 1)], "test"),
      ).toThrow(/names a role the document does not have: bradesco/);
    });

    it("refuses a role whose bullet count disagrees with the document's", () => {
      /*
        The gradient - three, three, three, two, one - is what makes page two
        scannable. A variant free to add a fourth bullet to the accounting role would
        be choosing the page count from a field whose name says nothing about pages.
      */
      expect(() => replaceVariantRoles(shell, all({ zup: { bullets: 3 } }), "test")).toThrow(
        /"zup" has 2 bullet\(s\) in the document and 3 in the variant/,
      );
    });

    it("refuses a stack for a role the document gives no stack line", () => {
      expect(() =>
        replaceVariantRoles(shell, all({ consultoria: { stack: "Excel" } }), "test"),
      ).toThrow(/has a stack, but the role in the document carries no stack line/);
    });

    it("refuses a shell whose role blocks carry no key at all", () => {
      /*
        The no-op indistinguishable from success. Without this, removing the hook from
        the shell would leave every variant shipping the general résumé's experience
        while the build reported four documents written and a contract passed.
      */
      const stripped = shell.replace(/ data-role="[a-z-]+"/g, "");

      expect(() => replaceVariantRoles(stripped, all(), "test")).toThrow(
        /no role blocks carry data-role/,
      );
    });

    it("refuses markup it can no longer find, rather than passing", () => {
      /*
        `String.replace` returns its input unchanged when the pattern misses, which at
        the call site looks exactly like a substitution that worked. A renamed class
        is one commit away, and the document it would produce is the one this whole
        mechanism exists to prevent.
      */
      const renamed = shell.replace('class="stack-line"', 'class="stack"');

      expect(() => replaceVariantRoles(renamed, all(), "test")).toThrow(
        /could not find the stack line of "dgt"/,
      );
    });
  });

  describe("the variants that ship", () => {
    it("declares every role, or none of them", () => {
      const inDocument = JSON.stringify([...roleKeys(shell)].sort());

      for (const variant of variants) {
        if (variant.roles === undefined) {
          continue;
        }

        const declared = JSON.stringify(variant.roles.map((content) => content.key).sort());

        check(`${variant.slug} declares the document's roles exactly`, declared === inDocument);
      }
    });

    it("states a stack for every role the document gives one, and none where it does not", () => {
      /*
        Held against the document rather than against the variant's own list, so a
        variant cannot stop crediting a stack by dropping the key - the all-or-nothing
        guard catches that too, but only at build time and with a message about the
        wrong thing.
      */
      for (const variant of variants) {
        for (const content of variant.roles ?? []) {
          const hasStackLine = blockOf(shell, content.key).includes('data-rule="stack"');

          check(
            `${variant.slug}/${content.key} states a stack iff the role has one`,
            (content.stack !== null) === hasStackLine,
          );
        }
      }
    });

    it("keeps every stack line inside the document's one-line budget", () => {
      /*
        The early warning the contract describes, held here because the content is
        written by hand in a different tool from the one that would complain - and the
        complaint costs a full browser render of all five documents.
      */
      for (const variant of variants) {
        for (const content of variant.roles ?? []) {
          if (content.stack !== null) {
            check(
              `${variant.slug}/${content.key} stack is ${content.stack.length}/${STACK_CHARS} chars`,
              content.stack.length <= STACK_CHARS,
            );
          }
        }
      }
    });

    it("keeps every bullet inside the document's three-line budget", () => {
      for (const variant of variants) {
        for (const content of variant.roles ?? []) {
          for (const [label, body] of content.bullets) {
            /*
              Unescaped first. The contract counts the text a reader gets, and `&amp;`
              is one character on the page and five in the source.
            */
            const length = `${label.replace(/&amp;/g, "&")}: ${body.replace(/&amp;/g, "&")}`.length;

            check(
              `${variant.slug}/${content.key} "${label}" is ${length}/${BULLET_CHARS} chars`,
              length <= BULLET_CHARS,
            );
          }
        }
      }
    });
  });
});
