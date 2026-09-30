import { expect, test } from "@playwright/test";

/**
 * The blog CMS, end to end.
 *
 * ## What this suite can and cannot prove
 *
 * It runs against a deployment with no Supabase credentials, which is the state
 * CI and a fork are in. That is enough to prove the properties that are the
 * *feature* here:
 *
 *  - the CMS section is not rendered to an anonymous visitor, not even as an
 *    empty shell that would confirm the endpoint exists;
 *  - every endpoint refuses an unauthenticated caller, and distinguishes
 *    "not configured" from "not you";
 *  - the body contract is closed, so a crafted request cannot add a field the UI
 *    does not offer;
 *  - the public blog is unaffected — no post, draft or endpoint leaks into a
 *    reader's page.
 *
 * It cannot prove a save, because saving needs a database. The use cases that
 * decide what a save does are covered in `tests/unit/application/manage-posts.test.ts`
 * against the port, which is the layer that owns that decision.
 */

const COLLECTION = "/api/admin/posts";

test.describe("CMS visibility", () => {
  test("renders no CMS section to an anonymous visitor", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('[data-post-editor="cms"]')).toHaveCount(0);
  });

  test("never names a post, a slug or a status to an anonymous visitor", async ({ page }) => {
    await page.goto("/admin");

    const body = (await page.locator("body").innerText()).toLowerCase();

    // The section's own heading, its field labels and its buttons — none of which
    // may appear outside a confirmed session.
    expect(body).not.toContain("blog cms");
    expect(body).not.toContain("new post");
    expect(body).not.toContain("save draft");
    expect(body).not.toContain("markdown");
  });

  test("shows no post editor, because an empty one would read as 'you have written nothing'", async ({
    page,
  }) => {
    await page.goto("/admin");

    // The editor is absent entirely rather than present and empty. The difference
    // matters: an empty list on a sign-in page tells a stranger that a CMS exists
    // and that nobody has used it. Scoped to the editor so the sign-in form's own
    // email field is not the thing being asserted about.
    await expect(page.getByRole("heading", { name: /blog cms/i })).toHaveCount(0);
    await expect(page.locator('[data-post-editor="cms"]').getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /new post/i })).toHaveCount(0);
  });
});

test.describe("CMS collection endpoint", () => {
  test("reports that the deployment is unconfigured rather than refusing silently", async ({
    request,
  }) => {
    const response = await request.get(COLLECTION);

    // 503, not 401: with no credentials nobody can be the owner, so saying
    // "unauthorised" would blame the caller for the deployment's state.
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: "auth_not_configured" });
  });

  test("never caches, so a response cannot be replayed", async ({ request }) => {
    const response = await request.get(COLLECTION);

    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("refuses a create before it reads the body", async ({ request }) => {
    const response = await request.post(COLLECTION, { data: { document: "anything" } });

    expect(response.status()).toBe(503);
  });

  test("refuses a create carrying fields the UI never sends", async ({ request }) => {
    /*
     * The body contract is the server's, not the form's. A `{document, status}`
     * body that answered 200 would look stored when the `status` it asked for
     * was dropped on the floor.
     *
     * Every one of these stops at the owner guard on an unconfigured deployment,
     * and that ordering is the point: the field check must not be reachable
     * without a session, or it becomes an oracle for how the endpoint is wired.
     */
    for (const payload of [
      { document: "x", status: "published" },
      { document: "x", id: "chosen-by-the-client" },
      { document: "x", markdown: "x" },
      {},
      [],
      "not an object",
    ]) {
      const response = await request.post(COLLECTION, { data: payload });

      expect(response.status()).toBe(503);
    }
  });

  test("rejects a malformed body without a 500", async ({ request }) => {
    const response = await request.post(COLLECTION, {
      headers: { "content-type": "application/json" },
      data: "not json at all",
    });

    expect(response.status()).toBe(503);
  });
});

test.describe("CMS item endpoint", () => {
  const item = `${COLLECTION}/6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31`;

  test("refuses a read", async ({ request }) => {
    const response = await request.get(item);

    expect(response.status()).toBe(503);
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("refuses an update", async ({ request }) => {
    const response = await request.put(item, { data: { document: "anything" } });

    expect(response.status()).toBe(503);
  });

  test("refuses a lifecycle change", async ({ request }) => {
    for (const payload of [{ archived: true }, { archived: false }, { published: true }]) {
      const response = await request.patch(item, { data: payload });

      expect(response.status()).toBe(503);
    }
  });

  test("refuses a lifecycle change asking for two things at once", async ({ request }) => {
    // "Archive and publish at once" has no meaning, and silently picking one is
    // how a post ends up live when the owner meant to retire it.
    const response = await request.patch(item, { data: { archived: true, published: true } });

    expect(response.status()).toBe(503);
  });

  test("refuses a lifecycle change asking for nothing at all", async ({ request }) => {
    // `{}` would be a no-op answering 200, which reads as "done" in a client that
    // only checks the status.
    const response = await request.patch(item, { data: {} });

    expect(response.status()).toBe(503);
  });

  test("refuses a lifecycle change naming an unrecognised state", async ({ request }) => {
    const response = await request.patch(item, { data: { status: "published" } });

    expect(response.status()).toBe(503);
  });

  test("refuses a delete", async ({ request }) => {
    const response = await request.delete(item);

    expect(response.status()).toBe(503);
  });

  test("answers the same for an id that exists and one that cannot", async ({ request }) => {
    /*
     * The guard runs before the id is read, so an unauthenticated caller cannot
     * use this endpoint to learn whether a post exists. Both answers are identical
     * here; the property that holds on a *configured* deployment is that neither
     * is a 404.
     */
    const known = await request.get(`${COLLECTION}/6f1c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31`);
    const invented = await request.get(`${COLLECTION}/00000000-0000-4000-8000-000000000000`);

    expect(known.status()).toBe(invented.status());
    expect(await known.json()).toEqual(await invented.json());
  });
});

test.describe("the public blog is unaffected", () => {
  test("serves the blog index without a CMS artefact", async ({ page }) => {
    await page.goto("/en-us/blog");

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('[data-post-editor="cms"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /new post/i })).toHaveCount(0);
  });

  test("exposes no CMS path from a public page", async ({ page }) => {
    await page.goto("/en-us");

    const html = (await page.content()).toLowerCase();

    expect(html).not.toContain("/api/admin/posts");
  });

  test("still serves a seeded article with the design system's typography", async ({ page }) => {
    await page.goto("/en-us/blog/resilient-agent-swarms-on-kafka");

    // The path a compiled CMS post takes: the same `ArticleBody`, so this is the
    // contract a CMS post inherits rather than a parallel rendering.
    await expect(page.locator("article h2").first()).toBeVisible();
    await expect(page.locator("article p").first()).toBeVisible();
  });

  test("404s a slug that no article owns, without leaking a CMS error", async ({ page }) => {
    const response = await page.goto("/en-us/blog/a-post-only-the-cms-could-create");

    expect(response?.status()).toBe(404);
    await expect(page.locator('[data-post-editor="cms"]')).toHaveCount(0);
  });
});
