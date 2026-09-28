import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAlternateLanguageMap, SUPPORTED_LOCALES, type Locale } from "@/domain/i18n";
import { ArticleSlug } from "@/domain/blog";
import { getHomeContent } from "@/infrastructure/content/home";
import { getResumeContent } from "@/infrastructure/content";

/**
 * Guards the home page configuration.
 *
 * The redesign moved every visitor-facing string on the home route into data, and
 * made the track record a *join* between the home configuration and the resume.
 * Both introduce failure modes that a type checker cannot see:
 *
 *  - a section id that no element actually renders, so a nav link scrolls nowhere;
 *  - an annotation whose `company` matches no experience, so a KPI badge silently
 *    disappears — or matches two, so it is applied to the wrong role;
 *  - a locale that drifts structurally from the other, so a section renders four
 *    cards in English and five in Portuguese;
 *  - a blog teaser whose slug is not a real article, so the teaser is a dead link.
 *
 * These are the checks that keep "all data in home is configurable" from becoming
 * "all data in home is easy to break".
 */

const LOCALES = [...SUPPORTED_LOCALES];

const ACCENT_TONES = new Set(["primary", "secondary", "tertiary"]);
const STAT_SCALES = new Set(["monumental", "headline"]);

const ICON_NAMES = new Set([
  "account",
  "bolt",
  "brush",
  "cpu",
  "devices",
  "server",
  "cloud",
  "brain",
  "calendar",
  "location",
  "mail",
  "verified",
  "external",
  "terminal",
  "document",
  "shield",
  "code",
  "arrow-down",
  "arrow-right",
  "arrow-back",
  "download",
]);

/** Route segments that exist as pages, as opposed to in-page anchors. */
const ROUTES = new Set(["", "resume", "blog"]);

describe("home content: locale parity", () => {
  it("is defined for every supported locale", () => {
    for (const locale of LOCALES) {
      expect(getHomeContent(locale).locale).toBe(locale);
    }
  });

  it("declares the same sections, in the same order, in both locales", () => {
    const en = getHomeContent("en-US");
    const pt = getHomeContent("pt-BR");

    expect(pt.kpis.id).toBe(en.kpis.id);
    expect(pt.stack.id).toBe(en.stack.id);
    expect(pt.trackRecord.id).toBe(en.trackRecord.id);
    expect(pt.blog.id).toBe(en.blog.id);
    expect(pt.contact.id).toBe(en.contact.id);
    expect(pt.footer.id).toBe(en.footer.id);
  });

  it("has a unique id per section", () => {
    for (const locale of LOCALES) {
      const home = getHomeContent(locale);
      const ids = [
        home.kpis.id,
        home.stack.id,
        home.trackRecord.id,
        home.blog.id,
        home.contact.id,
        home.footer.id,
      ];

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("carries the same number of KPIs, clusters, channels and columns in both locales", () => {
    const en = getHomeContent("en-US");
    const pt = getHomeContent("pt-BR");

    expect(pt.kpis.items.map((kpi) => kpi.id)).toEqual(en.kpis.items.map((kpi) => kpi.id));
    expect(pt.stack.clusters.map((cluster) => cluster.id)).toEqual(
      en.stack.clusters.map((cluster) => cluster.id),
    );
    expect(pt.hero.channels.map((channel) => channel.id)).toEqual(
      en.hero.channels.map((channel) => channel.id),
    );
    expect(pt.contact.channels.map((channel) => channel.id)).toEqual(
      en.contact.channels.map((channel) => channel.id),
    );
    expect(pt.footer.columns.map((column) => column.id)).toEqual(
      en.footer.columns.map((column) => column.id),
    );
  });

  it("keeps the same KPI scale decisions, so the visual hierarchy matches", () => {
    expect(getHomeContent("pt-BR").kpis.items.map((kpi) => kpi.scale)).toEqual(
      getHomeContent("en-US").kpis.items.map((kpi) => kpi.scale),
    );
  });

  it("keeps the same accent assignment per KPI and per cluster", () => {
    const en = getHomeContent("en-US");
    const pt = getHomeContent("pt-BR");

    expect(pt.kpis.items.map((kpi) => kpi.accent)).toEqual(en.kpis.items.map((kpi) => kpi.accent));
    expect(pt.stack.clusters.map((cluster) => cluster.accent)).toEqual(
      en.stack.clusters.map((cluster) => cluster.accent),
    );
  });

  it("never leaves a user-facing home string empty", () => {
    const blanks: string[] = [];

    const record = (label: string, value: string) => {
      if (value.trim() === "") {
        blanks.push(label);
      }
    };

    for (const locale of LOCALES) {
      const home = getHomeContent(locale);
      record(`${locale}.hero.statusPill`, home.hero.statusPill);
      record(`${locale}.hero.name`, home.hero.name);
      record(`${locale}.hero.headlineLead`, home.hero.headlineLead);
      record(`${locale}.hero.headlineAccent`, home.hero.headlineAccent);
      record(`${locale}.hero.headlineTail`, home.hero.headlineTail);
      record(`${locale}.hero.role`, home.hero.role);
      record(`${locale}.hero.narrative`, home.hero.narrative);
      record(`${locale}.hero.availability`, home.hero.availability);

      for (const section of [home.kpis, home.stack, home.trackRecord, home.blog]) {
        record(`${locale}.${section.kicker}`, section.kicker);
        record(`${locale}.${section.title}`, section.title);
        record(`${locale}.${section.note}`, section.note);
      }

      for (const kpi of home.kpis.items) {
        record(`${locale}.kpi.${kpi.id}.label`, kpi.label);
        record(`${locale}.kpi.${kpi.id}.value`, kpi.value);
        record(`${locale}.kpi.${kpi.id}.description`, kpi.description);
        record(`${locale}.kpi.${kpi.id}.footnote`, kpi.footnote.label);
        record(`${locale}.kpi.${kpi.id}.footnoteValue`, kpi.footnote.value);
      }

      for (const cluster of home.stack.clusters) {
        record(`${locale}.cluster.${cluster.id}`, cluster.title);
        record(`${locale}.cluster.${cluster.id}.description`, cluster.description);
      }

      for (const teaser of home.blog.items) {
        record(`${locale}.teaser.${teaser.slug}.category`, teaser.category);
        record(`${locale}.teaser.${teaser.slug}.title`, teaser.title);
        record(`${locale}.teaser.${teaser.slug}.excerpt`, teaser.excerpt);
        record(`${locale}.teaser.${teaser.slug}.cta`, teaser.ctaLabel);
      }

      record(`${locale}.contact.title`, home.contact.title);
      record(`${locale}.contact.narrative`, home.contact.narrative);
      record(`${locale}.contact.brief.subject`, home.contact.brief.subject);
      record(`${locale}.contact.brief.body`, home.contact.brief.bodyTemplate);
      record(`${locale}.footer.title`, home.footer.title);
      record(`${locale}.footer.legalNote`, home.footer.legalNote);
    }

    expect(blanks).toEqual([]);
  });

  it("only uses accents, scales and icons from the closed vocabularies", () => {
    for (const locale of LOCALES) {
      const home = getHomeContent(locale);

      for (const kpi of home.kpis.items) {
        expect(ACCENT_TONES.has(kpi.accent), `${kpi.id} accent`).toBe(true);
        expect(STAT_SCALES.has(kpi.scale), `${kpi.id} scale`).toBe(true);
        expect(ICON_NAMES.has(kpi.icon), `${kpi.id} icon`).toBe(true);
      }
      for (const cluster of home.stack.clusters) {
        expect(ACCENT_TONES.has(cluster.accent), `${cluster.id} accent`).toBe(true);
        expect(ICON_NAMES.has(cluster.icon), `${cluster.id} icon`).toBe(true);
      }
      for (const channel of [...home.hero.channels, ...home.contact.channels]) {
        expect(ICON_NAMES.has(channel.icon), `${channel.id} icon`).toBe(true);
      }
    }
  });

  it("carries the same portrait corner marks and ticker pair in both locales", () => {
    const en = getHomeContent("en-US").hero.portrait;
    const pt = getHomeContent("pt-BR").hero.portrait;

    expect(pt.cornerMarks).toHaveLength(4);
    expect(pt.ticker).toHaveLength(2);
    expect(en.cornerMarks).toHaveLength(4);
    expect(en.ticker).toHaveLength(2);
  });
});

describe("home content: track record joins to the resume", () => {
  for (const locale of LOCALES) {
    it(`annotates every ${locale} experience exactly once`, () => {
      const home = getHomeContent(locale);
      const resume = getResumeContent(locale);
      const companies = resume.experiences.map((experience) => experience.company);
      const annotated = home.trackRecord.annotations.map((annotation) => annotation.company);

      expect([...annotated].sort()).toEqual([...companies].sort());
      expect(new Set(annotated).size).toBe(annotated.length);
    });

    it(`names a real current company for ${locale}`, () => {
      const home = getHomeContent(locale);
      const companies = getResumeContent(locale).experiences.map((experience) => experience.company);

      if (home.trackRecord.currentCompany !== null) {
        expect(companies).toContain(home.trackRecord.currentCompany);
      }
    });

    it(`gives every ${locale} annotation a non-empty blueprint and team line`, () => {
      for (const annotation of getHomeContent(locale).trackRecord.annotations) {
        expect(annotation.blueprint.length).toBeGreaterThan(0);
        expect(annotation.blueprintLabel.trim()).not.toBe("");
        expect(annotation.teamLine.trim()).not.toBe("");
        expect(annotation.impact.label.trim()).not.toBe("");
        expect(annotation.impact.value.trim()).not.toBe("");
        expect(ACCENT_TONES.has(annotation.impact.accent)).toBe(true);
      }
    });
  }
});

describe("home content: link targets", () => {
  for (const locale of LOCALES) {
    it(`resolves every ${locale} internal href to a real route or section`, () => {
      const home = getHomeContent(locale);
      const sectionIds = new Set([
        "top",
        home.kpis.id,
        home.stack.id,
        home.trackRecord.id,
        home.blog.id,
        home.contact.id,
        home.footer.id,
      ]);

      const hrefs = [
        home.hero.primaryAction.href,
        home.hero.secondaryAction.href,
        ...home.hero.channels.map((channel) => channel.href),
        ...home.contact.channels.map((channel) => channel.href),
        ...home.footer.columns.flatMap((column) =>
          column.items.map((item) => item.href),
        ),
      ];

      for (const href of hrefs) {
        if (href.startsWith("#")) {
          expect(sectionIds.has(href.slice(1)), `anchor ${href}`).toBe(true);
          continue;
        }

        if (href.startsWith("/")) {
          const segment = href.slice(1).split("/")[0];
          expect(ROUTES.has(segment), `route ${href}`).toBe(true);
          continue;
        }

        expect(["http:", "https:", "mailto:"], `scheme for ${href}`).toContain(
          href.split(":")[0] + ":",
        );
      }
    });
  }

  it("keeps the hero secondary action pointing at the track record", () => {
    for (const locale of LOCALES) {
      const home = getHomeContent(locale);
      expect(home.hero.secondaryAction.href).toBe(`#${home.trackRecord.id}`);
    }
  });

  it("keeps the contact brief addressable by a real mailto", () => {
    const email = getResumeContent("en-US").contact.email;
    expect(email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });
});

describe("home content: blog teasers", () => {
  for (const locale of LOCALES) {
    it(`uses ${locale} slugs that are valid article slugs`, () => {
      for (const teaser of getHomeContent(locale).blog.items) {
        expect(ArticleSlug.isValid(teaser.slug), teaser.slug).toBe(true);
      }
    });

    it(`keeps a ${locale} reading time within a believable range`, () => {
      for (const teaser of getHomeContent(locale).blog.items) {
        expect(teaser.readingTimeMinutes).toBeGreaterThanOrEqual(1);
        expect(teaser.readingTimeMinutes).toBeLessThanOrEqual(60);
      }
    });

    it(`never renders more ${locale} teasers than the limit`, () => {
      const blog = getHomeContent(locale).blog;
      expect(blog.items.length).toBeLessThanOrEqual(Math.max(blog.limit, blog.items.length));
    });
  }

  it("teases the same slugs in both locales", () => {
    expect(getHomeContent("pt-BR").blog.items.map((item) => item.slug)).toEqual(
      getHomeContent("en-US").blog.items.map((item) => item.slug),
    );
  });
});

describe("home content: hreflang shape", () => {
  it("declares an x-default pointing at the reference locale", () => {
    expect(getAlternateLanguageMap()["x-default"]).toBe("/en-us");
  });
});

describe("home content: portrait", () => {
  /**
   * `src` must be a root-relative path into `public/`, never a remote URL.
   * A remote host would require a `remotePatterns` entry in `next.config.ts`, and
   * forgetting that produces a runtime 400 from the image optimizer — a failure
   * that only shows up in the browser.
   */
  it("only ever points at a local file in public/, or at nothing", () => {
    for (const locale of LOCALES) {
      const portrait = getHomeContent(locale).hero.portrait;

      if (portrait.src !== null) {
        expect(portrait.src, locale).toMatch(/^\/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+$/);
        expect(portrait.src, locale).not.toMatch(/^https?:\/\//);
      }
      expect(portrait.alt.trim(), locale).not.toBe("");
    }
  });

  /**
   * A path typo is invisible in review and renders a broken image on the hero.
   * The frame can fall back to a designed monogram, but only when `src` is
   * genuinely absent — never when a file is configured and missing.
   */
  it("resolves a configured portrait to a real file in public/", () => {
    for (const locale of LOCALES) {
      const { src } = getHomeContent(locale).hero.portrait;

      if (src === null) {
        continue;
      }

      const onDisk = path.join(process.cwd(), "public", src.replace(/^\//, ""));
      expect(existsSync(onDisk), `${locale} portrait ${src} is missing from public/`).toBe(true);
    }
  });

  it("uses the same photograph for both locales", () => {
    expect(getHomeContent("pt-BR").hero.portrait.src).toBe(
      getHomeContent("en-US").hero.portrait.src,
    );
  });
});

describe("home content: every locale renders every section", () => {
  it("keeps the section order stable across locales", () => {
    const order = (locale: Locale) => {
      const home = getHomeContent(locale);
      return [home.kpis.id, home.stack.id, home.trackRecord.id, home.blog.id, home.contact.id];
    };

    expect(order("pt-BR")).toEqual(order("en-US"));
  });
});
