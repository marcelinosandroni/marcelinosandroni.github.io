/**
 * Theme feedback.
 *
 * Answers one question: **which theme do people leave on?** It is the only
 * question a theme needs answered, and the table is shaped so no other question
 * can be asked of it.
 *
 * ## What is deliberately not collectable
 *
 * No free-text comment. Not "not collected" — not *collectable*: the storage
 * shape is an enum plus a counter, so a word a visitor typed has nowhere to go.
 * That is a real cost, stated plainly: someone who has something to say cannot
 * say it in words. The alternative is a text column, and a text column plus a
 * theme plus a timestamp is a profile of a stranger's opinions.
 *
 * No address, no device, no user agent, no referrer, no session, no viewport.
 * Same reasoning as the click aggregate, and for the same reason: a preference
 * is not identifying until something else is added to it.
 *
 * ## Three verdicts, not two
 *
 * `keep`, `leave`, `unsure`. A two-way good/bad would conflate "switched away"
 * with "saw it and did nothing", and those are different facts — the first is a
 * verdict on the theme, the second is usually just someone reading.
 */

/**
 * Themes a verdict can be about.
 *
 * Mirrors `THEME_IDS` rather than importing it, because this module is the
 * database contract and the test asserts the two lists are identical. An import
 * would make them identical by construction and stop the test being able to
 * fail — and the whole point of a mirrored list is that the mismatch is
 * detectable.
 */
export const FEEDBACK_THEMES = ["carbon", "paper", "matrix"] as const;

export type FeedbackTheme = (typeof FEEDBACK_THEMES)[number];

/**
 * Verdicts.
 *
 * `unsure` exists because "I saw the option and did not press it" is the
 * majority of any theme control's impressions, and a two-way scale would either
 * count it as approval or invent a fourth meaning to represent it.
 */
export const FEEDBACK_VERDICTS = ["keep", "leave", "unsure"] as const;

export type FeedbackVerdict = (typeof FEEDBACK_VERDICTS)[number];

/** Closed allowlists: a typo cannot invent a new signal or a new question. */
export function isFeedbackTheme(value: unknown): value is FeedbackTheme {
  return typeof value === "string" && (FEEDBACK_THEMES as readonly string[]).includes(value);
}

export function isFeedbackVerdict(value: unknown): value is FeedbackVerdict {
  return typeof value === "string" && (FEEDBACK_VERDICTS as readonly string[]).includes(value);
}

export type FeedbackCount = {
  readonly theme: FeedbackTheme;
  readonly verdict: FeedbackVerdict;
  readonly count: number;
};

export type FeedbackCounts = ReadonlyArray<FeedbackCount>;

/**
 * How many rows the read can return at most.
 *
 * Every theme against every verdict, so the shape is fixed and a response
 * cannot grow with traffic. A cap that grows with the table is not a cap.
 */
export const MAX_FEEDBACK_ROWS = FEEDBACK_THEMES.length * FEEDBACK_VERDICTS.length;

/**
 * The number the admin panel leads with, derived rather than stored.
 *
 * `keep - leave` over `keep + leave + unsure` is a defensible reading because
 * `unsure` is excluded from both sides: someone who did nothing is not
 * evidence either way, and counting them as approval would make a theme look
 * good for being ignored.
 */
export function netPreference(counts: FeedbackCounts): number {
  let keep = 0;
  let leave = 0;

  for (const entry of counts) {
    if (entry.verdict === "keep") {
      keep += entry.count;
    } else if (entry.verdict === "leave") {
      leave += entry.count;
    }
  }

  const total = keep + leave;

  return total === 0 ? 0 : Math.round(((keep - leave) / total) * 100);
}

/**
 * Per-theme totals, for the bars in the admin panel.
 *
 * Zero-filled across every theme so the panel always has one row per theme,
 * even one nobody has answered yet. A bar that is missing is a bar that reads
 * as "no data" when it actually means "nobody was asked".
 */
export function summariseByTheme(counts: FeedbackCounts): Array<{
  theme: FeedbackTheme;
  keep: number;
  leave: number;
  unsure: number;
  total: number;
  net: number;
}> {
  return FEEDBACK_THEMES.map((theme) => {
    const rows = counts.filter((entry) => entry.theme === theme);

    const countFor = (verdict: FeedbackVerdict): number => {
      const row = rows.find((entry) => entry.verdict === verdict);

      return row === undefined ? 0 : row.count;
    };

    const keep = countFor("keep");
    const leave = countFor("leave");
    const unsure = countFor("unsure");

    const subset = rows.map((entry) => ({ ...entry }));

    return {
      theme,
      keep,
      leave,
      unsure,
      total: keep + leave + unsure,
      net: netPreference(subset),
    };
  });
}
