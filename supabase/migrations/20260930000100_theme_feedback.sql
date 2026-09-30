-- ===========================================================================
-- Theme feedback
-- ===========================================================================
-- Answers one question: which theme do people leave on?
--
-- The privacy model is the same one `click_aggregates` uses, and for the same
-- reason. A theme is a preference, and a preference plus a timestamp plus an
-- address is a profile. So:
--
-- - No text column. The answer is an enum plus a count, so a free-text comment
--   is not merely discouraged, it is unwriteable.
-- - No per-event table. A response is folded into a counter at write time, so
--   there is no row that describes one person's opinion.
-- - No address, no user agent, no referrer, no session, no device.
--
-- The trade is real and worth stating: a visitor who has something to say
-- cannot say it in words. This table answers "which theme do people prefer",
-- which is the question a theme actually needs answered, and a text column
-- would answer a different question at the cost of storing something a
-- stranger typed.

-- ===========================================================================
-- Enums
-- ===========================================================================

do $$
begin
  -- The theme ids, mirrored from `src/domain/theme/theme.ts`. Not a foreign key
  -- to a themes table because there is no themes table: the list of valid ids is
  -- a TypeScript constant, and a database that could hold an id the app does not
  -- recognise would drift the moment a theme is renamed.
  if not exists (select 1 from pg_type where typname = 'feedback_theme') then
    create type public.feedback_theme as enum ('carbon', 'paper', 'matrix');
  end if;

  -- A sentiment is an enum rather than a boolean because the useful answer is
  -- three-way: keeping a theme, leaving it, and "I only looked" are different
  -- facts and collapsing them loses the one that matters.
  if not exists (select 1 from pg_type where typname = 'feedback_verdict') then
    create type public.feedback_verdict as enum ('keep', 'leave', 'unsure');
  end if;
end
$$;

-- ===========================================================================
-- Table
-- ===========================================================================

create table if not exists public.theme_feedback (
  theme      public.feedback_theme   not null,
  verdict    public.feedback_verdict not null,
  count      bigint                 not null default 0,
  updated_at timestamptz            not null default now(),

  primary key (theme, verdict),

  -- A negative count would make a "leave" row read as fewer than zero
  -- leavers, which is nonsense rather than merely wrong.
  constraint theme_feedback_count_not_negative check (count >= 0)
);

comment on table public.theme_feedback is
  'Per-theme, per-verdict feedback counters. Contains no personal data by construction: '
  'no comment text, no address, no device, no session, and no per-event table.';

comment on column public.theme_feedback.theme is
  'The theme the verdict is about. Constrained to the app''s theme ids.';
comment on column public.theme_feedback.verdict is
  'keep = staying on the theme, leave = switching away, unsure = saw it and did neither.';

-- The read pattern is "all of them, grouped", which the primary key already
-- serves. The index below is on `updated_at` because the admin view sorts by
-- recency, and without it that is a sort of the whole table on every load.
create index if not exists theme_feedback_updated_at_idx
  on public.theme_feedback (updated_at desc);

-- ===========================================================================
-- Row level security
-- ===========================================================================
-- Read is public so the theme panel can render without a session. Write is not:
-- the increment goes through a service-role client on the server, and the
-- anonymous role is denied here, which is what stops a loop from driving a
-- thousand "leave" votes into a theme that is fine.

alter table public.theme_feedback enable row level security;

drop policy if exists "theme feedback is publicly readable" on public.theme_feedback;
create policy "theme feedback is publicly readable"
  on public.theme_feedback
  for select
  to anon, authenticated
  using (true);

-- No insert or update policy on purpose. Writes require the service key, so
-- they cannot be driven from the browser with the anon key, which is the first
-- thing a scraper would try.
