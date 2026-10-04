-- =============================================================================
-- Owner database status
--
-- One function that answers "is the database connected, how old is it, and which
-- migrations have actually run", for the owner dashboard in `/admin`.
--
-- -----------------------------------------------------------------------------
-- WHY THIS IS A FUNCTION AND NOT A TABLE READ
-- -----------------------------------------------------------------------------
--
-- The obvious implementation is a query against `supabase_migrations.schema_migrations`
-- — the Supabase CLI's own ledger, which is the authoritative record of which
-- migrations ran. It cannot be read over PostgREST. Measured, not assumed:
--
--   supabase.schema("supabase_migrations").from("schema_migrations").select("version")
--     -> PGRST106 Invalid schema: supabase_migrations
--
-- PostgREST only serves schemas listed in the project's `db-schemas` setting, and
-- adding `supabase_migrations` to it would expose the CLI's own bookkeeping to
-- every anonymous key in existence. So the honest options are a schema the
-- platform controls, or a function — and a function is the one that can also
-- report the server version, which no table read can do.
--
-- -----------------------------------------------------------------------------
-- THE THREAT MODEL
-- -----------------------------------------------------------------------------
--
-- | Threat                                        | Control |
-- | --------------------------------------------- | ------- |
-- | An anonymous caller enumerates the schema     | `execute` is revoked from `public` and `anon`; the function returns a list of migration *names* and a version string, never data. There is no grant to `anon` at all, so there is nothing to revoke from them beyond the default. |
-- | A stranger who signed up calls it directly   | `execute` is revoked from `authenticated` as well. Supabase allows anyone to create an account by default, so `authenticated` is not a small audience. |
-- | The owner reads it without a session          | The server checks `getOwnerSession()` before it ever builds a client, exactly as it does for the CMS. The database never sees a request that did not pass. |
-- | `search_path` is attacker-controlled           | `set search_path = public` on the function, so it cannot be redirected at call time. |
-- | The claim is a lie when the database is down  | Every field is nullable and the function returns a row either way. The panel distinguishes "cannot reach" from "reached, and here is the answer", because collapsing them would report a healthy database whenever the network is up and a broken one whenever it is not. |
-- -----------------------------------------------------------------------------

create or replace function public.owner_database_status()
returns table (
  applied_count   bigint,
  latest_version  text,
  server_version  text,
  schema_version  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(max(version), ''),
    current_setting('server_version', true),
    (select extversion from pg_extension where extname = 'pgcrypto')
  from supabase_migrations.schema_migrations;
$$;

comment on function public.owner_database_status() is
  'Owner-only diagnostic: how many migrations have run, the newest, the Postgres version and the pgcrypto extension version. Called only from a server route that has already checked the owner session.';

-- Deny-all first, then grant nothing. The function defaults to `execute` for
-- `public` on creation, so a revoke is not optional here the way it is for a
-- table with no policy.
revoke execute on function public.owner_database_status() from public;
revoke execute on function public.owner_database_status() from anon;
revoke execute on function public.owner_database_status() from authenticated;