import { describe, expect, it, vi } from "vitest";
import { ResumeVersion } from "@/domain/publication/resume-version";
import {
  StoreResumeArtifact,
  RetrieveResumeArtifact,
  type ArtifactStorageRepository,
} from "@/application/publication/store-resume-artifact";
import type { ResumeArtifact } from "@/application/publication/publish-pdf-resume";

const sampleArtifact: ResumeArtifact = {
  version: ResumeVersion.create("1.0.0"),
  locale: "pt-BR",
  filename: "resume-test-1.0.0-pt-BR.pdf",
  pdfBuffer: Buffer.from("mock-pdf-content"),
  generatedAt: new Date(),
};

describe("Store & Retrieve Resume Artifacts", () => {
  it("uploads artifact and returns public URL", async () => {
    const mockRepository: ArtifactStorageRepository = {
      upload: vi.fn().mockResolvedValue("https://storage.example.com/1.0.0/pt-BR/resume-test-1.0.0-pt-BR.pdf"),
      download: vi.fn(),
    };

    const store = new StoreResumeArtifact(mockRepository);
    const url = await store.execute(sampleArtifact);

    expect(url).toContain("https://");
    expect(url).toContain("1.0.0");
    expect(url).toContain("pt-BR");
    expect(mockRepository.upload).toHaveBeenCalledWith(sampleArtifact, "resume-artifacts");
  });

  it("downloads artifact from storage", async () => {
    const mockBuffer = Buffer.from("pdf-content");
    const mockRepository: ArtifactStorageRepository = {
      upload: vi.fn(),
      download: vi.fn().mockResolvedValue(mockBuffer),
    };

    const retrieve = new RetrieveResumeArtifact(mockRepository);
    const buffer = await retrieve.execute("1.0.0/pt-BR/resume-test-1.0.0-pt-BR.pdf");

    expect(buffer).toEqual(mockBuffer);
    expect(mockRepository.download).toHaveBeenCalledWith(
      "1.0.0/pt-BR/resume-test-1.0.0-pt-BR.pdf",
      "resume-artifacts",
    );
  });

  it("uses custom bucket name", async () => {
    const mockRepository: ArtifactStorageRepository = {
      upload: vi.fn().mockResolvedValue("https://storage.example.com/artifact.pdf"),
      download: vi.fn(),
    };

    const store = new StoreResumeArtifact(mockRepository);
    await store.execute(sampleArtifact, "custom-bucket");

    expect(mockRepository.upload).toHaveBeenCalledWith(sampleArtifact, "custom-bucket");
  });

  it("handles upload errors gracefully", async () => {
    const mockRepository: ArtifactStorageRepository = {
      upload: vi.fn().mockRejectedValue(new Error("Upload failed")),
      download: vi.fn(),
    };

    const store = new StoreResumeArtifact(mockRepository);

    await expect(store.execute(sampleArtifact)).rejects.toThrow("Upload failed");
  });

  it("handles download errors gracefully", async () => {
    const mockRepository: ArtifactStorageRepository = {
      upload: vi.fn(),
      download: vi.fn().mockRejectedValue(new Error("Download failed")),
    };

    const retrieve = new RetrieveResumeArtifact(mockRepository);

    await expect(retrieve.execute("path/to/artifact")).rejects.toThrow("Download failed");
  });
});
