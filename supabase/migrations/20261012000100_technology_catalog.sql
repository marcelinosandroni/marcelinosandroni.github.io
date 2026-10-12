-- =============================================================================
-- Technology catalog
--
-- Turns "a string React, written once per role" into an entity you can ask
-- questions about.
--
-- ## Why this exists
--
-- `resume_technology` was `(experience_id, locale, label)` — a *string* per role.
-- "React" at Pollux and "React" at DGT were two unrelated rows that happened to
-- spell the same thing. That shape cannot answer "where have I used NestJS",
-- cannot filter a bullet by the stack it describes, and cannot add a tool once:
-- adding it means writing a row per role.
--
-- Everything the résumé needs in order to be *targeted* rather than generic —
-- promoting React over Vue when the role is React, keeping only the bullets that
-- mention Kafka when the job asks for Kafka — needs the tool to be an entity the
-- other rows can point at. That is what this migration adds.
--
-- ## Nothing here is destructive, and nothing is replaced
--
-- `resume_technology` keeps its own `label` and stays the per-role display list.
-- A technology can be linked to zero roles and still exist in the catalog, and a
-- role can still show a chip that was never linked, because both columns are
-- nullable in their own direction:
--
--   * `resume_technology.technology_id` is nullable — an unlinked chip renders.
--   * `technology` rows are independent — a catalog entry with no role is a tool
--     the owner uses but has not attributed yet.
--
-- The alternative — replacing the string column with a join table — would make
-- every existing row disappear the moment a migration ran, on a document whose
-- whole purpose is to be trustworthy. Adding the link is the version that cannot
-- lose anything.
--
-- ## Idempotent
--
-- See tests/unit/publication/migration-safety.test.ts: guarded `create table`,
-- guarded `create type`, `add column if not exists`, `drop policy if exists`
-- before every `create policy`. Re-running this against a populated database is
-- a no-op.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

-- The axis the résumé is already split on — Frontend & UI, Backend Core,
-- DevOps & Cloud, Inteligência Artificial — promoted from "whatever the group
-- happened to be called" to a row the owner can rename, reorder or extend.
--
-- A table rather than a Postgres enum because the taxonomy is content: adding
-- "Segurança" or "Domínio de negócio" is an admin edit, not a migration.
create table if not exists public.technology_category (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists technology_category_order_idx
  on public.technology_category (locale, sort_order);

comment on table public.technology_category is
  'The taxonomy a technology is filed under. Admin-managed: adding a category is content, not a migration.';

-- ---------------------------------------------------------------------------
-- The entity
-- ---------------------------------------------------------------------------

-- One row per tool per locale. This is the row the rest of the schema points at.
--
-- `slug` is locale-independent on purpose — "react" is "react" in both languages
-- — while `label` is not, because the same tool is written "Observabilidade" in
-- pt-BR and "Observability" in en-US. `unique (locale, slug)` keeps the two
-- translations of one tool independently renameable without touching a relation.
--
-- `aliases` is what makes job descriptions matchable. A posting says
-- "PostgreSQL", "Postgres" and "Postgres 15"; it says "k8s" where the résumé
-- says "Kubernetes" and "Amazon EKS" where the résumé says "AWS". Matching on
-- `label` alone would score those as absent. Aliases are the other names the
-- same thing goes by, and they are data the owner curates — not a fuzzy-match
-- heuristic, because a heuristic that invents a match is worse than no match.
create table if not exists public.technology (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.technology_category (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  label text not null check (length(btrim(label)) > 0),
  aliases text[] not null default '{}',
  /*
    Where the technology may be shown as a chip.

    Defaults to résumé-only because that is the document of record: every
    technology the owner has ever listed belongs on `/[locale]/resume`. The home
    page is the summary, and adding a tool there is a deliberate act — an
    unexplained twentieth chip in the arsenal reads as padding, which is the
    credibility cost this site's argument is built to avoid.
  */
  surfaces public.resume_surface[] not null default '{resume}',
  /*
    Whether the catalog entry can be picked.

    False means "retired": kept, so the links from existing roles and bullets
    still resolve and nothing already written breaks, but hidden from every
    selector and from the admin's pick list. Deleting instead would cascade
    through `highlight_technology` and `resume_technology` and silently thin out
    a role the owner wrote years ago.
  */
  is_published boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

create index if not exists technology_category_idx
  on public.technology (category_id, locale, sort_order);

-- Alias lookup, used when matching a pasted job description. GIN rather than a
-- scan: this is a whole-column search over the whole catalog, run once per
-- analysis, and there is no other index that answers it.
create index if not exists technology_aliases_idx
  on public.technology using gin (aliases);

comment on table public.technology is
  'One row per tool. Everything else in the résumé that mentions a tool points here.';

-- ---------------------------------------------------------------------------
-- Links
-- ---------------------------------------------------------------------------

-- Experience → technology.
--
-- Nullable, and additive on purpose: see the header. An unlinked chip still
-- renders exactly as before; a linked one also answers "where have I used this".
alter table public.resume_technology
  add column if not exists technology_id uuid references public.technology (id) on delete set null;

create index if not exists resume_technology_technology_idx
  on public.resume_technology (technology_id)
  where technology_id is not null;

-- Skill → technology.
--
-- The skills section lists tools, so it links rather than duplicates. Nullable
-- for the same reason: a skill that is not in the catalog still renders.
alter table public.resume_skill
  add column if not exists technology_id uuid references public.technology (id) on delete set null;

-- Highlight → technology. The relation that makes a targeted résumé possible.
--
-- This is a join table rather than a column because a bullet that mentions
-- Kafka, CI/CD and Terraform is three facts about one line, and the owner should
-- not have to pick one. A single `technology_id` on `resume_highlight` would
-- have forced that choice, and whichever technology lost would be unfindable.
create table if not exists public.highlight_technology (
  highlight_id uuid not null references public.resume_highlight (id) on delete cascade,
  technology_id uuid not null references public.technology (id) on delete cascade,
  primary key (highlight_id, technology_id)
);

create index if not exists highlight_technology_reverse_idx
  on public.highlight_technology (technology_id);

comment on table public.highlight_technology is
  'Which technologies a bullet describes. The join the focused résumé filters on.';

-- Case study → technology, same reasoning as the highlight link: a case study
-- is work, and work has a stack.
create table if not exists public.case_study_technology (
  case_study_id uuid not null references public.resume_case_study (id) on delete cascade,
  technology_id uuid not null references public.technology (id) on delete cascade,
  primary key (case_study_id, technology_id)
);

create index if not exists case_study_technology_reverse_idx
  on public.case_study_technology (technology_id);

-- ---------------------------------------------------------------------------
-- Case study media
-- ---------------------------------------------------------------------------

-- Optional images, zero or more per case study.
--
-- A separate table rather than a JSONB array on `resume_case_study` because
-- these are the résumé's only rows with a `surfaces` decision: a diagram that
-- helps a reader who already trusts the result is noise on the home page. An
-- array would mean filtering in application code, which is the same mistake the
-- rest of this schema avoids by making the database refuse an invalid value.
--
-- `url` is a path under `public/` or an absolute https URL. There is no upload
-- endpoint on purpose — see the admin note in docs/local-database.md; storing a
-- blob would put a file system write behind an authenticated route and a
-- content-type the server never validated.
create table if not exists public.case_study_media (
  id uuid primary key default gen_random_uuid(),
  case_study_id uuid not null references public.resume_case_study (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  url text not null check (length(btrim(url)) > 0),
  alt text not null default '',
  caption text not null default '',
  surfaces public.resume_surface[] not null default '{resume}',
  sort_order integer not null default 0,
  unique (case_study_id, locale, sort_order)
);

create index if not exists case_study_media_order_idx
  on public.case_study_media (case_study_id, locale, sort_order);

comment on table public.case_study_media is
  'Optional imagery for a case study. Zero rows is the normal case and renders nothing.';

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Same contract as every other table here: public read through the publishable
-- key, no write policy at all so `anon`/`authenticated` cannot write, writes
-- through the secret key from the server. See 20261011000100_resume_content.sql
-- for why that is the arrangement rather than a permissive write policy.
-- =============================================================================

do $$
declare
  target text;
  readable text[] := array[
    'technology_category', 'technology',
    'highlight_technology', 'case_study_technology', 'case_study_media'
  ];
begin
  foreach target in array readable loop
    execute format('alter table public.%I enable row level security', target);

    execute format('drop policy if exists %I on public.%I', target || ' is publicly readable', target);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      target || ' is publicly readable', target
    );

    execute format('revoke insert, update, delete on public.%I from anon, authenticated', target);
  end loop;
end $$;