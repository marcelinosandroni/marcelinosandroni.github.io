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
| `npm run db:seed` | Populate résumé tables from `src/infrastructure/content` |
| `npm run db:setup` | All of the above, in order |

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

## Why the seed is a script

The typed catalog in `src/infrastructure/content/` is the build-time fallback
*and* the source of truth for what the database rows must contain. Generating the
rows from it — rather than pasting five thousand lines of SQL into a migration —
means the two cannot drift: the database is populated from the same objects the
fallback serves, so "the database says X" and "the fallback says X" are the same
statement.

It is re-runnable. Every write upserts on its natural key, so a second run
refreshes content rather than duplicating it.

**Testimonials are not seeded.** A testimonial is a named person saying
something true about working with the owner, and inventing one would be
fabricating a reference. The table ships empty and stays that way until you add
a real quote from `/admin`.

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