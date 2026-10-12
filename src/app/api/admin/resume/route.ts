import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import {
  applyResumeWrite,
  ResumeWriteError,
  type ResumeWrite,
  type WritableTable,
} from "@/infrastructure/repositories/resume-writer";

/**
 * Writes to the résumé tables.
 *
 * ## The guard comes first, and before the body is read
 *
 * `getOwnerSession` re-derives authorisation from the allowlist on every
 * request, so a session minted before `ADMIN_EMAIL` changed stops working
 * immediately. Reading the body first would let a stranger make the server
 * allocate and parse an arbitrary payload before being told no.
 *
 * ## The three failure modes are kept apart
 *
 * | Status | Means | Who can act |
 * | --- | --- | --- |
 * | `401` | you are not the owner | nobody; sign in |
 * | `503` | this deployment cannot write | the operator |
 * | `400` | your request is not a résumé write | the owner |
 *
 * Collapsing `401` into `503` would tell a stranger the endpoint is real on a
 * deployment where it is not, and tell the owner their sign-in is broken when
 * it is the environment that is.
 *
 * ## Why this endpoint is narrower than it looks
 *
 * A write names one table, one row and one payload. There is no "save the whole
 * document" call, because a single request that could rewrite thirteen tables
 * is a single request that could destroy thirteen tables — and a résumé is the
 * one artefact here with no version history and no undo.
 */

/** Never cached: every answer is a live read of a table only the owner can see. */
const NO_STORE = { "cache-control": "no-store" } as const;

export async function POST(request: Request): Promise<Response> {
  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503, headers: NO_STORE });
  }

  if ((await getOwnerSession()) === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  const write = toWrite(body);

  if (write === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await applyResumeWrite(write, revalidatePath);

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ResumeWriteError) {
      return NextResponse.json({ error: error.reason }, { status: error.status, headers: NO_STORE });
    }

    console.error("[admin] résumé write failed:", error);

    return NextResponse.json({ error: "not_saved" }, { status: 503, headers: NO_STORE });
  }
}

/**
 * Narrows an untrusted body to a write, or refuses it.
 *
 * Every field is validated rather than cast. A résumé write reaches the
 * document of record, and a typo in a column name would otherwise be a silent
 * no-op that reads as a successful save — which is the failure an owner would
 * most believe and least notice.
 */
function toWrite(body: unknown): ResumeWrite | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const { kind, table, id, values, filters } = body as Record<string, unknown>;

  if (typeof table !== "string" || !isWritable(table)) {
    return null;
  }

  if (kind === "delete") {
    return typeof id === "string" && id !== "" ? { kind, table, id } : null;
  }

  /*
    A `deleteWhere` whose filter set is empty or malformed is refused here as
    well as in the writer. The writer is the boundary that matters, but this one
    answers the owner with `invalid_request` instead of routing a delete with no
    predicate to a table that holds the document of record.
  */
  if (kind === "deleteWhere") {
    if (typeof filters !== "object" || filters === null || Array.isArray(filters)) {
      return null;
    }

    const entries = Object.entries(filters as Record<string, unknown>);

    if (entries.length === 0) {
      return null;
    }

    const clean: Record<string, string> = {};

    for (const [column, value] of entries) {
      if (!/^[a-z_][a-z0-9_]*$/.test(column) || typeof value !== "string") {
        return null;
      }

      clean[column] = value;
    }

    return { kind, table, filters: clean };
  }

  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return null;
  }

  if (kind === "insert") {
    return { kind, table, values: values as Record<string, unknown> };
  }

  if (kind === "update") {
    return typeof id === "string" && id !== ""
      ? { kind, table, id, values: values as Record<string, unknown> }
      : null;
  }

  return null;
}

/**
 * Kept in step with `WRITABLE` in the writer rather than importing it, because
 * the writer's set is about what the database will accept and this one is about
 * what a request may name — and a request naming a table the writer refuses
 * should be rejected here with `400` rather than reaching the writer.
 */
function isWritable(value: string): value is WritableTable {
  return WRITABLE_TABLES.has(value);
}

const WRITABLE_TABLES: ReadonlySet<string> = new Set([
  "resume_profile",
  "resume_experience",
  "resume_highlight",
  "resume_case_study",
  "resume_technology",
  "resume_skill_group",
  "resume_skill",
  "resume_education",
  "resume_language",
  "tech_stack_cluster",
  "tech_stack_item",
  "track_record_annotation",
  "track_record_blueprint",
  "resume_testimonial",
  "technology",
  "technology_category",
  "highlight_technology",
  "case_study_technology",
  "case_study_media",
]);