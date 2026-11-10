-- =============================================================================
-- Cheatsheet tags
--
-- Tags for cheatsheet terms. A term can have multiple tags (N:N).
-- Tags are shared across locales (same slug, different label).
--
-- ## Why a separate table rather than a text[] column
--
-- Tags are a closed vocabulary: the admin picks from existing tags rather than
-- typing free-form strings. A separate table gives us a catalog to pick from,
-- a color per tag, and a single place to rename a tag across all terms.
--
-- ## Idempotent
--
-- Re-runnable against a partially provisioned project.
-- =============================================================================

create table if not exists public.cheatsheet_tag (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) > 0),
  color text not null default 'primary',
  sort_order integer not null default 0,
  unique (locale, slug)
);

create index if not exists cheatsheet_tag_locale_idx
  on public.cheatsheet_tag (locale, sort_order);

create table if not exists public.cheatsheet_term_tag (
  term_id uuid not null references public.cheatsheet_term(id) on delete cascade,
  tag_id uuid not null references public.cheatsheet_tag(id) on delete cascade,
  primary key (term_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- RLS: same policy as cheatsheet_category. Publishable key reads, secret key writes.
-- ---------------------------------------------------------------------------

alter table public.cheatsheet_tag enable row level security;
alter table public.cheatsheet_term_tag enable row level security;

do $$
begin
  create policy "cheatsheet_tag_read" on public.cheatsheet_tag
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "cheatsheet_term_tag_read" on public.cheatsheet_term_tag
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;
