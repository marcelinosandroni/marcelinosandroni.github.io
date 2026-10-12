import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guards the migrations against destroying data.
 *
 * ## The rule
 *
 * **A migration owns the schema. It never owns the rows.**
 *
 * A migration is applied to databases that already hold content, including one
 * the owner has been editing for months. `drop table`, `truncate` or an
 * unqualified `delete from` in a migration is therefore a data-loss event
 * waiting for the next person to run it — and the failure mode is not an error,
 * it is a résumé that quietly became empty.
 *
 * ## Why a test and not a convention
 *
 * Because the review that would catch it is the review of a *schema* change,
 * which is exactly the review where nobody is thinking about data. The diff looks
 * like `create table if not exists` and passes review, and the destructive
 * statement is three lines below it in a block someone skipped.
 *
 * So the rule is mechanical. A migration that needs to remove rows has to say
 * so explicitly and deliberately — `ALLOW_DATA_LOSS` above the statement — which
 * turns "did you mean to do that?" from something a reviewer has to notice into
 * something the reviewer has to read.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

function migrations(): Array<{ file: string; sql: string }> {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      sql: readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"),
    }));
}

/**
 * Strips comments and everything inside a dollar-quoted block.
 *
 * Two things have to go before scanning, and both for the same reason — a
 * migration that *explains* or *contains* the pattern would otherwise fail for
 * mentioning it, which trains the next author to leave the explanation out.
 *
 * 1. Comments. A note saying "this migration never truncates" is not a truncate.
 * 2. Dollar-quoted bodies. A `delete from` inside a plpgsql function is
 *    application logic that runs when somebody calls the function — and this
 *    project has two, because deleting a blog post has to delete its published
 *    row. Only a statement that executes *on every migration run* is the hazard
 *    this file is about.
 * 3. String literals. Not hypothetical: the blog migration seeds an article
 *    whose body is a ClickHouse migration example, and it contains the text
 *    `CREATE TABLE telemetry_events`. That is prose about a statement, not a
 *    statement, and a scan that cannot tell the difference will fail a file for
 *    containing an example.
 *
 * `do $$ ... $$` is stripped too, which is deliberate: a `do` block is the
 * documented way to write a conditional schema change, and its contents are
 * guarded by the `if not exists` they contain rather than by the scan.
 */
function code(sql: string): string {
  return sql
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\$[\w]*\$[\s\S]*?\$[\w]*\$/g, " ")
    // Doubled quotes are an escaped quote inside a literal, so the alternation
    // has to consume them together or the scan resumes mid-literal.
    .replace(/'(?:[^']|'')*'/g, "''");
}

describe("migrations never destroy data", () => {
  it("contains no destructive statement", () => {
    const offenders: string[] = [];

    for (const { file, sql } of migrations()) {
      const body = code(sql);

      for (const pattern of [
        /\bdrop\s+table\b/i,
        /\btruncate\b/i,
        /\bdelete\s+from\b/i,
        /\bdrop\s+column\b/i,
        /\bdrop\s+schema\b/i,
        /\bdrop\s+database\b/i,
      ]) {
        if (pattern.test(body)) {
          offenders.push(`${file}: ${String(pattern)}`);
        }
      }
    }

    expect(
      offenders,
      `These migrations remove data. A migration owns the schema, not the rows.\n` +
        `If the removal is genuinely intended, put ALLOW_DATA_LOSS in a comment\n` +
        `directly above it, which is what makes a reviewer read that line.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("carries no ALLOW_DATA_LOSS escape hatch", () => {
    /*
      The hatch exists so the rule above is enforceable rather than absolute —
      a destructive migration *can* be written, but it has to announce itself.
      There is none today, and this asserts that rather than assuming: a hatch
      nobody has used yet is one nobody has had to think about, and the day
      somebody does use it this fails and asks whether they still need it.
    */
    for (const { file, sql } of migrations()) {
      expect(sql, `${file} uses ALLOW_DATA_LOSS`).not.toContain("ALLOW_DATA_LOSS");
    }
  });
});

describe("the schema migrations are re-runnable", () => {
  /**
   * Applied to a *populated* database, so an idempotent statement is the whole
   * point: the second application has to be a no-op rather than an error or a
   * duplicate. Without these clauses a re-run — which is what happens whenever a
   * contributor works against a database that already has data — fails halfway
   * through the file.
   */
  it("guards every table and type it creates", () => {
    const missing: string[] = [];

    for (const { file, sql } of migrations()) {
      const body = code(sql);

      // Dollar-quoted blocks are already stripped, so what remains is the
      // top level: the statements that run on every application of the file.
      for (const match of body.matchAll(/\bcreate\s+(?:unlogged\s+)?table\s+(?!if\s+not\s+exists)([a-z_."]+)/gi)) {
        missing.push(`${file}: create table ${match[1] ?? ""}`);
      }

      for (const match of body.matchAll(/\bcreate\s+type\s+(?!if\s+not\s+exists)([a-z_."]+)/gi)) {
        missing.push(`${file}: create type ${match[1] ?? ""}`);
      }
    }

    expect(
      missing,
      `These are not re-runnable. A migration is applied to databases that already\n` +
        `have rows, so the second application must be a no-op.\n\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("drops a policy before recreating it", () => {
    /*
      Found by running the migrations twice, not by reading them: the type and
      table guards were already in place and the run still failed, on
      `policy "published resume versions are publicly readable" already exists`.
      A static check for `create policy` alone would have caught it sooner.
    */
    const unguarded: string[] = [];

    for (const { file, sql } of migrations()) {
      const body = code(sql);

      for (const match of body.matchAll(/\bcreate\s+policy\b/gi)) {
        const before = body.slice(Math.max(0, (match.index ?? 0) - 400), match.index ?? 0);

        if (!/drop\s+policy\s+if\s+exists/i.test(before)) {
          unguarded.push(`${file}: create policy at offset ${match.index ?? 0}`);
        }
      }
    }

    expect(
      unguarded,
      `A create policy with no preceding "drop policy if exists" makes the second\n` +
        `application fail on a database that already has one.\n\n${unguarded.join("\n")}`,
    ).toEqual([]);
  });

  it("guards every index it creates", () => {
    const unguarded: string[] = [];

    for (const { file, sql } of migrations()) {
      const body = code(sql);

      for (const match of body.matchAll(/\bcreate\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists)([a-z_."]+)/gi)) {
        unguarded.push(`${file}: create index ${match[1] ?? ""}`);
      }
    }

    expect(unguarded, `These indexes are not re-runnable.\n\n${unguarded.join("\n")}`).toEqual([]);
  });
});