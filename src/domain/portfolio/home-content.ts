import type { Locale } from "@/domain/i18n";

/**
 * Home page content contract.
 *
 * The home route is an executive landing page whose *every* visitor-facing
 * string is configuration, not markup (DESIGN.md §12). This module is the
 * vocabulary those configurations are written against; the data lives in
 * `src/infrastructure/content/home/`.
 *
 * It is intentionally disjoint from `ResumeContent`: the resume is the
 * document of record and is never restyled by the home design. The home page
 * *reuses* resume facts (track record, education, languages) but owns its own
 * titles, descriptions and framing.
 */

/**
 * Accent roles from DESIGN.md §3.2. Data may only pick from these; it may
 * never name a colour.
 */
export type AccentTone = "primary" | "secondary" | "tertiary";

/**
 * Closed icon vocabulary. Declared in the domain so content configuration
 * cannot request a glyph the presentation layer is unable to render.
 */
export type IconName =
  | "account"
  | "bolt"
  | "brush"
  | "cpu"
  | "devices"
  | "server"
  | "cloud"
  | "brain"
  | "calendar"
  | "location"
  | "mail"
  | "whatsapp"
  | "verified"
  | "external"
  | "terminal"
  | "document"
  | "shield"
  | "code"
  | "arrow-down"
  | "arrow-right"
  | "arrow-back"
  | "download";

/**
 * Relative emphasis of a KPI statistic. Mirrors the reference KPI matrix, where
 * a numeric value gets the monumental scale and a qualitative one gets the
 * headline scale, so the eye lands on the number that matters.
 */
export type StatScale = "monumental" | "headline";

export type HomeAction = {
  label: string;
  href: string;
  icon?: IconName;
};

export type HomeChannel = {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: IconName;
  external: boolean;
  /**
   * `false` for rows whose value is a fact rather than a destination — a
   * response-time promise is not something you click. Defaults to a link.
   */
  link?: boolean;
};

/**
 * The hero portrait frame. `src` is optional on purpose: until a photograph is
 * configured the component renders the designed monogram panel, which is a
 * deliberate asset rather than a broken image.
 */
export type HomePortrait = {
  src: string | null;
  alt: string;
  cornerMarks: [string, string, string, string];
  badge: string;
  caption: string;
  captionMeta: string;
  ticker: [string, string];
};

export type HomeHero = {
  statusPill: string;
  /**
   * Rendered as a mono kicker *inside* the single `<h1>` so the document
   * outline stays correct while the name stays scannable. Stored in natural
   * case; the uppercase treatment is a styling decision, not a content one.
   */
  name: string;
  headlineLead: string;
  headlineAccent: string;
  headlineTail: string;
  /** Playfair role line (`.hero-title`). */
  role: string;
  narrative: string;
  /**
   * Purpose-built `<meta name="description">` copy, kept separate from
   * `narrative`: the hero narrative is written to be read, and a 300-character
   * meta description is truncated in every search result anyway.
   */
  metaDescription: string;
  primaryAction: HomeAction;
  secondaryAction: HomeAction;
  availability: string;
  channels: HomeChannel[];
  portrait: HomePortrait;
};

export type HomeKpi = {
  id: string;
  label: string;
  value: string;
  scale: StatScale;
  description: string;
  icon: IconName;
  accent: AccentTone;
  footnote: { label: string; value: string };
};

export type HomeSectionHeader = {
  /** Mono kicker, e.g. `// HARD METRICS & FISCAL IMPACT`. */
  kicker: string;
  title: string;
  note: string;
};

export type HomeKpiSection = HomeSectionHeader & {
  id: string;
  items: HomeKpi[];
};

export type HomeStackCluster = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent: AccentTone;
  items: string[];
};

export type HomeStackSection = HomeSectionHeader & {
  id: string;
  clusters: HomeStackCluster[];
};

/**
 * Home-only framing for one resume experience.
 *
 * Joined to the resume by `company` rather than by position, so reordering the
 * resume never silently re-points a badge. `tests/unit/presentation/home-content.test.ts`
 * proves the join is total and unambiguous for both locales.
 */
export type HomeExperienceAnnotation = {
  company: string;
  impact: { label: string; value: string; accent: AccentTone };
  blueprintLabel: string;
  blueprint: string[];
  teamLine: string;
};

export type HomeTrackRecordSection = HomeSectionHeader & {
  id: string;
  /** Scroll target the hero's secondary action points at. */
  ctaLabel: string;
  resumeCtaLabel: string;
  /**
   * Company whose row gets the live status treatment. Explicit rather than
   * inferred from the period string, because "Present" and "Presente" are
   * locale-specific and a heuristic would be a translation bug waiting to happen.
   */
  currentCompany: string | null;
  annotations: HomeExperienceAnnotation[];
};

export type HomeBlogTeaser = {
  slug: string;
  category: string;
  readingTimeMinutes: number;
  title: string;
  excerpt: string;
  ctaLabel: string;
  accent: AccentTone;
};

export type HomeBlogSection = HomeSectionHeader & {
  id: string;
  ctaLabel: string;
  /** Maximum teasers rendered. `0` means "let the data decide". */
  limit: number;
  items: HomeBlogTeaser[];
};

export type HomeContact = {
  id: string;
  kicker: string;
  title: string;
  narrative: string;
  portalLabel: string;
  statusNote: string;
  channels: HomeChannel[];
  /**
   * The primary "let's solve it" channel.
   *
   * WhatsApp is the fastest route for a reader who wants an answer, so it leads
   * and the email brief is the fallback for anyone who prefers to write. Both
   * exist: this site never gates one behind the other.
   */
  whatsapp: {
    ctaLabel: string;
    /** Prefilled message. `{company}` and `{scope}` are left as visible dashes. */
    message: string;
  };
  /** Pre-addressed email draft. See `whatsapp.message` for the placeholder rule. */
  brief: { ctaLabel: string; subject: string; bodyTemplate: string };
};

export type HomeFooter = {
  id: string;
  kicker: string;
  title: string;
  narrative: string;
  columns: { id: string; title: string; items: HomeChannel[] }[];
  legalNote: string;
};

export type HomeContent = {
  locale: Locale;
  hero: HomeHero;
  kpis: HomeKpiSection;
  stack: HomeStackSection;
  trackRecord: HomeTrackRecordSection;
  blog: HomeBlogSection;
  contact: HomeContact;
  footer: HomeFooter;
};
