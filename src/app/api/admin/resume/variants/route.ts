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
 * Writes to the résumé variant tables.
 *
 * Same contract as `/api/admin/resume`: the guard comes first, before the body
 * is read, and the three failure modes (401 / 503 / 400) are kept apart.
 *
 * The difference is the tables this endpoint serves. A variant is a document of
 * record in its own right — it argues for one stack — so it is edited through
 * the same write path as the experience and the catalog, not through a separate
 * mechanism that would need its own guard and its own audit trail.
 */
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

    console.error("[admin] variant write failed:", error);

    return NextResponse.json({ error: "not_saved" }, { status: 503, headers: NO_STORE });
  }
}

function toWrite(body: unknown): ResumeWrite | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const candidate = body as Record<string, unknown>;

  if (candidate["kind"] === "update") {
    const table = candidate["table"];
    const id = candidate["id"];
    const values = candidate["values"];

    if (typeof table !== "string" || !isWritable(table)) {
      return null;
    }

    if (typeof id !== "string" || id.trim() === "") {
      return null;
    }

    if (typeof values !== "object" || values === null) {
      return null;
    }

    return { kind: "update", table, id, values: values as Record<string, unknown> };
  }

  if (candidate["kind"] === "insert") {
    const table = candidate["table"];
    const values = candidate["values"];

    if (typeof table !== "string" || !isWritable(table)) {
      return null;
    }

    if (typeof values !== "object" || values === null) {
      return null;
    }

    return { kind: "insert", table, values: values as Record<string, unknown> };
  }

  if (candidate["kind"] === "delete") {
    const table = candidate["table"];
    const id = candidate["id"];

    if (typeof table !== "string" || !isWritable(table)) {
      return null;
    }

    if (typeof id !== "string" || id.trim() === "") {
      return null;
    }

    return { kind: "delete", table, id };
  }

  if (candidate["kind"] === "deleteWhere") {
    const table = candidate["table"];
    const filters = candidate["filters"];

    if (typeof table !== "string" || !isWritable(table)) {
      return null;
    }

    if (typeof filters !== "object" || filters === null) {
      return null;
    }

    return { kind: "deleteWhere", table, filters: filters as Record<string, string> };
  }

  return null;
}

function isWritable(table: string): table is WritableTable {
  return [
    "resume_variant",
    "resume_variant_metric",
    "resume_variant_inventory",
    "resume_variant_role",
    "resume_variant_role_bullet",
  ].includes(table);
}
