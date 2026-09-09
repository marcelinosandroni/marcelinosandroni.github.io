import { describe, it, expect } from "vitest";
import {
  parsePeriodToDates,
  calculateDurationMonths,
  parseWorkExperiences,
  calculateSkillExperience,
  formatSkillExperience,
} from "@/domain/resume/skill-experience";
import type { ResumeExperience } from "@/domain/resume/types";

describe("parsePeriodToDates", () => {
  it("deve parsear período no formato 'Jan/2026 – Presente'", () => {
    const result = parsePeriodToDates("Jan/2026 – Presente");
    expect(result.startDate).toEqual(new Date(2026, 0, 1));
    expect(result.endDate).toBeNull();
  });

  it("deve parsear período com início e fim definidos", () => {
    const result = parsePeriodToDates("Jul/2024 – Dez/2025");
    expect(result.startDate).toEqual(new Date(2024, 6, 1));
    expect(result.endDate).toEqual(new Date(2025, 12, 0)); // Último dia de dezembro
  });

  it("deve parsear período em inglês", () => {
    const result = parsePeriodToDates("Mar/2022 – Nov/2022");
    expect(result.startDate).toEqual(new Date(2022, 2, 1));
    expect(result.endDate).toEqual(new Date(2022, 10, 30)); // Novembro é mês 10
  });

  it("deve lidar com períodos apenas com ano", () => {
    const result = parsePeriodToDates("2021–2025");
    expect(result.startDate.getFullYear()).toBe(2021);
    expect(result.endDate).not.toBeNull();
  });
});

describe("calculateDurationMonths", () => {
  it("deve calcular duração correta em meses", () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 11, 31);
    expect(calculateDurationMonths(start, end)).toBe(11);
  });

  it("deve calcular duração de múltiplos anos", () => {
    const start = new Date(2020, 0, 1);
    const end = new Date(2024, 0, 1);
    expect(calculateDurationMonths(start, end)).toBe(48);
  });

  it("deve retornar 0 para datas inválidas", () => {
    const start = new Date(2024, 11, 1);
    const end = new Date(2024, 0, 1);
    expect(calculateDurationMonths(start, end)).toBe(0);
  });

  it("deve usar data atual quando endDate é null", () => {
    const start = new Date(2020, 0, 1);
    const duration = calculateDurationMonths(start, null);
    expect(duration).toBeGreaterThan(0);
  });
});

describe("parseWorkExperiences", () => {
  it("deve converter array de ResumeExperience para ParsedWorkExperience", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Empresa A",
        role: "Desenvolvedor",
        period: "Jan/2020 – Dez/2022",
        location: "São Paulo",
        summary: "Resumo",
        highlights: [],
        technologies: ["React", "Node.js"],
      },
    ];

    const result = parseWorkExperiences(experiences);
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("Empresa A");
    expect(result[0].skillsUsed).toEqual(["React", "Node.js"]);
    expect(result[0].startDate).toEqual(new Date(2020, 0, 1));
  });

  it("deve lidar com experiências sem tecnologias", () => {
    const experiences: ResumeExperience[] = [
      {
        company: "Empresa B",
        role: "Analista",
        period: "2021–2022",
        location: "Rio",
        summary: "Resumo",
        highlights: [],
      },
    ];

    const result = parseWorkExperiences(experiences);
    expect(result[0].skillsUsed).toEqual([]);
  });
});

describe("calculateSkillExperience", () => {
  it("deve calcular anos de experiência para uma skill", () => {
    const experiences = [
      {
        company: "Empresa A",
        role: "Dev",
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2022, 11, 31),
        skillsUsed: ["React"],
      },
    ];

    const result = calculateSkillExperience(experiences);
    expect(result).toHaveLength(1);
    expect(result[0].skill).toBe("React");
    expect(result[0].yearsOfExperience).toBeGreaterThanOrEqual(2);
  });

  it("deve agrupar experiência da mesma skill em múltiplas empresas", () => {
    const experiences = [
      {
        company: "Empresa A",
        role: "Dev",
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2021, 11, 31),
        skillsUsed: ["TypeScript"],
      },
      {
        company: "Empresa B",
        role: "Senior Dev",
        startDate: new Date(2022, 0, 1),
        endDate: new Date(2023, 11, 31),
        skillsUsed: ["TypeScript"],
      },
    ];

    const result = calculateSkillExperience(experiences);
    expect(result).toHaveLength(1);
    expect(result[0].skill).toBe("TypeScript");
    expect(result[0].experiences).toHaveLength(2);
    // 2 anos (2020-2021) + 2 anos (2022-2023) = 4 anos, mas há gap de 1 mês entre períodos
    expect(result[0].yearsOfExperience).toBeGreaterThanOrEqual(3);
  });

  it("deve considerar sobreposição de períodos", () => {
    const experiences = [
      {
        company: "Empresa A",
        role: "Dev",
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2022, 11, 31),
        skillsUsed: ["Node.js"],
      },
      {
        company: "Empresa B",
        role: "Consultor",
        startDate: new Date(2021, 0, 1),
        endDate: new Date(2023, 11, 31),
        skillsUsed: ["Node.js"],
      },
    ];

    const result = calculateSkillExperience(experiences);
    expect(result).toHaveLength(1);
    // Períodos se sobrepõem: 2020-2023 = ~4 anos, não 6
    expect(result[0].yearsOfExperience).toBeLessThan(6);
    expect(result[0].yearsOfExperience).toBeGreaterThanOrEqual(3);
  });

  it("deve ordenar por anos de experiência descendente", () => {
    const experiences = [
      {
        company: "Empresa A",
        role: "Dev",
        startDate: new Date(2022, 0, 1),
        endDate: new Date(2023, 11, 31),
        skillsUsed: ["React"],
      },
      {
        company: "Empresa B",
        role: "Dev",
        startDate: new Date(2018, 0, 1),
        endDate: new Date(2023, 11, 31),
        skillsUsed: ["Java"],
      },
    ];

    const result = calculateSkillExperience(experiences);
    expect(result[0].skill).toBe("Java");
    expect(result[1].skill).toBe("React");
  });
});

describe("formatSkillExperience", () => {
  it("deve formatar apenas meses", () => {
    const skillExp = {
      skill: "React",
      yearsOfExperience: 0,
      monthsOfExperience: 6,
      experiences: [],
    };
    expect(formatSkillExperience(skillExp)).toBe("6 meses");
  });

  it("deve formatar apenas anos", () => {
    const skillExp = {
      skill: "Java",
      yearsOfExperience: 5,
      monthsOfExperience: 0,
      experiences: [],
    };
    expect(formatSkillExperience(skillExp)).toBe("5 anos");
  });

  it("deve formatar anos e meses", () => {
    const skillExp = {
      skill: "TypeScript",
      yearsOfExperience: 3,
      monthsOfExperience: 4,
      experiences: [],
    };
    expect(formatSkillExperience(skillExp)).toBe("3 anos e 4 meses");
  });

  it("deve formatar singular corretamente", () => {
    const skillExp = {
      skill: "Go",
      yearsOfExperience: 1,
      monthsOfExperience: 1,
      experiences: [],
    };
    expect(formatSkillExperience(skillExp)).toBe("1 ano e 1 mese");
  });
});
