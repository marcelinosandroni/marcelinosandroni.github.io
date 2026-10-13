import {
  supabaseConfigFromEnv,
  supabaseRestBase,
  type EnvironmentLike,
} from "@/infrastructure/supabase/server";

/**
 * Whether the deployment can reach its database, and what is on the other side.
 *
 * ## Why this is a `security definer` function and not a table read
 *
 * Because the authoritative ledger — `supabase_migrations.schema_migrations`, which
 * the Supabase CLI maintains and which is what `db push` consults — cannot be read
 * over PostgREST. Measured rather than assumed: selecting from that schema answers
 * `PGRST106 Invalid schema`, because PostgREST only serves schemas in the project's
 * `db-schemas` setting and that is not one of them. Adding it there would expose the
 * CLI's own bookkeeping to every publishable key.
 *
 * `public.owner_database_status()` reads the ledger from inside the database and
 * returns three numbers, with `execute` revoked from `anon`, `authenticated` and
 * `public`. This adapter calls it with the **secret** key, which bypasses the
 * execute grant — the same arrangement the CMS uses, and for the same reason: the
 * server checks the owner session and the database never sees a request that did
 * not pass.
 *
 * ## Why every field is nullable
 *
 * Because "cannot reach the database" and "reached it, and here is the answer" are
 * different facts and a panel that collapses them would report a healthy database
 * whenever the network happened to be up. `unreachable` is a first-class state here
 * rather than an error to swallow.
 */
export type DatabaseStatus =
  | {
      readonly reachable: true;
      /** Migrations recorded as applied by the Supabase CLI. */
      readonly appliedCount: number;
      /** The newest migration version, e.g. `20261004000100`. Empty when none. */
      readonly latestVersion: string;
      /** PostgreSQL server version, e.g. `17.6`. */
      readonly serverVersion: string;
      /** `pgcrypto` extension version — present because a migration creates it. */
      readonly extensionVersion: string;
    }
  | {
      readonly reachable: false;
      /** Why it could not be read, in one line, safe to show the owner. */
      readonly reason: string;
    };

const STATUS_FUNCTION = "owner_database_status";

/**
 * The shape this adapter asks PostgREST for.
 *
 * Declared structurally rather than reusing the Supabase client type, so the
 * adapter can be handed a stub in a test without standing up a database — the same
 * arrangement the CMS repository uses.
 */
export type DatabaseStatusClient = {
  rpc(
    fn: string,
  ): Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

/**
 * Reads the status, or says why it could not.
 *
 * Never throws. This is called from a Server Component that also has to render the
 * rest of the owner area, and a diagnostic that can take the page down is not a
 * diagnostic.
 */
export async function readDatabaseStatus(
  client: DatabaseStatusClient,
): Promise<DatabaseStatus> {
  let response: Awaited<ReturnType<DatabaseStatusClient["rpc"]>>;

  try {
    response = await client.rpc(STATUS_FUNCTION);
  } catch (cause) {
    // A fetch failure rejects rather than resolving with an error.
    return { reachable: false, reason: causeMessage(cause) };
  }

  if (response.error !== null) {
    return { reachable: false, reason: response.error.message ?? response.error.code ?? "unknown error" };
  }

  const row = firstRow(response.data);

  if (row === null) {
    return { reachable: false, reason: "the status function returned no row" };
  }

  return {
    reachable: true,
    appliedCount: toCount(row.applied_count),
    latestVersion: toText(row.latest_version),
    serverVersion: toText(row.server_version),
    extensionVersion: toText(row.schema_version),
  };
}

/**
 * A client built from the secret key, or the reason there is none.
 *
 * Returns a discriminated result rather than `null` because "not configured" and
 * "configured but unreachable" read differently on the panel, and a single `null`
 * would make both say the same thing.
 */
export function databaseStatusClient(
  env: EnvironmentLike = process.env,
): { client: DatabaseStatusClient } | { reason: string } {
  const config = supabaseConfigFromEnv(env);

  if (!config.configured) {
    /*
      `supabaseConfigFromEnv` names the two variables and nothing else, which is the
      right discipline for a log line and not enough for a page: this string is shown
      to the owner, who is trying to work out why a panel is empty. So it says which
      pair, and that the status function needs the secret one — the publishable key
      is enough to reach the public tables and not enough to call this.
     */
    return {
      reason:
        "SUPABASE_URL and SUPABASE_SECRET_KEY are not both set. The status function runs as a " +
        "deny-all function, so it needs the secret key rather than the publishable one.",
    };
  }

  const restUrl = supabaseRestBase(config.url);

  /*
    A direct POST rather than `createClient`.

    The status panel used to build a `supabase-js` client, which resolves
    `new URL('rest/v1', url)` against the project URL. Against the local stack
    that asks for `<host>/rest/v1` on a port whose PostgREST is mounted at the
    root, so it 404s and the panel reports UNREACHABLE for a database that is
    right there. Against the hosted project it is correct — which is why the panel
    said UNREACHABLE locally and CONNECTED in production, on the same code.

    `POST <rest>/rpc/<fn>` is the whole of what `client.rpc(fn)` did here, so the
    port above and its tests are unchanged by this.
  */
  const client: DatabaseStatusClient = {
    rpc: async (fn: string) => {
      const response = await fetch(`${restUrl}/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: config.secretKey,
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: {
            code: String(response.status),
            message:
              typeof body === "object" && body !== null && "message" in body
                ? String((body as { message: unknown }).message)
                : response.statusText,
          },
        };
      }

      return { data: body, error: null };
    },
  };

  return { client };
}

/** The first row, whatever shape PostgREST hands it back. */
function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const [first] = data;

    return typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
  }

  return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
}

/** A count, with a negative or unreadable one reported as zero rather than as `NaN`. */
function toCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** One line, never a stack. This string is rendered on the page. */
function causeMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }

  return typeof cause === "string" && cause !== "" ? cause : "the request failed for an unknown reason";
}