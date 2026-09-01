import type { ResumeArtifact } from "@/application/publication/publish-pdf-resume";
import type { ArtifactStorageRepository } from "@/application/publication/store-resume-artifact";
import { supabase } from "@/infrastructure/supabase/supabase-client";

export class SupabaseStorageRepository implements ArtifactStorageRepository {
  async upload(artifact: ResumeArtifact, bucket: string): Promise<string> {
    const path = `${artifact.version.toString()}/${artifact.locale}/${artifact.filename}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, artifact.pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error || !data) {
      throw new Error(`Failed to upload artifact: ${error?.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;
  }

  async download(path: string, bucket: string): Promise<Buffer> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error(`Failed to download artifact: ${error?.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }
}
