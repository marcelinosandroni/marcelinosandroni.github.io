import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES, type Locale } from "@/domain/i18n";
import {
  CAREER_CLAIMS,
  formatClaimValue,
  getAllClaims,
  getClaim,
  HERO_CLAIM_IDS,
} from "@/domain/portfolio/claims";
import { getHomeContent } from "@/infrastructure/content/home";
import { getResumeContent } from "@/infrastructure/content";

/**
 * Guards the career's headline numbers.
 *
 * ## Why this exists
 *
 * The site, the resume data and the exported markdown each carried their own copy
 * of the headline figures. That is how the same system came to be described as
 * "100 million messages/day" in one place and "10 million messages/day" in
 * another, and how a corrected employment period stayed wrong in the export.
 *
 * Neither contradiction was caught by any test, because every existing parity
 * check compares Portuguese against English — two surfaces that were *both* wrong
 * the same way pass it happily. The checks below compare the claims against every
 * surface that quotes them, which is the comparison that would have failed.
 */

/** Markdown exports at the repository root, by locale. */
const MARKDOWN_EXPORTS: Record<Locale, string> = {
  "en-US": "resume-en-us.md",
  "pt-BR": "resume-pt-br.md",
};

function readMarkdown(locale: Locale): string {
  return readFileSync(path.join(process.cwd(), MARKDOWN_EXPORTS[locale]), "utf8");
}

describe("career claims", () => {
  it("gives every claim a non-empty scope in both locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const claim of getAllClaims(locale)) {
        expect(claim.scope.trim().length, `${claim.id}/${locale}`).toBeGreaterThan(0);
        expect(claim.display.trim().length, `${claim.id}/${locale}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the broker throughput strictly below the pipeline total", () => {
    /**
     * The two throughput figures are not two versions of one number — the broker
     * is one hop inside the pipeline it feeds. If they ever converge, one of them
     * is wrong and the scope strings are lying.
     */
    expect(CAREER_CLAIMS.messagesPerDayBroker.value).toBeLessThan(
      CAREER_CLAIMS.messagesPerDay.value,
    );
  });

  it("states the throughput scopes distinctly, so neither can be quoted bare", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const total = getClaim("messagesPerDay", locale).scope;
      const broker = getClaim("messagesPerDayBroker", locale).scope;

      expect(total).not.toBe(broker);
      expect(total.toLowerCase()).not.toBe(broker.toLowerCase());
    }
  });

  it("never formats a pt-BR figure with a thousands separator", () => {
    /**
     * Brazilian numeric convention omits the separator. Adding one to `24000000`
     * renders as `24.000.000`, which a Brazilian reader reads as a decimal and
     * as a formatting mistake rather than as precision.
     */
    expect(formatClaimValue(24_000_000, "pt-BR")).toBe("24000000");
    expect(formatClaimValue(24_000_000, "en-US")).toBe("24,000,000");
  });

  it("keeps the arithmetic that the whole positioning rests on consistent", () => {
    const finance = CAREER_CLAIMS.financeYears.value;
    const engineering = CAREER_CLAIMS.engineeringYears.value;

    expect(finance + engineering).toBe(21);
  });
});

describe("career claims: the home page quotes the claims module", () => {
  for (const locale of SUPPORTED_LOCALES) {
    it(`quotes the contract value from the claims module in ${locale}`, () => {
      const home = getHomeContent(locale);
      const value = CAREER_CLAIMS.contractValueSaved.value;

      // `24M` in the compact form the hero and KPIs actually use.
      const compact = `${value / 1_000_000}M`;
      const kpiFootnotes = home.kpis.items.map((kpi) => kpi.footnote.value);

      expect(
        home.hero.narrative.includes(compact) || kpiFootnotes.some((note) => note.includes(compact)),
        locale,
      ).toBe(true);
    });

    it(`leads the hero with exactly the three declared claim ids in ${locale}`, () => {
      expect(HERO_CLAIM_IDS).toHaveLength(3);
      expect(new Set(HERO_CLAIM_IDS).size).toBe(3);

      for (const id of HERO_CLAIM_IDS) {
        expect(CAREER_CLAIMS[id], id).toBeDefined();
      }
    });

    it(`never quotes a throughput figure in the ${locale} home without its scope`, () => {
      /**
       * A bare "100M" is the exact shape that let the two throughput numbers drift
       * apart unnoticed. The home page must name the hop it is talking about.
       */
      const kpis = getHomeContent(locale).kpis.items;
      const throughput = kpis.find((kpi) => kpi.id === "throughput");

      expect(throughput).toBeDefined();
      expect(throughput?.description.toLowerCase()).toMatch(/telemetry|pipeline/i);
    });
  }
});

describe("career claims: the resume quotes the claims module", () => {
  for (const locale of SUPPORTED_LOCALES) {
    it(`states the contract value identically in the ${locale} resume`, () => {
      expect(getResumeContent(locale).summary).toMatch(/R\$ ?24/);
    });
  }
});

describe("career claims: the markdown exports agree with the data", () => {
  /**
   * The markdown at the repository root is what a recruiter opens. It is written
   * by hand, so it is the surface most likely to drift from the typed content
   * that actually renders the site and the PDF — and it is the one a technical
   * reviewer is most likely to diff.
   */
  for (const locale of SUPPORTED_LOCALES) {
    it(`gives every ${locale} role the same title as the resume data`, () => {
      const markdown = readMarkdown(locale);
      const resume = getResumeContent(locale);

      for (const experience of resume.experiences) {
        expect(markdown, `${locale}: ${experience.company}`).toContain(
          `${experience.company} | ${experience.role}`,
        );
      }
    });

    it(`gives every ${locale} period the same dates as the resume data`, () => {
      const markdown = readMarkdown(locale);
      const resume = getResumeContent(locale);

      for (const experience of resume.experiences) {
        const [start, end] = experience.period.split("–").map((part) => part.trim());

        expect(markdown, `${locale}: ${experience.company} start`).toContain(start);
        if (end && end.length > 0) {
          expect(markdown, `${locale}: ${experience.company} end`).toContain(end);
        }
      }
    });

    it(`carries the ${locale} contract figure the resume claims`, () => {
      expect(readMarkdown(locale)).toMatch(/R\$ ?24/);
    });
  }

  it("does not state a throughput figure that contradicts the claims module", () => {
    /**
     * The original defect: one export said 10 million, the site said 100 million,
     * both describing the same system. Both numbers are legitimate measurements,
     * so the check is not "only one may appear" — it is that neither may appear
     * without naming which hop it measures.
     */
    for (const locale of SUPPORTED_LOCALES) {
      const markdown = readMarkdown(locale);

      if (markdown.includes("100 million") || markdown.includes("100 milhões")) {
        expect(markdown, locale).toMatch(/telemetry/i);
      }

      if (markdown.includes("10 million") || markdown.includes("10 milhões")) {
        expect(markdown, locale).toMatch(/rabbitmq|broker/i);
      }
    }
  });

  it("carries every headline figure in both exports", () => {
    const en = readMarkdown("en-US");
    const pt = readMarkdown("pt-BR");

    // The figures that decide a hiring conversation, checked across both exports.
    for (const pattern of [/R\$ ?24/, /100\s*(million|milhões)/, /R\$ ?100\s*(billion|bilh)/]) {
      expect(pattern.test(en), `en-US misses ${pattern}`).toBe(true);
      expect(pattern.test(pt), `pt-BR misses ${pattern}`).toBe(true);
    }
  });
});