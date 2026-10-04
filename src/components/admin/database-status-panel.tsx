import type { DatabaseStatus } from "@/infrastructure/supabase/database-status";

/**
 * What the database answered.
 *
 * Four facts an owner wants before touching anything else: is it reachable, how old
 * is the server, which migration is the newest one that ran, and how many ran in
 * total. The last two are the ones that answer the question this panel exists for,
 * which is "is the database behind the code I just deployed" — a version on the
 * build readout tells you what is *served*, and nothing about what is *stored*.
 *
 * ## Why unreachable is its own state and not a missing panel
 *
 * Because "cannot reach the database" and "reached it, everything is fine" are
 * different facts, and a panel that rendered nothing for either would report a
 * healthy database whenever the network happened to be up. So the unreachable case
 * states itself, with the reason, in the same place and the same weight.
 *
 * ## Why it is server-rendered
 *
 * The status function is deny-all to `anon` and `authenticated` and is called with
 * the secret key, which cannot reach a browser. There is nothing here a client
 * component could fetch, so making it one would add a second request to arrive
 * after the HTML for data the server already had.
 */
export function DatabaseStatusPanel({ status }: { status: DatabaseStatus }): React.ReactElement {
  return (
    <section aria-labelledby="database-status-heading" data-database-status="panel">
      <header className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <h2 id="database-status-heading" className="font-headline-sm text-headline-sm text-text-primary">
          Database
        </h2>
        <p className="font-label-mono text-label-mono text-text-muted">
          {status.reachable ? "CONNECTED" : "UNREACHABLE"}
        </p>
      </header>

      {status.reachable ? (
        <dl className="mt-space-md grid grid-cols-2 gap-space-sm sm:grid-cols-4">
          <Fact label="Migrations applied" value={String(status.appliedCount)} />
          <Fact label="Latest" value={status.latestVersion === "" ? "none" : status.latestVersion} />
          <Fact label="Postgres" value={status.serverVersion === "" ? "unknown" : status.serverVersion} />
          <Fact label="pgcrypto" value={status.extensionVersion === "" ? "absent" : status.extensionVersion} />
        </dl>
      ) : (
        /*
          The reason is rendered rather than logged, and it is `break-words` because
          a PostgREST or network error can be a long single token with no spaces in
          it, which would otherwise widen the panel past the viewport.
        */
        <p
          role="status"
          className="mt-space-md break-words text-body-sm text-body-sm text-text-secondary"
        >
          {status.reason}
        </p>
      )}
    </section>
  );
}

/**
 * One labelled number.
 *
 * A `<dl>` and not a table of `<div>`s, because these are name/value pairs and the
 * description list is what tells a screen reader that `17.6` is a Postgres version
 * rather than the next number in a column.
 *
 * The value uses the mono face for the same reason the telemetry bar does: a version
 * is something a person compares character by character against another one, and
 * proportional figures make `1` and `l` look alike.
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