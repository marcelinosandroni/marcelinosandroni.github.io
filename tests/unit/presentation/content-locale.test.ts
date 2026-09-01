import { describe, it, expect } from "vitest";
import { getResumeContent } from "@/infrastructure/content";

describe("Content Locale & Factual Consistency", () => {
  it("should return Portuguese content for pt-BR", () => {
    const content = getResumeContent("pt-BR");
    expect(content.locale).toBe("pt-BR");
    expect(content.name).toBe("Marcelino Sandroni Dias");
    expect(content.title).toContain("Engenheiro");
    expect(content.experiences.length).toBeGreaterThan(0);
  });

  it("should return English content for en-US", () => {
    const content = getResumeContent("en-US");
    expect(content.locale).toBe("en-US");
    expect(content.name).toBe("Marcelino Sandroni Dias");
    expect(content.title).toContain("Engineer");
    expect(content.experiences.length).toBeGreaterThan(0);
  });

  it("should maintain 1-to-1 factual consistency between PT-BR and EN-US", () => {
    const pt = getResumeContent("pt-BR");
    const en = getResumeContent("en-US");

    expect(pt.name).toBe(en.name);
    expect(pt.contact.email).toBe(en.contact.email);
    expect(pt.contact.linkedin).toBe(en.contact.linkedin);

    expect(pt.experiences.length).toBe(en.experiences.length);
    // Named tech companies
    expect(pt.experiences[0].company).toBe(en.experiences[0].company);
    expect(pt.experiences[1].company).toBe(en.experiences[1].company);
    expect(pt.experiences[2].company).toBe(en.experiences[2].company);
    expect(pt.experiences[3].company).toBe(en.experiences[3].company);

    for (let i = 0; i < pt.experiences.length; i++) {
      expect(pt.experiences[i].highlights.length).toBe(en.experiences[i].highlights.length);
    }

    expect(pt.education.length).toBe(en.education.length);
    for (let i = 0; i < pt.education.length; i++) {
      expect(pt.education[i].institution).toBe(en.education[i].institution);
    }

    expect(pt.skillGroups.length).toBe(en.skillGroups.length);
  });
});
