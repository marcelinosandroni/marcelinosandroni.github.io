create type public.resume_locale as enum ('pt-BR', 'en-US');

create table public.resume_versions (
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

create index resume_versions_latest_idx
  on public.resume_versions (locale, published_at desc);

alter table public.resume_versions enable row level security;

create policy "published resume versions are publicly readable"
  on public.resume_versions
  for select
  to anon, authenticated
  using (published_at <= now());

comment on table public.resume_versions is 'Immutable, published resume snapshots. Git remains the canonical content source.';
comment on column public.resume_versions.content is 'Validated ResumeContent snapshot for the selected locale and semantic version.';
