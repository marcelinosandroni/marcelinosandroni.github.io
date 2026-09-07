import type { Locale, ResumeContent } from "@/domain/resume/types";
import { ResumeVersion } from "@/domain/publication/resume-version";
import type { PublishedResume, PublishedResumeRepository } from "@/application/publication/get-published-resume";
import { supabase } from "@/infrastructure/supabase/supabase-client";

export class SupabaseResumeRepository implements PublishedResumeRepository {
  async findLatest(locale: Locale): Promise<PublishedResume | null> {
    const { data, error } = await supabase
      .from("resume_versions")
      .select("version, content")
      .eq("locale", locale)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    const version = ResumeVersion.create(String(data.version));
    const content = data.content as ResumeContent;

    return {
      version,
      content,
    };
  }
}
