import {
  FEEDBACK_THEMES,
  FEEDBACK_VERDICTS,
  isFeedbackTheme,
  isFeedbackVerdict,
  type FeedbackCounts,
  type FeedbackTheme,
  type FeedbackVerdict,
} from "@/domain/feedback/theme-feedback";
import type { ThemeFeedbackRepository } from "@/application/feedback/theme-feedback-repository";

/**
 * Process-local counters, used when Supabase is not configured and by tests.
 *
 * Holds nothing but two numbers per theme. A comment column, a timestamp or a
 * session id has no field here to live in, which is the point: the fallback
 * cannot be more informative than the real thing.
 */
export class InMemoryThemeFeedbackRepository implements ThemeFeedbackRepository {
  /**
   * Ceiling per cell.
   *
   * A real table has no such cap, so this is not parity — it exists so a loop
   * against an unconfigured deployment cannot exhaust memory. The value is high
   * enough that a genuine reader never approaches it.
   */
  private static readonly MAX_PER_CELL = 10_000;

  private readonly counts = new Map<string, number>();

  async increment(theme: FeedbackTheme, verdict: FeedbackVerdict, by = 1): Promise<void> {
    const key = `${theme}:${verdict}`;
    const current = this.counts.get(key) ?? 0;

    this.counts.set(key, Math.min(current + by, InMemoryThemeFeedbackRepository.MAX_PER_CELL));
  }

  async list(): Promise<FeedbackCounts> {
    const rows: Array<{ theme: FeedbackTheme; verdict: FeedbackVerdict; count: number }> = [];

    for (const theme of FEEDBACK_THEMES) {
      for (const verdict of FEEDBACK_VERDICTS) {
        const count = this.counts.get(`${theme}:${verdict}`) ?? 0;

        // Zero cells are omitted, matching the Supabase adapter: a row of zeroes
        // is noise in the panel, and `summariseByTheme` fills the gaps anyway.
        if (count > 0) {
          rows.push({ theme, verdict, count });
        }
      }
    }

    return rows.sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme));
  }

  async reset(): Promise<void> {
    this.counts.clear();
  }
}

/**
 * Guards the allowlist at the storage edge too.
 *
 * The use case already validates, so this is a second gate on a different side of
 * the boundary. Cheap, and it means a future caller reaching the repository
 * directly still cannot write a row the domain would refuse to read.
 */
export function assertKnownTheme(theme: unknown): FeedbackTheme {
  if (!isFeedbackTheme(theme)) {
    throw new Error(`Unknown feedback theme: ${String(theme)}`);
  }

  return theme;
}

export function assertKnownVerdict(verdict: unknown): FeedbackVerdict {
  if (!isFeedbackVerdict(verdict)) {
    throw new Error(`Unknown feedback verdict: ${String(verdict)}`);
  }

  return verdict;
}
