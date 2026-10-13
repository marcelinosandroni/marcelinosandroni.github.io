import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase access, server-side only.
 *
 * ## Why nothing here is `NEXT_PUBLIC_`
 *
 * The Vercel Supabase integration provides the same two values twice: as
 * `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, and as
 * `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only the
 * `NEXT_PUBLIC_` forms are inlined into the client bundle, which is a permanent
 * and unavoidable exposure to anyone who views source.
 *
 * This site does not need a browser-side Supabase client. Owner sign-in is
 * requested from a Route Handler precisely so the allowlist is evaluated
 * *before* a message is sent, and the session is read from a Server Component.
 * So the `SUPABASE_` pair is sufficient on its own and the browser bundle
 * contains no Supabase credential at all.
 *
 * That is not a stylistic preference. A publishable key in client code is
 * acceptable, but there is no reason to ship one when no browser code calls the
 * API.
 */

/** Environment variable holding the project URL. */
export const SUPABASE_URL_ENV = "SUPABASE_URL";

/**
 * Environment variable holding the publishable key.
 *
 * This is what the article, resume and artifact repositories read with. It is
 * subject to row level security, and the migration grants the anonymous role
 * read access on purpose — so a bug in a content query returns nothing rather
 * than returning a draft.
 *
 * It is the *server-side* name, not `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The
 * `NEXT_PUBLIC_` variant exists so a browser can hold the key; nothing in this
 * codebase queries Supabase from a browser, so using it would ship a credential
 * for no reason.
 */
export const SUPABASE_PUBLISHABLE_KEY_ENV = "SUPABASE_PUBLISHABLE_KEY";

/**
 * Environment variable holding the server-side secret key.
 *
 * Named `SECRET_KEY` rather than `SERVICE_ROLE_KEY` because that is what
 * Supabase now calls it: same privilege, current name. It bypasses row level
 * security, so it must never reach a browser.
 *
 * Only the auth path uses it, and only because Supabase's auth endpoints
 * require a privileged key when the exchange happens on the server. It is not
 * used for content reads, which stay behind RLS on purpose.
 */
export const SUPABASE_SECRET_KEY_ENV = "SUPABASE_SECRET_KEY";

/**
 * Optional override for the PostgREST base.
 *
 * Set it only when {@link supabaseRestBase} cannot work out the right answer for
 * a deployment — a self-hosted Supabase reached through a proxy that mounts
 * PostgREST somewhere other than `/rest/v1`, for instance. The derivation below
 * handles both the hosted project and the local Docker stack, so a normal
 * deployment never needs this.
 *
 * It exists as an escape hatch *and* as documentation: the fact that a variable
 * can be set to contradict the derivation is what makes the derivation's
 * heuristic safe to rely on.
 */
export const SUPABASE_REST_URL_ENV = "SUPABASE_REST_URL";

/**
 * The PostgREST base for a project URL — the root under which tables live.
 *
 * ## Why this is not `url`
 *
 * Because Supabase serves two APIs from one project address and they are **not**
 * at the same path, which is the whole reason this function exists.
 *
 * | API | hosted | local Docker stack |
 * |---|---|---|
 * | auth, realtime, storage | `/auth/v1`, `/realtime/v1`, `/storage/v1` | not used |
 * | PostgREST (tables) | `/rest/v1` | the **root** — the container publishes no prefix |
 *
 * `supabase-js` assumes the two coincide: it resolves `new URL('rest/v1', url)`
 * against the project URL and gets auth, realtime and storage the same way. That
 * assumption is why there is one variable and one convention for a project that
 * needs two. It is also why the two deployments disagreed:
 *
 * - **hosted** — `supabase-js` correct, a bare `fetch` to `<url>/<table>` 404s
 * - **local** — a bare `fetch` correct, `supabase-js` appends `/rest/v1` and 404s
 *
 * Neither deployment was misconfigured in the sense of a typo. Each was correct
 * for the reader it happened to exercise, and silently wrong for the other.
 *
 * ## The rule
 *
 * Explicit override, else the URL as given when it already carries the REST
 * path or points at the local stack, else `/rest/v1` appended.
 *
 * The local test is `http` plus a loopback host. That is a heuristic and it is
 * written down as one: the local stack is plain HTTP on a high port and a hosted
 * project is HTTPS on 443 behind a gateway that routes by path. Guessing wrong
 * in the hosted direction costs a 404 that the admin's source panel now reports,
 * which is the failure mode this whole arrangement exists to stop being silent.
 */
export function supabaseRestBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");

  if (trimmed.endsWith(REST_PATH)) {
    return trimmed;
  }

  if (isLoopbackHttp(trimmed)) {
    return trimmed;
  }

  return `${trimmed}${REST_PATH}`;
}

/** The path PostgREST is mounted at behind the hosted gateway. */
const REST_PATH = "/rest/v1";

function isLoopbackHttp(url: string): boolean {
  if (!url.startsWith("http://")) {
    return false;
  }

  try {
    const host = new URL(url).hostname;

    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  } catch {
    return false;
  }
}

export type SupabaseConfig =
  | { readonly configured: true; readonly url: string; readonly secretKey: string }
  | { readonly configured: false };

/** The pair content reads need. */
export type SupabaseReadConfig =
  | {
      readonly configured: true;
      /** The project base, for `supabase-js` — auth, realtime, storage. */
      readonly url: string;
      /** The PostgREST base, for a direct `fetch`. See {@link supabaseRestBase}. */
      readonly restUrl: string;
      readonly publishableKey: string;
    }
  | { readonly configured: false };

/**
 * A subset of the process environment.
 *
 * Narrower than `NodeJS.ProcessEnv` on purpose: it is exactly what these
 * functions read, and it lets a test pass a literal without casting a partial
 * environment into a type that promises every key of `ProcessEnv`.
 */
export type EnvironmentLike = Readonly<Record<string, string | undefined>>;

function readEnv(env: EnvironmentLike, key: string): string | null {
  const value = env[key];

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/**
 * Reads the pair auth needs, or reports it absent.
 *
 * One definition of "configured" for the whole codebase. A partial
 * configuration has to read as *absent*, because a client built from one value
 * and no other throws from inside the library rather than degrading.
 */
export function supabaseConfigFromEnv(env: EnvironmentLike = process.env): SupabaseConfig {
  const url = readEnv(env, SUPABASE_URL_ENV);
  const secretKey = readEnv(env, SUPABASE_SECRET_KEY_ENV);

  if (url === null || secretKey === null) {
    return { configured: false };
  }

  return { configured: true, url, secretKey };
}

/**
 * Reads the pair content reads need, or reports it absent.
 *
 * Separate from {@link supabaseConfigFromEnv} because the two answer different
 * questions. A deployment can serve the whole site from the versioned content
 * catalog with no database at all, and an owner-only deployment may want auth
 * without the database. Conflating them would make one of those two
 * configurations look broken.
 */
export function supabaseReadConfigFromEnv(env: EnvironmentLike = process.env): SupabaseReadConfig {
  const url = readEnv(env, SUPABASE_URL_ENV);
  const publishableKey = readEnv(env, SUPABASE_PUBLISHABLE_KEY_ENV);

  if (url === null || publishableKey === null) {
    return { configured: false };
  }

  /*
    The override is used **verbatim**, not run through {@link supabaseRestBase}.

    That is the difference between an override and a hint. Someone who set it has
    already looked at where their PostgREST is mounted; appending `/rest/v1` to
    their answer would make the variable useless for the one case it exists to
    serve — a deployment that mounts it somewhere the rule cannot guess — and
    would do so silently, as a 404.
  */
  const override = readEnv(env, SUPABASE_REST_URL_ENV);

  return {
    configured: true,
    url,
    restUrl: override ?? supabaseRestBase(url),
    publishableKey,
  };
}

/** Whether owner authentication can work on this deployment. */
export function isSupabaseConfigured(env: EnvironmentLike = process.env): boolean {
  return supabaseConfigFromEnv(env).configured;
}

/** Whether the Supabase content repositories can be loaded. */
export function isSupabaseContentConfigured(env: EnvironmentLike = process.env): boolean {
  return supabaseReadConfigFromEnv(env).configured;
}

/** The auth configuration, or `null` when absent. */
export function requireSupabaseConfig(env: EnvironmentLike = process.env): {
  url: string;
  secretKey: string;
} {
  const config = supabaseConfigFromEnv(env);

  if (!config.configured) {
    throw new Error(
      `Supabase is not configured: set ${SUPABASE_URL_ENV} and ${SUPABASE_SECRET_KEY_ENV}.`,
    );
  }

  return { url: config.url, secretKey: config.secretKey };
}

/** The content-read configuration, or `null` when absent. */
export function requireSupabaseReadConfig(env: EnvironmentLike = process.env): {
  url: string;
  restUrl: string;
  publishableKey: string;
} {
  const config = supabaseReadConfigFromEnv(env);

  if (!config.configured) {
    throw new Error(
      `Supabase content is not configured: set ${SUPABASE_URL_ENV} and ${SUPABASE_PUBLISHABLE_KEY_ENV}.`,
    );
  }

  return {
    url: config.url,
    restUrl: config.restUrl,
    publishableKey: config.publishableKey,
  };
}

/**
 * Builds a Supabase client bound to the request cookies.
 *
 * `getAll`/`setAll` rather than the older `get`/`set` pair, which
 * `@supabase/ssr` has deprecated and will remove: the batch form is what lets a
 * token refresh be written back in the same response that read it.
 *
 * A new client per call, never a module-level singleton — a cached client would
 * carry one visitor's cookies into another visitor's request.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, secretKey } = requireSupabaseConfig();
  const store = await cookies();

  return createServerClient(url, secretKey, {
    auth: {
      // The session lives in these cookies already. Letting the client also
      // persist it would put a second copy in `localStorage`, where it cannot
      // be revoked server-side.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    cookies: {
      getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (values: Array<{ name: string; value: string; options?: unknown }>) => {
        for (const { name, value, options } of values) {
          try {
            store.set(name, value, options as Parameters<typeof store.set>[2]);
          } catch {
            /*
             * A Server Component cannot write cookies, and `setAll` throwing
             * there is expected rather than a fault. It does mean a token
             * refreshed during a Server Component read is not persisted, so the
             * session ends when the access token expires. For a single-owner
             * page that is a sign-in again, not a broken feature — and it is
             * preferable to refreshing in `proxy.ts`, which would put a Supabase
             * round trip in front of every public page and undo the static
             * rendering the whole site is built on.
             */
          }
        }
      },
    },
  });
}
