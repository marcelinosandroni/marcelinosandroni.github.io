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
    focus: string | null = null,
  ): string {
    const signature = this.buildSignature(version, locale, content, templateId, focus);
    const cacheDir = this.cacheDir(locale, version, templateId, focus);
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
    focus: string | null = null,
  ): string {
    const signature = this.buildSignature(version, locale, content, templateId, focus);
    const cacheDir = this.cacheDir(locale, version, templateId, focus);
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
    focus: string | null = null,
  ): boolean {
    return Boolean(this.getPath(version, locale, content, templateId, preferredFilename, focus));
  }

  /**
   * One directory per focus, not one directory per signature.
   *
   * The signature already separates renders, so the directory does not need to —
   * except that a focus produces a file per render, and without a directory of
   * its own each new profile would overwrite the previous one's filename inside
   * the same folder. Five profiles would leave one file and five orphan `.meta`
   * files, and the folder would grow without bound as profiles were added and
   * removed.
   *
   * `safeName` on the focus because the value reaches here from a query
   * parameter and becomes a path segment.
   */
  private cacheDir(
    locale: string,
    version: string,
    templateId: string,
    focus: string | null,
  ): string {
    const segment = focus === null || focus === "" ? "full" : this.safeName(focus);

    return join(this.rootDir, locale, version, templateId, segment);
  }

  /**
   * The signature that decides whether two renders are the same document.
   *
   * `focus` is part of it because a narrowed résumé is a **different document**.
   * Signing only the content would work today — `applyFocus` returns different
   * bullets, so the hashes differ — but that is a coincidence of the current
   * narrowing, not a property worth depending on. A profile that promotes skills
   * without dropping any bullet is a valid configuration: it reorders the skills
   * section and leaves every experience intact, so two profiles on the same
   * document would share a signature and the second download would serve the
   * first profile's PDF.
   *
   * Naming the profile in the signature makes that unreachable.
   */
  private buildSignature(
    version: string,
    locale: string,
    content: ResumeContent,
    templateId: string,
    focus: string | null,
  ): string {
    const payload = JSON.stringify({
      version,
      locale,
      templateId,
      focus: focus ?? "",
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
