import { type ClickAggregates, type TrackableElement } from "@/domain/analytics";

/**
 * Storage port for click counters.
 *
 * The contract itself is the privacy guarantee: the only thing that can be
 * written or read is an element id and a count. There is no shape in which a
 * coordinate, an address or a session could travel through this interface, so
 * the exclusions in the domain cannot be forgotten by an adapter.
 */
export interface ClickAggregateRepository {
  increment(element: TrackableElement, by?: number): Promise<void>;

  /** All counters, highest first. Implementations must not expose per-event rows. */
  list(): Promise<ClickAggregates>;

  /** Drops every counter. Used by tests and by an explicit reset action. */
  reset(): Promise<void>;
}
