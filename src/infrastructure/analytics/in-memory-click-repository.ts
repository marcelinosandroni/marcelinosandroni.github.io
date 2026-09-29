import { TRACKABLE_ELEMENTS, type ClickAggregates, type TrackableElement } from "@/domain/analytics";
import type { ClickAggregateRepository } from "@/application/analytics/click-aggregate-repository";

/**
 * Process-local counters, used when Supabase is not configured and by tests.
 *
 * Deliberately bounded: counters are capped so a dev session or a test run
 * cannot grow without limit, and nothing about the request survives the object
 * — there is no request object, no headers and no address to accidentally hold
 * on to.
 */
const MAX_COUNT_PER_ELEMENT = 10_000;

export class InMemoryClickAggregateRepository implements ClickAggregateRepository {
  private readonly counts = new Map<TrackableElement, number>();

  async increment(element: TrackableElement, by = 1): Promise<void> {
    const next = Math.min((this.counts.get(element) ?? 0) + by, MAX_COUNT_PER_ELEMENT);
    this.counts.set(element, next);
  }

  async list(): Promise<ClickAggregates> {
    return TRACKABLE_ELEMENTS.map((element) => ({
      element,
      count: this.counts.get(element) ?? 0,
    }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count || a.element.localeCompare(b.element));
  }

  async reset(): Promise<void> {
    this.counts.clear();
  }
}
