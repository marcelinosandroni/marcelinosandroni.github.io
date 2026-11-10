-- =============================================================================
-- Cheatsheet (SRE + AI Engineer)
--
-- Database-resident cheatsheet content. The cheatsheet used to be a typed
-- TypeScript module under `src/infrastructure/content/cheatsheet/`. This moves
-- it into the database so the owner edits it from `/admin`, exactly as the
-- résumé content already is.
--
-- ## Shape
--
-- A category groups related terms. A term has a name, a brief definition and
-- an optional example. Categories and terms are ordered explicitly.
--
-- ## Locale
--
-- One set of rows per locale. `pt-BR` is the reference and `en-US` translates
-- it, mirroring the catalog convention.
--
-- ## Idempotent
--
-- Re-runnable against a partially provisioned project. `on conflict do update`
-- so re-running refreshes content without duplicating it.
-- =============================================================================

create table if not exists public.cheatsheet_category (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (length(btrim(slug)) > 0),
  title text not null check (length(btrim(title)) > 0),
  icon text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists cheatsheet_category_locale_idx
  on public.cheatsheet_category (locale, sort_order);

create table if not exists public.cheatsheet_term (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.cheatsheet_category(id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  term text not null check (length(btrim(term)) > 0),
  definition text not null check (length(btrim(definition)) > 0),
  example text not null default '',
  sort_order integer not null default 0
);

create index if not exists cheatsheet_term_category_idx
  on public.cheatsheet_term (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS: same policy as resume_experience. Publishable key reads, secret key writes.
-- ---------------------------------------------------------------------------

alter table public.cheatsheet_category enable row level security;
alter table public.cheatsheet_term enable row level security;

do $$
begin
  create policy "cheatsheet_category_read" on public.cheatsheet_category
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "cheatsheet_term_read" on public.cheatsheet_term
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;
