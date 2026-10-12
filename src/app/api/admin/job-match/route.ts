import { NextResponse } from "next/server";

import { getOwnerSession, isAuthEnabled } from "@/infrastructure/auth/owner-session";
import { readResume, readResolvedProfiles, readTechnologyCatalog } from "@/infrastructure/repositories";
import { matchJobDescription } from "@/domain/resume/job-match";
import type { TechnologyCatalogEntry } from "@/domain/resume/resume-repository";
import type { Locale } from "@/domain/i18n";

/**
 * Matches a pasted job description against the résumé.
 *
 * ## This reads and reports; it never writes
 *
 * There is no "generate the text" endpoint here, and that is the point. A
 * tailored résumé that claims an achievement the posting asked for but the owner
 * never delivered is not a tailored résumé — it is a fabricated reference, and it
 * is found in an interview rather than in review.
 *
 * So the endpoint answers three questions the owner can act on: what does the
 * posting ask that I already evidence, what does it ask that I do not, and which
 * profile should I read the résumé with. The document stays his own words, and
 * the matching is string comparison against a catalogue he curated — which
 * cannot invent an achievement because it cannot invent anything.
 *
 * ## Why it is owner-only
 *
 * The whole route is a POST, so it returns 404 in production by default and 401
 * to a stranger. A public "score my résumé against this job" endpoint would let
 * anyone enumerate the catalogue and the tagging, which is the document of record
 * in a form designed for reading rather than probing.
 */
const MAX_DESCRIPTION_CHARS = 20_000;

export async function POST(request: Request): Promise<Response> {
  const noStore = { "cache-control": "no-store" } as const;

  if (!isAuthEnabled()) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503, headers: noStore });
  }

  if ((await getOwnerSession()) === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStore });
  }

  const { description, locale } = (body ?? {}) as Record<string, unknown>;

  if (typeof description !== "string" || typeof locale !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStore });
  }

  const resolved = locale === "pt-BR" || locale === "en-US" ? (locale as Locale) : null;

  if (resolved === null) {
    return NextResponse.json(
      { error: "invalid_locale" },
      { status: 400, headers: noStore },
    );
  }

  const trimmed = description.trim();

  if (trimmed === "") {
    return NextResponse.json({ error: "empty_description" }, { status: 400, headers: noStore });
  }

  /*
    Bounded, because the route is authenticated but a 4 MB body is still a 4 MB
    body, and the matcher scans it repeatedly. The limit is generous for a real
    posting - the longest ones are a few thousand characters.
  */
  if (trimmed.length > MAX_DESCRIPTION_CHARS) {
    return NextResponse.json(
      {
        error: "description_too_long",
        limit: MAX_DESCRIPTION_CHARS,
      },
      { status: 400, headers: noStore },
    );
  }

  const [content, catalog, profiles] = await Promise.all([
    readResume(resolved, "resume"),
    readTechnologyCatalog(resolved),
    readResolvedProfiles(resolved),
  ]);

  const technologies: Array<{
    slug: string;
    label: string;
    categoryLabel: string | null;
    aliases: readonly string[];
  }> = catalog.technologies
    .filter((entry: TechnologyCatalogEntry) => entry.isPublished)
    .map((entry: TechnologyCatalogEntry) => ({
      slug: entry.slug,
      label: entry.label,
      categoryLabel: entry.categoryLabel,
      aliases: entry.aliases,
    }));

  const result = matchJobDescription(
    trimmed,
    content,
    technologies,
    catalog.relations.map((relation) => {
      const from = catalog.technologies.find((entry) => entry.id === relation.fromId);
      const to = catalog.technologies.find((entry) => entry.id === relation.toId);

      return {
        from: from?.slug ?? "",
        to: to?.slug ?? "",
        kind: relation.kind,
      };
    }).filter((edge) => edge.from !== "" && edge.to !== ""),
    profiles.map((entry) => ({
      slug: entry.profile.slug,
      label: entry.profile.label,
      primary: entry.profile.primary,
      listed: entry.profile.listed,
    })),
  );

  return NextResponse.json(result, { headers: noStore });
}