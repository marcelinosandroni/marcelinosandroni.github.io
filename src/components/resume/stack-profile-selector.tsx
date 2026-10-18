"use client";

import Link from "next/link";
import { resumePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";

/**
 * The stack the reader wants, chosen from the profiles.
 *
 * ## Why it is links and not a `<select>` that pushes state
 *
 * Because a selection is a **shareable URL**. Someone who reads the Java + Angular
 * version sends that link to a colleague, or bookmarks it, or pastes it into a
 * follow-up email. A `<select>` would put the choice in component state that
 * dies on reload, so the reader would be explaining "you have to pick Java +
 * Angular first" instead of sending the document.
 *
 * ## Why `Link` and not `<a>`
 *
 * Same address, no reload.
 *
 * A plain anchor throws away the whole document and refetches the CSS, the fonts
 * and the layout to change one query parameter - and on the fixed source the page
 * behind them does not even change, since the stack picks which PDF the download
 * button fetches rather than which résumé is shown. `Link` keeps the URL exactly
 * as shareable as before and still swaps the data without the reader losing their
 * scroll position or waiting for the page to come back.
 *
 * ## Why "all" is first and always present
 *
 * Because the generic résumé is the complete one. Narrowing shows less; it never
 * shows more, and a reader who lands here with a profile in the URL and wants the
 * whole career should not have to guess how to undo it.
 */
export function StackProfileSelector({
  locale,
  profiles,
  selected,
  labels,
  showAllLink = true,
}: {
  locale: Locale;
  profiles: ReadonlyArray<{ slug: string; label: string; description: string }>;
  selected: string | null;
  labels: { all: string; choose: string; focusedOn: string; narrowed: string };
  /**
   * Whether to offer the bare "all profiles" entry before the list.
   *
   * False on the fixed source, where the list already opens with the general
   * document. Rendering both meant two buttons side by side leading to the same
   * PDF, and the reader had no way to know they were the same choice - which is
   * worse than either button on its own.
   */
  showAllLink?: boolean;
}): React.ReactElement | null {
  if (profiles.length === 0) {
    return null;
  }

  const base = resumePath(locale);
  const active = profiles.find((profile) => profile.slug === selected);

  return (
    <div className="mt-space-sm border border-border-subtle p-space-sm">
      <p className="font-label-mono text-label-mono uppercase tracking-widest text-text-secondary">
        {labels.choose}
      </p>

      <nav aria-label={labels.choose} className="mt-2 flex flex-wrap gap-space-sm">
        {showAllLink ? (
          <Link
            href={base}
            aria-current={selected === null ? "page" : undefined}
            className={`border px-2 py-1 text-body-sm ${
              selected === null
                ? "border-primary-container text-text-primary"
                : "border-border-subtle text-text-secondary"
            }`}
          >
            {labels.all}
          </Link>
        ) : null}

        {profiles.map((profile) => (
          <Link
            key={profile.slug}
            href={`${base}?stack=${profile.slug}`}
            scroll={false}
            title={profile.description === "" ? undefined : profile.description}
            aria-current={selected === profile.slug ? "page" : undefined}
            className={`border px-2 py-1 text-body-sm ${
              selected === profile.slug
                ? "border-primary-container text-text-primary"
                : "border-border-subtle text-text-secondary"
            }`}
          >
            {profile.label}
          </Link>
        ))}
      </nav>

      {active === undefined ? null : (
        <p className="mt-2 text-body-sm text-text-secondary">
          {labels.focusedOn.replace("{stack}", active.label)}
          {active.description === "" ? "" : ` — ${active.description}`}
        </p>
      )}
    </div>
  );
}