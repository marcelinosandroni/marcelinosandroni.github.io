import type { Locale } from "@/domain/i18n";
import type { KnowledgeChunk } from "@/domain/ai";
import type { ResumeContent } from "@/domain/resume/types";
import { getResumeContent } from "@/infrastructure/content";
import { GetArticle, ListArticles, type ArticleRepository } from "@/application/blog";

/**
 * Builds the retrievable corpus from the published resume and blog.
 *
 * Chunks are derived, never authored: the resume content and the articles are
 * already the source of truth, and the copilot has no separate copy of the facts
 * that could drift from them.
 */

function truncate(text: string, limit = 320): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  const cut = normalized.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");

  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

function chunksFromResume(resume: ResumeContent, locale: Locale): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  const localeTag = locale === "en-US" ? "en" : "pt";

  chunks.push({
    id: `${localeTag}:summary`,
    source: { kind: "summary", experience: resume.name },
    label: resume.title,
    text: `${resume.name}. ${resume.title}. ${resume.location}. ${resume.summary}`,
    keywords: [resume.title, resume.location],
  });

  for (const [experienceIndex, experience] of resume.experiences.entries()) {
    const period = experience.period;

    chunks.push({
      id: `${localeTag}:exp:${experienceIndex}:overview`,
      source: { kind: "summary", experience: experience.company },
      label: `${experience.company} — ${experience.role}`,
      text: [
        `${experience.company}. ${experience.role}. ${period}. ${experience.location}.`,
        experience.summary,
        experience.scope ?? "",
      ].join(" "),
      keywords: [experience.company, experience.role, period, `team of ${experience.teamSize ?? 0}`, ...(experience.technologies ?? [])],
    });

    for (const [highlightIndex, highlight] of experience.highlights.entries()) {
      chunks.push({
        id: `${localeTag}:exp:${experienceIndex}:hl:${highlightIndex}`,
        source: { kind: "highlight", experience: experience.company, index: highlightIndex },
        label: `${experience.company} — ${experience.role}`,
        text: highlight,
        keywords: [experience.company, experience.role, ...(experience.technologies ?? [])],
      });
    }

    for (const [caseIndex, caseStudy] of (experience.caseStudies ?? []).entries()) {
      chunks.push({
        id: `${localeTag}:exp:${experienceIndex}:case:${caseIndex}`,
        source: { kind: "case-study", experience: experience.company, title: caseStudy.title },
        label: caseStudy.title,
        text: [
          caseStudy.title,
          caseStudy.challenge,
          caseStudy.solution,
          caseStudy.result,
          caseStudy.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(". "),
        ].join(" "),
        keywords: [experience.company, ...caseStudy.metrics.map((metric) => metric.value), ...(experience.technologies ?? [])],
      });
    }
  }

  // Skills belong to the candidate, not to one employer, so they are chunked
  // once. Emitting them per experience produced duplicate ids, which silently
  // made the retriever rank duplicated passages against each other.
  for (const [groupIndex, group] of resume.skillGroups.entries()) {
    for (const [skillIndex, skill] of group.skills.entries()) {
      chunks.push({
        id: `${localeTag}:skill:${groupIndex}:${skillIndex}`,
        source: { kind: "skill", group: group.label, skill },
        label: `${group.label} — ${skill}`,
        text: `${group.label}: ${skill}`,
        keywords: [skill, group.label],
      });
    }
  }

  for (const [educationIndex, item] of resume.education.entries()) {
    chunks.push({
      id: `${localeTag}:edu:${educationIndex}`,
      source: { kind: "education", institution: item.institution },
      label: `${item.title} — ${item.institution}`,
      text: `${item.title}. ${item.institution}. ${item.period}. ${item.description}`,
      keywords: [item.institution, item.title],
    });
  }

  for (const language of resume.languages) {
    chunks.push({
      id: `${localeTag}:lang:${language}`,
      source: { kind: "language", language },
      label: language,
      text: language,
      keywords: [language, "language", "idioma"],
    });
  }

  return chunks;
}

async function chunksFromArticles(
  locale: Locale,
  repository: ArticleRepository,
): Promise<KnowledgeChunk[]> {
  // The list projection deliberately omits the body, so each article is fetched
  // through the existing use case. The corpus is built once per request and the
  // publication count is small, so this stays cheaper than widening the port.
  const summaries = await new ListArticles(repository).execute({ locale });
  const chunks: KnowledgeChunk[] = [];
  const localeTag = locale === "en-US" ? "en" : "pt";

  for (const summary of summaries) {
    let article;
    try {
      article = await new GetArticle(repository).execute({ locale, slug: summary.slug });
    } catch {
      continue;
    }

    for (const [blockIndex, block] of article.body.entries()) {
      if (block.type !== "paragraph" && block.type !== "heading" && block.type !== "quote") {
        continue;
      }

      chunks.push({
        id: `${localeTag}:article:${article.slug}:${blockIndex}`,
        source: {
          kind: "article",
          slug: article.slug,
          title: article.title,
          category: article.category,
        },
        label: article.title,
        text: `${article.title}. ${truncate(block.text)}`,
        keywords: [article.title, article.category, ...article.tags],
      });
    }
  }

  return chunks;
}

/**
 * Loads the full corpus for a locale.
 *
 * Articles come from the repository so a post published in the CMS is
 * answerable without a redeploy, exactly like it is on the blog index.
 */
export async function buildCorpus(locale: Locale, articles?: ArticleRepository): Promise<KnowledgeChunk[]> {
  const resume = getResumeContent(locale);
  const resumeChunks = chunksFromResume(resume, locale);

  if (!articles) {
    return resumeChunks;
  }

  try {
    return [...resumeChunks, ...(await chunksFromArticles(locale, articles))];
  } catch {
    // A database outage must not take the copilot down: the resume itself is
    // enough to answer most questions asked of it.
    return resumeChunks;
  }
}
