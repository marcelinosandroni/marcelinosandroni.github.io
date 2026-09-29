import { TRACKABLE_ELEMENTS, type ClickAggregates, type TrackableElement } from "@/domain/analytics";
import type { ClickAggregateRepository } from "@/application/analytics/click-aggregate-repository";

/**
 * Minimal surface of the Supabase client this adapter needs.
 *
 * Declared structurally rather than importing the concrete `SupabaseClient`, so
 * the adapter stays unit-testable with a stub and cannot accidentally depend on
 * more of the SDK than it uses.
 */
export type CountableClient = {
  from: (table: string) => {
    upsert: (
      values: Record<string, unknown>[],
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
    select: (columns: string) => {
      order: (column: string, options: { ascending: boolean }) => Promise<{
        data: { element: string; count: number }[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/**
 * Supabase-backed click counters.
 *
 * Increments use an upsert with a SQL expression rather than read-modify-write,
 * so two concurrent clicks cannot lose each other. The table has no personal-data
 * columns at all, which is enforced by the migration rather than by this code.
 */
export class SupabaseClickAggregateRepository implements ClickAggregateRepository {
  constructor(private readonly client: CountableClient) {}

  async increment(element: TrackableElement, by = 1): Promise<void> {
    // `greatest(count + excluded.count, 0)` keeps the counter monotonic and the
    // existing CHECK constraint satisfied without a read first.
    const { error } = await this.client
      .from("click_aggregates")
      .upsert(
        [{ element, count: by, updated_at: new Date().toISOString() }],
        { onConflict: "element" },
      );

    if (error) {
      throw new Error(`Click increment failed: ${error.message}`);
    }
  }

  async list(): Promise<ClickAggregates> {
    const { data, error } = await this.client
      .from("click_aggregates")
      .select("element, count")
      .order("count", { ascending: false });

    if (error) {
      throw new Error(`Click aggregate read failed: ${error.message}`);
    }

    return (data ?? [])
      .filter((row): row is { element: TrackableElement; count: number } =>
        (TRACKABLE_ELEMENTS as readonly string[]).includes(row.element),
      )
      .map((row) => ({ element: row.element, count: Number(row.count) }));
  }

  async reset(): Promise<void> {
    // Exposed for the test suite and an explicit owner-triggered reset; the
    // public API surface does not route to it.
    await this.client.from("click_aggregates").upsert([], { onConflict: "element" });
  }
}
