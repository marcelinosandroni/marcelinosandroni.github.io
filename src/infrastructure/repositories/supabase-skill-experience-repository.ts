import { supabase } from "@/infrastructure/supabase/supabase-client";
import type {
  SkillExperience,
  ParsedWorkExperience,
} from "@/domain/resume/skill-experience";

export interface WorkExperienceRecord {
  id: string;
  company: string;
  role: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  summary: string | null;
  highlights: string[];
  technologies: string[];
  team_size: number | null;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillExperienceCacheRecord {
  id: string;
  skill: string;
  total_months: number;
  years_of_experience: number;
  months_of_experience: number;
  experience_details: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    duration_months: number;
  }>;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export class SupabaseSkillExperienceRepository {
  async getAllWorkExperiences(): Promise<ParsedWorkExperience[]> {
    const { data, error } = await supabase
      .from("work_experiences")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Erro ao buscar experiências:", error);
      return [];
    }

    return (data ?? []).map((record: WorkExperienceRecord) => ({
      company: record.company,
      role: record.role,
      startDate: new Date(record.start_date),
      endDate: record.end_date ? new Date(record.end_date) : null,
      skillsUsed: record.technologies ?? [],
    }));
  }

  async getSkillExperienceCache(): Promise<SkillExperience[]> {
    const { data, error } = await supabase
      .from("skill_experience_cache")
      .select("*")
      .order("years_of_experience", { ascending: false })
      .order("months_of_experience", { ascending: false });

    if (error) {
      console.error("Erro ao buscar cache de skills:", error);
      return [];
    }

    return (data ?? []).map((record: SkillExperienceCacheRecord) => ({
      skill: record.skill,
      yearsOfExperience: record.years_of_experience,
      monthsOfExperience: record.months_of_experience,
      experiences: record.experience_details.map((detail) => ({
        company: detail.company,
        role: detail.role,
        startDate: new Date(detail.start_date),
        endDate: detail.end_date ? new Date(detail.end_date) : null,
        durationMonths: detail.duration_months,
      })),
    }));
  }

  async saveWorkExperience(experience: {
    company: string;
    role: string;
    startDate: Date;
    endDate?: Date | null;
    location?: string;
    summary?: string;
    highlights?: string[];
    technologies?: string[];
    teamSize?: number;
    scope?: string;
  }): Promise<void> {
    const { error } = await supabase.from("work_experiences").upsert({
      company: experience.company,
      role: experience.role,
      start_date: experience.startDate.toISOString().split("T")[0],
      end_date: experience.endDate?.toISOString().split("T")[0] ?? null,
      location: experience.location ?? null,
      summary: experience.summary ?? null,
      highlights: JSON.stringify(experience.highlights ?? []),
      technologies: JSON.stringify(experience.technologies ?? []),
      team_size: experience.teamSize ?? null,
      scope: experience.scope ?? null,
    });

    if (error) {
      console.error("Erro ao salvar experiência:", error);
      throw error;
    }
  }

  async refreshSkillExperienceCache(): Promise<void> {
    // O trigger no banco já atualiza automaticamente
    // Esta função pode ser usada para forçar refresh se necessário
    const { error } = await supabase.rpc("update_skill_experience_cache");
    
    if (error) {
      console.error("Erro ao atualizar cache de skills:", error);
      throw error;
    }
  }
}
