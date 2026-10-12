-- Both guarded so re-applying this migration is a no-op.
--
-- A migration is applied to databases that already hold rows, so the second
-- application must not fail — and `create type` and `create index` have no
-- `if not exists` clause, which is what made this file the first thing to break
-- on a populated database. `tests/unit/publication/migration-safety.test.ts` now
-- fails the build if an unguarded form appears at the top level of any file.
do $$
begin
  create type public.resume_locale as enum ('pt-BR', 'en-US');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null check (version ~ '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$'),
  locale public.resume_locale not null,
  content jsonb not null,
  published_at timestamptz not null,
  artifact_url text,
  artifact_checksum text,
  created_at timestamptz not null default now(),
  unique (version, locale)
);

create index if not exists resume_versions_latest_idx
  on public.resume_versions (locale, published_at desc);

alter table public.resume_versions enable row level security;

-- Dropped first so re-applying this migration is a no-op. Every other policy in
-- this directory carries the same guard; this one was the exception, and it
-- made the second run fail with `policy ... already exists` on a database that
-- already held rows. See tests/unit/publication/migration-safety.test.ts.
drop policy if exists "published resume versions are publicly readable" on public.resume_versions;

create policy "published resume versions are publicly readable"
  on public.resume_versions
  for select
  to anon, authenticated
  using (published_at <= now());

comment on table public.resume_versions is 'Immutable, published resume snapshots. Git remains the canonical content source.';
comment on column public.resume_versions.content is 'Validated ResumeContent snapshot for the selected locale and semantic version.';
