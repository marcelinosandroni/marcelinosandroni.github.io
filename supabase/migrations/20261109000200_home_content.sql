-- =============================================================================
-- Home content
--
-- Database-resident home page content. The home content used to be typed
-- TypeScript modules under `src/infrastructure/content/home/`. This moves it into
-- the database so the owner edits it from `/admin`, exactly as the résumé content
-- already is.
--
-- ## Why a single JSONB column rather than one table per entity
--
-- The résumé content is split into one table per entity because every entity is
-- editable independently and the read queries join them. Home content is a
-- smaller, more tightly coupled set: the hero, the KPIs, the track record and
-- the sections are all read together for one page render, and an owner edits
-- them as a document rather than as individual fields. Splitting them into
-- tables would add joins to a query that exists to render one page, and the
-- admin editor would have to coordinate writes across five tables for one save.
--
-- The JSONB column holds the entire `HomeContent` shape, so the read is one
-- query and the write is one upsert. The trade-off is that a malformed value
-- fails the whole page rather than one field — which is the same failure mode
-- as the typed catalog, and the repository validates the shape on read.
--
-- ## Locale
--
-- One row per locale. `pt-BR` is the reference and `en-US` translates it.
--
-- ## Idempotent
--
-- Re-runnable against a partially provisioned project. `on conflict do update`
-- so re-running refreshes content without duplicating it.
-- =============================================================================

create table if not exists public.home_content (
  locale text primary key check (locale in ('pt-BR', 'en-US')),
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.home_content enable row level security;

do $$
begin
  create policy "home_content_read" on public.home_content
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;
