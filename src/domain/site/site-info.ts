import { version as packageVersion } from "../../../package.json";

/**
 * Static site identity. Single source of truth so version strings are never
 * duplicated across components, metadata and footers.
 *
 * The version is read from `package.json` because release automation
 * (release-please) is the only thing allowed to change it.
 */
export const SITE_VERSION: string = packageVersion;

/**
 * Canonical origin for every absolute URL the site emits: metadata, canonical
 * links, hreflang alternates, Open Graph, `sitemap.xml` and `robots.txt`.
 *
 * The apex, not a subdomain and not the deployment host, because a canonical that
 * points at `vercel.app` or `*.github.io` splits the ranking signal across hosts
 * and makes every URL a redirect. Changing this constant is the whole cutover.
 */
export const SITE_URL = "https://marcelinosandroni.com";

export const SITE_OWNER = {
  name: "Marcelino Sandroni Dias",
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
