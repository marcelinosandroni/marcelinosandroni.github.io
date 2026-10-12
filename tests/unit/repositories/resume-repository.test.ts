import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/domain/i18n";
import {
  FallbackResumeRepository,
  VersionedResumeRepository,
} from "@/infrastructure/repositories/versioned-resume-repository";
import type {
  ResumeRepository,
  ResumeSurfaceRead,
  ResumeTestimonial,
} from "@/domain/resume/resume-repository";
import type { ResumeContent } from "@/domain/resume/types";
import { getResumeContent } from "@/infrastructure/content";

/**
 * Guards the résumé fallback.
 *
 * The typed catalog is what a reader gets whenever the database cannot answer,
 * so these tests are about the *failure* paths rather than the happy one: a
 * database outage must produce the document, not a blank page and not a 500.
 */
describe("the versioned résumé repository", () => {
  it("serves the typed catalog for every locale", async () => {
    const repository = new VersionedResumeRepository();

    for (const locale of SUPPORTED_LOCALES) {
      expect(await repository.readResume(locale, "both")).toEqual(getResumeContent(locale));
    }
  });

  it("has no testimonials, because none has ever been written", async () => {
    // Not a stub that will be filled in later: a testimonial is a named person
    // saying something true, and the typed catalog inventing one would be the
    // one lie this site does not tell.
    expect(await new VersionedResumeRepository().readTestimonials("en-US")).toEqual([]);
  });

  it("answers with the typed home stack and annotations", async () => {
    const repository = new VersionedResumeRepository();

    expect(await repository.readHomeStack("en-US")).not.toBeNull();
    expect((await repository.readHomeTrackRecord("en-US"))?.length).toBeGreaterThan(0);
  });
});

/** A repository that answers with whatever it is told to. */
function stub(overrides: Partial<ResumeRepository> = {}): ResumeRepository {
  const base: ResumeRepository = {
    readResume: async () => getResumeContent("en-US"),
    readTestimonials: async () => [],
    readHomeStack: async () => null,
    readHomeTrackRecord: async () => null,
    readTechnologyCatalog: async () => ({ categories: [], technologies: [] }),
  };

  return { ...base, ...overrides };
}

describe("the fallback résumé repository", () => {
  it("prefers the database when it answers", async () => {
    const fromDatabase: ResumeContent = {
      ...getResumeContent("en-US"),
      summary: "EDITED IN THE DATABASE",
    };

    const repository = new FallbackResumeRepository(
      stub({ readResume: async () => fromDatabase }),
      new VersionedResumeRepository(),
    );

    expect((await repository.readResume("en-US", "both")).summary).toBe("EDITED IN THE DATABASE");
  });

  it("falls back to the catalog when the database rejects", async () => {
    const repository = new FallbackResumeRepository(
      stub({
        readResume: async () => {
          throw new Error("PGRST116: connection refused");
        },
      }),
      new VersionedResumeRepository(),
    );

    expect(await repository.readResume("en-US", "both")).toEqual(getResumeContent("en-US"));
  });

  it("falls back rather than rendering a blank résumé", async () => {
    /*
      The distinction this exists for: a database that is *empty* and a database
      that is *unavailable* are different states, and treating the first as the
      second is how a hiring manager ends up looking at a résumé with no
      experience in it — indistinguishable, to them, from a person with no career.
    */
    const empty: ResumeContent = {
      locale: "en-US",
      name: "",
      title: "",
      location: "",
      contact: { phone: "", email: "", linkedin: "" },
      summary: "",
      experiences: [],
      skillGroups: [],
      education: [],
      languages: [],
    };

    const repository = new FallbackResumeRepository(
      stub({ readResume: async () => empty }),
      new VersionedResumeRepository(),
    );

    const content = await repository.readResume("en-US", "both");

    expect(content.experiences.length).toBeGreaterThan(0);
    expect(content.name).not.toBe("");
  });

  it("reports the failure, so the breaker can open", async () => {
    const reasons: string[] = [];

    const repository = new FallbackResumeRepository(
      stub({
        readResume: async () => {
          throw new Error("timed out after 2000ms");
        },
      }),
      new VersionedResumeRepository(),
      (error) => reasons.push(error.message),
    );

    await repository.readResume("en-US", "both");

    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/timed out/);
  });

  it("does not report a failure when the database answers with nothing", async () => {
    /*
      A `null` from `readHomeStack` means "not provisioned", not "failed".
      Treating it as a failure would open the breaker for a deployment that is
      working exactly as configured, and every visitor would then be served the
      typed catalog for the next minute.
    */
    const reasons: string[] = [];

    const repository = new FallbackResumeRepository(
      stub({ readHomeStack: async () => null }),
      stub({ readHomeStack: async () => ({ id: "x", kicker: "", title: "", note: "", clusters: [] }) }),
      (error) => reasons.push(error.message),
    );

    const stack = await repository.readHomeStack("en-US");

    expect(reasons).toEqual([]);
    expect(stack?.id).toBe("x");
  });

  it("falls back for testimonials without opening the breaker on an empty table", async () => {
    const reasons: string[] = [];

    const repository = new FallbackResumeRepository(
      stub({ readTestimonials: async () => [] }),
      stub({ readTestimonials: async (): Promise<ResumeTestimonial[]> => [] }),
      (error) => reasons.push(error.message),
    );

    expect(await repository.readTestimonials("en-US")).toEqual([]);
    expect(reasons).toEqual([]);
  });

  it("propagates the surface it was asked for, rather than deciding", async () => {
    const seen: ResumeSurfaceRead[] = [];

    const repository = new FallbackResumeRepository(
      stub({
        readResume: async (_locale, surface) => {
          seen.push(surface);
          return getResumeContent("en-US");
        },
      }),
      new VersionedResumeRepository(),
    );

    await repository.readResume("en-US", "home");
    await repository.readResume("en-US", "resume");

    expect(seen).toEqual(["home", "resume"]);
  });
});