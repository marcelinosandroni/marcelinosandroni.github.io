import type { ResumeArtifact } from "@/application/publication/publish-pdf-resume";

export interface ArtifactStorageRepository {
  upload(artifact: ResumeArtifact, bucket: string): Promise<string>;
  download(path: string, bucket: string): Promise<Buffer>;
}

export class StoreResumeArtifact {
  constructor(private readonly repository: ArtifactStorageRepository) {}

  async execute(
    artifact: ResumeArtifact,
    bucket: string = "resume-artifacts",
  ): Promise<string> {
    return this.repository.upload(artifact, bucket);
  }
}

export class RetrieveResumeArtifact {
  constructor(private readonly repository: ArtifactStorageRepository) {}

  async execute(
    path: string,
    bucket: string = "resume-artifacts",
  ): Promise<Buffer> {
    return this.repository.download(path, bucket);
  }
}
