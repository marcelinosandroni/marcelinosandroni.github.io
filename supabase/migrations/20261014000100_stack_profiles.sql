-- =============================================================================
-- Stack profiles
--
-- "React + Node", "Angular + Java", "Angular + .NET", "Python".
--
-- =============================================================================
--
-- ## What a profile is
--
-- A named selection of technologies, which the résumé can be narrowed to. Not a
-- second document, and not a template: it is the same document, with the skills
-- reordered and the bullets filtered, which is why there is no profile column on
-- `resume_experience` and no copy of the résumé per profile.
--
-- ## Two lists, not one
--
-- `primary` is what the profile is *for* — the tools a reader should see first,
-- and the ones whose bullets survive the filter. `listed` is everything else
-- worth showing on the same page.
--
-- That distinction is the feature the owner asked for: "focus more on React,
-- Node, TypeScript, JavaScript, Next.js, NestJS and Express, but still list the
-- others." One list cannot say that. React goes to the top; Vue stays on the
-- page. A single ordered list would either bury the others or promote them.
--
-- ## Why the profile stores slugs, not technology ids
--
-- Slugs are the locale-independent identity, and a profile is *about* the tool
-- rather than about this locale's row for it. Storing ids would mean creating
-- the profile twice and keeping two lists in step — and the English one would
-- silently drift from the Portuguese one, which is the failure this schema has
-- avoided everywhere else by making the locale-specific things locale-specific
-- and the shared things shared.
--
-- The resolution table below is what makes that possible: it is keyed by slug
-- and resolved against whichever locale is being read.
--
-- ## Idempotent
--
-- See tests/unit/publication/migration-safety.test.ts.
-- =============================================================================

create extension if not exists pgcrypto;

create table if not exists public.resume_stack_profile (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 64),
  description text not null default '',
  sort_order integer not null default 0,
  surfaces public.resume_surface[] not null default '{resume}',
  updated_at timestamptz not null default now(),
  unique (slug)
);

comment on table public.resume_stack_profile is
  'A named stack selection: "React + Node". The résumé narrowed to it, never a second document.';

-- Which technologies a profile promotes, and which it merely lists.
--
-- `weight` is the whole table. There is no ordering *within* `primary`: the
-- résumé's own order wins, so adding a profile cannot reorder the skills
-- section, and the profile stays a selection rather than becoming a layout.
create table if not exists public.resume_stack_profile_member (
  profile_id uuid not null references public.resume_stack_profile (id) on delete cascade,
  technology_slug text not null check (technology_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  weight text not null check (weight in ('primary', 'listed')),
  sort_order integer not null default 0,
  primary key (profile_id, technology_slug)
);

create index if not exists resume_stack_profile_member_slug_idx
  on public.resume_stack_profile_member (technology_slug);

-- No `label` column, and that is the design rather than an omission.
--
-- The profiles are named after combinations — "React + Node", "Angular + Java",
-- "Python" — so a label cannot be written once and translated: the *members*
-- are translated, and the display name is assembled from them at render time. A
-- stored label would also go stale, because renaming a member would leave the
-- profile describing a combination it no longer contains.
--
-- The consequence is that the admin shows a slug as the working name. That is
-- the right trade: a stale name is wrong on the public page, and a slug is only
-- wrong in the admin.

comment on table public.resume_stack_profile_member is
  'profile x technology, weighted. primary is promoted and survives the bullet filter; listed only appears.';

-- =============================================================================
-- Row Level Security
-- =============================================================================

do $$
declare
  target text;
begin
  foreach target in array array['resume_stack_profile', 'resume_stack_profile_member'] loop
    execute format('alter table public.%I enable row level security', target);

    execute format('drop policy if exists %I on public.%I', target || ' is publicly readable', target);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      target || ' is publicly readable', target
    );

    execute format('revoke insert, update, delete on public.%I from anon, authenticated', target);
  end loop;
end $$;