export class InvalidResumeVersionError extends Error {
  constructor(value: string) {
    super(`Invalid resume version: ${value}`);
    this.name = "InvalidResumeVersionError";
  }
}

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export class ResumeVersion {
  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
  ) {}

  static create(value: string): ResumeVersion {
    const match = SEMVER_PATTERN.exec(value);
    if (!match) {
      throw new InvalidResumeVersionError(value);
    }

    return new ResumeVersion(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  compareTo(other: ResumeVersion): number {
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }
}
