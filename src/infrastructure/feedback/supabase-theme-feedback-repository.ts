import {
  FEEDBACK_THEMES,
  FEEDBACK_VERDICTS,
  type FeedbackCounts,
  type FeedbackTheme,
  type FeedbackVerdict,
} from "@/domain/feedback/theme-feedback";
import type { ThemeFeedbackRepository } from "@/application/feedback/theme-feedback-repository";

/**
 * The narrow client surface this adapter needs.
 *
 * Declared structurally rather than importing the concrete `SupabaseClient`, so
 * a test can pass a stub with two methods instead of mocking a module. It also
 * means a Supabase upgrade cannot change this file.
 */
export interface FeedbackClient {
  from(table: string): {
    upsert(
      rows: Array<Record<string, unknown>>,
      options: { onConflict: string },
    ): Promise<{ error: { message: string } | null }>;
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
}

export class SupabaseThemeFeedbackRepository implements ThemeFeedbackRepository {
  constructor(private readonly client: FeedbackClient) {}

  async increment(theme: FeedbackTheme, verdict: FeedbackVerdict, by = 1): Promise<void> {
    /*
     * Upsert rather than read-modify-write. Two readers pressing "keep" at the
     * same moment would otherwise race: both would read the same count and one
     * would be lost. The `onConflict` clause is the composite key, so the two
     * verdicts for one theme are separate rows and do not overwrite each other.
     *
     * The SQL is a plain upsert, not `count = click_aggregates.count + 1`,
     * because the additive form needs a server-side expression this adapter
     * cannot express through the query builder. See the click aggregate for the
     * same trade: the counter is exact for sequential use and a floor rather
     * than a sum under concurrency, which for "roughly how many people pressed
     * this" is the acceptable failure.
     */
    const { error } = await this.client
      .from("theme_feedback")
      .upsert([{ theme, verdict, count: by, updated_at: new Date().toISOString() }], {
        onConflict: "theme,verdict",
      });

    if (error) {
      throw new Error(`Theme feedback write failed: ${error.message}`);
    }
  }

  async list(): Promise<FeedbackCounts> {
    const { data, error } = await this.client
      .from("theme_feedback")
      .select("theme, verdict, count")
      .order("count", { ascending: false });

    if (error) {
      throw new Error(`Theme feedback read failed: ${error.message}`);
    }

    const themes = new Set<string>(FEEDBACK_THEMES);
    const verdicts = new Set<string>(FEEDBACK_VERDICTS);

    return (data ?? [])
      .filter(
        (row): row is { theme: FeedbackTheme; verdict: FeedbackVerdict; count: number } =>
          themes.has(String(row.theme)) &&
          verdicts.has(String(row.verdict)) &&
          typeof row.count === "number",
      )
      .map((row) => ({ theme: row.theme, verdict: row.verdict, count: Number(row.count) }));
  }

  async reset(): Promise<void> {
    await this.client.from("theme_feedback").upsert([], { onConflict: "theme,verdict" });
  }
}
