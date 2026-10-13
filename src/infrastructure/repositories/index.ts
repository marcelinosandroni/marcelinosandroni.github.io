import { createClient } from "@supabase/supabase-js";

import { versionedArticleRepository } from "@/infrastructure/content/blog";
import { FallbackArticleRepository, GetArticle, ListArticles } from "@/application/blog";
import type { Locale } from "@/domain/i18n";
import type {
  HomeExperienceAnnotation,
  HomeStackSection,
} from "@/domain/portfolio";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
  StackProfileSummary,
  TechnologyCatalog,
} from "@/domain/resume/resume-repository";
import type { ResumeContent } from "@/domain/resume/types";
import {
  EMPTY_FOCUS,
  resolveProfiles,
  type FocusExpansion,
  type TechnologyEdge,
} from "@/domain/resume/focus";
import {
  FallbackResumeRepository,
  versionedResumeRepository,
} from "@/infrastructure/repositories/versioned-resume-repository";
import {
  isSupabaseContentConfigured,
  supabaseConfigFromEnv,
  type EnvironmentLike,
} from "@/infrastructure/supabase/server";
import type { ArticleRepository } from "@/application/blog";
import {
  DEFAULT_POST_ADAPTER_ID,
  isPostAdapterId,
  POST_ADAPTER_IDS,
  type PostAdapterId,
  type PostRepository,
} from "@/domain/blog";
import { InMemoryPostRepository } from "./inmemory-post-repository";
import { SupabasePostRepository, type PostCmsClient } from "./supabase-post-repository";

/**
 * Composition roots for the blog.
 *
 * The public feed and the owner's CMS are wired here and nowhere else, because
 * the two questions — which article catalog answers, and which store holds a
 * draft — are both questions about *this deployment's* environment. A use case
 * that had to answer either of them would be a use case that could only be
 * tested against a real Supabase project.
 */

/**
 * Composition root for the public feed.
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

/* -------------------------------------------------------------------------
 * Composition root for résumé content
 *
 * The same arrangement as the blog, for the same reason: which of two answers
 * a visitor gets is a question about *this deployment's* environment, and a
 * page that had to answer it could only be tested against a real Supabase
 * project.
 *
 * The breaker matters more here than it does for the blog. The blog is a
 * side-channel; the résumé is the document of record, and a page view that
 * waits on a database round trip is a page view that costs a recruiter. After
 * one failure the catalog answers directly for `COOLDOWN_MS`, so an outage
 * costs one slow request rather than one per visitor.
 * ---------------------------------------------------------------------- */

/** How long the versioned catalog answers directly after a database failure. */
const RESUME_COOLDOWN_MS = 60_000;

let resumeRepositoryPromise: Promise<ResumeRepository> | null = null;
let resumeOpenedUntil = 0;

async function buildResumeRepository(): Promise<ResumeRepository> {
  if (!isSupabaseContentConfigured()) {
    return versionedResumeRepository;
  }

  const { SupabaseResumeRepository } = await import(
    "@/infrastructure/repositories/supabase-resume-repository"
  );

  return new FallbackResumeRepository(
    new SupabaseResumeRepository(),
    versionedResumeRepository,
    (error) => {
      resumeOpenedUntil = Date.now() + RESUME_COOLDOWN_MS;
      console.warn(
        `[resume] Supabase unavailable for ${RESUME_COOLDOWN_MS / 1000}s; serving the versioned catalog. Reason: ${error.message}`,
      );
    },
  );
}

function getResumeRepository(): Promise<ResumeRepository> {
  resumeRepositoryPromise ??= buildResumeRepository();
  return resumeRepositoryPromise;
}

async function resolveResumeRepository(): Promise<ResumeRepository> {
  const repository = await getResumeRepository();

  if (repository === versionedResumeRepository || Date.now() >= resumeOpenedUntil) {
    return repository;
  }

  return versionedResumeRepository;
}

/** The résumé as a page serves it. See `ResumeSurfaceRead`. */
export async function readResume(
  locale: Locale,
  surface: ResumeSurfaceRead = "both",
): Promise<ResumeContent> {
  return (await resolveResumeRepository()).readResume(locale, surface);
}

/** Published testimonials, which is empty until the owner adds a real one. */
export async function readTestimonials(locale: Locale): Promise<ResumeTestimonial[]> {
  return (await resolveResumeRepository()).readTestimonials(locale);
}

/**
 * The home page tech stack, database-first.
 *
 * Merged over the typed section rather than replacing it, so the kicker, title
 * and note — which are editorial, not facts, and which the admin does not edit —
 * survive either way. Only the clusters themselves come from the database.
 */
export async function readHomeStack(locale: Locale): Promise<HomeStackSection | null> {
  return (await resolveResumeRepository()).readHomeStack(locale);
}

/** The home page track-record annotations, database-first. */
export async function readHomeTrackRecord(locale: Locale): Promise<HomeExperienceAnnotation[] | null> {
  return (await resolveResumeRepository()).readHomeTrackRecord(locale);
}

/**
 * The technology catalog, for the admin.
 *
 * ## Why it bypasses the circuit breaker
 *
 * The breaker exists so a database outage does not add a latency to every page
 * view. That argument does not apply to an owner opening `/admin` on purpose:
 * there is no visitor to protect, and answering from the typed catalog would
 * hand the owner an empty catalog while the database holds a hundred and twenty
 * rows — which reads as "the catalog was lost", and the first thing they would
 * do about it is re-seed something that is fine.
 *
 * So it throws instead, and the admin renders "needs the database". That is
 * true, and it names the fix.
 */
export async function readTechnologyCatalog(locale: Locale): Promise<TechnologyCatalog> {
  if (!isSupabaseContentConfigured()) {
    throw new Error("the technology catalog requires Supabase; the typed catalog has no entities");
  }

  return (await getResumeRepository()).readTechnologyCatalog(locale);
}

/**
 * The stack profiles, for the résumé page's selector and for the admin.
 *
 * Through the breaker rather than around it, unlike the catalog: a résumé page
 * with no selector is the generic résumé, which is correct, so falling back is a
 * real answer and worth having on the hot path.
 */
export async function readStackProfiles(locale: Locale): Promise<StackProfileSummary[]> {
  return (await resolveResumeRepository()).readStackProfiles(locale);
}

/**
 * The profiles already resolved against the relation graph.
 *
 * The single place the walk happens. The résumé page, the PDF and the job
 * matcher all call this, because three implementations of the same walk would
 * drift the first time a relation was corrected — and a page that promoted
 * TypeScript while the PDF did not is the kind of bug nobody reports.
 */
export async function readResolvedProfiles(
  locale: Locale,
): Promise<Array<{ profile: StackProfileSummary; focus: FocusExpansion }>> {
  const [summaries, catalog] = await Promise.all([
    readStackProfiles(locale),
    readTechnologyCatalog(locale).catch(() => ({ categories: [], technologies: [], relations: [] })),
  ]);

  if (summaries.length === 0) {
    return [];
  }

  const slugById = new Map(catalog.technologies.map((entry) => [entry.id, entry.slug]));

  const edges: TechnologyEdge[] = catalog.relations
    .map((relation) => {
      const from = slugById.get(relation.fromId);
      const to = slugById.get(relation.toId);

      return from === undefined || to === undefined ? null : { from, to, kind: relation.kind };
    })
    .filter((edge): edge is TechnologyEdge => edge !== null);

  const resolved = resolveProfiles(
    summaries.map((summary) => ({
      slug: summary.slug,
      label: summary.label,
      description: summary.description,
      surfaces: new Set(summary.surfaces),
      primary: new Set(summary.primary),
      listed: new Set(summary.listed),
    })),
    edges,
  );

  return summaries
    .map((profile) => ({ profile, focus: resolved.get(profile.slug) ?? EMPTY_FOCUS }))
    .filter((entry) => entry.focus.all.size > 0);
}

/* -------------------------------------------------------------------------
 * Composition root for the owner's CMS
 *
 * The same seam `infrastructure/email` uses, with the same rules: the adapter is
 * named by an environment variable, the default is the one the project has
 * always run, and a selector that names nothing is a deployment error rather than
 * a fallback.
 * ---------------------------------------------------------------------- */

/** Environment variable selecting the CMS storage adapter. */
export const CMS_STORAGE_ENV = "CMS_STORAGE";

/**
 * The wired adapter, or why this deployment cannot have one.
 *
 * `configured: false` is a statement about environment variables, so it is safe
 * to log and safe to answer with a `503`: it names the deployment and never the
 * request. An unrecognised selector resolves to nothing — *not* to the default.
 * Silently running the Supabase adapter on a deployment whose operator asked for
 * something else is worse than an endpoint that says it is misconfigured, which is
 * the same argument ADR-006 makes for `EMAIL_SENDER`.
 */
export type PostRepositoryResolution =
  | {
      readonly configured: true;
      readonly adapterId: PostAdapterId;
      readonly repository: PostRepository;
    }
  | {
      readonly configured: false;
      readonly adapterId: PostAdapterId;
      readonly reason: string;
    };

/**
 * One in-memory store per process, on purpose.
 *
 * A fresh store per call would make the CMS unusable in the one configuration it
 * exists for: create a post, list the CMS, and the post is gone because the
 * request that listed it built a different store. Tests that need an isolated
 * store construct `InMemoryPostRepository` directly.
 */
let memoryRepository: InMemoryPostRepository | null = null;

/**
 * Builds the adapter this deployment asked for, or explains why it cannot.
 *
 * Read from `env` rather than `process.env` at the top level so a test can prove
 * each branch without a child process.
 */
export function resolvePostRepository(
  env: EnvironmentLike = process.env,
): PostRepositoryResolution {
  const requested = env[CMS_STORAGE_ENV];
  const selector = typeof requested === "string" ? requested.trim().toLowerCase() : "";

  if (selector !== "" && !isPostAdapterId(selector)) {
    return {
      configured: false,
      adapterId: DEFAULT_POST_ADAPTER_ID,
      reason: `${CMS_STORAGE_ENV}="${selector}" is not a known adapter (${POST_ADAPTER_IDS.join(", ")})`,
    };
  }

  const adapterId: PostAdapterId = isPostAdapterId(selector) ? selector : DEFAULT_POST_ADAPTER_ID;

  if (adapterId === "memory") {
    memoryRepository ??= new InMemoryPostRepository();

    return { configured: true, adapterId, repository: memoryRepository };
  }

  /*
   * **The secret key, on purpose.** The migration revokes every grant on
   * `blog_post_drafts` from `anon` and `authenticated` and creates no policy, so
   * there is no key a browser could hold that would read or write an unpublished
   * post. The publishable key that the public article repository uses is
   * therefore useless here by construction, and using it would mean loosening the
   * migration.
   *
   * The pair read is the same one `isAuthEnabled()` reads, which means "auth is
   * configured" and "the CMS can be written" are the same statement — there is no
   * deployment where the owner can sign in and then find the editor broken.
   */
  const config = supabaseConfigFromEnv(env);

  if (!config.configured) {
    return {
      configured: false,
      adapterId,
      reason: `set SUPABASE_URL and SUPABASE_SECRET_KEY, or set ${CMS_STORAGE_ENV}=memory to store posts in this process`,
    };
  }

  const client = createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }) as unknown as PostCmsClient;

  return { configured: true, adapterId, repository: new SupabasePostRepository(client) };
}

/**
 * The CMS repository, or `null` when this deployment has none.
 *
 * `null` rather than a throw, so the endpoint answers `503 cms_not_configured`
 * instead of a `500` from a missing environment variable. The reason is logged
 * here, once per call, because `null` on its own tells the operator nothing about
 * which of the two failure modes they are in.
 *
 * Not cached, unlike the article repository. `createClient` opens no connection,
 * so there is nothing to save, and a cached answer derived from `process.env`
 * cannot be re-derived by a test or by a runtime secret reload.
 */
export function getPostRepository(env: EnvironmentLike = process.env): PostRepository | null {
  const resolution = resolvePostRepository(env);

  if (resolution.configured) {
    return resolution.repository;
  }

  console.error(`[cms] no storage adapter: ${resolution.reason}`);

  return null;
}
