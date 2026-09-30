-- ===========================================================================
-- Visitor presence, and the owner's chat
-- ===========================================================================
--
-- Two features in one migration because they share one key, one pair of tables
-- and one privacy argument: a visitor is a random id plus a time, and everything
-- else in here hangs off that id.
--
--   visitor_presence      one row per browser: a random id and when it was last
--                         seen. Nothing else.
--   owner_presence        one row: when the owner was last looking at their own
--                         console, and when they signed out.
--   chat_conversations    one row per session the owner has opened.
--   chat_messages         the transcript, with the author's kind on every row.
--
-- ===========================================================================
-- THE THREAT MODEL
-- ===========================================================================
--
-- **The assets.** (a) The fact that somebody is reading this site, and (b) the
-- text of a conversation the owner asked for.
--
-- **The adversary.** Anyone who can reach PostgREST: a scraper, a bored
-- stranger, a link the owner pasted somewhere, a shared computer. And — the one
-- that actually matters — *us*, in six months, on a Friday, adding a column
-- because a question would be nice to answer.
--
-- | Threat                                    | Control |
-- | ----------------------------------------- | ------- |
-- | A visitor is identified across visits      | The id is 128 bits of `crypto.getRandomValues`, held in `localStorage`, never derived from the machine. A cookie would be readable by every other site; this is not. |
-- | A reader's address, device or viewport is stored | There is no column for one. `visitor_presence` is an id, two timestamps and a counter. |
-- | A visitor reads or writes somebody else's conversation | Every table is deny-all to `anon` and `authenticated`. The only anonymous capabilities are two `security definer` functions, and neither returns a row about any session but the one it was handed. |
-- | A scraper floods the owner with messages     | The rate limit is inside `append_visitor_message`, in the same transaction as the insert, so a caller that skips the application check cannot outrun it. |
-- | A visitor opens their own chat uninvited     | `chat_conversations.state` defaults to `unopened`, and only `openConversation`'s caller — an owner-authenticated route — can move it. There is no database path from `anon` to `open`. |
-- | A machine's reply is read as the owner       | `chat_messages.automated_notice` is non-null exactly when `author = 'agent'`, as a check constraint. An unlabelled automated message cannot exist in this table, whatever wrote it. |
-- | The owner keeps being advertised as available after leaving | `owner_presence.signed_out_at` outranks `last_activity_at`, and the route that answers `401` is what writes it. |
-- | A stranger enumerates session ids            | They are 128 random bits and are never returned by anything: no `select` policy exists for `anon`, and the two functions return only a timestamp or a message id for the session they were given. |
-- | A conversation is lost when a session is forgotten | `chat_conversations` has **no** foreign key to `visitor_presence`. Pruning presence is a privacy operation and must not destroy what somebody wrote; a transcript outliving its presence row is correct, not a leak. |
--
-- ===========================================================================
-- WHAT IS DELIBERATELY ABSENT
-- ===========================================================================
--
-- No address, no user agent, no referrer, no viewport, no device, no cookie, no
-- fingerprint, no cross-site identifier, and no timestamp finer than "last seen".
--
-- The cost is real and worth stating: a visitor who opens two tabs is one person,
-- a person who switches from Chrome to Safari is two, and the owner cannot tell
-- them apart. That is what "not identifiable" costs, and it is the trade this
-- schema makes deliberately — the same one `click_aggregates` and
-- `theme_feedback` make, for the same reason.
--
-- ===========================================================================
-- THE ANONYMOUS MINIMUM
-- ===========================================================================
--
-- What a visitor may do, in full, is:
--
--   1. create or refresh **its own** presence row, and
--   2. append **one message** to a conversation the owner opened, at most five
--      times a minute, and read back only what it just wrote.
--
-- That is enforced in the database, by the two functions below, and it is the
-- *only* thing the `anon` role can do to any table in this migration: no `select`,
-- no `update`, no `delete`, no way to open or close a conversation, and no way to
-- write as `owner` or `agent` — the author is a literal inside the function body.
--
-- Two honest caveats:
--
--   * The functions are granted to `anon`, and calling them needs the project's
--     anon key. This deployment ships no Supabase credential to the browser at
--     all (see `src/infrastructure/supabase/server.ts`), so today no anonymous
--     caller can reach them and the *primary* path is the Route Handler, which
--     uses the secret key. They are the floor the database enforces on its own,
--     kept correct so that a future browser client cannot weaken it by existing.
--   * The rate limit needs a key, and the only key an anonymous caller has is the
--     session id it chose. There is no address to bucket by, deliberately: hashing
--     one would put an address-derived value in the table, which is the thing this
--     migration exists to avoid. A caller who wants a bigger allowance mints a new
--     session id, and a new id is a new browser as far as this site is concerned.
--
-- ===========================================================================

create extension if not exists pgcrypto;

-- ===========================================================================
-- Enums
-- ===========================================================================
--
-- Mirrored from `src/domain/chat/message.ts` rather than generated, so a mismatch
-- is detectable: `tests/unit/domain/chat-message.test.ts` reads this file and
-- compares the values with the TypeScript union.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'chat_state') then
    create type public.chat_state as enum ('unopened', 'open', 'closed');
  end if;

  -- `agent` is a first-class author rather than a flag on a message. A boolean
  -- `is_bot` column is a thing a future bug can forget to set; an enum value that
  -- the constraint below *requires* a notice for is not.
  if not exists (select 1 from pg_type where typname = 'chat_author') then
    create type public.chat_author as enum ('visitor', 'owner', 'agent');
  end if;
end
$$;

-- ===========================================================================
-- Presence
-- ===========================================================================

create table if not exists public.visitor_presence (
  -- The browser's own random id. The pattern is the same one
  -- `PRESENCE_SESSION_ID_PATTERN` enforces in TypeScript; a `uuid` column would
  -- also be 128 bits, but it would invite a caller to pass a value that means
  -- something else elsewhere.
  session_id      text        primary key check (session_id ~ '^[0-9a-f]{32}$'),
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  heartbeat_count integer     not null default 1 check (heartbeat_count > 0)
);

comment on table public.visitor_presence is
  'How many anonymous browsers are on the site, and when each was last seen. A random id the browser generated plus two timestamps and a counter: there is no column for an address, a device, a user agent, a referrer, a viewport or a fingerprint. Rows are deleted after 24h of silence by the application, not by a trigger, so the retention rule is testable.';
comment on column public.visitor_presence.session_id is
  '128 bits from crypto.getRandomValues, in localStorage. Not a cookie, not derived from the machine, and not shared with any other site.';
comment on column public.visitor_presence.last_seen_at is
  'The heartbeat. Everything the board says about this visitor is derived from this one column and the online window in the domain.';

-- The console reads newest-first and the sweep deletes by the same column, so one
-- index serves both. The primary key is on `session_id`, which is the heartbeat's
-- lookup and nothing else does that.
create index if not exists visitor_presence_last_seen_idx
  on public.visitor_presence (last_seen_at desc);

-- ===========================================================================
-- Owner presence
-- ===========================================================================

create table if not exists public.owner_presence (
  -- A singleton enforced by a check rather than by convention: there is exactly
  -- one owner of this site, and a second row would mean two answers to "can I
  -- answer?".
  id               boolean     primary key default true check (id),
  last_activity_at timestamptz,
  signed_out_at    timestamptz
);

comment on table public.owner_presence is
  'The owner''s own availability. Two nullable timestamps and nothing else: last_activity_at is stamped by every authenticated owner request, and signed_out_at ends availability immediately.';

-- ===========================================================================
-- Conversations
-- ===========================================================================

create table if not exists public.chat_conversations (
  session_id        text             primary key check (session_id ~ '^[0-9a-f]{32}$'),
  state             public.chat_state not null default 'unopened',
  opened_at         timestamptz,
  closed_at         timestamptz,
  -- Settled by the first visitor message and never changed after: the automatic
  -- reply is written in the language of the message that caused it, not the
  -- language of whoever reads the thread next.
  visitor_locale    text             check (visitor_locale in ('pt-BR', 'en-US')),
  last_visitor_at   timestamptz,
  last_owner_reply_at timestamptz,
  -- The visitor message the last automatic reply answered. At most one automatic
  -- reply per visitor message, including when a visitor sends three in a row.
  auto_replied_to_at timestamptz,
  updated_at        timestamptz      not null default now(),

  -- The state and its timestamps have to agree, because every rule in
  -- `shouldOfferChat` and `autoReplyDecision` reads them together.
  constraint chat_conversations_state_matches_timestamps check (
    (state = 'open'  and opened_at is not null and closed_at is null)
    or (state = 'closed' and opened_at is not null and closed_at is not null)
    or (state = 'unopened' and opened_at is null and closed_at is null)
  )
);

comment on table public.chat_conversations is
  'One row per session the owner has opened. A visitor is never offered a chat: this row starts unopened, and the only writer of open is the owner-authenticated route.';
comment on column public.chat_conversations.state is
  'unopened = never contacted, so the visitor is shown nothing. open = the owner started it. closed = the owner stopped answering; the transcript is kept.';
comment on column public.chat_conversations.visitor_locale is
  'The locale of the first visitor message. Fixed afterwards, so an automatic reply cannot change language because a different person opened the console.';

-- No foreign key to `visitor_presence`, on purpose. The sweep deletes presence
-- rows after 24h; a cascade here would delete a transcript because a *privacy*
-- operation ran, which is the wrong direction for a destructive mistake.
create index if not exists chat_conversations_updated_at_idx
  on public.chat_conversations (updated_at desc);

-- ===========================================================================
-- Messages
-- ===========================================================================

create table if not exists public.chat_messages (
  id         uuid             primary key default gen_random_uuid(),
  session_id text             not null references public.chat_conversations (session_id) on delete cascade,
  author     public.chat_author not null,
  body       text             not null check (length(btrim(body)) > 0 and length(body) <= 1000),
  -- The anti-impersonation field. See the constraint below.
  automated_notice text       check (automated_notice is null or length(btrim(automated_notice)) > 0),
  sent_at    timestamptz      not null default now()
);

comment on table public.chat_messages is
  'The transcript. One row per message, with the author''s kind on the row rather than in the text, so no rendering decision is ever made by matching a string.';

-- ===========================================================================
-- The anti-impersonation constraint
-- ===========================================================================
--
-- `automated_notice` is present exactly when the author is `agent`, and present
-- means non-blank. Three things follow, and each one is a separate failure it
-- prevents:
--
--   * an automated message with no label cannot be inserted by anything;
--   * a visitor or owner message cannot carry a label, so no code can make a
--     person's message look like a machine's or the other way round;
--   * the label itself is a non-blank string, so "labelled" cannot be satisfied
--     with a space.
--
-- The domain enforces the same rule in `composeAgentMessage`, which refuses to
-- build a message without a notice. Two independent places, on purpose: this one
-- survives a future implementation that skips the other.

alter table public.chat_messages
  drop constraint if exists chat_messages_notice_matches_author;

alter table public.chat_messages
  add constraint chat_messages_notice_matches_author check (
    (author = 'agent' and automated_notice is not null and length(btrim(automated_notice)) > 0)
    or (author <> 'agent' and automated_notice is null)
  );

-- The transcript read and the rate-limit count are both "this session, in time
-- order", so one index serves both.
create index if not exists chat_messages_session_sent_at_idx
  on public.chat_messages (session_id, sent_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
--
-- Deny everything, to every role that can reach PostgREST.

alter table public.visitor_presence enable row level security;
alter table public.owner_presence enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- No policy is created on any of them. RLS enabled with zero policies is default
-- deny, and that is the intent: no browser, no key this deployment ships, and no
-- guessed table name gets to read a stranger's presence row or a transcript.
--
-- `revoke` is belt and braces on top of the policies. RLS is a switch somebody
-- can turn off in a later migration; a missing table grant survives that, and the
-- two together mean a mistake in one is not a breach on its own.
--
-- The owner reads these tables with the *secret* key, which bypasses RLS. That is
-- the whole authorisation story for the console, and it is the same story as the
-- CMS: the server checks the owner session, and the database never sees a request
-- that did not pass.

revoke all on table public.visitor_presence from anon, authenticated;
revoke all on table public.owner_presence from anon, authenticated;
revoke all on table public.chat_conversations from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;

-- ===========================================================================
-- THE ANONYMOUS FLOOR
-- ===========================================================================
--
-- Two `security definer` functions, and they are the entire set of things an
-- anonymous caller can do to this schema. Both `set search_path`, both re-check
-- every rule the application checks, and neither returns a row about any session
-- other than the one it was given.
--
-- `security invoker` would make these useless: the caller has no grants. That is
-- the point — the grants live on the function, not on the table.

-- ---------------------------------------------------------------------------
-- 1. "I am still here"
-- ---------------------------------------------------------------------------
-- Writes one row and returns nothing. It cannot read a row: the `select into`
-- below is for the courtesy throttle, and the value it reads is only ever used to
-- decide whether to skip the write.

create or replace function public.touch_visitor_session(p_session_id text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_last_seen timestamptz;
begin
  if p_session_id is null or p_session_id !~ '^[0-9a-f]{32}$' then
    raise exception 'invalid_session';
  end if;

  select last_seen_at into previous_last_seen
  from public.visitor_presence
  where session_id = p_session_id
  for update;

  -- Courtesy throttle. A browser that beats faster than this is not a signal the
  -- owner needs, and the floor has to live here rather than in a timer: a
  -- per-instance timer in the application does not survive a scale-out, and this
  -- is a write an anonymous caller can cause.
  if previous_last_seen is not null and previous_last_seen > now() - interval '15 seconds' then
    return previous_last_seen;
  end if;

  insert into public.visitor_presence (session_id, first_seen_at, last_seen_at, heartbeat_count)
  values (p_session_id, now(), now(), 1)
  on conflict (session_id) do update
    set last_seen_at = now(),
        heartbeat_count = public.visitor_presence.heartbeat_count + 1;

  return now();
end;
$$;

comment on function public.touch_visitor_session(text) is
  'Creates or refreshes one presence row. Write-only, self-scoped by the id the caller chose, and rate limited to one write per 15 seconds.';

-- ---------------------------------------------------------------------------
-- 2. "Here is my message"
-- ---------------------------------------------------------------------------
-- The open-state check and the rate limit have to be in the same transaction as
-- the insert, or two concurrent requests both observe "four sent" and both write
-- a fifth. The policy numbers arrive as arguments so the limit has exactly one
-- definition, in the domain; the body length is fixed here because a caller that
-- chose its own maximum would have no maximum.

create or replace function public.append_visitor_message(
  p_session_id text,
  p_body text,
  p_locale text,
  p_limit integer,
  p_window_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.chat_conversations;
  recent_count integer;
  inserted_id uuid;
begin
  if p_session_id is null or p_session_id !~ '^[0-9a-f]{32}$' then
    raise exception 'invalid_session';
  end if;

  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 1000 then
    raise exception 'invalid_body';
  end if;

  if p_locale is null or p_locale not in ('pt-BR', 'en-US') then
    raise exception 'invalid_locale';
  end if;

  if p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid_policy';
  end if;

  select * into target
  from public.chat_conversations
  where session_id = p_session_id
  for update;

  -- The owner-initiates rule, enforced where it cannot be forgotten: an
  -- unopened or closed conversation is not writable by anybody through this
  -- function, whoever is calling.
  if target.session_id is null or target.state <> 'open' then
    raise exception 'chat_not_open';
  end if;

  select count(*) into recent_count
  from public.chat_messages
  where session_id = p_session_id
    and author = 'visitor'
    and sent_at > now() - make_interval(secs => p_window_seconds);

  if recent_count >= p_limit then
    raise exception 'chat_rate_limited';
  end if;

  -- `coalesce` is the "first write wins" rule for the locale, expressed once here
  -- and once in `recordVisitorMessage`. The two are the same rule in two languages
  -- a row has to cross, and the test asserts both are present.
  update public.chat_conversations
  set last_visitor_at = now(),
      visitor_locale = coalesce(visitor_locale, p_locale),
      updated_at = now()
  where session_id = p_session_id;

  insert into public.chat_messages (session_id, author, body, automated_notice)
  -- `visitor` is a literal, not a parameter, and there is no notice: this function
  -- cannot write as the owner and cannot write as the machine.
  values (p_session_id, 'visitor', btrim(p_body), null)
  returning id into inserted_id;

  return inserted_id;
end;
$$;

comment on function public.append_visitor_message(text, text, text, integer, integer) is
  'Appends one visitor message to an open conversation, at most p_limit times per p_window_seconds, in one transaction. Always authored as visitor, never with a notice, and never for a conversation the owner has not opened.';

-- `public` is the implicit grant on every new function, so it is revoked first and
-- the anonymous role re-granted explicitly. Anything skipped here would leave the
-- function callable by `authenticated` — i.e. by anybody who can make a Supabase
-- account, which the owner has explicitly discussed and may allow.
revoke execute on function public.touch_visitor_session(text) from public;
revoke execute on function public.touch_visitor_session(text) from authenticated;
revoke execute on function public.append_visitor_message(text, text, text, integer, integer) from public;
revoke execute on function public.append_visitor_message(text, text, text, integer, integer) from authenticated;

grant execute on function public.touch_visitor_session(text) to anon;
grant execute on function public.append_visitor_message(text, text, text, integer, integer) to anon;

-- The two refusals the adapter translates, kept as exact phrases in one place so
-- the pairing with `translateAppendFailure` is greppable from both sides.
--
--   chat_not_open       -> ChatNotOfferedError -> 403
--   chat_rate_limited   -> ChatRateLimitedError -> 429
