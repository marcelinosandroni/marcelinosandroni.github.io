import type { ResumeSourceReport } from "@/infrastructure/repositories";

/**
 * Is the résumé being served from the database or from the code?
 *
 * ## Why this panel exists at all
 *
 * Because the fallback is invisible by construction. `FallbackResumeRepository`
 * answers from the typed catalog whenever the database cannot be reached, and it
 * does so silently and correctly — a recruiter should never see a broken page.
 * The cost is that *every* misconfiguration looks exactly like a healthy site:
 *
 *   - a `SUPABASE_URL` missing `/rest/v1` answers 404 for every table
 *   - a paused Supabase project answers the same way
 *   - a migration that ran without its bootstrap leaves the document empty
 *
 * In all three the résumé renders perfectly, the admin loads, and every write
 * the owner makes goes nowhere. There is no error anywhere to notice, which is
 * why the deployed site once spent time showing the shipped catalog while the
 * database held 1,359 rows of edited content. This panel is the answer to
 * "which one am I looking at", asked by the adapter that served the page rather
 * than re-derived from the environment — a re-derived answer is a *prediction*,
 * and a prediction is exactly what got the deployment wrong.
 *
 * ## Why it says which, not just whether
 *
 * "Database" and "catalog" imply different amounts of work. A reader seeing the
 * catalog needs to know whether the database is missing entirely (set two
 * variables) or failing (fix a URL or a network), so the reason is rendered in
 * full rather than summarised into a state name.
 *
 * ## Why it is server-rendered
 *
 * Same as `DatabaseStatusPanel`: the read happens with the server's credentials
 * and there is nothing a client component could fetch that would not be a second
 * request to arrive after the HTML for data the server already had.
 */
export function ResumeSourcePanel({
  report,
}: {
  report: ResumeSourceReport;
}): React.ReactElement {
  const fromDatabase = report.source === "database";

  /*
    `role="status"` rather than `alert`. This is a statement about the
    deployment, not an error that happened while the owner was working, and an
    assertive announcement on every admin load would interrupt whatever they
    were already doing.
  */
  return (
    <section aria-labelledby="resume-source-heading" data-resume-source="panel" role="status">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <h2
          id="resume-source-heading"
          className="font-headline-sm text-headline-sm text-text-primary"
        >
          Résumé content
        </h2>
        <p
          className={`font-label-mono text-label-mono ${
            fromDatabase ? "text-primary-container" : "text-error-container"
          }`}
        >
          {fromDatabase ? "DATABASE" : "STATIC CATALOG"}
        </p>
      </header>

      <dl className="mt-space-md grid grid-cols-1 gap-space-sm sm:grid-cols-2">
        <Fact
          label="Experiences served"
          value={String(report.experiences)}
        />
        <Fact
          label="Source"
          value={fromDatabase ? "Supabase (PostgREST)" : "typed catalog in src/infrastructure/content"}
        />
      </dl>

      {report.reason === undefined ? null : (
        /*
          The reason is rendered rather than logged, and `break-words` because a
          PostgREST or network error can be one long token with no spaces in it,
          which would otherwise widen the panel past the viewport.
        */
        <div className="mt-space-md border border-error-container bg-surface-base p-space-sm">
          <p className="font-label-mono text-label-mono uppercase tracking-widest text-error-container">
            {fromDatabase ? "Note" : "Serving the catalog because"}
          </p>
          <p className="mt-1 break-words font-mono text-body-sm text-body-sm text-text-secondary">
            {report.reason}
          </p>
          {fromDatabase ? null : (
            <p className="mt-2 text-body-sm text-body-sm text-text-secondary">
              Edits made in the admin are saved, but this deployment is not reading them. Fix the
              URL before publishing.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One labelled value.
 *
 * A `<dl>` rather than a table of `<div>`s, because these are name/value pairs
 * and the description list is what tells a screen reader that `9` is a count and
 * not the next item in a list.
 */
function Fact({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="border border-border-subtle bg-surface-base p-space-sm">
      <dt className="font-label-mono text-label-mono uppercase tracking-widest text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-body-sm text-body-sm text-text-primary">{value}</dd>
    </div>
  );
}