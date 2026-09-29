-- =============================================================================
-- Click aggregates
--
-- One row per trackable element, holding a single integer.
--
-- Privacy design, and it is the whole point of the table:
--
--  * There is no column for a coordinate, a viewport, an address, a user agent,
--    a referrer or a session. Re-identification is not "mitigated" by policy, it
--    is unrepresentable in the schema.
--  * There is no per-event table. A click is folded into a counter at write
--    time, so no individual action is ever retained.
--  * `element` is a constrained enum, not free text, so the set of signals
--    cannot grow by accident.
--  * RLS denies writes to the anonymous role. In production the increment path
--    goes through a service-role client; the anon role can only read the
--    aggregate, which is the public dashboard.
-- =============================================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'trackable_element') then
    create type public.trackable_element as enum (
      'download-pdf',
      'download-pdf-template-menu',
      'contact-email',
      'contact-phone',
      'contact-whatsapp',
      'copilot-open',
      'copilot-example',
      'blog-article',
      'locale-switch'
    );
  end if;
end
$$;

create table if not exists public.click_aggregates (
  element     public.trackable_element primary key,
  count       bigint      not null default 0,
  updated_at  timestamptz not null default now(),
  constraint click_aggregates_count_not_negative check (count >= 0)
);

comment on table public.click_aggregates is
  'Per-element click counters. Contains no personal data by construction: no coordinates, no address, no session.';

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.click_aggregates enable row level security;

-- The public dashboard may read the aggregate.
drop policy if exists "click aggregates are publicly readable" on public.click_aggregates;
create policy "click aggregates are publicly readable"
  on public.click_aggregates
  for select
  to anon, authenticated
  using (true);

-- No insert/update policy on purpose. Writes require a service-role client, so
-- the increment path cannot be driven straight from the browser with the anon
-- key, which is what a scraper would try first.
