import { isTrackableElement, type ClickAggregates } from "@/domain/analytics";
import type { ClickAggregateRepository } from "./click-aggregate-repository";

/**
 * Records a click and reads the aggregate view.
 *
 * Validation happens here, before the port, so an unknown element is rejected
 * rather than stored. The use case is also the only place allowed to widen what
 * is counted, which keeps the privacy rule in one reviewable spot.
 */
export class RecordClick {
  constructor(private readonly repository: ClickAggregateRepository) {}

  async execute(element: unknown): Promise<void> {
    if (!isTrackableElement(element)) {
      return;
    }

    await this.repository.increment(element);
  }
}

export class GetClickHeatmap {
  constructor(private readonly repository: ClickAggregateRepository) {}

  execute(): Promise<ClickAggregates> {
    return this.repository.list();
  }
}
