-- =============================================================================
-- Language vs stack, and the relations between them
--
-- "NestJS is part of the Node.js stack, which is part of JavaScript and
-- TypeScript. Spring Boot is part of the Java language."
--
-- =============================================================================
--
-- ## Why the flat catalog was not enough
--
-- `technology` made a tool an entity, but it left every tool an equal. A
-- framework and the language it runs on were the same kind of thing, which
-- makes two things the owner asked for impossible:
--
--   1. **Selecting NestJS has to imply JavaScript.** A job posting asks for
--      TypeScript; the owner picks the profile "React + Node"; the TypeScript
--      bullets have to be kept. Nothing in a flat list can say that, because
--      the connection between the two is not stored — it has to be *known*.
--   2. **A reader has to tell a language from a tool.** "TypeScript" and
--      "React" sit in the same list, and the difference is the thing that
--      decides whether a candidate matches a role.
--
-- So there are two changes: a `kind` that names which of those a row is, and a
-- relation table that records what rests on what.
--
-- ## Why the relation is a table and not a column
--
-- `technology.parent_id` would record one relationship, and one is not the
-- shape of the problem. React rests on JavaScript; NestJS rests on Node.js *and*
-- is written in TypeScript; Spring Boot rests on Java and uses Spring. A single
-- parent column would force an ordering on facts that do not have one, and the
-- second fact would have to be dropped or smuggled into the description — where
-- nothing could query it.
--
-- The kind of edge matters too, and is an enum rather than free text: "rests on"
-- is a hierarchy you can walk down to reach a language, and "uses" is a lateral
-- fact you must not walk, because TypeScript uses JavaScript but React does not
-- thereby become a superset of JavaScript.
--
-- ## The direction is the whole design
--
-- `from` rests on / uses `to`. NestJS → Node.js → JavaScript. Walking *down* the
-- `built_on` edges from what the owner selected reaches the language underneath
-- it, and that is what a focused résumé expands: selecting NestJS keeps the
-- TypeScript bullets because TypeScript is what NestJS is made of, not because
-- a guess said they were related.
--
-- ## Idempotent
--
-- See tests/unit/publication/migration-safety.test.ts.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Which kind of thing a technology is
-- ---------------------------------------------------------------------------

-- A closed vocabulary, because the distinction is load-bearing: `language` is
-- what a profile expands down to, and a row misfiled as a framework would
-- silently stop being reachable from a selection.
--
-- `datastore`, `messaging` and `infrastructure` are separated from `platform`
-- because they behave differently when a posting asks for them — asking for
-- "Kafka" is asking for a broker, not for a runtime, and a search that matched
-- both would rank a JVM against a message bus.
do $$
begin
  create type public.technology_kind as enum (
    'language',
    'platform',
    'framework',
    'library',
    'datastore',
    'messaging',
    'infrastructure',
    'observability',
    'testing',
    'practice',
    'domain'
  );
exception
  when duplicate_object then null;
end $$;

-- `kind` is additive and nullable: an existing row that has not been revisited
-- is `null` rather than being guessed at. Guessing `library` for 120 rows in a
-- migration would be a claim about all of them, made by a keyword list, with no
-- way for the owner to see that it happened.
alter table public.technology
  add column if not exists kind public.technology_kind;

-- ---------------------------------------------------------------------------
-- What one technology rests on, or uses
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.technology_relation_kind as enum ('built_on', 'uses');
exception
  when duplicate_object then null;
end $$;

-- `built_on` walks down to a language. `uses` does not.
--
-- The self-reference is the point: it is what makes the chain
-- NestJS → Node.js → JavaScript expressible without knowing in advance how deep
-- the chain goes, and it is why the expansion in the domain is a graph closure
-- rather than a hardcoded list.
create table if not exists public.technology_relation (
  from_id uuid not null references public.technology (id) on delete cascade,
  to_id uuid not null references public.technology (id) on delete cascade,
  kind public.technology_relation_kind not null default 'built_on',
  primary key (from_id, to_id, kind),
  -- A technology cannot rest on itself. Allowed by the foreign key, forbidden by
  -- the data: a self-edge is a cycle of length one, and the expansion that
  -- consumes this table is recursive.
  check (from_id <> to_id)
);

create index if not exists technology_relation_to_idx
  on public.technology_relation (to_id, kind);

comment on table public.technology_relation is
  'What rests on what. "built_on" is a hierarchy that expands to a language; "uses" is lateral and does not.';

-- ---------------------------------------------------------------------------
-- Descriptions
-- ---------------------------------------------------------------------------

-- Why the owner has it, in their words, for a reader who does not know the
-- acronym.
--
-- On `technology` rather than a side table because `technology` is already
-- per-locale: a description written in pt-BR and one written in en-US are two
-- rows that never have to be kept in step by a join.
--
-- Optional and defaulting to empty, because a tool the owner has not written
-- about yet must still render. The UI shows nothing rather than a placeholder,
-- since an empty tooltip that says "no description" is worse than no tooltip.
alter table public.technology
  add column if not exists description text not null default '';

-- =============================================================================
-- Row Level Security
-- =============================================================================

do $$
declare
  target text;
begin
  foreach target in array array['technology_relation'] loop
    execute format('alter table public.%I enable row level security', target);

    execute format('drop policy if exists %I on public.%I', target || ' is publicly readable', target);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      target || ' is publicly readable', target
    );

    execute format('revoke insert, update, delete on public.%I from anon, authenticated', target);
  end loop;
end $$;