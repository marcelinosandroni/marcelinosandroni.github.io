-- =============================================================================
-- Blog post CMS
--
-- The owner's copy of a post: a Markdown document with front matter, plus the
-- lifecycle state that says whether it is a draft, live on the blog, or
-- withdrawn.
--
-- Design notes:
--  * This table is *not* what the blog reads. The blog reads `blog_articles`,
--    and a post only becomes an article when the owner publishes it — at which
--    point the Markdown is compiled into `ArticleBlock`s and upserted there
--    with the same `id`. So a draft is unreachable from the public site by
--    construction rather than by a filter somebody has to remember.
--  * `markdown` is the source of truth and the compiled blocks are a
--    projection. The compiler is lossy — `ArticleBlock` has no inline
--    emphasis, no links and no images — so the document is never rebuilt from
--    the projection, which would silently drop whatever the author wrote.
--  * `id` is the post's id *and*, once published, the article's id. That makes
--    publication idempotent, makes withdrawal a single-row update instead of a
--    slug lookup that could match the wrong row, and lets a delete retract both
--    sides. There is deliberately no foreign key to `blog_articles`: a draft has
--    no article, and a post may be archived and republished any number of times.
--  * The slug is unique per locale on *both* tables. A post therefore cannot
--    claim a slug a seeded article already owns, and the CMS checks both before
--    publishing rather than letting the write fail on the constraint.
--  * The migration is idempotent so it can be re-run against a partially
--    provisioned project, matching the blog migration it sits next to.
-- =============================================================================

create extension if not exists pgcrypto;

-- Depends on `blog_category` from 20260928000100_blog_articles.sql. Reusing the
-- enum rather than declaring a second one is what makes a category mean the same
-- thing in the editor and on the published article.

do $$
begin
  -- `archived` is the one state with no `article_status` equivalent: a post can
  -- be filed away and restored, and `blog_articles` never needs to express that
  -- because an archived post's article is simply demoted to `draft`.
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('draft', 'published', 'archived');
  end if;
end
$$;

create table if not exists public.blog_post_drafts (
  id uuid primary key,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 96),
  status public.post_status not null default 'draft',
  title text not null check (length(btrim(title)) > 0),
  excerpt text not null check (length(btrim(excerpt)) > 0),
  category public.blog_category not null,
  featured boolean not null default false,
  published_at date not null,
  tags text[] not null default '{}',
  -- The author's text, verbatim. Not compiled here: compilation is a
  -- TypeScript concern with a grammar that is documented and unit-tested, and a
  -- second implementation in SQL would be a second set of rules.
  markdown text not null check (length(btrim(markdown)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (locale, slug)
);

comment on table public.blog_post_drafts is
  'Owner-authored blog posts as Markdown. Compiled into blog_articles on publish; the public blog never reads this table.';
comment on column public.blog_post_drafts.markdown is
  'The post body, without the front matter. The source of truth for the article, not a rendering of it.';
comment on column public.blog_post_drafts.id is
  'Shared with the blog_articles row once published, so publication is idempotent and withdrawal is a single-row update.';
comment on column public.blog_post_drafts.status is
  'draft = saved, not on the blog. published = compiled into blog_articles with status published. archived = withdrawn; the article is demoted to draft and the Markdown is kept.';
comment on column public.blog_post_drafts.updated_at is
  'Stamped on every save, publish and archive. The CMS list is ordered by it, because the question it answers is "what did I touch last".';

-- The CMS list. Ordered newest-first, and unlike the blog feed this is not a
-- partial index: the owner needs to see drafts and archived posts too, which is
-- most of the table.
create index if not exists blog_post_drafts_recent_idx
  on public.blog_post_drafts (updated_at desc);

-- Filtering by lifecycle. Small table today; it is here because "show me the
-- drafts" is the first thing an author wants and a sequential scan of every
-- post to answer it would not survive a blog that gets used.
create index if not exists blog_post_drafts_status_idx
  on public.blog_post_drafts (status);

-- =============================================================================
-- Row Level Security
-- =============================================================================
--
-- Deny everything, to every role that can reach PostgREST.

alter table public.blog_post_drafts enable row level security;

-- No policy is created on purpose. RLS enabled with zero policies is default
-- deny, which is exactly the intent: an unreviewed draft must not be readable
-- by anyone who can guess a table name, and unlike `blog_articles` there is no
-- published subset that *should* be public.
--
-- `revoke` is belt and braces on top of the policies. RLS is a switch someone
-- can turn off in a migration; a missing table grant survives that, and the two
-- together mean a mistake in one is not a breach on its own.

revoke all on table public.blog_post_drafts from anon, authenticated;

-- =============================================================================
-- Deleting a post, atomically
-- =============================================================================
--
-- A delete has to touch two tables: the owner's copy and, if it was ever
-- published, the article. Doing it as two statements from the server leaves a
-- window where the process dies in between, and the residue is the bad
-- direction — an article still live on the blog that the owner believes they
-- deleted, with no draft left to remove it.
--
-- A function is the only way to get both statements into one transaction
-- without exposing a second privileged code path. `security invoker` means this
-- runs with the caller's rights, so it cannot become a way around the grants
-- above; the secret key bypasses RLS, and nothing else can reach the function.
-- =============================================================================

create or replace function public.delete_post_with_article(post_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  -- The article first. If the transaction aborts, it aborts for both.
  delete from public.blog_articles where id = post_id;
  delete from public.blog_post_drafts where id = post_id;
end;
$$;

comment on function public.delete_post_with_article(uuid) is
  'Removes an owner post and the article it published, in one transaction. Reachable only with the secret key.';

-- `public` is the implicit grant on every new function, so it is revoked first
-- and the service role re-granted explicitly. Anything skipped here would leave
-- the function callable by `anon` with a guessed uuid.
revoke execute on function public.delete_post_with_article(uuid) from public;
revoke execute on function public.delete_post_with_article(uuid) from anon, authenticated;
grant execute on function public.delete_post_with_article(uuid) to service_role;
