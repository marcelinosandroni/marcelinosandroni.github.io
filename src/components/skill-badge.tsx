"use client";

import { useState } from "react";
import type { SkillExperience } from "@/domain/resume/skill-experience";
import { formatSkillExperience } from "@/domain/resume/skill-experience";

interface SkillBadgeProps {
  skill: string;
  yearsOfExperience: number;
  monthsOfExperience: number;
  experiences?: Array<{
    company: string;
    role: string;
    startDate: Date;
    endDate: Date | null;
    durationMonths: number;
  }>;
  variant?: "default" | "highlight" | "compact";
}

export function SkillBadge({
  skill,
  yearsOfExperience,
  monthsOfExperience,
  experiences = [],
  variant = "default",
}: SkillBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formattedExperience = formatSkillExperience({
    skill,
    yearsOfExperience,
    monthsOfExperience,
    experiences: [],
  });

  const getVariantClasses = () => {
    switch (variant) {
      case "highlight":
        return "skill-badge-highlight";
      case "compact":
        return "skill-badge-compact";
      default:
        return "";
    }
  };

  return (
    <div
      className={`skill-badge ${getVariantClasses()}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="button"
      aria-label={`${skill}: ${formattedExperience} de experiência`}
    >
      <span className="skill-name">{skill}</span>
      <span className="skill-experience">{formattedExperience}</span>

      {showTooltip && experiences.length > 0 && (
        <div className="skill-tooltip" role="tooltip">
          <div className="tooltip-title">
            {yearsOfExperience} ano{yearsOfExperience !== 1 ? "s" : ""} e {monthsOfExperience} mese{monthsOfExperience !== 1 ? "s" : ""} em {skill}
          </div>
          <div className="tooltip-details">
            {experiences.map((exp, index) => (
              <div key={index} className="tooltip-item">
                <strong>{exp.company}</strong>
                <span>{exp.role}</span>
                <span className="tooltip-period">
                  {exp.startDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} -{" "}
                  {exp.endDate
                    ? exp.endDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
                    : "Presente"}
                </span>
                <span className="tooltip-duration">{exp.durationMonths} meses</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SkillGridProps {
  skills: SkillExperience[];
  title?: string;
  showYears?: boolean;
  minYears?: number;
}

export function SkillGrid({
  skills,
  title,
  showYears = true,
  minYears = 0,
}: SkillGridProps) {
  const filteredSkills = skills.filter(
    (s) => s.yearsOfExperience >= minYears
  );

  return (
    <div className="skill-grid-container">
      {title && <h3 className="skill-grid-title">{title}</h3>}
      <div className="skill-grid">
        {filteredSkills.map((skillExp) => (
          <SkillBadge
            key={skillExp.skill}
            skill={skillExp.skill}
            yearsOfExperience={skillExp.yearsOfExperience}
            monthsOfExperience={skillExp.monthsOfExperience}
            experiences={skillExp.experiences}
            variant={skillExp.yearsOfExperience >= 5 ? "highlight" : "default"}
          />
        ))}
      </div>
      {filteredSkills.length === 0 && (
        <p className="skill-grid-empty">
          Nenhuma habilidade encontrada com os filtros selecionados.
        </p>
      )}
    </div>
  );
}
