import { expect, test, type Page } from "@playwright/test";

/**
 * The chat feature's credential-less contract.
 *
 * This suite runs against a deployment with no Supabase credentials, which is the
 * state CI, a fork and most contributors are in — and it is the state in which a
 * feature like this is most likely to be broken *silently*. A chat that quietly
 * does nothing is indistinguishable from a chat nobody has been offered.
 *
 * So what is asserted here is not the happy path. It is:
 *
 * 1. **An anonymous visitor is offered no chat, and there is nothing to find.**
 *    No launcher, no panel, no marker attribute, no chat in the HTML. Not "hidden"
 *    — absent, because a disabled button is still a promise to a stranger.
 * 2. **The owner's routes refuse with the right status**, and they refuse
 *    *before* reading a body: `503` when nobody can sign in on this deployment,
 *    which is a fact about the environment, and never `401`, which would tell a
 *    stranger that the endpoint is real and their session is merely missing.
 * 3. **The anonymous endpoints stay anonymous and stay strict**: a `400` for a
 *    body carrying anything the contract does not declare, a `503` when there is
 *    no storage, and a `400` for a session id that is not a session id.
 * 4. **The public site is unaffected.** A page that grows a widget, a second
 *    layout or a second render pass is a regression in a site whose main
 *    achievement is that very little ships to the browser.
 */

/** 32 lowercase hex characters — a session id the domain would accept. */
const SESSION = "0f9a3c1b7e2d48a6b0c5e9f1a3d7c2b4";

/** The boot overlay covers the page for a first-time visitor; skip it. */
async function visitHome(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("msd:boot-seen:v1", "1");
    } catch {
      /* private mode */
    }
  });
  await page.goto("/en-us");
}

test.describe("an anonymous visitor is offered no chat", () => {
  test("the home page has no chat launcher at all", async ({ page }) => {
    await visitHome(page);

    // The launcher is the only way into the panel, and it does not exist until the
    // owner has contacted this browser. Absent, not disabled: a greyed-out
    // "Talk to me" is still an invitation nobody intends to honour.
    await expect(page.getByRole("button", { name: /open the direct line/i })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("no chat markup reaches the HTML at all", async ({ page }) => {
    await visitHome(page);

    const html = await page.content();

    // Not `display: none` and not a hidden panel: nothing. The e2e is the only
    // place a claim like "renders nothing" can be checked against real output.
    expect(html).not.toContain("data-chat");
    expect(html).not.toContain('aria-label="Open the direct line"');
  });

  test("the server-rendered document offers a visitor no chat at all", async ({ request }) => {
    /*
     * Asserted on the *markup*, not on the label text.
     *
     * The widget is a Client Component, so its props — including every translated
     * string — are serialized into the RSC payload embedded in the HTML. A visitor
     * viewing source therefore sees "Open the direct line" whether or not anything
     * is rendered, and asserting the string is absent tested the payload rather
     * than the page. What has to be true is that no control exists to click.
     *
     * The claim being protected: before the owner opens a conversation, an
     * anonymous request is never sent a chat.
     */
    const response = await request.get("/en-us");
    const html = await response.text();

    expect(response.status()).toBe(200);

    // No element carrying the widget's hook, and no labelled control.
    expect(html).not.toContain("data-chat");
    expect(html).not.toContain('aria-label="Open the direct line"');
    // And no session id is minted server-side; it is a client concern, made only
    // when the heartbeat is first sent.
    expect(html).not.toContain("msd:visitor-session");
  });

  test("and the hydrated page still shows no chat control", async ({ page }) => {
    /*
     * The same claim against the live DOM, which is the one a reader can act on.
     * On a credential-less deployment the heartbeat answers 204, so the widget can
     * never be offered — this is that end to end.
     */
    await page.goto("/en-us");

    await expect(page.getByRole("button", { name: /open the direct line/i })).toHaveCount(0);
    await expect(page.locator("[data-chat]")).toHaveCount(0);
  });

  test("the visitor's own read says there is no conversation, and never says why", async ({
    request,
  }) => {
    /*
     * The answer is identical for a session that has never existed and one the
     * owner has never contacted. A response that distinguished them would be an
     * oracle for whether a session id is real, and a session id is the only value
     * in this system a stranger might want to guess.
     */
    const read = await request.post("/api/chat/messages", {
      data: { session: SESSION, intent: "read" },
    });

    // 503 rather than 200 here, because this deployment has no database at all and
    // a read that answered "nothing yet" would be indistinguishable from a real one.
    expect(read.status()).toBe(503);
    expect(await read.json()).toEqual({ error: "chat_unavailable" });
  });

  test("the visitor cannot open a conversation, and cannot smuggle the field that would", async ({
    request,
  }) => {
    for (const body of [
      { session: SESSION, intent: "send", text: "hello", state: "open" },
      { session: SESSION, intent: "send", text: "hello", author: "owner" },
      { session: SESSION, intent: "send", text: "hello", automated_notice: "not a machine" },
      { session: SESSION, intent: "open" },
      { session: SESSION },
    ]) {
      const response = await request.post("/api/chat/messages", { data: body });

      // A body outside the declared shape is a `400` before anything is read, which
      // is what makes "a visitor cannot open a conversation" a property of the
      // endpoint rather than of the UI.
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({ error: "invalid_request" });
    }
  });

  test("a malformed body is a 400 and not a 500", async ({ request }) => {
    for (const payload of ["not json at all", "", "[]", "null"]) {
      const response = await request.post("/api/chat/messages", {
        headers: { "content-type": "application/json" },
        data: payload,
      });

      expect(response.status()).toBe(400);
    }
  });
});

test.describe("the presence heartbeat", () => {
  test("answers without a database and never fails the page", async ({ request }) => {
    /*
     * A heartbeat has to be unbreakable: it runs for every visitor of the site, and
     * a page that shows an error because a counter could not be written is a worse
     * outcome than a counter that is missing. `204` here is the whole contract.
     */
    const response = await request.post("/api/presence", { data: { session: SESSION } });

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
  });

  test("never caches, so a stored response cannot be replayed", async ({ request }) => {
    const response = await request.post("/api/presence", { data: { session: SESSION } });

    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("refuses anything but a session id, and refuses a bad one", async ({ request }) => {
    for (const body of [
      {},
      { session: SESSION, lastSeenAt: 1 },
      { session: SESSION, userAgent: "Mozilla/5.0" },
      { session: SESSION, ip: "203.0.113.1" },
      { session: "not-a-session" },
      { session: SESSION.toUpperCase() },
      { session: 42 },
    ]) {
      const response = await request.post("/api/presence", { data: body });

      // The field list *is* the privacy claim: reading only `session` would accept
      // the rest, drop them and answer 204, which would make "no address, no
      // device, no fingerprint" a property of this function's body.
      expect(response.status()).toBe(400);
    }
  });
});

test.describe("owner routes refuse without an owner session", () => {
  /**
   * `503`, not `401`, and the difference is the point.
   *
   * This deployment has no `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, so *nobody* could
   * sign in — not this request, not the owner, not a stranger. `401` would say "you
   * are not the owner", which is a different fact and a false one: it would tell a
   * stranger that the endpoint is real on a deployment where it is not, and tell the
   * owner that their sign-in is broken when it is the environment that is.
   */
  const unconfigured = { status: 503, error: "auth_not_configured" };

  test("the console snapshot is refused", async ({ request }) => {
    const response = await request.get("/api/chat/messages");

    expect(response.status()).toBe(unconfigured.status);
    expect(await response.json()).toEqual({ error: unconfigured.error });
  });

  test("replying is refused", async ({ request }) => {
    const response = await request.put("/api/chat/messages", {
      data: { session: SESSION, text: "I read your message." },
    });

    expect(response.status()).toBe(unconfigured.status);
    expect(await response.json()).toEqual({ error: unconfigured.error });
  });

  test("opening a conversation is refused", async ({ request }) => {
    const response = await request.patch("/api/chat/messages", { data: { session: SESSION } });

    expect(response.status()).toBe(unconfigured.status);
    expect(await response.json()).toEqual({ error: unconfigured.error });
  });

  test("closing a conversation is refused", async ({ request }) => {
    const response = await request.delete(`/api/chat/messages?session=${SESSION}`);

    expect(response.status()).toBe(unconfigured.status);
    expect(await response.json()).toEqual({ error: unconfigured.error });
  });

  test("a refused owner route never leaks whether the body was valid", async ({ request }) => {
    /*
     * The guard runs before the body is read, so a malformed body and a well-formed
     * one are indistinguishable to an unauthenticated caller. That is what stops the
     * endpoint from being a validator for a stranger, and it is why the guard is
     * written first in the route rather than after a parse.
     */
    const valid = await request.patch("/api/chat/messages", { data: { session: SESSION } });
    const invalid = await request.patch("/api/chat/messages", {
      headers: { "content-type": "application/json" },
      data: "not json at all",
    });

    expect(invalid.status()).toBe(valid.status());
    expect(await invalid.json()).toEqual(await valid.json());
  });

  test("every refusal is uncached", async ({ request }) => {
    for (const response of [
      await request.get("/api/chat/messages"),
      await request.put("/api/chat/messages", { data: { session: SESSION, text: "hi" } }),
      await request.patch("/api/chat/messages", { data: { session: SESSION } }),
      await request.delete(`/api/chat/messages?session=${SESSION}`),
    ]) {
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
  });

  test("the admin page still refuses to render the console to an anonymous visitor", async ({
    page,
  }) => {
    await page.goto("/admin");

    // The board, the online count and the availability badge are all inside the
    // `session === null` early return, so an anonymous request never receives a
    // session id, a last-seen time or an availability state in its payload.
    await expect(page.locator("[data-chat-console]")).toHaveCount(0);
    await expect(page.locator("[data-presence-state]")).toHaveCount(0);
    await expect(page.locator("[data-owner-availability]")).toHaveCount(0);
  });
});

test.describe("the public site is unaffected", () => {
  test("the home page is still one static document", async ({ request }) => {
    /*
     * Presence must not put a Supabase read, a cookie read or anything else in
     * front of a public page. The header stayed a static document for exactly this
     * reason, and a chat widget is not a reason to give that up.
     */
    const response = await request.get("/en-us");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-nextjs-cache"]).not.toBe("MISS");
  });

  test("the resume, the blog and the contact links are untouched", async ({ request }) => {
    for (const path of ["/en-us/resume", "/en-us/blog", "/pt-br"]) {
      const response = await request.get(path);

      expect(response.status()).toBe(200);
      expect(await response.text()).not.toContain("Open the direct line");
    }
  });

  test("the heartbeat is a single request, not a storm", async ({ page }) => {
    /*
     * One heartbeat a minute for every visitor is the price of "who is reading",
     * and it is the whole price. A component that also polled the transcript for
     * the same information would double the cost of the site for a boolean, so the
     * count is asserted rather than assumed.
     */
    const beats: string[] = [];

    page.on("request", (request) => {
      if (request.url().endsWith("/api/presence")) {
        beats.push(request.url());
      }
    });

    await visitHome(page);
    await page.waitForTimeout(1500);

    expect(beats).toHaveLength(1);
  });
});
