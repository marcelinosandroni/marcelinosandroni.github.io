"use client";

import { useState } from "react";

import type { JobMatchResult } from "@/domain/resume/job-match";

/**
 * Paste a job description; get back what it asks for that the résumé already
 * evidences, what it asks for that it does not, and which profile to read the
 * résumé with.
 *
 * ## Why nothing here writes a sentence
 *
 * The request was "generate an improved résumé for this job". The tempting
 * implementation is to have a model rewrite the bullets, and it is the one thing
 * this site must not do: a rewritten bullet that claims a number the owner never
 * produced is not a tailored résumé, it is a fabricated reference, and it is
 * found in an interview rather than in review.
 *
 * So this reports, and the owner writes. The matcher's one guarantee is that it
 * cannot invent an achievement, because it does not generate prose at all — it
 * compares a pasted posting against a catalogue he curated.
 *
 * ## Why "evidenced" is a separate column from "covered"
 *
 * A chip says the owner has touched a tool. A tagged bullet says he used it to
 * do something. A recruiter reads the second and skips the first, so reporting
 * them as one number would let a requirement met only by a list item read as
 * met with a story — which is the difference that decides an interview.
 */
export function JobMatchPanel({ locale }: { locale: string }): React.ReactElement {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const analyze = async (): Promise<void> => {
    if (description.trim() === "") {
      setError("Paste the job description first.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, locale }),
      });

      const body = (await response.json().catch(() => ({}))) as JobMatchResult & { error?: string };

      if (!response.ok) {
        setError(typeof body.error === "string" ? body.error : `Request failed (${response.status})`);
        return;
      }

      setResult(body);
    } catch {
      setError("The request did not complete. Check the network and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <h2 className="font-headline-sm text-headline-sm text-text-primary">Job match</h2>
      <p className="mt-2 max-w-prose text-body-sm text-body-sm text-text-secondary">
        Paste a posting and see what it asks for that your résumé already evidences, what it asks for
        that it does not, and which stack profile to read the résumé with. Nothing is written and
        no text is generated — a bullet that claims a result you did not deliver is found in the
        interview, not in review.
      </p>

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={10}
        placeholder="Paste the job description here."
        className="mt-3 w-full border border-border-subtle bg-surface-base p-2 text-body-sm text-text-primary"
      />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void analyze()}
          disabled={pending}
          className="border border-border-subtle px-3 py-1 text-body-sm text-text-primary"
        >
          {pending ? "Matching…" : "Match"}
        </button>

        {error === null ? null : (
          <span role="alert" className="text-body-sm text-text-secondary">
            {error}
          </span>
        )}
      </div>

      {result === null ? null : (
        <div className="mt-space-md space-y-space-md">
          <section className="border border-border-subtle p-space-sm">
            <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Covered — {result.covered.length}
            </h3>
            {result.covered.length === 0 ? (
              <p className="mt-1 text-body-sm text-text-secondary">
                Nothing in the catalogue matched this posting. Add the missing tools to the catalog
                and their aliases — that is what this reads.
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1">
                {result.covered.map((entry) => (
                  <li
                    key={entry.slug}
                    title={`matched as "${entry.matchedOn}"${entry.evidencedIn.length > 0 ? ` · ${entry.evidencedIn.join(", ")}` : ""}`}
                    className={`border px-2 py-0.5 text-body-sm ${
                      entry.evidenced
                        ? "border-primary-container text-text-primary"
                        : "border-border-subtle text-text-secondary"
                    }`}
                  >
                    {entry.label}
                    {entry.viaAlias ? " *" : ""}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-body-sm text-text-secondary">
              Solid border = a bullet names it. Plain = listed but not shown doing anything.{" "}
              <code>*</code> matched by alias, not by name.
            </p>
          </section>

          <section className="border border-primary-container p-space-sm">
            <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Asked for, not evidenced — {result.gaps.length}
            </h3>
            {result.gaps.length === 0 ? (
              <p className="mt-1 text-body-sm text-text-secondary">
                Nothing the posting named was left unmatched. Treat this as &ldquo;no obvious
                gap&rdquo;, not as &ldquo;fully covered&rdquo; — a matcher only sees the technologies
                it knows.
              </p>
            ) : (
              <>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {result.gaps.map((gap) => (
                    <li
                      key={gap}
                      className="border border-primary-container px-2 py-0.5 text-body-sm text-text-secondary"
                    >
                      {gap}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-body-sm text-text-secondary">
                  The first panel lists what you could genuinely be asked about. The rest are words
                  the posting capitalised that are not tools — read them and ignore what is not a
                  requirement.
                </p>
              </>
            )}
          </section>

          <section className="border border-border-subtle p-space-sm">
            <h3 className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
              Read the resume as
            </h3>
            <ul className="mt-2 space-y-1">
              {result.profiles.map((profile) => (
                <li key={profile.slug} className="text-body-sm text-text-secondary">
                  <a href={`/${locale === "pt-BR" ? "pt-br" : "en-us"}/resume?stack=${profile.slug}`}>
                    {profile.label || profile.slug}
                  </a>{" "}
                  — {profile.overlap} of the covered technologies promoted
                </li>
              ))}
            </ul>
            {result.suggestedProfile === null ? (
              <p className="mt-2 text-body-sm text-text-secondary">
                No profile is a clear fit for this posting. That is a real answer: none of your
                stacks leads this role, and the generic résumé is the honest document to send.
              </p>
            ) : (
              <p className="mt-2 text-body-sm text-text-secondary">
                Suggested: {result.suggestedProfile.label || result.suggestedProfile.slug}.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}