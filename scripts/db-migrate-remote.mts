import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

/*
 * Applies `supabase/migrations/*.sql` to a Supabase project, over the pooler.
 *
 * ## Why this exists alongside `db:migrate`
 *
 * `db:migrate` talks to the local two-container stack over a socket with no TLS
 * and fixed credentials. Production is a connection pooler that terminates TLS
 * with a certificate the client cannot chain to, addressed by a URL rather than
 * by host and port. Bolting a `--remote` flag onto the local script would mean
 * that script knows about both, and the flag on a command that writes to a
 * database is exactly the thing that should not exist.
 *
 * ## Why the caller supplies the URL
 *
 * So this script cannot choose a database. It has no default, no fallback and
 * no `.env` parsing: a script that can pick the wrong database and writes to
 * whatever it picked is a very bad script, and the only defence is making the
 * choice explicit at the call site.
 *
 * ## Why each migration is its own transaction
 *
 * The same contract as the local runner, and for the same reason. A migration
 * that fails halfway leaves a schema that no later run revisits, because the
 * ledger records the filename. Rolling back means the database is exactly as it
 * was, so the fix is an edit and a re-run.
 */
const url = process.env.DATABASE_URL;

if (url === undefined || url === "") {
  throw new Error("DATABASE_URL is required; this script will not guess a database");
}

const dryRun = process.argv.includes("--dry-run");

/*
 * The pooler's URL carries `sslmode=require`, and `pg` gives that query
 * parameter precedence over the `ssl` option — so the client verifies the
 * pooler's certificate chain and fails, even though this pooler terminates TLS
 * with a certificate the machine does not chain to. Stripping the parameter and
 * stating the policy in one place is what makes the connection behaviour
 * readable: `rejectUnauthorized: false` is a deliberate choice about the
 * pooler's certificate, not an oversight.
 */
const connection = new URL(url);

connection.searchParams.delete("sslmode");
connection.searchParams.delete("supa");

const client = new pg.Client({
  connectionString: connection.toString(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();

console.log(`target:   ${new URL(url).hostname}:${new URL(url).port || 5432}`);
console.log(`mode:     ${dryRun ? "DRY RUN — nothing will be written" : "apply"}`);

try {
  const files = readdirSync(join(process.cwd(), "supabase", "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  console.log(`pending:  ${files.length} migration file(s)\n`);

  let applied = 0;
  let failed = false;

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");

    await client.query(`
      create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (
        version text primary key,
        statements text[] default '{}'
      );
    `);

    const recorded = await client.query(
      "select 1 from supabase_migrations.schema_migrations where version = $1",
      [version],
    );

    if (recorded.rowCount !== null && recorded.rowCount > 0) {
      console.log(`  skip   ${file} (already recorded)`);
      continue;
    }

    if (dryRun) {
      console.log(`  would  ${file}`);
      continue;
    }

    process.stdout.write(`  apply  ${file} ... `);

    try {
      await client.query("begin");

      await client.query(readFileSync(join(process.cwd(), "supabase", "migrations", file), "utf8"));
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, statements)
         values ($1, $2::text[])
         on conflict (version) do nothing`,
        [version, []],
      );

      await client.query("commit");
      console.log("ok");
      applied += 1;
    } catch (error) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`\n${error instanceof Error ? error.message : String(error)}`);
      console.error("\nRolled back. The database is unchanged.");

      // Stop here rather than continuing: every later migration assumes the
      // earlier one applied, so carrying on after a failure would produce a
      // second error that describes the first one's consequences.
      process.exitCode = 1;
      failed = true;
      break;
    }
  }

  console.log(
    failed
      ? "\nStopped at the first failure."
      : `\n${dryRun ? "would apply" : "applied"} ${applied} migration(s).`,
  );
} finally {
  await client.end();
}