import { requireSupabaseReadConfig } from "@/infrastructure/supabase/server";

/**
 * PostgREST over `fetch`, for every table read and write on the server.
 *
 * ## Why this exists instead of `supabase-js`
 *
 * Because `supabase-js` assumes one project address serves every API, and
 * Supabase does not work that way:
 *
 * | API | hosted | local Docker stack |
 * |---|---|---|
 * | auth, realtime, storage | `/auth/v1`, `/realtime/v1`, `/storage/v1` | not used |
 * | PostgREST (tables) | `/rest/v1` | the **root** of its own port |
 *
 * It resolves all five off the same base, so a `SUPABASE_URL` correct for one is
 * wrong for the other. That produced two deployments that were each half-broken
 * with nothing reporting it — the hosted one serving the versioned résumé
 * catalog while its database held the owner's edits, and the local one reporting
 * the database unreachable while it was right there.
 *
 * `supabaseRestBase` resolves the disagreement once; this type then reads from
 * whatever base it is given and adds no opinion of its own. `supabase-js` stays
 * for auth and realtime, which genuinely need a client and genuinely want the
 * project base.
 *
 * ## Why it implements four ports instead of replacing them
 *
 * Because each adapter already declares the exact surface it calls
 * (`PostCmsClient`, `CountableClient`, `FeedbackClient`, `DatabaseStatusClient`).
 * Narrow declarations written before this existed are what kept the adapters
 * honest, and they are what stops this growing into a second SDK. If an adapter
 * needs a verb that is not here, the right answer is usually a new method on the
 * port it already declares — reviewed, typed, and tested — rather than a wider
 * `any`.
 */
export interface PostgrestResult {
  data: unknown;
  error: { message: string } | null;
}

export interface PostgrestFilter extends PromiseLike<PostgrestResult> {
  select(columns: string): PostgrestFilter;
  eq(column: string, value: unknown): PostgrestFilter;
  order(column: string, options: { ascending: boolean }): PostgrestFilter;
  limit(count: number): PostgrestFilter;
  maybeSingle(): PromiseLike<PostgrestResult>;
}

export interface PostgrestReturning {
  select(columns: string): PostgrestFilter;
}

export interface PostgrestTable {
  select(columns: string): PostgrestFilter;
  insert(values: Record<string, unknown>): PostgrestReturning;
  upsert(values: Record<string, unknown>, options: { onConflict: string }): PostgrestReturning;
  update(values: Record<string, unknown>): PostgrestFilter;
  delete(): PostgrestFilter;
}

export interface PostgrestClient extends PostgrestTableHost {
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

interface PostgrestTableHost {
  from(table: string): PostgrestTable;
}

type Verb = "GET" | "POST" | "PATCH" | "DELETE";

/**
 * The mutable half of a PostgREST query.
 *
 * One object carries the verb, the filters and the body, and every builder method
 * returns it. That is what makes the chain `update(...).eq(...).select(...)` work
 * without each link needing a reference to the next — the same reason the
 * supabase builder is chainable, and the reason the adapters did not have to be
 * rewritten to use this instead.
 */
class TableBuilder implements PostgrestFilter, PostgrestReturning {
  private verb: Verb = "GET";
  private params = new URLSearchParams();
  private body: unknown = null;
  private returning = false;

  constructor(
    private readonly base: string,
    private readonly key: string,
    private readonly table: string,
  ) {}

  select(columns: string): PostgrestFilter {
    this.params.set("select", columns);

    /*
      A `select` after a mutating verb is PostgREST's way of saying "send the rows
      back", which is what makes read-after-write possible in one round trip. It
      needs the `Prefer` header as well — without it the verb succeeds and the
      body is empty, which reads as "the write silently did nothing".
    */
    if (this.verb !== "GET") {
      this.returning = true;
    }

    return this;
  }

  insert(values: Record<string, unknown>): PostgrestReturning {
    this.verb = "POST";
    this.body = [values];

    return this;
  }

  upsert(values: Record<string, unknown>, options: { onConflict: string }): PostgrestReturning {
    this.verb = "POST";
    this.body = [values];
    this.params.set("on_conflict", options.onConflict);

    return this;
  }

  update(values: Record<string, unknown>): PostgrestFilter {
    this.verb = "PATCH";
    this.body = values;

    return this;
  }

  delete(): PostgrestFilter {
    this.verb = "DELETE";

    return this;
  }

  eq(column: string, value: unknown): PostgrestFilter {
    this.params.set(column, `eq.${encodeURIComponent(String(value))}`);

    return this;
  }

  order(column: string, options: { ascending: boolean }): PostgrestFilter {
    this.params.set("order", `${column}.${options.ascending ? "asc" : "desc"}`);

    return this;
  }

  limit(count: number): PostgrestFilter {
    this.params.set("limit", String(count));

    return this;
  }

  maybeSingle(): PromiseLike<PostgrestResult> {
    return this.run({ single: true });
  }

  /** Awaiting the builder runs it — `await client.from(t).select(...)`. */
  then<TResult1 = PostgrestResult, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run({ single: false }).then(onfulfilled, onrejected);
  }

  private async run({ single }: { single: boolean }): Promise<PostgrestResult> {
    const query = this.params.toString();
    const url = `${this.base}/${this.table}${query === "" ? "" : `?${query}`}`;

    const headers: Record<string, string> = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      Accept: single ? "application/vnd.pgrst.object+json" : "application/json",
    };

    if (this.body !== null) {
      headers["Content-Type"] = "application/json";
    }

    if (this.returning) {
      headers.Prefer = "return=representation";
    }

    const response = await fetch(url, {
      method: this.verb,
      headers,
      ...(this.body === null ? {} : { body: JSON.stringify(this.body) }),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      /*
        `maybeSingle` asks for one row and PostgREST answers 406 `PGRST116` when
        there is none. That is the whole point of the variant — "absent" is an
        answer, not an error — so it is translated here rather than at each call
        site, which is where the previous implementation put it.
      */
      if (single && isNoRows(payload)) {
        return { data: null, error: null };
      }

      return { data: null, error: toPostgrestError(payload, response.status) };
    }

    return { data: payload, error: null };
  }
}

function isNoRows(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    (payload as { code: unknown }).code === "PGRST116"
  );
}

function toPostgrestError(payload: unknown, status: number): { message: string } {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    return { message: String((payload as { message: unknown }).message) };
  }

  return { message: `PostgREST answered ${status}` };
}

/**
 * Builds the shared client against one PostgREST base and key.
 *
 * The base comes from `supabaseRestBase` and the key from whichever of the two
 * the caller is exercising — the publishable one for reads behind RLS, the secret
 * one for writes and for deny-all functions. Choosing the wrong one is a silent
 * "no rows" rather than an error, which is why it stays a parameter of each
 * composition root instead of being guessed from the verb here.
 */
export function createPostgrestClient(base: string, key: string): PostgrestClient {
  return {
    from: (table: string) => new TableBuilder(base.replace(/\/+$/, ""), key, table),
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      const response = await fetch(`${base.replace(/\/+$/, "")}/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);

        return { error: toPostgrestError(payload, response.status) };
      }

      return { error: null };
    },
  };
}

/**
 * The content-read client, cached.
 *
 * Built from the publishable key rather than the secret one so every query stays
 * behind row level security: the migration grants the anonymous role read access
 * deliberately, which means a mistake in a content query returns nothing instead
 * of returning a draft.
 *
 * Resolved inside the call that queries, never at module scope, so a missing
 * configuration throws where the composition root can catch it rather than while
 * a module is being loaded.
 */
let contentClient: PostgrestClient | null = null;

export function getPostgrestContentClient(): PostgrestClient {
  if (contentClient === null) {
    const { restUrl, publishableKey } = requireSupabaseReadConfig();

    contentClient = createPostgrestClient(restUrl, publishableKey);
  }

  return contentClient;
}

/**
 * The four adapters that read or write tables, served by this client.
 *
 * ## Why this is a comment and not a compile-time assertion
 *
 * Because it is not one, and claiming otherwise would be worse than leaving it
 * out. An earlier version asserted `PostgrestClient extends XClient ? true : false`
 * and that assertion was *false* for three of the four — which is the useful part:
 *
 * - `CountableClient.upsert` takes an **array** and returns a real `Promise`;
 *   `PostCmsClient.upsert` takes a **single object** and returns a chainable
 *   builder. One method cannot be both without widening to `any`.
 * - Both narrow ports require `data` already typed as `Array<Record<string, unknown>>`,
 *   because `supabase-js` is generic over the schema and the ports were written
 *   against its inference. This client's `data` is `unknown`, which is what a
 *   client that cannot know the schema should return.
 *
 * Satisfying them statically would mean `any` at the seam, which trades a
 * compile-time error for a runtime one — the opposite of the point. So each
 * composition root narrows with `as unknown as XClient`, the cast that was already
 * there for exactly this reason, and `tests/unit/infrastructure/postgrest.test.ts`
 * pins the runtime behaviour these ports depend on: the verbs, the headers, and
 * what `maybeSingle` does with a missing row.
 */