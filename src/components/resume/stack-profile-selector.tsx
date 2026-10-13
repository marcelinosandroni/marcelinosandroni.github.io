"use client";

import { resumePath } from "@/domain/site/routes";
import type { Locale } from "@/domain/i18n";

/**
 * The stack the reader wants, chosen from the profiles.
 *
 * ## Why it is links and not a `<select>` that pushes state
 *
 * Because a selection is a **shareable URL**. Someone who reads the React + Node
 * version sends that link to a colleague, or bookmarks it, or pastes it into a
 * follow-up email. A `<select>` would put the choice in component state that
 * dies on reload, so the reader would be explaining "you have to pick React +
 * Node first" instead of sending the document.
 *
 * Server-rendered links also mean the narrowed résumé is a real page with its
 * own title, which is what makes it printable and linkable rather than a
 * client-side variant of a page.
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
}: {
  locale: Locale;
  profiles: ReadonlyArray<{ slug: string; label: string; description: string }>;
  selected: string | null;
  labels: { all: string; choose: string; focusedOn: string; narrowed: string };
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
        <a
          href={base}
          aria-current={selected === null ? "page" : undefined}
          className={`border px-2 py-1 text-body-sm ${
            selected === null
              ? "border-primary-container text-text-primary"
              : "border-border-subtle text-text-secondary"
          }`}
        >
          {labels.all}
        </a>

        {profiles.map((profile) => (
          <a
            key={profile.slug}
            href={`${base}?stack=${profile.slug}`}
            title={profile.description === "" ? undefined : profile.description}
            aria-current={selected === profile.slug ? "page" : undefined}
            className={`border px-2 py-1 text-body-sm ${
              selected === profile.slug
                ? "border-primary-container text-text-primary"
                : "border-border-subtle text-text-secondary"
            }`}
          >
            {profile.label}
          </a>
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