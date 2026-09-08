import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import type { ResumeContent } from "@/domain/resume/types";

export class ResumePdfCache {
  constructor(private readonly rootDir: string) {
    mkdirSync(rootDir, { recursive: true });
  }

  public getPath(
    version: string,
    locale: "pt-BR" | "en-US",
    content: ResumeContent,
    templateId: string,
    preferredFilename: string,
  ): string {
    const signature = this.buildSignature(version, locale, content, templateId);
    const cacheDir = join(this.rootDir, locale, version, templateId);
    const targetPath = join(cacheDir, preferredFilename);
    const signaturePath = join(cacheDir, `${this.safeName(preferredFilename)}.${signature}.meta`);

    if (existsSync(signaturePath) && existsSync(targetPath)) {
      return targetPath;
    }

    return "";
  }

  public write(
    version: string,
    locale: "pt-BR" | "en-US",
    content: ResumeContent,
    templateId: string,
    pdfBuffer: Buffer,
    preferredFilename: string,
  ): string {
    const signature = this.buildSignature(version, locale, content, templateId);
    const cacheDir = join(this.rootDir, locale, version, templateId);
    mkdirSync(cacheDir, { recursive: true });

    const targetPath = join(cacheDir, preferredFilename);
    const signaturePath = join(cacheDir, `${this.safeName(preferredFilename)}.${signature}.meta`);

    if (existsSync(signaturePath) && existsSync(targetPath)) {
      return targetPath;
    }

    writeFileSync(targetPath, pdfBuffer);
    writeFileSync(signaturePath, signature);
    return targetPath;
  }

  public has(
    version: string,
    locale: "pt-BR" | "en-US",
    content: ResumeContent,
    templateId: string,
    preferredFilename: string,
  ): boolean {
    return Boolean(this.getPath(version, locale, content, templateId, preferredFilename));
  }

  private buildSignature(version: string, locale: string, content: ResumeContent, templateId: string): string {
    const payload = JSON.stringify({
      version,
      locale,
      templateId,
      name: content.name,
      title: content.title,
      location: content.location,
      contact: content.contact,
      summary: content.summary,
      experiences: content.experiences,
      skillGroups: content.skillGroups,
      education: content.education,
      languages: content.languages,
    });

    return createHash("sha256").update(payload).digest("hex").slice(0, 16);
  }

  private safeName(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/-\./g, ".")
      .replace(/\.-/g, ".")
      .trim();
  }
}
