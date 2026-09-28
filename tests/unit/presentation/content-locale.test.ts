import { describe, expect, it } from "vitest";

import { getResumeContent } from "@/infrastructure/content";

/**
 * PT-BR is the source of truth for every fact in the resume.
 *
 * These tests lock that rule in: the English catalog must mirror the Portuguese
 * one, so an abbreviated or drifted English version fails the build instead of
 * shipping a weaker experience to international recruiters.
 */
describe("Content Locale & Factual Consistency", () => {
  const pt = getResumeContent("pt-BR");
  const en = getResumeContent("en-US");

  it("returns Portuguese content for pt-BR", () => {
    expect(pt.locale).toBe("pt-BR");
    expect(pt.name).toBe("Marcelino Sandroni Dias");
    expect(pt.title).toContain("Engenheiro");
    expect(pt.experiences.length).toBeGreaterThan(0);
  });

  it("returns English content for en-US", () => {
    expect(en.locale).toBe("en-US");
    expect(en.name).toBe("Marcelino Sandroni Dias");
    expect(en.title).toContain("Engineer");
    expect(en.experiences.length).toBeGreaterThan(0);
  });

  it("keeps identity and contact details identical", () => {
    expect(en.name).toBe(pt.name);
    expect(en.contact.phone).toBe(pt.contact.phone);
    expect(en.contact.email).toBe(pt.contact.email);
    expect(en.contact.linkedin).toBe(pt.contact.linkedin);
  });

  it("lists the same experiences in the same order", () => {
    // Proper nouns stay identical; the generic descriptor of the consulting
    // practice is translated like any other prose.
    expect(en.experiences.map((experience) => experience.company)).toEqual([
      "DGT Tecnologia",
      "Antlia",
      "Banco Itaú",
      "Pollux Technologies",
      "Accounting Consulting Firms",
    ]);
  });

  it("keeps the same employment dates, since periods are facts", () => {
    // Only the month names are translated ("Presente" -> "Present",
    // "Dez" -> "Dec"), so the digits must match exactly.
    const expectedPeriods = [
      "Jan/2026 – Present",
      "Jul/2024 – Dec/2025",
      "Mar/2022 – Nov/2022",
      "Jun/2021 – Jan/2022",
      "Jan/2005 – Dec/2020",
    ];

    expect(en.experiences.map((experience) => experience.period)).toEqual(expectedPeriods);

    for (const [index, experience] of pt.experiences.entries()) {
      const label = `[${experience.company}] period dates`;
      expect(digitsOf(en.experiences[index].period), label).toEqual(digitsOf(experience.period));
    }
  });

  it("translates the role instead of dropping the seniority", () => {
    const expectedRoles = [
      "Senior Software Engineer & Tech Lead",
      "Tech Lead & Strategic Consultant",
      "Full Software Engineer & Tech Lead",
      "Full Software Engineer (Promoted in 3 months)",
      "Accounting Analyst & Manager",
    ];

    expect(en.experiences.map((experience) => experience.role)).toEqual(expectedRoles);
  });

  it("mirrors the highlight count of every experience", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const label = `[${experience.company}] highlight count`;
      expect(en.experiences[index].highlights.length, label).toBe(experience.highlights.length);
    }
  });

  it("mirrors the case study count and metric count of every experience", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];
      const label = `[${experience.company}] case study count`;

      expect(translated.caseStudies?.length ?? 0, label).toBe(experience.caseStudies?.length ?? 0);

      for (const [caseIndex, caseStudy] of (experience.caseStudies ?? []).entries()) {
        const translatedCase = translated.caseStudies?.[caseIndex];
        const caseLabel = `[${experience.company}] case study ${caseIndex}`;

        expect(translatedCase, caseLabel).toBeDefined();
        expect(translatedCase?.metrics.length, `${caseLabel} metric count`).toBe(caseStudy.metrics.length);
        expect(translatedCase?.title.trim().length, `${caseLabel} title`).toBeGreaterThan(0);
        expect(translatedCase?.challenge.trim().length, `${caseLabel} challenge`).toBeGreaterThan(0);
        expect(translatedCase?.solution.trim().length, `${caseLabel} solution`).toBeGreaterThan(0);
        expect(translatedCase?.result.trim().length, `${caseLabel} result`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the translated prose substantive rather than a stub", () => {
    // Guards against a regression to the old abbreviated English summaries.
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];
      const label = `[${experience.company}]`;

      expect(translated.summary.length, `${label} summary`).toBeGreaterThan(experience.summary.length / 3);

      for (const [highlightIndex, highlight] of experience.highlights.entries()) {
        const translatedHighlight = translated.highlights[highlightIndex];
        const highlightLabel = `${label} highlight ${highlightIndex}`;

        expect(translatedHighlight, highlightLabel).toBeDefined();
        expect(translatedHighlight.length, highlightLabel).toBeGreaterThan(highlight.length / 3);
        expect(translatedHighlight, highlightLabel).not.toBe(highlight);
      }
    }
  });

  it("mirrors technologies, team size and scope", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];
      const label = `[${experience.company}]`;

      expect(translated.technologies?.length, `${label} technologies`).toBe(experience.technologies?.length);
      expect(translated.teamSize, `${label} team size`).toBe(experience.teamSize);
      expect(translated.scope?.trim().length, `${label} scope`).toBeGreaterThan(0);
    }
  });

  it("mirrors education and skill groups", () => {
    expect(en.education.length).toBe(pt.education.length);

    for (const [index, item] of pt.education.entries()) {
      const label = `[${item.institution}] education`;
      expect(en.education[index].institution, label).toBe(item.institution);
      expect(en.education[index].period, label).toBe(item.period);
      expect(en.education[index].description.length, `${label} description`).toBeGreaterThan(0);
    }

    expect(en.skillGroups.length).toBe(pt.skillGroups.length);

    for (const [index, group] of pt.skillGroups.entries()) {
      const label = `skill group ${index}`;
      expect(en.skillGroups[index].skills.length, `${label} skill count`).toBe(group.skills.length);
      expect(en.skillGroups[index].label.trim().length, `${label} label`).toBeGreaterThan(0);
    }
  });

  it("lists the same number of languages", () => {
    expect(en.languages.length).toBe(pt.languages.length);
  });

  it("preserves the figures that state financial and performance facts", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];
      const source = [experience.summary, ...experience.highlights, experience.scope ?? ""].join(" ");
      const target = [translated.summary, ...translated.highlights, translated.scope ?? ""].join(" ");
      const label = `[${experience.company}] figures`;

      // Numbers written as words are legitimately translated ("100 milhões" ->
      // "100 million"), so the invariant is on the digits, not the full string.
      expect(digitsOf(target), label).toEqual(digitsOf(source));
    }
  });

  it("preserves the figures stated in case study metrics", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];

      for (const [caseIndex, caseStudy] of (experience.caseStudies ?? []).entries()) {
        const translatedCase = translated.caseStudies?.[caseIndex];
        const label = `[${experience.company}] case study ${caseIndex} metric`;

        for (const [metricIndex, metric] of caseStudy.metrics.entries()) {
          const translatedMetric = translatedCase?.metrics[metricIndex];
          const metricLabel = `${label} ${metricIndex}`;

          expect(digitsOf(translatedMetric?.value ?? ""), `${metricLabel} value`).toEqual(
            digitsOf(metric.value),
          );
          expect(translatedMetric?.icon, `${metricLabel} icon`).toBe(metric.icon);
          expect(translatedMetric?.label.trim().length, `${metricLabel} label`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("preserves the figures cited in case study prose", () => {
    for (const [index, experience] of pt.experiences.entries()) {
      const translated = en.experiences[index];

      for (const [caseIndex, caseStudy] of (experience.caseStudies ?? []).entries()) {
        const translatedCase = translated.caseStudies?.[caseIndex];
        const source = [caseStudy.title, caseStudy.challenge, caseStudy.solution, caseStudy.result].join(" ");
        const target = [translatedCase?.title, translatedCase?.challenge, translatedCase?.solution, translatedCase?.result].join(" ");
        const label = `[${experience.company}] case study ${caseIndex} prose`;

        expect(digitsOf(target), label).toEqual(digitsOf(source));
      }
    }
  });
});

/** All digit runs in a string, order-independent, so locale formatting is ignored. */
function digitsOf(text: string): string[] {
  return (text.match(/\d+/g) ?? []).sort();
}
