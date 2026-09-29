/**
 * Regenerates the blog seed INSERT from the versioned catalogs.
 *
 * The catalogs in `src/infrastructure/content/blog/articles-*.ts` are the source
 * of truth. The SQL in `supabase/migrations/*_blog_articles.sql` is a mirror of
 * them, and a hand-maintained mirror drifts: it picks up British spellings the
 * catalogs no longer use, and single quotes get mangled into `'"'"'` by shell
 * escaping habits, which silently corrupts the body JSON in the database.
 *
 * Run: npx tsx scripts/generate-blog-seed.ts
 */
import { articlesEnUS, articlesPtBR } from "../src/infrastructure/content/blog";
import type { BlogArticle } from "../src/domain/blog";

/** PostgreSQL escapes a single quote inside a string literal by doubling it. */
function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlArray(values: readonly string[]): string {
  return `array[${values.map(sqlText).join(", ")}]`;
}

function row(article: BlogArticle): string {
  return [
    "  (",
    `    ${sqlText(article.id)},`,
    `    ${sqlText(article.locale)},`,
    `    ${sqlText(article.slug)},`,
    `    ${sqlText(article.category)},`,
    `    ${sqlText(article.status)},`,
    `    ${sqlText(article.title)},`,
    `    ${sqlText(article.excerpt)},`,
    `    ${article.readingTimeMinutes},`,
    `    ${sqlText(article.publishedAt)},`,
    article.updatedAt === null ? "    null," : `    ${sqlText(article.updatedAt)},`,
    `    ${article.featured},`,
    `    ${sqlArray(article.tags)},`,
    `    ${sqlText(JSON.stringify(article.body))}::jsonb`,
    "  )",
  ].join("\n");
}

const articles = [...articlesPtBR, ...articlesEnUS];

const ids = articles.map((article) => article.id);
if (new Set(ids).size !== ids.length) {
  throw new Error(
    "Duplicate article id: `id` is the primary key of blog_articles and must be unique per row.",
  );
}

const block = [
  "insert into public.blog_articles (",
  "  id, locale, slug, category, status, title, excerpt,",
  "  reading_time_minutes, published_at, updated_at, featured, tags, body",
  ") values",
  articles.map(row).join(",\n"),
  "on conflict (locale, slug) do update",
  "set category = excluded.category,",
  "    status = excluded.status,",
  "    title = excluded.title,",
  "    excerpt = excluded.excerpt,",
  "    reading_time_minutes = excluded.reading_time_minutes,",
  "    published_at = excluded.published_at,",
  "    updated_at = excluded.updated_at,",
  "    featured = excluded.featured,",
  "    tags = excluded.tags,",
  "    body = excluded.body;",
].join("\n");

process.stdout.write(`${block}\n`);
