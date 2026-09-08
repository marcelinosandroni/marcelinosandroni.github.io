import { describe, it, expect } from "vitest";
import { calculateSkillExperience } from "@/application/resume/calculate-skill-experience";
import type { ResumeExperience, ResumeSkillGroup } from "@/domain/resume/types";

describe("CalculateSkillExperience", () => {
  const mockSkillGroups: ResumeSkillGroup[] = [
    { label: "Backend", skills: ["C# / .NET", "Java / Spring Boot", "Node.js / NestJS"] },
    { label: "Frontend", skills: ["React", "Angular", "TypeScript"] },
    { label: "Cloud & SRE", skills: ["AWS", "Kubernetes", "Docker", "Terraform"] },
  ];

  it("should calculate years of experience for non-overlapping periods", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Company A",
        role: "Developer",
        period: "Jan/2020 – Dec/2021",
        location: "Remote",
        summary: "Worked with C# and React",
        highlights: ["Developed systems using C# / .NET and React"],
        technologies: ["C#", ".NET", "React"],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    expect(result[0].yearsOfExperience).toBeDefined();
    expect(result[0].yearsOfExperience!).toBeGreaterThanOrEqual(1.5);
    expect(result[0].yearsOfExperience!).toBeLessThanOrEqual(2.5);

    expect(result[1].yearsOfExperience).toBeDefined();
    expect(result[1].yearsOfExperience!).toBeGreaterThanOrEqual(1.5);

    expect(result[2].yearsOfExperience).toBeUndefined();
  });

  it("should handle overlapping periods correctly without double counting", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Company A",
        role: "Developer",
        period: "Jan/2020 – Dec/2021",
        location: "Remote",
        summary: "Backend work",
        highlights: ["C# development"],
        technologies: ["C#", ".NET"],
      },
      {
        company: "Company B",
        role: "Developer",
        period: "Jun/2021 – Dec/2022",
        location: "Remote",
        summary: "More backend",
        highlights: ["Java development"],
        technologies: ["Java", "Spring Boot"],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    // Overlapping period: Jan 2020 - Dec 2022 = 3 years total, not 4
    expect(result[0].yearsOfExperience).toBeDefined();
    expect(result[0].yearsOfExperience!).toBeGreaterThanOrEqual(2.5);
    expect(result[0].yearsOfExperience!).toBeLessThanOrEqual(3.5);
  });

  it("should handle Present as end date", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Current Company",
        role: "Senior Developer",
        period: "Jan/2023 – Present",
        location: "Remote",
        summary: "Current role",
        highlights: ["Working with AWS and Kubernetes"],
        technologies: ["AWS", "Kubernetes", "Docker"],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    // Should calculate from Jan 2023 to now
    expect(result[2].yearsOfExperience).toBeDefined();
    expect(result[2].yearsOfExperience!).toBeGreaterThan(0);
  });

  it("should return undefined when no skills are matched", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Company X",
        role: "Manager",
        period: "Jan/2020 – Dec/2021",
        location: "Remote",
        summary: "Management role",
        highlights: ["Team management", "Strategy"],
        technologies: [],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    // No matching skills, so years should be undefined
    result.forEach((group) => {
      expect(group.yearsOfExperience).toBeUndefined();
    });
  });

  it("should extract skills from highlights text", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Tech Corp",
        role: "Full Stack Developer",
        period: "Jan/2019 – Dec/2023",
        location: "Remote",
        summary: "Full stack development",
        highlights: [
          "Built microservices with Node.js / NestJS",
          "Created responsive UIs with Angular and TypeScript",
          "Deployed to AWS using Terraform and Docker",
        ],
        technologies: [],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    // All groups should have some experience detected from highlights
    expect(result[0].yearsOfExperience).toBeDefined();
    expect(result[0].yearsOfExperience!).toBeGreaterThan(4);

    expect(result[1].yearsOfExperience).toBeDefined();
    expect(result[1].yearsOfExperience!).toBeGreaterThan(4);

    expect(result[2].yearsOfExperience).toBeDefined();
    expect(result[2].yearsOfExperience!).toBeGreaterThan(4);
  });

  it("should round years to 1 decimal place", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Short Term Corp",
        role: "Contractor",
        period: "Jan/2023 – Jun/2023",
        location: "Remote",
        summary: "Short contract",
        highlights: ["React development"],
        technologies: ["React"],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    // 6 months = 0.5 years
    expect(result[1].yearsOfExperience).toBe(0.5);
  });

  it("should preserve original group properties", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Company",
        role: "Dev",
        period: "Jan/2020 – Dec/2021",
        location: "Remote",
        summary: "Work",
        highlights: ["C# work"],
        technologies: ["C#"],
      },
    ];

    const result = calculateSkillExperience(experiences, mockSkillGroups);

    expect(result[0].label).toBe("Backend");
    expect(result[0].skills).toEqual(["C# / .NET", "Java / Spring Boot", "Node.js / NestJS"]);
    expect(result[1].label).toBe("Frontend");
    expect(result[2].label).toBe("Cloud & SRE");
  });

  it("should handle empty experiences array", () => {
    const result = calculateSkillExperience([], mockSkillGroups);

    result.forEach((group) => {
      expect(group.yearsOfExperience).toBeUndefined();
      expect(group.label).toBeDefined();
      expect(group.skills).toBeDefined();
    });
  });

  it("should handle multiple skills in same group with different usage periods", () => {
    const customSkillGroups: ResumeSkillGroup[] = [
      { label: "Mixed", skills: ["Python", "Go", "Rust"] },
    ];

    const experiences: ResumeExperience[] = [
      {
        company: "Company A",
        role: "Developer",
        period: "Jan/2020 – Dec/2021",
        location: "Remote",
        summary: "Python work",
        highlights: ["Python development"],
        technologies: ["Python"],
      },
      {
        company: "Company B",
        role: "Developer",
        period: "Jan/2022 – Dec/2023",
        location: "Remote",
        summary: "Go work",
        highlights: ["Go development"],
        technologies: ["Go"],
      },
    ];

    const result = calculateSkillExperience(experiences, customSkillGroups);

    // Python: 2 years (24 months), Go: 2 years (24 months), Rust: 0 -> total unique months = 48
    // Group spans from Jan 2020 to Dec 2023 = 4 years total
    expect(result[0].yearsOfExperience).toBeDefined();
    expect(result[0].yearsOfExperience!).toBeGreaterThanOrEqual(3.5);
    expect(result[0].yearsOfExperience!).toBeLessThanOrEqual(4.5);
  });
});
