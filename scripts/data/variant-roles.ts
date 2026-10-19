/**
 * Swapping a variant's stack lines and bullets into the shared role blocks.
 *
 * ## Why this lives here rather than in the build script
 *
 * Because these four guards are the entire safety argument for letting a variant own
 * the text of the experience, and a guard inside a script that runs on import cannot
 * be tested - only the script can be executed, and the guards only fire on broken
 * input. So they fire on nothing, permanently, and the first person to find out is a
 * recruiter holding a document that credits two stacks at once.
 *
 * Nothing here executes on import. That is the whole reason it is a module.
 *
 * ## The division of ownership
 *
 * The role, the company, the dates and the tenure are facts, and they stay in the
 * shell: shared by all five documents, so there is one of each to keep true. The stack
 * line and the bullets are the argument, and each variant has to be allowed to make
 * its own - a document that names Node, Go and React under the name and then credits
 * Spring Boot through the middle of its experience reads as carelessness rather than
 * breadth, and that is the one thing these documents cannot afford.
 */

/** One role's stack line and bullets, as written for a particular stack. */
export type RoleContent = {
  /**
   * The `data-role` the shell puts on the block. Not the company name and not an
   * index: an index moves when a role is added, and a company name is text a variant
   * could edit into disagreeing with itself.
   */
  readonly key: string;
  /**
   * The stack line, or `null` where the role carries none.
   *
   * `null` rather than an omission, because the document - not the variant - decides
   * which roles have a stack line. The accounting role has none: a stack is what an
   * engineering job was, and that one was not. A variant that left the field out
   * would be indistinguishable from one that declared every role and gave this one a
   * stack, and the build would swap a stack line into a role that has no line to
   * hold it.
   */
  readonly stack: string | null;
  /** The bullets, as a bold label and the sentence that follows it. */
  readonly bullets: ReadonlyArray<readonly [string, string]>;
};

/**
 * The closing tag of a role block.
 *
 * Eight spaces of indentation, against the twelve inside it. Matching on the tag
 * alone would close a role at its stack line and leave the rest of the document
 * unreplaced - which is the same silent-partial-rewrite this module exists to make
 * impossible.
 */
const BLOCK_END = "\n        </div>";

/** The `data-role` keys of every role block, in document order. */
export function roleKeys(html: string): ReadonlyArray<string> {
  return [...html.matchAll(/data-role="([a-z-]+)"/g)].map((match) => match[1]);
}

/**
 * Rewrites each role's stack line and bullets, and leaves the role itself alone.
 *
 * Replaces rather than supplies: a variant that wrote its own role markup would turn
 * one change to the shell into five, and the fit measured for one document would say
 * nothing about the others - the page count would depend on which variant the author
 * happened to be thinking about. So the block stays the shell's and only the two
 * sentences inside it are swapped, which is what keeps `data-rule`, `keep-together`
 * and the layout contract measuring the same thing everywhere.
 */
export function replaceVariantRoles(
  html: string,
  roles: ReadonlyArray<RoleContent>,
  slug: string,
): string {
  /*
    No roles declared means the variant inherits the shell's experience whole.

    Checked here rather than left to the caller to skip the call, because the caller's
    version of this is `variant.roles ?? []`, and an empty list reaching the
    all-or-nothing guard below reads as a variant that declared none of the five roles
    and therefore left all five arguing for the other stack - which is a real error
    and the exact opposite of what it means here.
  */
  if (roles.length === 0) {
    return html;
  }

  assertRolesDeclared(html, roles, slug);

  let out = html;

  for (const role of roles) {
    const block = locateRole(out, slug, role.key);
    out = out.replace(block, applyRole(block, slug, role));
  }

  return out;
}

/** One role block, located by its hook and bounded by its own indentation. */
function locateRole(html: string, slug: string, key: string): string {
  const marker = html.indexOf(`data-role="${key}"`);

  if (marker === -1) {
    throw new Error(`[${slug}] no role block carries data-role="${key}"`);
  }

  const start = html.lastIndexOf("<div", marker);
  const end = html.indexOf(BLOCK_END, marker);

  if (start === -1 || end === -1) {
    throw new Error(`[${slug}] the block for "${key}" is not closed`);
  }

  return html.slice(start, end + BLOCK_END.length);
}

/** Swaps one role's stack line and bullet list for the variant's. */
function applyRole(block: string, slug: string, role: RoleContent): string {
  const hasStackLine = block.includes('data-rule="stack"');

  if ((role.stack !== null) !== hasStackLine) {
    throw new Error(
      `[${slug}] "${role.key}" ${
        role.stack === null
          ? "has no stack line to remove, because the role carries none"
          : "has a stack, but the role in the document carries no stack line"
      }`,
    );
  }

  let out = block;

  if (role.stack !== null) {
    out = swap(
      out,
      /(<div class="stack-line" data-rule="stack">)[\s\S]*?(<\/div>)/,
      `$1<strong>Stack:</strong> ${role.stack}$2`,
      slug,
      role,
      "stack line",
    );
  }

  const bullets = role.bullets
    .map(
      ([label, body]) =>
        `                    <li data-rule="bullet"><strong>${label}:</strong> ${body}</li>`,
    )
    .join("\n");

  return swap(
    out,
    /(<ul class="role-bullets">)[\s\S]*?(<\/ul>)/,
    `$1\n${bullets}\n                </ul>`,
    slug,
    role,
    "bullet list",
  );
}

/**
 * A substitution that matched nothing, said so.
 *
 * `String.replace` returns its input unchanged when the pattern does not match, and
 * that is indistinguishable at the call site from a substitution that did the right
 * thing. So one markup change to the shell - a renamed class, a wrapper div, a hook
 * moved onto a parent - would leave every variant shipping the general résumé's
 * experience while the build reported success. The document that came out would be
 * the one this module exists to prevent, produced by the module itself.
 *
 * The layout contract has the same property and the same defence, for the same
 * reason: a rule that matches no element is reported as missing rather than passing.
 */
function swap(
  block: string,
  pattern: RegExp,
  replacement: string,
  slug: string,
  role: RoleContent,
  what: string,
): string {
  if (!pattern.test(block)) {
    throw new Error(
      `[${slug}] could not find the ${what} of "${role.key}" - the markup in the ` +
        `shell no longer matches what this build knows how to replace.`,
    );
  }

  return block.replace(pattern, replacement);
}

/**
 * A variant that declares roles has to declare all of them.
 *
 * ## Why this is all-or-nothing
 *
 * The failure it prevents is a document that argues for Node in three of its four
 * roles and for Spring in the fourth - which is not a document that got the argument
 * wrong, it is one that never made it. And it cannot be caught downstream: the layout
 * contract measures each stack line and each bullet on its own terms and finds nothing
 * wrong with either. Only a declaration that stops where it should not is wrong, and
 * this is the only place that is visible.
 *
 * Deciding to opt in at all is the caller's: a variant that passes no roles inherits
 * the shell's text whole, which is what the variants written before this existed do.
 */
function assertRolesDeclared(
  html: string,
  roles: ReadonlyArray<RoleContent>,
  slug: string,
): void {
  const inDocument = roleKeys(html);

  if (inDocument.length === 0) {
    throw new Error(
      `[${slug}] no role blocks carry data-role, so nothing would be replaced and ` +
        `the variant's stacks and bullets would never reach the page.`,
    );
  }

  const declared = roles.map((role) => role.key);
  const unknown = declared.filter((key) => !inDocument.includes(key));

  if (unknown.length > 0) {
    throw new Error(
      `[${slug}] names a role the document does not have: ${unknown.join(", ")}. ` +
        `The document's roles are ${inDocument.join(", ")}.`,
    );
  }

  const missing = inDocument.filter((key) => !declared.includes(key));

  if (missing.length > 0) {
    throw new Error(
      `[${slug}] left ${missing.join(", ")} with the general résumé's text. ` +
        `Declaring roles is all-or-nothing: a variant that declares some of them ` +
        `ships half an experience arguing for one stack and half for another.`,
    );
  }

  for (const role of roles) {
    assertBulletCount(html, role, slug);
  }
}

/**
 * A role keeps the number of bullets the document gives it.
 *
 * The counts are a layout decision rather than a content one - the newest three roles
 * carry three bullets, the next two carry two, the oldest carries one - and that
 * gradient is what makes page two scannable. A variant free to add a fourth bullet to
 * the accounting role would be choosing the page count from a field whose name says
 * nothing about pagination.
 */
function assertBulletCount(
  html: string,
  role: RoleContent,
  slug: string,
): void {
  const block = locateRole(html, slug, role.key);
  const inDocument = [...block.matchAll(/data-rule="bullet"/g)].length;

  if (inDocument === 0) {
    throw new Error(`[${slug}] the block for "${role.key}" has no bullets to replace`);
  }

  if (role.bullets.length !== inDocument) {
    throw new Error(
      `[${slug}] "${role.key}" has ${inDocument} bullet(s) in the document and ` +
        `${role.bullets.length} in the variant. The bullet count is the document's, ` +
        `not the variant's - it is what decides how page two reads.`,
    );
  }
}
