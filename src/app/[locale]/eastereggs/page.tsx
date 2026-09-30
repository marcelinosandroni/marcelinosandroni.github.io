import { MatrixEasterEgg } from "@/components/effects/matrix-easter-egg";
import { EASTER_EGGS, type EasterEgg } from "@/domain/easter-egg";
import { getDictionary } from "@/i18n";
import { LOCALE_SEGMENTS, SUPPORTED_LOCALES, toLocale } from "@/domain/i18n";
import { DocumentShell } from "@/components/layout/document-shell";

/**
 * Every easter egg, on demand, with its rules written down.
 *
 * ## Why this route exists
 *
 * Five effects that fire at most once per visit, in a 150-second window after 45
 * seconds of reading, and only in the matrix theme — that is an unreasonable
 * amount of engineering to ship without a way to *look* at the result. Judging
 * them means watching all five in a minute, on a phone width, and reading what
 * the trigger rules actually are.
 *
 * It gets its own root layout, like `/admin` and `/loading`: the site header
 * would scroll away over the top of an effect that is supposed to own the
 * viewport, and the footer would add a theme picker to a page whose subject is
 * the matrix theme.
 *
 * ## The seam is not a bypass
 *
 * `?easter-egg=<id>` is the same parameter the e2e suite uses, and it is
 * deliberately *not* a way to see everything with the gates off: the theme gate,
 * the reduced-motion gate, the dialog check and the per-visit budget all still
 * apply. That is the only way those four could be tested at all. What it does
 * skip is the wait — page age, schedule, minimum gap and interaction cooldown —
 * because a test cannot wait seven minutes for a reader to stop touching the
 * page.
 */
export const metadata = {
  robots: { index: false, follow: false },
} as const;

/** The rules, stated as data so the page and the domain cannot disagree. */
const RULES: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Per visit", value: "at most one, ever" },
  { label: "Earliest", value: "45s after arriving" },
  { label: "Latest", value: "3m15s after arriving" },
  { label: "Theme", value: "matrix only" },
  { label: "Reduced motion", value: "suppressed" },
  { label: "While a dialog is open", value: "held back" },
  { label: "After you touch the page", value: "7 minutes" },
  { label: "Escape", value: "dismisses any of them" },
];

export default async function EasterEggsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const segment = (await params).locale;
  const resolved = toLocale(segment);
  const locale = resolved ?? SUPPORTED_LOCALES[0];
  const t = await getDictionary(locale);

  const query = await searchParams;
  const requested = Array.isArray(query.easter) ? query.easter[0] : query.easter;

  return (
    <DocumentShell className="p-0">
      <main className="relative min-h-screen overflow-hidden bg-surface-base">
        {/*
          The rain is the backdrop for the whole page rather than a decoration on
          it: this is a page about a matrix effect, and the plain dark background
          would misrepresent what the eggs look like over the real thing.
        */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-45">
          <div className="msd-rain msd-rain--viewport" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-between gap-space-xl p-6 md:p-10">
          <header className="max-w-prose">
            <p className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
              Easter eggs
            </p>
            <h1 className="mt-2 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary">
              {t.easterEggs.title}
            </h1>
            <p className="mt-3 font-body text-body text-text-secondary">{t.easterEggs.intro}</p>
          </header>

          <ul className="grid gap-space-sm">
            {EASTER_EGGS.map((egg: EasterEgg) => (
              <li
                key={egg.id}
                className="flex flex-wrap items-baseline justify-between gap-x-space-md gap-y-1 border-b border-border-subtle pb-space-sm"
              >
                <span className="font-label-mono text-label-mono text-text-primary">{egg.id}</span>
                <span className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
                  {egg.kind}
                </span>
                <span className="font-label-mono text-label-mono text-text-muted">
                  {(egg.durationMs / 1000).toFixed(1)}s
                </span>
                <a
                  href={`/${LOCALE_SEGMENTS[locale]}/eastereggs?easter=${egg.id}`}
                  className="tap-target inline-flex items-center border border-border-subtle px-3 py-1 font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-text-secondary hover:text-primary-container"
                >
                  {t.easterEggs.replay}
                </a>
              </li>
            ))}
          </ul>

          <section aria-labelledby="rules-heading">
            <h2
              id="rules-heading"
              className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted"
            >
              {t.easterEggs.rulesHeading}
            </h2>
            <dl className="mt-space-sm grid gap-x-space-lg gap-y-2 sm:grid-cols-2">
              {RULES.map((rule) => (
                <div key={rule.label} className="flex items-baseline justify-between gap-space-md">
                  <dt className="font-label-mono text-label-mono text-text-muted">{rule.label}</dt>
                  <dd className="font-label-mono text-label-mono text-text-secondary">{rule.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <footer className="flex flex-wrap gap-space-sm">
            <a
              href={`/${LOCALE_SEGMENTS[locale]}`}
              className="tap-target inline-flex items-center border border-border-subtle px-3 py-1 font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-text-secondary hover:text-primary-container"
            >
              {t.easterEggs.back}
            </a>
            {requested === undefined ? null : (
              <a
                href={`/${LOCALE_SEGMENTS[locale]}/eastereggs`}
                className="tap-target inline-flex items-center border border-border-subtle px-3 py-1 font-label-mono text-label-mono uppercase tracking-widest text-text-secondary transition-colors hover:border-text-secondary hover:text-primary-container"
              >
                {t.easterEggs.clear}
              </a>
            )}
          </footer>
        </div>

        {/*
          One island, asked for a specific egg. It still applies the theme gate,
          the reduced-motion gate, the dialog check and the per-visit budget, so
          this page can show a refusal — which is itself the honest demonstration
          that the rules are real.
        */}
        <MatrixEasterEgg
          requestedId={requested}
          labels={{
            dismiss: t.easterEgg.dismiss,
            glitchStatus: t.easterEgg.glitchStatus,
            whitePill: t.easterEgg.whitePill,
            whitePillHint: t.easterEgg.whitePillHint,
            wakeUp: t.easterEgg.wakeUp,
          }}
        />
      </main>
    </DocumentShell>
  );
}
