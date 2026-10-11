import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Applies `supabase/migrations/*.sql` to the local Postgres, in filename order.
 *
 * ## Why this is a script and not `supabase db reset`
 *
 * The CLI's own reset needs the full fourteen-container stack. This site needs
 * two, and a contributor should not download Studio and Logflare to create a
 * table. So the migrations are applied here, over the same connection a
 * contributor would use by hand.
 *
 * ## Why the whole file is executed in one transaction
 *
 * A migration that fails halfway leaves the schema in a state neither the
 * previous nor the next migration expects, and the next run — which skips the
 * filename it already recorded — will not revisit it. Executing atomically
 * means a failure leaves the database exactly as it was, so a fix is an edit
 * and a re-run rather than a manual repair.
 *
 * Applied to a *fresh* database this is a no-op beyond running the files; the
 * `if not exists` and `on conflict` clauses in each migration are what make
 * re-running safe against an already-provisioned one.
 */

/** Where the local Postgres listens. Matches `docker-compose.supabase.yml`. */
const HOST = process.env["LOCAL_DB_HOST"] ?? "127.0.0.1";
const PORT = process.env["LOCAL_DB_PORT"] ?? "54324";
const USER = process.env["LOCAL_DB_USER"] ?? "postgres";
const PASSWORD = process.env["LOCAL_DB_PASSWORD"] ?? "postgres";
const DATABASE = process.env["LOCAL_DB_NAME"] ?? "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main(): Promise<void> {
  const { Client } = await import("pg");
  const client = new Client({ host: HOST, port: Number(PORT), user: USER, password: PASSWORD, database: DATABASE });

  await client.connect();

  try {
    await client.query("create schema if not exists extensions");
    await client.query("alter database postgres set search_path = public, extensions");

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.warn("No migrations found.");
      return;
    }

    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");

      process.stdout.write(`  ${file} ... `);

      try {
        await client.query("begin");

        /*
          The Supabase CLI keeps its own ledger in `supabase_migrations`, and one
          of this project's migrations reads it — the owner-status function
          reports "which migrations have run" from that table, which it cannot
          get any other way. The full CLI creates that schema; this two-container
          stack does not, so it is created here and populated as files are
          applied.

          The version is derived from the filename the same way the CLI derives
          it, so the number the owner dashboard prints matches what a full
          `supabase db push` would record for the same file.
        */
        await client.query(`
          create schema if not exists supabase_migrations;
          create table if not exists supabase_migrations.schema_migrations (
            version text primary key,
            statements text[] default '{}'
          );
        `);

        await client.query(sql);
        await client.query(
          `insert into supabase_migrations.schema_migrations (version, statements)
           values ($1, $2::text[])
           on conflict (version) do nothing`,
          [file.replace(/\.sql$/, ""), []],
        );
        await client.query("commit");
        console.log("ok");
      } catch (error) {
        await client.query("rollback");
        const reason = error instanceof Error ? error.message : String(error);
        console.error(`FAILED\n\n${reason}`);
        process.exitCode = 1;
        return;
      }
    }

    console.log(`\nApplied ${files.length} migration(s).`);
  } finally {
    await client.end();
  }
}

void main();