import { NextResponse } from "next/server";

import { negotiateLocale } from "@/infrastructure/i18n";
import { getListArticles, getArticle } from "@/infrastructure/repositories";
import { AskResumeCopilot } from "@/application/ai/ask-resume-copilot";
import { getDictionary } from "@/i18n";

/**
 * Answers a recruiter question from published content.
 *
 * Anonymous and read-only by construction: no session, no cookie, no personal
 * data, and the answer is assembled only from passages that already existed in
 * the public resume or the published blog.
 *
 * The locale comes from `Accept-Language` via the shared negotiator rather than
 * a bespoke parser, so the copilot answers in the language the visitor is
 * already reading.
 */
export async function POST(request: Request) {
  const locale = negotiateLocale(request.headers.get("accept-language"));
  const t = await getDictionary(locale);

  const labels = {
    topMatch: t.copilot.topMatch,
    nothingFound: t.copilot.nothingFound,
    questionTooShort: t.copilot.questionTooShort,
    questionTooLong: t.copilot.questionTooLong,
    sourcesLabel: t.copilot.sourcesLabel,
  };

  let question: unknown;

  try {
    ({ question } = (await request.json()) as { question?: unknown });
  } catch {
    return NextResponse.json({ status: "rejected", text: labels.questionTooShort, citations: [] }, { status: 400 });
  }

  if (typeof question !== "string") {
    return NextResponse.json({ status: "rejected", text: labels.questionTooShort, citations: [] }, { status: 400 });
  }

  // Reuses the blog composition root, so the copilot inherits its circuit
  // breaker: a database outage degrades to the versioned catalog instead of
  // adding a timeout to every question.
  const listArticles = await getListArticles();
  const getArticleBySlug = await getArticle();

  const copilot = await AskResumeCopilot.create(
    locale,
    labels,
    {
      listPublished: (requestedLocale, limit) => listArticles.execute({ locale: requestedLocale, limit }),
      findPublishedBySlug: (requestedLocale, slug) =>
        getArticleBySlug.execute({ locale: requestedLocale, slug: slug.toString() }),
    },
  );

  return NextResponse.json(copilot.ask(question));
}
