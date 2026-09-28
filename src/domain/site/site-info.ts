import { version as packageVersion } from "../../../package.json";

/**
 * Static site identity. Single source of truth so version strings are never
 * duplicated across components, metadata and footers.
 *
 * The version is read from `package.json` because release automation
 * (release-please) is the only thing allowed to change it.
 */
export const SITE_VERSION: string = packageVersion;

export const SITE_URL = "https://marcelinosandroni.github.io";

export const SITE_OWNER = {
  name: "Marcelino Sandroni Dias",
  linkedin: "https://linkedin.com/in/marcelinosandroni",
  email: "marcelino.sandroni@gmail.com",
} as const;

/** Content freshness stamp shown in the hero (YYYY.MM). */
export const CONTENT_PERIOD = "2026.08";

export const COPYRIGHT_YEAR = 2026;
