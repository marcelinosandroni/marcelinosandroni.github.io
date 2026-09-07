import { describe, expect, it } from "vitest";
import { InvalidResumeVersionError, ResumeVersion } from "@/domain/publication/resume-version";

describe("ResumeVersion", () => {
  it("creates a valid semantic version", () => {
    const version = ResumeVersion.create("1.4.2");

    expect(version.toString()).toBe("1.4.2");
  });

  it("rejects incomplete or prefixed versions", () => {
    expect(() => ResumeVersion.create("v1.4.2")).toThrow(InvalidResumeVersionError);
    expect(() => ResumeVersion.create("1.4")).toThrow(InvalidResumeVersionError);
  });

  it("compares major, minor and patch values", () => {
    expect(ResumeVersion.create("2.0.0").compareTo(ResumeVersion.create("1.9.9"))).toBeGreaterThan(0);
    expect(ResumeVersion.create("1.2.0").compareTo(ResumeVersion.create("1.1.9"))).toBeGreaterThan(0);
    expect(ResumeVersion.create("1.2.3").compareTo(ResumeVersion.create("1.2.3"))).toBe(0);
  });
});
