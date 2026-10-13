import { afterEach, describe, expect, it, vi } from "vitest";

import { createPostgrestClient } from "@/infrastructure/supabase/postgrest";

/**
 * The PostgREST client that every table read and write now goes through.
 *
 * ## Why these tests are behavioural and not type-level
 *
 * Because the four ports this client serves (`PostCmsClient`, `CountableClient`,
 * `FeedbackClient`) are structurally satisfied but statically narrower than it —
 * they pin `data` to an array because `supabase-js` is generic over the schema,
 * and they disagree among themselves about whether `upsert` takes one object or
 * an array. Satisfying them would mean `any` at the seam. So the contract is
 * pinned here instead: verbs, headers, query parameters, and the one behaviour
 * that is easy to get wrong and invisible when wrong.
 */
const BASE = "https://abcdefgh.supabase.co/rest/v1";
const KEY = "sb_publishable_test";

function respond(body: unknown, init: ResponseInit = {}): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200, ...init })),
  );
}

function lastCall(): [string, RequestInit] {
  const mock = vi.mocked(fetch);

  return mock.mock.calls[mock.mock.calls.length - 1] as unknown as [string, RequestInit];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the PostgREST client", () => {
  it("reads with the filters as query parameters, not a body", async () => {
    respond([]);
    const client = createPostgrestClient(BASE, KEY);

    await client
      .from("blog_articles")
      .select("id,title")
      .eq("locale", "pt-BR")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5);

    const [url, init] = lastCall();

    expect(init.method).toBe("GET");
    expect(url).toContain(`${BASE}/blog_articles?`);
    expect(url).toContain("select=id%2Ctitle");
    expect(url).toContain("locale=eq.pt-BR");
    expect(url).toContain("status=eq.published");
    expect(url).toContain("order=published_at.desc");
    expect(url).toContain("limit=5");
    expect(init.body).toBeUndefined();
  });

  it("authenticates both ways, because PostgREST requires the apikey header", async () => {
    respond([]);
    await createPostgrestClient(BASE, KEY).from("blog_articles").select("id");

    const [, init] = lastCall();
    const headers = init.headers as Record<string, string>;

    expect(headers.apikey).toBe(KEY);
    expect(headers.Authorization).toBe(`Bearer ${KEY}`);
  });

  it("posts an insert and asks for the row back", async () => {
    respond({ id: "a" });
    await createPostgrestClient(BASE, KEY).from("blog_post_drafts").insert({ id: "a" }).select("id");

    const [url, init] = lastCall();

    expect(init.method).toBe("POST");
    expect(url).toContain(`${BASE}/blog_post_drafts?select=id`);
    // Without this the write succeeds and the body comes back empty, which reads
    // as "the save did nothing".
    expect((init.headers as Record<string, string>).Prefer).toBe("return=representation");
    expect(init.body).toBe(JSON.stringify([{ id: "a" }]));
  });

  it("sends on_conflict on an upsert, or the counter silently forks", async () => {
    respond([]);
    await createPostgrestClient(BASE, KEY)
      .from("theme_feedback")
      .upsert({ theme: "carbon" }, { onConflict: "theme,verdict" });

    const [url] = lastCall();

    expect(url).toContain("on_conflict=theme%2Cverdict");
  });

  it("patches on an update rather than posting", async () => {
    respond([]);
    await createPostgrestClient(BASE, KEY)
      .from("blog_post_drafts")
      .update({ status: "draft" })
      .eq("id", "7");

    const [url, init] = lastCall();

    expect(init.method).toBe("PATCH");
    expect(url).toContain("id=eq.7");
  });

  it("deletes with the filter attached, never unfiltered", async () => {
    respond([]);
    await createPostgrestClient(BASE, KEY).from("blog_post_drafts").delete().eq("id", "7");

    const [url, init] = lastCall();

    expect(init.method).toBe("DELETE");
    expect(url).toContain("id=eq.7");
  });

  it("reports a missing row as no error, which is what maybeSingle means", async () => {
    /*
      The distinction this preserves: "there is no such draft" and "the query
      failed" are different facts. PostgREST answers 406 `PGRST116` for the first,
      and a CMS that reports it as an error cannot tell an owner that the slug is
      free.
    */
    respond({ code: "PGRST116", message: "no rows" }, { status: 406 });
    const result = await createPostgrestClient(BASE, KEY)
      .from("blog_post_drafts")
      .select("id")
      .maybeSingle();

    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it("still reports a real failure as an error", async () => {
    respond({ message: "permission denied for table blog_post_drafts" }, { status: 401 });

    const result = await createPostgrestClient(BASE, KEY)
      .from("blog_post_drafts")
      .select("id")
      .maybeSingle();

    expect(result.error).toEqual({ message: "permission denied for table blog_post_drafts" });
  });

  it("asks for a single object on maybeSingle", async () => {
    respond({ id: "7" });
    await createPostgrestClient(BASE, KEY).from("blog_post_drafts").select("id").maybeSingle();

    const [, init] = lastCall();

    expect((init.headers as Record<string, string>).Accept).toBe(
      "application/vnd.pgrst.object+json",
    );
  });

  it("calls a database function by POST to the rpc path", async () => {
    respond(null);
    await createPostgrestClient(BASE, KEY).rpc("delete_post_with_article", { post_id: "7" });

    const [url, init] = lastCall();

    expect(url).toBe(`${BASE}/rpc/delete_post_with_article`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ post_id: "7" }));
  });

  it("tolerates a base with a trailing slash", async () => {
    respond([]);
    await createPostgrestClient(`${BASE}/`, KEY).from("blog_articles").select("id");

    const [url] = lastCall();

    expect(url.startsWith(`${BASE}/blog_articles`)).toBe(true);
    expect(url).not.toContain("rest/v1//");
  });
});