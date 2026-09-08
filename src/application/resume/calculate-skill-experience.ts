import type { ResumeExperience, ResumeSkillGroup } from "@/domain/resume/types";

type SkillOccurrence = {
  skill: string;
  startDate: Date;
  endDate: Date | null;
};

/**
 * Calculates years of experience for each skill group based on experiences timeline.
 * Uses date parsing from period strings (e.g., "Jan/2021 – Dec/2025", "Mar/2022 – Present").
 * Handles overlapping periods by counting unique months per skill.
 */
export function calculateSkillExperience(
  experiences: ResumeExperience[],
  skillGroups: ResumeSkillGroup[]
): ResumeSkillGroup[] {
  const skillToMonths = new Map<string, Set<string>>();

  // Helper to parse period string into dates
  function parsePeriod(period: string): { start: Date; end: Date | null } {
    const parts = period.split("–").map((p) => p.trim());
    const startStr = parts[0];
    const endStr = parts[1];

    const start = parseDate(startStr);
    const end = endStr && endStr.toLowerCase() !== "present" ? parseDate(endStr) : null;

    return { start, end };
  }

  // Parse date string like "Jan/2021" or "Mar/2022"
  function parseDate(dateStr: string): Date {
    const [month, year] = dateStr.split("/");
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    return new Date(parseInt(year), monthIndex, 1);
  }

  // Generate month key "YYYY-MM" for range
  function getMonthsInRange(start: Date, end: Date | null): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endDate = end ?? new Date();

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      months.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  // Map skills to their active months
  for (const exp of experiences) {
    const { start, end } = parsePeriod(exp.period);
    const months = getMonthsInRange(start, end);
    const monthSet = new Set(months);

    // Get all technologies from this experience
    const techs = exp.technologies ?? [];

    // Also extract skills from highlights (keywords)
    const highlightText = exp.highlights.join(" ").toLowerCase();

    for (const group of skillGroups) {
      for (const skill of group.skills) {
        const skillLower = skill.toLowerCase();
        const skillBase = skill.split(/[\/\s]/)[0].toLowerCase(); // e.g., "C#" from "C# / .NET"

        // Check if skill appears in technologies or highlights
        const isUsedInExp =
          techs.some((t) => t.toLowerCase().includes(skillBase) || t.toLowerCase().includes(skillLower)) ||
          highlightText.includes(skillBase) ||
          highlightText.includes(skillLower);

        if (isUsedInExp) {
          if (!skillToMonths.has(skill)) {
            skillToMonths.set(skill, new Set());
          }
          // Merge months (handles overlaps automatically via Set)
          for (const m of monthSet) {
            skillToMonths.get(skill)!.add(m);
          }
        }
      }
    }
  }

  // Calculate years and update skill groups
  return skillGroups.map((group) => {
    const allMonthsForGroup = new Set<string>();

    for (const skill of group.skills) {
      const months = skillToMonths.get(skill);
      if (months) {
        for (const m of months) {
          allMonthsForGroup.add(m);
        }
      }
    }

    const totalMonths = allMonthsForGroup.size;
    const yearsOfExperience = Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal

    return {
      ...group,
      yearsOfExperience: yearsOfExperience > 0 ? yearsOfExperience : undefined,
    };
  });
}
