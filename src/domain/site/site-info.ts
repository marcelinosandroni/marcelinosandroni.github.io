import { version as packageVersion } from "../../../package.json";

/**
 * Static site identity. Single source of truth so version strings are never
 * duplicated across components, metadata and footers.
 *
 * The version is read from `package.json` because the release automation is the
 * only thing allowed to change it. `semantic-release` writes the new number
 * there on every release, commits that change, and tags it; the deployment
 * built from that commit therefore renders the version it was released as,
 * rather than a number typed into a component.
 */
export const SITE_VERSION: string = packageVersion;

import type { BuildInfo } from "@/domain/site/build-info";
import { resolveBuildInfo } from "@/domain/site/build-info";

/**
 * What is currently deployed, resolved once here and nowhere else.
 *
 * A `const` rather than a function call in the layout, because the answer cannot
 * change between two components rendered in the same request and there is no
 * reason to compute it twice. Exported from this module — not from
 * `build-info.ts` — so that reading `package.json` and reading `process.env`
 * stay in one file; `build-info.ts` knows neither.
 */
export const SITE_BUILD: BuildInfo = resolveBuildInfo(
  {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
    NEXT_PUBLIC_BUILD_STAMP: process.env.NEXT_PUBLIC_BUILD_STAMP,
  },
  SITE_VERSION,
);

/**
 * Canonical origin for every absolute URL the site emits: metadata, canonical
 * links, hreflang alternates, Open Graph, `sitemap.xml` and `robots.txt`.
 *
 * The apex, not a subdomain and not the deployment host, because a canonical that
 * points at `vercel.app` or `*.github.io` splits the ranking signal across hosts
 * and makes every URL a redirect. Changing this constant is the whole cutover.
 */
export const SITE_URL = "https://marcelinosandroni.com";

/** Repository slug, used to build the release link shown in the footer. */
const SITE_REPOSITORY = "marcelinosandroni.github.io";

export const SITE_OWNER = {
  name: "Marcelino Sandroni Dias",
  /**
   * The name the first-visit intro writes out in falling glyphs.
   *
   * Not derived from `name`, and that is deliberate. The intro sets the wordmark in
   * all capitals with a trailing surname, because that is what a single line of
   * monospace can hold at a readable size on a phone — `MARCELINO SANDRONI DIAS`
   * at the same `clamp()` wraps or shrinks below legibility. Deriving it would
   * trade the one thing that has to work for a consistency nothing can see.
   */
  introName: "MARCELINO SANDRONI",
  linkedin: "https://linkedin.com/in/marcelinosandroni",
  github: "https://github.com/marcelinosandroni",
  email: "marcelino.sandroni@gmail.com",
  /**
   * Single source of truth for the phone number. The resume content references
   * this rather than repeating the literal, so a `wa.me` link can never drift
   * from the number printed on the document.
   */
  phone: "+55 11 91446-1993",
  location: "Fortaleza, CE, Brasil",
} as const;

/**
 * Where the version in the footer can be checked.
 *
 * A version in a footer is a claim. Linking it to the release that produced it
 * lets a reader confirm the claim instead of taking it on trust, which is the
 * point of publishing one on a repository people are asked to evaluate.
 *
 * Built from `SITE_OWNER` and `SITE_VERSION`, so a renamed repository or a
 * version bump moves this link by construction rather than by remembering to
 * update it. Declared after both, because a `const` cannot be read before it is
 * initialised.
 */
export const SITE_RELEASE_URL = `${SITE_OWNER.github}/${SITE_REPOSITORY}/releases/tag/v${SITE_VERSION}`;

/** Content freshness stamp shown in the hero (YYYY.MM). */
export const CONTENT_PERIOD = "2026.08";

export const COPYRIGHT_YEAR = 2026;

/**
 * Author attribution shared by the blog. Kept next to the site identity so the
 * structured data emitted by the blog routes can never disagree with the person
 * the rest of the site is about.
 */
export const SITE_AUTHOR = {
  name: SITE_OWNER.name,
  url: `${SITE_URL}/`,
} as const;
