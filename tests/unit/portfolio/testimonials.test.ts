import { describe, expect, it } from "vitest";

import { enUS } from "@/i18n/dictionaries/en-US";
import { ptBR } from "@/i18n/dictionaries/pt-BR";
import { parseFeatureFlag } from "@/domain/feature-flags/feature-flags";

/**
 * Guards the testimonials rule: **the section never invents a person.**
 *
 * A reference is a named human saying something true about working with the
 * owner, so the contract is narrow. The flag decides whether the site offers the
 * section; the data decides whether there is anything true to put in it. Neither
 * of those can substitute for the other, and neither can produce a name.
 *
 * This file tests the copy and the gating rather than the rendered markup: the
 * component is three lines of conditional plus a list, and what is worth
 * protecting here is the copy — which is a claim about the owner — rather than
 * the markup around it.
 */
describe("testimonials: the flag", () => {
  it("is off unless a value says otherwise", () => {
    // A section that shows by default is a section that shows before the owner
    // has decided the site should carry references at all.
    for (const value of [undefined, null, "", "  ", "off", "no", "0", "false"]) {
      expect(parseFeatureFlag(value), String(value)).toBe(false);
    }

    for (const value of ["1", "true", "yes", "on", "ON", " On "]) {
      expect(parseFeatureFlag(value), String(value)).toBe(true);
    }
  });
});

describe("testimonials: the copy", () => {
  it("says the table is empty, not that the owner has nobody to vouch for them", () => {
    /*
      The failure this prevents: an empty state reading as a verdict on the
      person. "No references" is a claim about them; "nobody has written one
      yet" is a claim about the database, which is the only one this site can
      actually support.
    */
    for (const catalog of [enUS, ptBR]) {
      const { empty } = catalog.testimonials;

      expect(empty.length).toBeGreaterThan(0);
      expect(empty).toMatch(/yet|ainda/i);
      expect(empty).not.toMatch(/\b(no references exist|has no references)\b/i);
      expect(empty).not.toMatch(/ningu(m|a) (falaria|se refere)/i);
    }
  });

  it("offers a way out of the empty state, rather than only stating the fact", () => {
    // An empty section that only reports emptiness is a dead end on a hiring
    // page; the copy invites the thing that would fill it.
    expect(enUS.testimonials.empty).toMatch(/ask/i);
    expect(ptBR.testimonials.empty).toMatch(/pe[çc]a|pedir/i);
  });

  it("carries both locales", () => {
    expect(enUS.testimonials).toBeDefined();
    expect(ptBR.testimonials).toBeDefined();
    expect(enUS.testimonials.title).not.toBe(ptBR.testimonials.title);
    expect(enUS.testimonials.empty).not.toBe(ptBR.testimonials.empty);
  });
});

describe("testimonials: the data rule", () => {
  it("the read path returns nothing while the table is empty", async () => {
    /*
      The typed catalog has never held a testimonial, so the fallback cannot
      produce one. This is the assertion that keeps it that way: if a future
      edit "helpfully" adds a placeholder quote to the fallback, the site would
      publish a fabricated reference the moment the database was unreachable —
      which is precisely the failure the flag and the empty table exist to
      prevent.
    */
    const { VersionedResumeRepository } = await import(
      "@/infrastructure/repositories/versioned-resume-repository"
    );

    expect(await new VersionedResumeRepository().readTestimonials("en-US")).toEqual([]);
    expect(await new VersionedResumeRepository().readTestimonials("pt-BR")).toEqual([]);
  });
});