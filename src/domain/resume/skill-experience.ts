import type { ResumeExperience } from "./types";

export type SkillExperience = {
  skill: string;
  yearsOfExperience: number;
  monthsOfExperience: number;
  experiences: SkillInExperience[];
};

export type SkillInExperience = {
  company: string;
  role: string;
  startDate: Date;
  endDate: Date | null;
  durationMonths: number;
};

export type ParsedWorkExperience = {
  company: string;
  role: string;
  startDate: Date;
  endDate: Date | null;
  skillsUsed: string[];
};

export function parsePeriodToDates(period: string): { startDate: Date; endDate: Date | null } {
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    "jan/": 0, "fev/": 1, "mar/": 2, "abr/": 3, "mai/": 4, "jun/": 5,
    "jul/": 6, "ago/": 7, "set/": 8, "out/": 9, "nov/": 10, "dez/": 11,
  };

  const normalizedPeriod = period.toLowerCase().trim();
  
  // Padrão: "Jan/2026 – Presente" ou "Jul/2024 – Dez/2025"
  const parts = normalizedPeriod.split(/[\s–-]+/).filter(p => p.length > 0);
  
  if (parts.length < 2) {
    // Fallback: tentar extrair apenas ano
    const yearMatch = period.match(/\d{4}/);
    if (yearMatch) {
      return {
        startDate: new Date(parseInt(yearMatch[0]), 0, 1),
        endDate: null,
      };
    }
    return {
      startDate: new Date(2020, 0, 1),
      endDate: null,
    };
  }

  const startPart = parts[0];
  const endPart = parts[parts.length - 1];

  // Parse start date
  let startMonth = 0;
  let startYear = 2020;
  
  const startMonthMatch = startPart.match(/^([a-z]{3,4})\/?(\d{4})$/);
  if (startMonthMatch) {
    const [, monthStr, yearStr] = startMonthMatch;
    startMonth = monthNames[monthStr + "/"] ?? monthNames[monthStr] ?? 0;
    startYear = parseInt(yearStr);
  } else {
    const yearMatch = startPart.match(/(\d{4})/);
    if (yearMatch) {
      startYear = parseInt(yearMatch[1]);
    }
  }

  // Parse end date
  let endDate: Date | null = null;
  if (endPart.includes("presente") || endPart.includes("present") || endPart === "atual") {
    endDate = null;
  } else {
    let endMonth = 11;
    let endYear = startYear;
    
    const endMonthMatch = endPart.match(/^([a-z]{3,4})\/?(\d{4})$/);
    if (endMonthMatch) {
      const [, monthStr, yearStr] = endMonthMatch;
      endMonth = monthNames[monthStr + "/"] ?? monthNames[monthStr] ?? 11;
      endYear = parseInt(yearStr);
      endDate = new Date(endYear, endMonth + 1, 0); // Último dia do mês
    } else {
      const yearMatch = endPart.match(/(\d{4})/);
      if (yearMatch) {
        endYear = parseInt(yearMatch[1]);
        endDate = new Date(endYear, 11, 31);
      }
    }
  }

  return {
    startDate: new Date(startYear, startMonth, 1),
    endDate,
  };
}

export function calculateDurationMonths(startDate: Date, endDate: Date | null): number {
  const end = endDate ?? new Date();
  const years = end.getFullYear() - startDate.getFullYear();
  const months = end.getMonth() - startDate.getMonth();
  const days = end.getDate() - startDate.getDate();
  
  let totalMonths = years * 12 + months;
  if (days < 0) {
    totalMonths -= 1;
  }
  
  return Math.max(0, totalMonths);
}

export function parseWorkExperiences(experiences: ResumeExperience[]): ParsedWorkExperience[] {
  return experiences.map(exp => {
    const { startDate, endDate } = parsePeriodToDates(exp.period);
    return {
      company: exp.company,
      role: exp.role,
      startDate,
      endDate,
      skillsUsed: exp.technologies ?? [],
    };
  });
}

export function calculateSkillExperience(
  experiences: ParsedWorkExperience[]
): SkillExperience[] {
  const skillMap = new Map<string, SkillExperience>();

  for (const exp of experiences) {
    const durationMonths = calculateDurationMonths(exp.startDate, exp.endDate);
    
    for (const skill of exp.skillsUsed) {
      if (!skillMap.has(skill)) {
        skillMap.set(skill, {
          skill,
          yearsOfExperience: 0,
          monthsOfExperience: 0,
          experiences: [],
        });
      }

      const skillExp = skillMap.get(skill)!;
      skillExp.experiences.push({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate,
        endDate: exp.endDate,
        durationMonths,
      });
    }
  }

  // Calcular total considerando sobreposição
  const result: SkillExperience[] = [];
  
  for (const [skill, data] of skillMap.entries()) {
    const totalMonths = calculateTotalNonOverlappingMonths(data.experiences);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    result.push({
      ...data,
      yearsOfExperience: years,
      monthsOfExperience: months,
    });
  }

  // Ordenar por anos de experiência (descendente)
  result.sort((a, b) => {
    if (b.yearsOfExperience !== a.yearsOfExperience) {
      return b.yearsOfExperience - a.yearsOfExperience;
    }
    return b.monthsOfExperience - a.monthsOfExperience;
  });

  return result;
}

function calculateTotalNonOverlappingMonths(experiences: SkillInExperience[]): number {
  if (experiences.length === 0) return 0;

  // Criar intervalos de meses
  const intervals: [number, number][] = experiences.map(exp => {
    const start = exp.startDate.getTime();
    const end = exp.endDate?.getTime() ?? Date.now();
    return [start, end];
  });

  // Ordenar por início
  intervals.sort((a, b) => a[0] - b[0]);

  // Mesclar sobreposições
  const merged: [number, number][] = [];
  for (const [start, end] of intervals) {
    if (merged.length === 0 || merged[merged.length - 1][1] < start) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    }
  }

  // Calcular total de meses
  let totalMonths = 0;
  for (const [start, end] of merged) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    const days = endDate.getDate() - startDate.getDate();
    
    let monthsDiff = years * 12 + months;
    if (days < 0) {
      monthsDiff -= 1;
    }
    
    totalMonths += Math.max(0, monthsDiff);
  }

  return totalMonths;
}

export function formatSkillExperience(skillExp: SkillExperience): string {
  const { yearsOfExperience, monthsOfExperience } = skillExp;
  
  if (yearsOfExperience === 0) {
    return `${monthsOfExperience} meses`;
  }
  
  if (monthsOfExperience === 0) {
    return `${yearsOfExperience} ano${yearsOfExperience > 1 ? 's' : ''}`;
  }
  
  return `${yearsOfExperience} ano${yearsOfExperience > 1 ? 's' : ''} e ${monthsOfExperience} mese${monthsOfExperience > 1 ? 's' : ''}`;
}
