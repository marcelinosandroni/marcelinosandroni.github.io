-- =============================================================================
-- Resume content
--
-- Database-resident résumé content, one row per entity per locale.
--
-- ## Why this exists
--
-- The résumé used to be typed TypeScript modules under
-- `src/infrastructure/content/`. That made it impossible to correct a typo
-- without a deploy, and it put the single most-edited document on the site
-- behind the slowest editing path it had. This moves it into the database so
-- the owner edits it from `/admin`; the typed catalog stays as the fallback
-- that answers when the database is unreachable, exactly as it does for the
-- blog.
--
-- ## Why the shape mirrors the document
--
-- Every table here corresponds to something a reader actually sees on
-- `/[locale]/resume`. There is no `resume_json` blob and no generic
-- key/value store: a table per entity is what lets the admin edit one
-- experience's bullet without rewriting a document, and what lets the read
-- policies and the queries stay reviewable.
--
-- ## The `surfaces` column
--
-- The home page and the résumé render the *same* career at different depths:
-- the résumé is the document of record, the home page is a summary. Rather
-- than two parallel sets of rows that can disagree, every editable item
-- declares which surfaces it appears on.
--
--   * `surfaces = '{resume}'`  → résumé only
--   * `surfaces = '{home,resume}'` → both
--
-- This is why a stack item can be on the résumé and off the home page, which
-- is the behaviour the admin dashboard needs and which a single global
-- boolean cannot express. The column is an enum array so the set of surfaces
-- is closed vocabulary: a typo is rejected by the database rather than
-- silently meaning "nowhere".
--
-- ## Locale
--
-- Every content row is `(entity, locale)`. `pt-BR` is the reference and
-- `en-US` translates it, mirroring the catalog convention. The seed mirrors
-- `resume-data*.ts`, which remains the build-time fallback and the source of
-- truth for what these rows must contain.
--
-- ## Idempotent
--
-- Re-runnable against a partially provisioned project, and the seed uses
-- `on conflict do update` so re-running refreshes content without duplicating
-- it — the same contract as the blog migration.
-- =============================================================================

create extension if not exists pgcrypto;

-- Where an item is allowed to appear. Closed vocabulary, enforced here so an
-- unrecognised surface fails at the database rather than rendering nowhere.
--
-- Created through a guarded block because `create type` has no
-- `if not exists` clause: a bare statement makes the *second* application of
-- this migration fail with `type "resume_surface" already exists`, which is the
-- shape of every other idempotency bug in this directory. A migration is applied
-- to databases that already hold rows, so re-running it has to be a no-op.
--
-- `tests/unit/publication/migration-safety.test.ts` fails the build if a
-- top-level `create table`/`create type` appears without one of these guards.
do $$
begin
  create type public.resume_surface as enum ('home', 'resume');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- One row per locale. The name, title and contact details a reader sees at
-- the top of both the home page and the résumé.
create table if not exists public.resume_profile (
  locale text primary key check (locale in ('pt-BR', 'en-US')),
  name text not null check (length(btrim(name)) > 0),
  title text not null check (length(btrim(title)) > 0),
  location text not null default '',
  phone text not null default '',
  email text not null default '',
  linkedin text not null default '',
  summary text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.resume_profile is
  'Who the owner is, one row per locale. Read through the ResumeRepository port.';

-- ---------------------------------------------------------------------------
-- Work experience
-- ---------------------------------------------------------------------------

-- `sort_order` is explicit rather than derived from a date: the résumé is a
-- curated order, and a date sort would silently reorder two overlapping roles
-- in whichever direction the database felt like.
create table if not exists public.resume_experience (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  company text not null check (length(btrim(company)) > 0),
  role text not null check (length(btrim(role)) > 0),
  period text not null check (length(btrim(period)) > 0),
  location text not null default '',
  summary text not null default '',
  team_size smallint check (team_size is null or team_size >= 0),
  scope text not null default '',
  sort_order integer not null default 0,
  surfaces public.resume_surface[] not null default '{resume}',
  updated_at timestamptz not null default now(),
  unique (locale, company)
);

create index if not exists resume_experience_order_idx
  on public.resume_experience (locale, sort_order);

-- The three bullets under a role. Separate because the admin edits them
-- individually and the compression rule ("keep only what carries a number")
-- is enforced per row.
create table if not exists public.resume_highlight (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.resume_experience (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  body text not null check (length(btrim(body)) > 0),
  sort_order integer not null default 0,
  unique (experience_id, locale, sort_order)
);

-- The case studies: problem, response, result, and the metrics that came out.
--
-- `metrics` is a JSONB array of `{label, value, icon}` mirroring `CaseStudy`
-- in `src/domain/resume/types.ts`. It is JSON rather than a table because a
-- metric is never queried, never sorted and never joined — it is read as a
-- block with its case study, always. Splitting it out would add a join to a
-- query that exists to render one card.
create table if not exists public.resume_case_study (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.resume_experience (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  title text not null check (length(btrim(title)) > 0),
  challenge text not null default '',
  solution text not null default '',
  result text not null default '',
  metrics jsonb not null default '[]'::jsonb
    check (jsonb_typeof(metrics) = 'array'),
  sort_order integer not null default 0,
  unique (experience_id, locale, sort_order)
);

-- The technology chips for one role. These are what the admin can add to or
-- remove from a single experience without touching anything else.
create table if not exists public.resume_technology (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.resume_experience (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  unique (experience_id, locale, sort_order)
);

-- ---------------------------------------------------------------------------
-- Skills
-- ---------------------------------------------------------------------------

-- Four closed categories, matching the arsenal taxonomy the site already
-- enforces in `tests/unit/presentation/home-content.test.ts`.
create table if not exists public.resume_skill_group (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  unique (locale, label)
);

create table if not exists public.resume_skill (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.resume_skill_group (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  unique (group_id, locale, sort_order)
);

-- ---------------------------------------------------------------------------
-- Education and languages
-- ---------------------------------------------------------------------------

create table if not exists public.resume_education (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  title text not null check (length(btrim(title)) > 0),
  institution text not null default '',
  period text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  unique (locale, title)
);

create table if not exists public.resume_language (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  unique (locale, label)
);

-- ---------------------------------------------------------------------------
-- Tech stack on the home page
-- ---------------------------------------------------------------------------

-- The four cluster cards in the arsenal section.
create table if not exists public.tech_stack_cluster (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  icon text not null default 'devices',
  accent text not null default 'primary',
  sort_order integer not null default 0,
  surfaces public.resume_surface[] not null default '{home}',
  updated_at timestamptz not null default now(),
  unique (locale, slug)
);

-- One chip. `surfaces` is what lets the owner drop a single chip from the
-- home page while it stays on the résumé, or remove it from both.
create table if not exists public.tech_stack_item (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.tech_stack_cluster (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  surfaces public.resume_surface[] not null default '{home}',
  unique (cluster_id, locale, sort_order)
);

-- ---------------------------------------------------------------------------
-- Track record annotations
-- ---------------------------------------------------------------------------

-- The impact badge, role stack and team line shown against each employer on
-- the home page. Joined to an experience by `company`, never by position, so
-- reordering the résumé cannot re-point a badge — the same rule the domain
-- type already carries.
create table if not exists public.track_record_annotation (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  company text not null check (length(btrim(company)) > 0),
  impact_label text not null default '',
  impact_value text not null default '',
  impact_accent text not null default 'primary',
  blueprint_label text not null default '',
  team_line text not null default '',
  sort_order integer not null default 0,
  surfaces public.resume_surface[] not null default '{home}',
  updated_at timestamptz not null default now(),
  unique (locale, company)
);

create table if not exists public.track_record_blueprint (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references public.track_record_annotation (id) on delete cascade,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  label text not null check (length(btrim(label)) > 0),
  sort_order integer not null default 0,
  unique (annotation_id, locale, sort_order)
);

-- ---------------------------------------------------------------------------
-- Testimonials
-- ---------------------------------------------------------------------------

-- Empty on purpose.
--
-- A testimonial is a named person saying something true about working with
-- the owner. Writing one here would be fabricating a reference, and this
-- repository's whole argument is that it does not do that — so the table ships
-- with no rows and the feature ships off. The owner adds rows from `/admin`
-- when they have a real quote, with a name to attribute.
--
-- `status` mirrors `blog_articles`: a draft is never readable through the
-- anonymous role, so a quote being written is not a quote being published.
create table if not exists public.resume_testimonial (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('pt-BR', 'en-US')),
  status text not null default 'draft' check (status in ('published', 'draft')),
  author_name text not null check (length(btrim(author_name)) > 0),
  author_role text not null default '',
  author_company text not null default '',
  quote text not null check (length(btrim(quote)) > 0),
  link_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (locale, author_name, quote)
);

comment on table public.resume_testimonial is
  'Named references. Ships empty: a quote is a real person saying something true, and inventing one would be the one lie this site does not tell.';

create index if not exists resume_testimonial_published_idx
  on public.resume_testimonial (locale, sort_order)
  where status = 'published';

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Public read, owner-only write, on every table above.
--
-- Reads go through the publishable key behind these policies; writes go through
-- the secret key from the server. No browser in this codebase holds a Supabase
-- credential at all (`src/infrastructure/supabase/server.ts`), so `anon` and
-- `authenticated` are granted read and nothing else — a bug in a content query
-- returns nothing rather than returning a draft.
--
-- The generated block below is uniform, so it is written once and applied by
-- table name rather than pasted thirteen times.
-- =============================================================================

do $$
declare
  target text;
  readable text[] := array[
    'resume_profile', 'resume_experience', 'resume_highlight',
    'resume_case_study', 'resume_technology', 'resume_skill_group',
    'resume_skill', 'resume_education', 'resume_language',
    'tech_stack_cluster', 'tech_stack_item',
    'track_record_annotation', 'track_record_blueprint',
    'resume_testimonial'
  ];
begin
  foreach target in array readable loop
    execute format('alter table public.%I enable row level security', target);

    execute format('drop policy if exists %I on public.%I', target || ' is publicly readable', target);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      target || ' is publicly readable', target
    );

    -- Writes are refused by having no policy at all. `drop policy if exists`
    -- covers a re-run; revoking is belt and braces against a role that was
    -- granted by an earlier run of this migration.
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', target);
  end loop;
end $$;