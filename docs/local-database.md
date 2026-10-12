# Local database

Everything below runs on your machine. No Supabase account, no cloud project.

---

## Why not `supabase start`

This site talks to Postgres over **PostgREST** and nothing else. No storage, no
realtime, no edge functions, no Studio. `supabase start` boots fourteen
containers to provide those — several gigabytes of images for services no query
here touches.

So `docker-compose.supabase.yml` brings up the two that matter:

| Container | Why |
|---|---|
| `db` | Postgres 17 with the four Supabase roles (`anon`, `authenticated`, `authenticator`, `service_role`) already created by the image |
| `rest` | PostgREST — what `@supabase/supabase-js` speaks |

The REST API is exposed directly on **54321** rather than behind the CLI's API
gateway. Only this site talks to it, always from the server, so the gateway would
add a hop and a layer of JWT rewriting without changing a single query.

---

## Setup

```bash
npm run db:setup
```

Which is the four steps, in order:

```bash
npm run db:up       # start Postgres + PostgREST
npm run db:keys     # write local keys into .env.local
npm run db:migrate  # apply supabase/migrations/*.sql
npm run db:seed     # populate the résumé tables from the typed catalog
```

Then:

```bash
npm run dev
```

The site is at <http://localhost:3000>.

---

## The commands

| Command | What it does |
|---|---|
| `npm run db:up` | Start the containers |
| `npm run db:down` | Stop them, keep the data |
| `npm run db:reset` | Stop and **delete the volume** — a clean database |
| `npm run db:keys` | Write local keys into `.env.local` |
| `npm run db:migrate` | Apply every migration, in filename order |
| `npm run db:bootstrap` | Populate an **empty** résumé database from the typed catalog |
| `npm run db:setup` | All of the above, in order |

> Earlier drafts of this file called the last one `db:seed`. It was renamed
> because "seed" implies something you run repeatedly, and the distinction
> matters — see below.

---

## What the keys are

`npm run db:keys` generates a `anon` and a `service_role` JWT signed with the
secret in `docker-compose.supabase.yml`, and writes them to `.env.local`.

PostgREST validates the JWT on every request against that secret, so a key from
a hosted Supabase project is simply rejected by a local stack. The local keys
have to be signed with the *local* secret, which is why they are derived from
the same constant the stack uses rather than pasted in.

**These keys authenticate to nothing reachable from a network.** The secret they
are signed with is committed in `docker-compose.supabase.yml`, which is fine
precisely because the thing they authenticate to is a container on your machine.
Never point them at anything else.

`.env.local` is git-ignored. `.env` holds the hosted project's values, so a
deployment is unaffected by any of this.

---

## Why migrations are applied from the host

Not mounted into the container's entrypoint. An entrypoint script only runs
against an empty data directory, so editing a migration and restarting would
silently do nothing — the worst possible behaviour for a schema you are iterating
on.

`scripts/db-migrate.ts` also creates the `supabase_migrations.schema_migrations`
ledger that the CLI maintains, because one of this project's migrations reads it
(the owner-status function reports which migrations have run). The full CLI
creates that schema; this two-container stack does not.

Each file runs inside a transaction, so a failure leaves the database exactly as
it was and a fix is an edit plus a re-run rather than a manual repair.

---

## Migration vs bootstrap: they are not the same thing

This is the distinction that matters most, and getting it wrong is how content
disappears.

### A migration owns the schema. It never owns the rows.

A migration is applied to databases that **already hold content** — including
one you have been editing for months. So it may create, alter and index, and it
may not delete.

That is enforced, not merely intended:

```
tests/unit/publication/migration-safety.test.ts
```

fails the build if any migration contains `drop table`, `truncate`,
`delete from`, `drop column`, `drop schema` or `drop database`. A migration that
genuinely needs to remove rows has to say `ALLOW_DATA_LOSS` above the statement,
which turns "did you mean to do that?" from something a reviewer has to notice
into something a reviewer has to read. There is no such marker in the directory
today, and a test asserts that too.

The same test also requires every migration to be **re-runnable**: `create table`
and `create index` need `if not exists`, `create type` needs a guarded `do $$
… exception when duplicate_object … $$` block (Postgres has no `if not exists`
for types), and `create policy` needs a preceding `drop policy if exists`.

Run it twice and it is a no-op. Verified: `npm run db:migrate` against a
populated database applies all eight files and changes nothing.

### A bootstrap fills an empty database. Once.

`npm run db:bootstrap` reads the typed catalog and inserts the rows that are
missing. It uses `resolution=ignore-duplicates`, so:

- on an empty database it inserts everything
- on a populated database it inserts **nothing**
- it never overwrites a row

That last one is the point. It used to be an upsert with
`resolution=merge-duplicates`, which *overwrites on conflict* — so the owner
edits a job title in `/admin`, someone runs the bootstrap, and the old title is
back, silently, with a green exit code. A database you edit and a script that
overwrites it cannot both be true.

The output tells you which case you are in:

```
602 inserted, 0 already present (of 602 offered).   ← first run
0 inserted, 602 already present (of 602 offered).   ← every run after
```

A single counter would have reported the second as six hundred and two writes,
which is why there are two.

**Testimonials are never bootstrapped.** A testimonial is a named person saying
something true about working with the owner, and inventing one would be
fabricating a reference. The table ships empty and stays that way until you add
a real quote from `/admin`.

---

## The order, and why

```
migrate  →  schema only, always safe to re-run
bootstrap →  rows, only where absent, never destructive
```

Running them in the other order does nothing wrong — the bootstrap's inserts
would fail against a schema that does not exist yet — but running `migrate`
*after* you have been editing is the case worth being sure about, and it is
now.

---

## When the database is not running

The site does not break. `src/infrastructure/repositories/index.ts` is the
composition root: with Supabase unconfigured it uses the typed catalog directly;
when a query fails it opens a circuit breaker for 60 seconds and serves the
catalog for that period, so an outage costs one slow request rather than one per
visitor.

The résumé is the document of record, so this matters more here than for the
blog — which is why the log line says so:

```
[resume] Supabase unavailable for 60s; serving the versioned catalog. Reason: …
```

**A database edit that does not appear on the page is usually this.** Check the
dev server log first, and remember the page is cached: see below.

---

## Editing content

Pages are statically generated and regenerate at most hourly
(`export const revalidate = 3600`). An admin save calls `revalidatePath`, so an
edit made through `/admin` appears immediately.

A **direct** database edit does not trigger that. Either wait out the revalidate
window or restart the dev server, which discards the cache:

```bash
# Windows
Get-Process node | Stop-Process -Force
Remove-Item .next -Recurse -Force
npm run dev
```

This is the single most common reason "I changed the row and nothing happened".

---

## Inspecting

```bash
# psql straight into the database
docker exec -it marcelinosandronigithubio-db-1 psql -U supabase_admin -d postgres

# row counts
docker exec marcelinosandronigithubio-db-1 psql -U supabase_admin -d postgres -c \
  "select 'experiences' t, count(*) from resume_experience
   union all select 'case_studies', count(*) from resume_case_study
   union all select 'testimonials', count(*) from resume_testimonial;"
```

Host-side Postgres is on **54324** if you want a GUI client.

---

## RLS

Every résumé table grants `anon` and `authenticated` **read** and revokes
insert, update and delete. Writes go through the service key from the server.
There is no browser-side Supabase client in this codebase at all, so no key a
reader could hold would write anything — which is what the revoked grants mean
by construction rather than by convention.

---

## Known quirk

PostgREST here answers `PGRST125 Invalid path specified in request URL` for
`supabase-js` filtered selects, and `PGRST108 'contains' is not an embedded
resource` for a scalar enum array — including with `select=*` and with the
column named.

Both adapters (`supabase-resume-repository.ts`) and the seed script therefore
speak the HTTP API over `fetch` rather than going through the client, and the
surface membership test is applied in the adapter instead of in the query. This
was measured against the pinned version, not assumed.

If a future PostgREST supports both, the adapter is the only place to change.