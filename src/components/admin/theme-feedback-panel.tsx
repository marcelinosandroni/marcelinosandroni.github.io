import { summariseByTheme, type FeedbackCounts, type FeedbackTheme } from "@/domain/feedback/theme-feedback";

/**
 * Theme feedback, as the owner reads it.
 *
 * Three bars, one per theme, each split into keep / leave / unsure. No chart
 * library: the data is three numbers, and a library would add a dependency, a
 * bundle cost and a canvas that a screen reader cannot describe, in exchange for
 * shapes a reader cannot interpret faster than a labelled bar.
 *
 * The bars are `<div>`s with explicit widths rather than `<progress>`, because
 * the two states being compared are *composition* — how much of a theme's
 * response is keep versus leave — and a single filled bar cannot show that.
 */
export function ThemeFeedbackPanel({ counts }: { counts: FeedbackCounts }): React.ReactElement {
  const summary = summariseByTheme(counts);
  const hasData = summary.some((row) => row.total > 0);

  return (
    <section aria-labelledby="theme-feedback-heading" data-theme-feedback="panel">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <h2
          id="theme-feedback-heading"
          className="font-headline-sm text-headline-sm text-text-primary"
        >
          Theme feedback
        </h2>
        <p className="font-label-mono text-label-mono text-text-muted">
          {hasData ? `${summary.reduce((sum, row) => sum + row.total, 0)} RESPONSES` : "NO DATA YET"}
        </p>
      </header>

      {/*
        No chart library. The data is three numbers per theme, and a library
        would cost a dependency, bundle weight and a canvas a screen reader cannot
        describe, in exchange for shapes a reader cannot read faster than a
        labelled bar.
      */}
      <div className="mt-space-md space-y-space-md">
        {summary.map((row) => (
          <ThemeFeedbackBar key={row.theme} {...row} />
        ))}
      </div>
    </section>
  );
}

function ThemeFeedbackBar({
  theme,
  keep,
  leave,
  unsure,
  total,
  net,
}: {
  theme: FeedbackTheme;
  keep: number;
  leave: number;
  unsure: number;
  total: number;
  net: number;
}): React.ReactElement {
  /*
   * A bar with no responses still renders, at a floor of a few percent width.
   *
   * A zero-width bar for a theme nobody has answered is indistinguishable from
   * a theme that is not offered, and the reader cannot tell "no data" from
   * "hidden". A visible stub with a muted colour says "nothing yet" without
   * claiming a score.
   */
  const width = (value: number): string =>
    total === 0 ? "100%" : `${Math.max((value / total) * 100, 1)}%`;

  return (
    <div data-theme-bar={theme}>
      <div className="flex items-baseline justify-between gap-space-sm">
        <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
          {theme}
        </span>
        <span className="font-label-mono text-label-mono text-text-muted">
          {total === 0 ? "—" : `NET ${net > 0 ? `+${net}` : net}`}
        </span>
      </div>

      {/*
        The segments are described in text as well as drawn, so the numbers are
        available to a screen reader and to anyone who cannot distinguish the
        three colours.
      */}
      <div
        role="img"
        aria-label={`${theme}: ${keep} keep, ${leave} leave, ${unsure} no opinion, ${total} total`}
        className="mt-space-xs flex h-2 w-full overflow-hidden border border-border-subtle"
      >
        <span className={KEEP_CLASS} style={{ width: width(keep) }} />
        <span className={LEAVE_CLASS} style={{ width: width(leave) }} />
        <span className={UNSURE_CLASS} style={{ width: width(unsure) }} />
      </div>

      <dl className="mt-space-xs flex flex-wrap gap-space-md font-label-mono text-label-mono text-text-muted">
        <div className="flex items-center gap-space-xs">
          <dt className="sr-only">Keep</dt>
          <dd>
            <span className={KEEP_TEXT} aria-hidden="true" /> {keep}
          </dd>
        </div>
        <div className="flex items-center gap-space-xs">
          <dt className="sr-only">Leave</dt>
          <dd>
            <span className={LEAVE_TEXT} aria-hidden="true" /> {leave}
          </dd>
        </div>
        <div className="flex items-center gap-space-xs">
          <dt className="sr-only">No opinion</dt>
          <dd>
            <span className={UNSURE_TEXT} aria-hidden="true" /> {unsure}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Segment colours.
 *
 * Green, red and grey, taken from the theme tokens rather than literals so the
 * panel is readable in all three themes — a hardcoded green is legible on carbon
 * and invisible on matrix.
 */
const KEEP_CLASS = "bg-primary-container";
const LEAVE_CLASS = "bg-error";
const UNSURE_CLASS = "bg-border-prominent";

const KEEP_TEXT = "inline-block h-2 w-2 bg-primary-container";
const LEAVE_TEXT = "inline-block h-2 w-2 bg-error";
const UNSURE_TEXT = "inline-block h-2 w-2 bg-border-prominent";
