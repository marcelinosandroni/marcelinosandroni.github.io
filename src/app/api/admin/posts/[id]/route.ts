import { NextResponse } from "next/server";

import {
  DeletePost,
  PostNotFoundError,
  PostSlugConflictError,
  PublishPost,
  SetPostArchived,
  UpdatePost,
  type PostRepository,
} from "@/application/blog/manage-posts";
import { InvalidPostDraftError } from "@/domain/blog/post-draft";
import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { getPostRepository } from "@/infrastructure/repositories/supabase-post-repository";

/**
 * One post: read-modify-write, lifecycle, and deletion.
 *
 * The owner guard is identical to `/api/admin/posts` and for the same reasons —
 * see that file for the status table. It is duplicated rather than imported
 * because a shared helper here would have to live in one of the two routes or in
 * a third file, and the two lines that matter (`isAuthEnabled`, then
 * `getOwnerSession`) are easier to audit when they are visible in both places
 * than when they are one call away.
 *
 * Three verbs, three meanings:
 *
 * - `PUT` replaces the document. A published post is recompiled and republished
 *   in the same call, so the blog can never show a text the owner has already
 *   replaced.
 * - `PATCH` moves the lifecycle, one step at a time: `{"published": true}`
 *   compiles and publishes, `{"archived": true}` retracts the article and keeps
 *   the Markdown, `{"archived": false}` republishes. A `status` field would let
 *   a client ask for any state without going through compilation, which is the
 *   one transition that is not a rename.
 * - `DELETE` removes the post and retracts anything it published, in one
 *   database transaction.
 */

const NO_STORE = { "cache-control": "no-store" } as const;

/**
 * `PATCH` accepts exactly one of these, and no other key.
 *
 * `{"published": false}` is refused rather than mapped to "archive". Unpublishing
 * *is* archiving — the article is demoted to `draft` and the Markdown is kept —
 * so accepting both spellings would give one action two names, and the one the
 * owner picked the wrong one of would be the one silently ignored.
 */
const LIFECYCLE_FIELDS = ["archived", "published"] as const;

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/posts/[id]">,
): Promise<Response> {
  const repository = await guard();

  if (repository instanceof Response) {
    return repository;
  }

  const { id } = await context.params;

  try {
    const post = await repository.findById(id);

    if (post === null) {
      return NextResponse.json({ error: "post_not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ post }, { headers: NO_STORE });
  } catch (error) {
    console.error("[admin] loading a post failed:", describe(error));

    return NextResponse.json({ error: "post_unavailable" }, { status: 503, headers: NO_STORE });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/admin/posts/[id]">,
): Promise<Response> {
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

  if (!hasOnly(body, ["document"])) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const { id } = await context.params;

  try {
    const post = await new UpdatePost(repository).execute(
      id,
      (body as Record<string, unknown>).document,
    );

    return NextResponse.json({ post }, { headers: NO_STORE });
  } catch (error) {
    return toResponse(error, "updating");
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/posts/[id]">,
): Promise<Response> {
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

  if (!hasExactlyOneOf(body, LIFECYCLE_FIELDS)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const change = readLifecycleChange(body);

  if (change === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const { id } = await context.params;

  try {
    const post =
      change === "publish"
        ? await new PublishPost(repository).execute(id)
        : await new SetPostArchived(repository).execute(id, change === "archive");

    return NextResponse.json({ post }, { headers: NO_STORE });
  } catch (error) {
    return toResponse(error, "archiving");
  }
}

/**
 * The single lifecycle change a `PATCH` body is allowed to ask for.
 *
 * Returns `"publish"`, `"archive"`, `"restore"`, or `null` for anything else —
 * including a well-formed body asking for a combination, which is what the
 * exactly-one-key check above is for.
 */
function readLifecycleChange(body: unknown): "publish" | "archive" | "restore" | null {
  const change = (body as Record<string, unknown>);

  if (change.published !== undefined) {
    return change.published === true ? "publish" : null;
  }

  if (change.archived === undefined) {
    return null;
  }

  if (typeof change.archived !== "boolean") {
    return null;
  }

  return change.archived ? "archive" : "restore";
}

/**
 * Deletes a post.
 *
 * `204` with no body, never a `{ok: true}`: there is nothing to say, and a body
 * on a `204` is a response some proxies and caches will preserve anyway. The
 * confirmation the owner gets is the row disappearing from the list.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/posts/[id]">,
): Promise<Response> {
  const repository = await guard();

  if (repository instanceof Response) {
    return repository;
  }

  const { id } = await context.params;

  try {
    await new DeletePost(repository).execute(id);

    return new NextResponse(null, { status: 204, headers: NO_STORE });
  } catch (error) {
    return toResponse(error, "deleting");
  }
}

/** The shared mapping from a use-case failure to a status. */
function toResponse(error: unknown, action: string): Response {
  if (error instanceof PostNotFoundError) {
    return NextResponse.json({ error: "post_not_found" }, { status: 404, headers: NO_STORE });
  }

  if (error instanceof InvalidPostDraftError) {
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

  console.error(`[admin] ${action} a post failed:`, describe(error));

  return NextResponse.json({ error: "post_not_saved" }, { status: 503, headers: NO_STORE });
}

/**
 * Owner-only resolution of the repository.
 *
 * Identical to `/api/admin/posts` and duplicated on purpose — see the note at the
 * top of this file.
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
    return NextResponse.json({ error: "cms_not_configured" }, { status: 503, headers: NO_STORE });
  }

  return repository;
}

/**
 * Refuses a body that is not exactly the listed fields.
 *
 * Refused rather than ignored, for the reason the theme-feedback endpoint
 * documents: a `{document, status}` body that answered `200` would look stored
 * when the `status` it asked for was dropped on the floor. Comparing the sorted
 * key list also catches a *missing* field, which a per-field read would not.
 */
function hasOnly(body: unknown, expected: readonly string[]): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body).sort();
  const sorted = [...expected].sort();

  return keys.length === sorted.length && keys.every((key, index) => key === sorted[index]);
}

/**
 * Refuses a body carrying zero, two, or an unrecognised lifecycle key.
 *
 * Zero is refused because `{}` would be a no-op that answers `200`, which reads
 * as "done" in a client that only checks the status. Two is refused because
 * "archive and publish at once" has no meaning, and picking one of them silently
 * is how a post ends up live when the owner meant to retire it.
 */
function hasExactlyOneOf(body: unknown, allowed: readonly string[]): boolean {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const keys = Object.keys(body);

  return keys.length === 1 && allowed.includes(keys[0]);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
