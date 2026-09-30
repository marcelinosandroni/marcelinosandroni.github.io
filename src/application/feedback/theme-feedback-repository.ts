import type { FeedbackCounts, FeedbackTheme, FeedbackVerdict } from "@/domain/feedback/theme-feedback";

/**
 * Port for theme feedback storage.
 *
 * The signatures are the privacy boundary. Nothing here can carry a string that
 * is not an enum member, and no method takes an address, a device or a session —
 * so an implementation cannot store one even by accident. A test asserts this by
 * reading this file, for the same reason the click aggregate does: a privacy
 * claim in a comment is worth nothing if the shape permits it.
 */
export interface ThemeFeedbackRepository {
  increment(theme: FeedbackTheme, verdict: FeedbackVerdict, by?: number): Promise<void>;

  /** Every counter. Implementations must not expose per-event rows. */
  list(): Promise<FeedbackCounts>;

  /** Drops every counter. Used by tests and by an explicit owner reset. */
  reset(): Promise<void>;
}
