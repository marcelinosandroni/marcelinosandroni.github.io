import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { articlesEnUS, articlesPtBR } from "@/infrastructure/content/blog";
import type { BlogArticle } from "@/domain/blog";

/**
 * Guards the Supabase seed against drift from the versioned catalogs.
 *
 * `src/infrastructure/content/blog/articles-*.ts` is the source of truth: it is
 * both the build-time fallback and the seed. The SQL in the migration is a
 * hand-maintained mirror of those files, and a mirror nobody checks drifts in
 * ways no type checker can see:
 *
 *  - copy edited in the catalog and not in the SQL, so the database serves the
 *    old text to anyone reading the blog through Supabase;
 *  - a locale row missing entirely, so the article exists in one language only;
 *  - a duplicated `id`, which is the primary key and makes the whole INSERT fail;
 *  - single quotes escaped shell-style (`'"'"'`) instead of SQL-style (`''`),
 *    which corrupts the body JSON without failing the statement.
 *
 * The durable fix is regenerating the block with `npm run generate:blog-seed`;
 * this test is what tells you it is needed.
 */

const MIGRATION = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260928000100_blog_articles.sql",
);

const seed = readFileSync(MIGRATION, "utf8");

/** The `insert ... values ... on conflict` block, without the DDL above it. */
const seedBlock = seed.slice(seed.indexOf("insert into public.blog_articles ("));

/** Reverses the SQL literal quoting so the value can be compared to the catalog. */
function unquote(literal: string): string {
  const inner = literal.slice(1, -1);
  return inner.replace(/''/g, "'");
}

describe("blog seed", () => {
  const articles: BlogArticle[] = [...articlesPtBR, ...articlesEnUS];

  it("is generated from the catalogs, not hand-edited", () => {
    expect(seedBlock, "run `npm run generate:blog-seed`").toContain(
      "on conflict (locale, slug) do update",
    );
    // Shell-style escaping never belongs in a SQL literal.
    expect(seedBlock).not.toContain(`'"'"'`);
  });

  it("carries one row per (article, locale)", () => {
    // Read the rows back out of the SQL rather than counting substrings: a slug
    // legitimately appears once per locale, so only the row tuple identifies a row.
    const rows = [...seedBlock.matchAll(/^ {4}'([0-9a-f-]{36})',\r?\n {4}'([^']+)',\r?\n {4}'([^']+)',/gm)]
      .map((match) => `${match[1]}|${match[2]}|${match[3]}`)
      .sort();

    const expected = articles
      .map((article) => `${article.id}|${article.locale}|${article.slug}`)
      .sort();

    expect(rows).toEqual(expected);
  });

  it("uses a unique id for every row, because id is the primary key", () => {
    const ids = [...seedBlock.matchAll(/^ {4}'([0-9a-f-]{36})',$/gm)].map((match) => match[1]);

    expect(ids).toHaveLength(articles.length);
    expect(new Set(ids).size, "duplicate id in the seed").toBe(ids.length);
  });

  it("quotes every title exactly as the catalog spells it", () => {
    for (const article of articles) {
      expect(seedBlock, `title ${article.locale}/${article.slug}`).toContain(
        `'${article.title.replace(/'/g, "''")}',`,
      );
    }
  });

  it("stores the body as the same JSON the catalog renders", () => {
    for (const article of articles) {
      const expected = JSON.stringify(article.body).replace(/'/g, "''");
      expect(seedBlock, `body ${article.locale}/${article.slug}`).toContain(expected);
    }
  });

  it("keeps single quotes intact instead of mangling them", () => {
    // The accounting essay quotes a phrase; a shell-escaped seed would store `"`.
    const quoted = articlesPtBR.find((article) => JSON.stringify(article.body).includes("'"));
    expect(quoted, "expected an article body containing a single quote").toBeDefined();

    const expected = JSON.stringify(quoted?.body).replace(/'/g, "''");
    expect(seedBlock).toContain(expected);
    expect(unquote(`'${expected}'`)).toBe(JSON.stringify(quoted?.body));
  });
});
