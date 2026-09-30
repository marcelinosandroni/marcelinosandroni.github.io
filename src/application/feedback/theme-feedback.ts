import {
  isFeedbackTheme,
  isFeedbackVerdict,
  type FeedbackCounts,
} from "@/domain/feedback/theme-feedback";
import type { ThemeFeedbackRepository } from "@/application/feedback/theme-feedback-repository";

/**
 * Records one reader's verdict on a theme.
 *
 * Validation happens here, before the port. An unrecognised theme or verdict is
 * dropped rather than rejected, because this is called from a click handler and
 * a thrown error would surface as a console message on a page that is otherwise
 * fine. A bot posting garbage gets silence, which is the correct answer.
 */
export class RecordThemeFeedback {
  constructor(private readonly repository: ThemeFeedbackRepository) {}

  async execute(theme: unknown, verdict: unknown): Promise<boolean> {
    if (!isFeedbackTheme(theme) || !isFeedbackVerdict(verdict)) {
      return false;
    }

    await this.repository.increment(theme, verdict);

    return true;
  }
}

/** Every counter, for the admin panel. */
export class GetThemeFeedback {
  constructor(private readonly repository: ThemeFeedbackRepository) {}

  async execute(): Promise<FeedbackCounts> {
    return this.repository.list();
  }
}
