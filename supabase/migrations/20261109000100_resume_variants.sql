-- =============================================================================
-- Resume variants (CV stacks)
--
-- Database-resident CV variant content. The variants used to be typed TypeScript
-- modules under `scripts/data/stack-variants.pt-br.ts` and `.en-us.ts`, which
-- made it impossible to correct a typo or add a stack without a deploy and a
-- rebuild of all twelve PDFs.
--
-- This moves variant content into the database so the owner edits it from
-- `/admin`, exactly as the experience and the tech stack already are. The typed
-- catalog stays as the build-time fallback that answers when the database is
-- unreachable.
--
-- ## Shape
--
-- A variant is the shared shell with five things replaced: the headline, the
-- summary, the four metric cards, the inventory (skill groups) and, for the four
-- that argue a different experience, the stack lines and bullets of each role.
-- Everything else — company, dates, tenure, education, languages, contact — is
-- inherited from the shell and is not stored here.
--
-- ## Locale
--
-- One row per (locale, slug). `pt-BR` is the reference and `en-US` translates
-- it, mirroring the catalog convention.
--
-- ## Idempotent
--
-- Re-runnable against a partially provisioned project. `on conflict do update`
-- so re-running refreshes content without duplicating it.
-- =============================================================================

create table if not exists public.resume_variant (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null,
  label text not null check (length(btrim(label)) > 0),
  title text not null check (length(btrim(title)) > 0),
  headline text not null check (length(btrim(headline)) > 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists resume_variant_locale_idx
  on public.resume_variant (locale, sort_order);

create table if not exists public.resume_variant_metric (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.resume_variant(id) on delete cascade,
  value text not null check (length(btrim(value)) > 0),
  label text not null check (length(btrim(label)) > 0),
  caption text not null default '',
  sort_order integer not null default 0
);

create index if not exists resume_variant_metric_variant_idx
  on public.resume_variant_metric (variant_id, sort_order);

create table if not exists public.resume_variant_inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.resume_variant(id) on delete cascade,
  group_label text not null check (length(btrim(group_label)) > 0),
  items text not null check (length(btrim(items)) > 0),
  sort_order integer not null default 0
);

create index if not exists resume_variant_inventory_variant_idx
  on public.resume_variant_inventory (variant_id, sort_order);

create table if not exists public.resume_variant_role (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.resume_variant(id) on delete cascade,
  role_key text not null check (length(btrim(role_key)) > 0),
  stack text,
  sort_order integer not null default 0,
  unique (variant_id, role_key)
);

create index if not exists resume_variant_role_variant_idx
  on public.resume_variant_role (variant_id, sort_order);

create table if not exists public.resume_variant_role_bullet (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.resume_variant_role(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  body text not null check (length(btrim(body)) > 0),
  sort_order integer not null default 0
);

create index if not exists resume_variant_role_bullet_role_idx
  on public.resume_variant_role_bullet (role_id, sort_order);

-- ---------------------------------------------------------------------------
-- RLS: same policy as resume_experience. Publishable key reads, secret key writes.
-- ---------------------------------------------------------------------------

alter table public.resume_variant enable row level security;
alter table public.resume_variant_metric enable row level security;
alter table public.resume_variant_inventory enable row level security;
alter table public.resume_variant_role enable row level security;
alter table public.resume_variant_role_bullet enable row level security;

do $$
begin
  create policy "resume_variant_read" on public.resume_variant
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "resume_variant_metric_read" on public.resume_variant_metric
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "resume_variant_inventory_read" on public.resume_variant_inventory
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "resume_variant_role_read" on public.resume_variant_role
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "resume_variant_role_bullet_read" on public.resume_variant_role_bullet
    for select to anon, authenticated using (true);
exception when duplicate_object then null;
end $$;
