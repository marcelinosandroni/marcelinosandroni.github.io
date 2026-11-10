-- =============================================================================
-- Skill & technology descriptions (tooltips for the home and résumé)
--
-- Every skill chip and technology on the home page and the résumé now carries a
-- short descriptive tooltip. The description is a one-line summary of what the
-- tool is, so a reader hovering over a chip learns something instead of seeing
-- the same label twice.
--
-- ## Why a column and not a separate table
--
-- A description is a property of the skill or technology, not a relationship.
-- Splitting it out would add a join to every read for a value that is always
-- read together with the label. The cost is one nullable-ish column per table,
-- which is the cheapest shape for a value that is edited alongside its parent.
--
-- ## Cheatsheet link
--
-- `cheatsheet_slug` points at a term in `cheatsheet_term`. When set, the chip
-- links to that term on the cheatsheet page. When null, the chip is plain text.
-- This is what makes the home page's skill chips clickable: a reader who wants
-- to know more about "Kafka" clicks the chip and lands on the cheatsheet entry.
--
-- ## Idempotent
--
-- `add column if not exists` so re-running is a no-op.
-- =============================================================================

alter table public.resume_skill
  add column if not exists description text not null default '';

alter table public.resume_skill
  add column if not exists cheatsheet_slug text;

alter table public.technology
  add column if not exists description text not null default '';

alter table public.technology
  add column if not exists cheatsheet_slug text;
