import { versionedArticleRepository } from "@/infrastructure/content/blog";
import { FallbackArticleRepository, GetArticle, ListArticles } from "@/application/blog";
import { isSupabaseContentConfigured } from "@/infrastructure/supabase/server";
import type { ArticleRepository } from "@/application/blog";

/**
 * Composition root for the blog.
 *
 * The database is the source of truth, and the versioned catalog is the safety
 * net. Which one answers is decided here, once, and every page depends only on
 * the `ArticleRepository` port.
 *
 * Two pieces of resilience live here, because both matter in production and
 * neither belongs in the pages:
 *
 * 1. **Graceful degradation.** When Supabase is not configured at all — a
 *    contributor running `next dev` without an `.env`, a CI build, a fork — the
 *    versioned repository is used directly rather than wrapped in a fallback
 *    that could never fire. The Supabase adapter is loaded with a dynamic
 *    `import()` so the module that calls `createClient` at import time is never
 *    evaluated when it cannot work.
 *
 * 2. **A circuit breaker.** A database outage must not add a network timeout to
 *    *every* page view. After a failure the breaker opens and the versioned
 *    catalog answers directly for `COOLDOWN_MS`, so a cold Supabase project, a
 *    transient DNS failure or a dev machine with a stale `.env` costs one failed
 *    request rather than one per visitor. Without this, a blog backed by a
 *    database that is briefly unreachable would slow the whole site to the
 *    client's patience.
 */
const COOLDOWN_MS = 60_000;

let repositoryPromise: Promise<ArticleRepository> | null = null;
let openedUntil = 0;

function isBreakerOpen(): boolean {
  return Date.now() < openedUntil;
}

async function buildArticleRepository(): Promise<ArticleRepository> {
  const fallback = versionedArticleRepository;

  if (!isSupabaseContentConfigured()) {
    return fallback;
  }

  const { SupabaseArticleRepository } = await import(
    "@/infrastructure/repositories/supabase-article-repository"
  );

  const database = new SupabaseArticleRepository();

  return new FallbackArticleRepository(database, fallback, (error) => {
    openedUntil = Date.now() + COOLDOWN_MS;
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[blog] Supabase unavailable for ${COOLDOWN_MS / 1000}s; serving the versioned catalog. Reason: ${reason}`,
    );
  });
}

export async function getListArticles(): Promise<ListArticles> {
  return new ListArticles(await resolveRepository());
}

export async function getArticle(): Promise<GetArticle> {
  return new GetArticle(await resolveRepository());
}

function getArticleRepository(): Promise<ArticleRepository> {
  repositoryPromise ??= buildArticleRepository();
  return repositoryPromise;
}

/**
 * Returns the database-backed repository while the breaker is closed, and the
 * versioned catalog while it is open.
 */
async function resolveRepository(): Promise<ArticleRepository> {
  const repository = await getArticleRepository();

  if (repository === versionedArticleRepository || !isBreakerOpen()) {
    return repository;
  }

  return versionedArticleRepository;
}
