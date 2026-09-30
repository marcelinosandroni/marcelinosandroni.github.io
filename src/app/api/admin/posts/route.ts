import { NextResponse } from "next/server";

import {
  CreatePost,
  ListPosts,
  PostSlugConflictError,
  type PostRepository,
} from "@/application/blog/manage-posts";
import { InvalidPostDraftError } from "@/domain/blog/post-draft";
import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { getPostRepository } from "@/infrastructure/repositories/supabase-post-repository";

/**
 * The owner's post list, and the endpoint that creates one.
 *
 * ## The guard comes first, and it comes before the body is read
 *
 * `getOwnerSession` re-derives authorisation from the allowlist on every
 * request, so a session minted before `ADMIN_EMAIL` changed stops working
 * immediately. Reading the body first would mean a stranger can make the server
 * allocate and parse an arbitrary body before being told no — small, but it is
 * free not to.
 *
 * The three failure modes are kept distinct, and only because they are
 * genuinely different facts:
 *
 * | Status | Means | Who can act |
 * | --- | --- | --- |
 * | `401` | you are not the owner | nobody; sign in |
 * | `503` | this deployment has no Supabase, so nobody can sign in either | the operator |
 * | `400` | your document is not a post | the author |
 *
 * Collapsing `401` into `503` would be the mistake: it would tell a stranger
 * that the endpoint is real on a deployment where it is not, and tell the owner
 * that their sign-in is broken when it is the environment that is.
 *
 * There is no fourth status for a missing Supabase content pair, because
 * `isAuthEnabled()` reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` — exactly the
 * pair `getPostRepository()` needs. Owner auth and CMS writes are configured by
 * the same two variables, so there is no deployment where one works and the
 * other does not.
 */

/** Only this one field. Anything else is refused — see `assertOnlyDocument`. */
const DOCUMENT_FIELD = "document";

/** Never cached: every answer is a live read of a table only the owner can see. */
const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(): Promise<Response> {
  const repository = await guard();

  if (repository instanceof Response) {
    return repository;
  }

  try {
    const posts = await new ListPosts(repository).execute();

    return NextResponse.json({ posts }, { headers: NO_STORE });
  } catch (error) {
    // An unapplied migration shows here. The owner needs to know the CMS is
    // broken, which is the opposite of the theme-feedback route's choice to
    // answer `[]`: a wrong feedback count is close to the truth, a silently
    // empty post list reads as "you have written nothing".
    console.error("[admin] listing posts failed:", describe(error));

    return NextResponse.json({ error: "posts_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: Request): Promise<Response> {
  const repository = await guard();

  if (repository instanceof Response) {
    return repository;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  if (!hasOnlyDocument(body)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const post = await new CreatePost(repository).execute(
      (body as Record<string, unknown>)[DOCUMENT_FIELD],
    );

    return NextResponse.json({ post }, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof InvalidPostDraftError) {
      // The field issues are returned rather than logged, because the editor
      // marks the fields from them. They are codes, not sentences, so nothing
      // here is untranslatable and nothing about the *value* is echoed back.
      return NextResponse.json(
        { error: "invalid_document", issues: error.issues },
        { status: 400, headers: NO_STORE },
      );
    }

    if (error instanceof PostSlugConflictError) {
      return NextResponse.json(
        { error: "slug_taken", field: "slug", slug: error.slug },
        { status: 409, headers: NO_STORE },
      );
    }

    console.error("[admin] creating a post failed:", describe(error));

    return NextResponse.json({ error: "post_not_saved" }, { status: 503, headers: NO_STORE });
  }
}

/**
 * Owner-only resolution of the repository.
 *
 * Returns the repository, or the `Response` to send. A discriminated union would
 * be tidier, but a `Response` is the shape every Next.js handler already returns
 * and the two call sites are guarded by one `instanceof` — a narrower type buys
 * nothing here and costs a wrapper nobody would read twice.
 */
async function guard(): Promise<PostRepository | Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503, headers: NO_STORE });
  }

  if ((await getOwnerSession()) === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const repository = getPostRepository();

  if (repository === null) {
    // Unreachable while `isAuthEnabled()` is true — same variables — but a
    // `500` here would be a lie about a deployment the operator can fix.
    return NextResponse.json({ error: "cms_not_configured" }, { status: 503, headers: NO_STORE });
  }

  return repository;
}

/**
 * Refuses a body that is not exactly `{ document: string }`.
 *
 * The same rule the theme-feedback endpoint applies, and for the same reason:
 * reading only `document` would accept `{document, status}` or
 * `{document, id}`, silently drop the extra field and answer `201` — so a
 * crafted request would look stored when the status it asked for was ignored.
 *
 * Unknown fields are *refused* rather than ignored so that adding a column to
 * this contract is a deliberate change on both sides, and a client that sends a
 * stale field fails loudly instead of quietly publishing something different
 * from what it asked for.
 */
function hasOnlyDocument(body: unknown): body is { document: unknown } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body).sort();

  return keys.length === 1 && keys[0] === DOCUMENT_FIELD;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
