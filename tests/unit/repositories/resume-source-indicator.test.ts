import { describe, expect, it } from "vitest";

import {
  FallbackResumeRepository,
  VersionedResumeRepository,
} from "@/infrastructure/repositories/versioned-resume-repository";
import type { ResumeContent } from "@/domain/resume/types";
import { getResumeContent } from "@/infrastructure/content";

/**
 * The degraded branch of the admin's source indicator, assembled here rather than
 * reached through the composition root.
 *
 * `readResumeSource` reads process-wide module state — a cached repository
 * promise and a breaker deadline — which cannot be reset between tests without a
 * module registry reset per case. Asserting against shared state here would make
 * each test's result depend on the order the suite happened to run in, which is
 * the worst property a test of a *degradation* path can have: the failures are
 * intermittent by construction.
 *
 * So this covers the decision itself — the fallback's provenance, and the
 * fallback's reason surviving into the value the panel renders — against local
 * fakes. The wiring from those values into the panel is covered end to end
 * against a real deployment.
 */
describe("the résumé source the admin reports", () => {
  const reasons: string[] = [];

  /** A database that is provisioned, reachable, and answering. */
  const healthy = (): FallbackResumeRepository =>
    new FallbackResumeRepository(
      {
        readResume: async (): Promise<ResumeContent> => getResumeContent("en-US"),
        readResumeSnapshot: async () => ({
          content: getResumeContent("en-US"),
          source: "database",
        }),
        readTestimonials: async () => [],
        readHomeStack: async () => null,
        readHomeTrackRecord: async () => null,
        readTechnologyCatalog: async () => ({ categories: [], technologies: [], relations: [] }),
        readStackProfiles: async () => [],
      },
      new VersionedResumeRepository(),
      (error) => reasons.push(error.message),
    );

  /** A database that answers 404 for every table — the `/rest/v1` failure. */
  const misconfigured = (message: string): FallbackResumeRepository =>
    new FallbackResumeRepository(
      {
        readResume: async (): Promise<ResumeContent> => {
          throw new Error(message);
        },
        readResumeSnapshot: async () => {
          throw new Error(message);
        },
        readTestimonials: async () => [],
        readHomeStack: async () => null,
        readHomeTrackRecord: async () => null,
        readTechnologyCatalog: async () => ({ categories: [], technologies: [], relations: [] }),
        readStackProfiles: async () => [],
      },
      new VersionedResumeRepository(),
      (error) => reasons.push(error.message),
    );

  it("says the database, with no reason, while the database answers", async () => {
    const snapshot = await healthy().readResumeSnapshot("en-US", "both");

    expect(snapshot.source).toBe("database");
    // A reason on this branch would render the panel's warning box against a
    // healthy deployment, which is worse than showing nothing.
    expect(snapshot.reason).toBeUndefined();
  });

  it("says the catalog and names the 404 when the URL is missing its path", async () => {
    const snapshot = await misconfigured(
      'requested path is invalid',
    ).readResumeSnapshot("en-US", "both");

    expect(snapshot.source).toBe("versioned");
    // The exact string an owner needs: it is PostgREST's own message and it is
    // what tells them the variable is set but the path is wrong.
    expect(snapshot.reason).toBe("requested path is invalid");
  });

  it("still serves the whole document when degraded, so the panel can count it", async () => {
    const snapshot = await misconfigured("timeout").readResumeSnapshot("en-US", "both");

    // Without this the panel would render "STATIC CATALOG / 0 experiences", which
    // reads as "you have no career" rather than "the database is unreachable".
    expect(snapshot.content.experiences.length).toBeGreaterThan(0);
  });

  it("reports the failure so the breaker can be armed by the same read", async () => {
    reasons.length = 0;

    await misconfigured("connection refused").readResumeSnapshot("en-US", "both");

    expect(reasons).toEqual(["connection refused"]);
  });
});