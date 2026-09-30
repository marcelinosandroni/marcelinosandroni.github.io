import type { Metadata } from "next";
import Link from "next/link";

import { MatrixRain } from "@/components/effects/matrix-rain";
import "../rain.css";

/**
 * A persistent view of the loading effect.
 *
 * ## Why this route exists
 *
 * The rain is otherwise only visible for as long as a route takes to load, which
 * is exactly the wrong length of time to judge it. Someone deciding whether the
 * effect is right needs to watch it run, compare densities, see it at a phone
 * width, and confirm that `prefers-reduced-motion` produces something calm rather
 * than something frozen mid-fall. All of that is impossible while it is behind a
 * click that resolves in 200ms.
 *
 * So it is a real page at a stable URL, not a storybook. It is also the honest
 * test surface: what runs here is the same component and the same stylesheet that
 * run during a navigation, so if it looks right here it is right there.
 *
 * ## Why the preview links are `next/link`
 *
 * Not for the lint rule. A plain `<a>` to an internal path is a full document
 * load, the App Router never goes pending, and the rain never appears — so the
 * links that are supposed to demonstrate the effect would be the one case where
 * it does not show up.
 *
 * ## Why it has no site chrome
 *
 * It gets its own root layout. Inheriting the public header and footer would put
 * a sticky header, a footer with a theme picker and a body of copy over the one
 * screen that exists to show an effect unencumbered — and the chrome scrolls, so
 * the viewport height being judged would not be the viewport height.
 */
export const metadata: Metadata = {
  title: "Digital rain — loading effect",
  description: "A persistent view of the site's Matrix-style loading effect.",
  // A development surface, not a page to be found through search.
  robots: { index: false, follow: false },
};

/**
 * Densities to compare.
 *
 * The count is the only knob that matters: too few reads as sparse confetti, too
 * many turns into a solid green wall where individual columns stop being visible.
 * The column pitch is one character wide, so on a 1280px viewport these land
 * between roughly one column every 90px and one every 17px — which is the range
 * between "a few streaks" and "a wall", and where the reference actually sits.
 */
const DENSITIES = [
  { id: "sparse", label: "Sparse", columns: 24 },
  { id: "standard", label: "Standard", columns: 60 },
  { id: "dense", label: "Dense", columns: 96 },
  { id: "wall", label: "Wall", columns: 150 },
] as const;

const PREVIEW_LINKS = [
  { href: "/en-us", label: "Home" },
  { href: "/en-us/resume", label: "Resume" },
  { href: "/en-us/blog", label: "Blog" },
];

export default async function LoadingPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = Array.isArray(params.density) ? params.density[0] : params.density;
  // Defaults to Dense, which is what the site itself uses, so the page opens on
  // the real effect rather than on a setting nobody chose.
  const active = DENSITIES.find((density) => density.id === requested) ?? DENSITIES[2];

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-base">
      <MatrixRain columnCount={active.columns} className="msd-rain--viewport" />

      {/*
        `pointer-events-none` on the panel because the rain is the thing being
        judged and the reader needs to see all of it. The links stay focusable, so
        the page is still fully navigable by keyboard.
      */}
      <div className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between p-6 md:p-10">
        <header className="max-w-prose">
          <p className="font-label-mono text-label-mono uppercase tracking-widest text-primary-container">
            Loading effect
          </p>
          <h1 className="mt-2 font-headline-lg text-headline-lg font-extrabold tracking-tight text-text-primary">
            Digital rain
          </h1>
          <p className="mt-3 font-body text-body text-text-secondary">
            The same component and stylesheet that run during a route change, at full viewport, for as
            long as you want to look at it. Follow a link to watch it in context.
          </p>
        </header>

        <footer className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <dl className="grid max-w-prose gap-3 font-label-mono text-label-mono uppercase tracking-widest">
            <div>
              <dt className="text-text-muted">Density</dt>
              <dd className="mt-1 flex flex-wrap gap-2 text-text-secondary">
                {DENSITIES.map((density) => (
                  <Link
                    key={density.id}
                    href={`/loading?density=${density.id}`}
                    aria-current={density.id === active.id ? "true" : undefined}
                    className="header-control pointer-events-auto px-2"
                  >
                    {density.label}
                  </Link>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Reduced motion</dt>
              <dd className="mt-1 text-text-secondary">Enable it in your OS settings, then reload</dd>
            </div>
          </dl>

          <nav aria-label="Preview" className="pointer-events-auto flex flex-wrap gap-2">
            {PREVIEW_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="header-control px-3">
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </main>
  );
}
