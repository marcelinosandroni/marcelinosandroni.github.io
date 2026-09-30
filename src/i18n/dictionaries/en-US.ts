/**
 * English (en-US) message catalog — the reference locale.
 *
 * This module defines the `Dictionary` contract: every other locale must
 * structurally match it, so a missing or misspelled key becomes a build error
 * instead of silently rendering untranslated text.
 *
 * Values intentionally widen to `string` (no `as const`) so translated
 * catalogs are not forced to repeat the English literals.
 *
 * Division of labor with the content modules (`DESIGN.md` §12):
 * - **Dictionary** = UI chrome. Structural labels, aria text, units, formats and
 *   anything that is a property of the *interface* rather than of the page.
 * - **Content modules** (`home`, `resume-data`, blog articles) = what this
 *   particular site says. Titles, narratives, metrics, tags, article bodies.
 *
 * Placeholders use `{name}` and are filled by `formatMessage`.
 */
export const enUS = {
  metadata: {
    title: "Marcelino Sandroni Dias | Senior Software Engineer & Tech Lead",
    jobTitle: "Senior Software Engineer & Tech Lead",
    description:
      "Marcelino Sandroni Dias — senior software engineer and tech lead. Executive engineering across distributed systems, AI pipelines and financial infrastructure, with R$ 24M/year and 100M messages/day of measured impact.",
    siteName: "Marcelino Sandroni Dias",
    openGraphDescription:
      "Senior Software Engineer & Tech Lead. Distributed systems, AI pipelines and financial infrastructure — with measured fiscal impact.",
    structuredDataDescription:
      "Senior full-stack software engineer and tech lead combining cutting-edge engineering with 15 years of experience in corporate finance and accounting.",
    keywords: [
      "Marcelino Sandroni Dias",
      "Senior Software Engineer",
      "Tech Lead",
      "Software Architect",
      "Full Stack",
      "TypeScript",
      "Node.js",
      "Next.js",
      "React",
      ".NET",
      "C#",
      "Java",
      "Spring Boot",
      "Python",
      "Go",
      "Kubernetes",
      "Docker",
      "Cloud",
      "Microservices",
      "Distributed Systems",
      "DDD",
      "Apache Kafka",
      "ClickHouse",
    ],
    knowsAbout: [
      "Software Engineering",
      "Distributed Systems",
      "Cloud Computing",
      "DDD",
      "CQRS",
      "Hexagonal Architecture",
      "TypeScript",
      "C#",
      ".NET",
      "Java",
      "Go",
      "Python",
      "React",
      "Next.js",
      "Apache Kafka",
      "ClickHouse",
    ],
  },
  /** UI-only affordances that must exist even with content removed. */
  a11y: {
    skipToContent: "Skip to main content",
    mainContent: "Main content",
    decorative: "Decorative",
    opensInNewTab: "Opens in a new tab",
  },
  nav: {
    backToTop: "Back to top",
    mainNavigation: "Main navigation",
    experience: "Experience",
    skills: "Skills",
    education: "Education",
    home: "Overview",
    arsenal: "Arsenal",
    trackRecord: "Track record",
    blog: "Writing",
    resume: "Resume",
    contact: "Contact",
  },
  hero: {
    liveResume: "Live Resume · v{version} · Updated {period}",
    note: "Engineering connecting distributed systems, product and financial outcomes.",
    backToOverview: "Back to overview",
  },
  signal: {
    available: "Available for opportunities",
  },
  experience: {
    title: "Track Record: Production Systems Experience",
    subtitle: "A trajectory across technology, operations and business.",
    teamLabel: "Team",
  },
  skills: {
    titleLead: "Tools to",
    titleEmphasis: "solve the complex.",
    subtitle: "A broad technical repertoire. The choice is always problem-driven.",
  },
  education: {
    title: "Education & Languages",
    subtitle: "Academic foundation and international communication.",
    languagesLabel: "Languages",
    languagesTitle: "Bilingual Fluency",
    languagesDescription: "Full professional proficiency in English and native Portuguese.",
  },
  resume: {
    kicker: "// DOCUMENT OF RECORD",
    title: "Complete resume",
    subtitle:
      "Every role, deliverable and measured outcome, in full. This page is the document of record; the overview is the summary.",
    documentLabel: "Resume document",
    technologiesLabel: "Core technologies",
    scopeLabel: "Scope",
    teamLabel: "Team",
    caseStudiesLabel: "Case study",
    problem: "Problem",
    solution: "Solution",
    result: "Result",
    backToOverview: "Back to overview",
  },
  blog: {
    indexKicker: "// ENGINEERING WRITING",
    indexTitle: "Whitepapers, benchmarks and field notes",
    indexSubtitle:
      "Long-form writing on distributed systems, data platforms and the craft of technical leadership.",
    allArticles: "Read the writing",
    readingTime: "{minutes} min read",
    publishedOn: "Published",
    updatedOn: "Updated",
    tagsLabel: "Tags",
    backToIndex: "All articles",
    emptyTitle: "No articles published yet",
    emptyDescription: "The first whitepaper is being written. Check back shortly.",
    notFoundTitle: "Article not found",
    notFoundDescription:
      "This article does not exist in this language, or it has been unpublished.",
  },
  contact: {
      briefNote:
        "WhatsApp opens the conversation with the context already suggested; email opens a filled-in draft. Nothing is sent from this page and there is no form to submit.",
  },
  boot: {
    skip: "Skip intro",
    hint: "Press Enter to skip",
  },
  footer: {
    versionedResume: "Versioned Resume",
    themeLabel: "THEME",
    legal: "All rights reserved.",
  },

  /**
   * The one question this site asks a reader. Wording matters: it is short
   * enough to read in passing, and "still using" rather than "do you like"
   * because the answer is about behaviour, not sentiment.
   */
  feedback: {
    question: "New themes. Still using this one?",
    keep: "Keep it",
    unsure: "Not sure",
    leave: "Prefer another",
    dismiss: "Dismiss this question",
  },
  pdf: {
    download: "Download PDF",
    generating: "Generating…",
    failed: "Failed to download PDF",
    unknownError: "Unknown error",
    chooseTemplate: "Choose PDF template",
    /**
     * Section headings printed in the generated PDF. Kept apart from the web UI
     * because the document follows its own editorial structure, and the
     * REFERENCE template reproduces the headings of the original reference PDF.
     */
    sections: {
      summary: "Summary",
      skills: "Skills",
      experience: "Experience",
      education: "Education",
      languages: "Languages",
      teamSize: "Team of {n}",
      stack: "Stack",
      challenge: "Challenge",
      solution: "Response",
      result: "Result",
    },
    referenceSections: {
      summary: "Executive Summary",
      skills: "Core Skills & Software Architecture",
      experience: "Professional Experience",
      education: "Education & Certifications",
      languages: "Languages",
      teamSize: "Team of {n}",
      stack: "Stack",
      challenge: "Challenge",
      solution: "Response",
      result: "Result",
    },
    templates: {
      CLEAN: {
        label: "CLEAN",
        description: "Default editorial template",
      },
      REFERENCE: {
        label: "REFERENCE",
        description: "Template faithful to the reference PDF",
      },
    },
  },
  localeSwitcher: {
    switchTo: "Read this resume in {language}",
  },
  notFound: {
    title: "Page not found",
    description: "This address does not match any part of the resume.",
    backHome: "Back to the resume",
  },
  copilot: {
    open: "Ask about my experience",
    title: "Ask the resume",
    subtitle: "Grounded answers from this page and the blog. No guessing.",
    placeholder: "How did you save 24M?",
    send: "Ask",
    thinking: "Searching the resume…",
    sourcesLabel: "Sources",
    openLabel: "Open the resume copilot",
    examplesLabel: "Try one of these",
    examples: [
      "How did you save the 24M contract?",
      "What is your Kafka experience?",
      "Tell me about ClickHouse",
      "How do you lead engineering teams?",
    ],
    topMatch: "From {label}:",
    nothingFound:
      "Nothing in this resume answers that. I only answer from published content, and I would rather say so than guess.",
    questionTooShort: "Ask something a little longer so I can search for it.",
    questionTooLong: "That question is too long. Keep it to a sentence.",
    error: "The copilot could not be reached. Try again.",
  },
  admin: {
    accessLabel: "Owner access",
    signInTitle: "Owner sign-in",
    signInDescription: "This area is restricted. Enter your address and we will email you a sign-in link.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submit: "Email me a link",
    sending: "Sending…",
    sent: "Check your inbox. The link expires shortly and can be used once.",
    invalidEmail: "That does not look like a valid email address.",
    notAllowed: "This address is not authorised for this site.",
    notConfigured:
      "Owner sign-in is not configured on this deployment. Set ADMIN_EMAIL, SUPABASE_URL and SUPABASE_SECRET_KEY.",
    unavailable:
      "The mail provider is not reachable from this deployment. Nothing was sent — try again shortly.",
    backToSite: "Back to the site",
    signOut: "Sign out",
    signedInAs: "Signed in as {email}",
  },
  analytics: {
    panelLabel: "Engagement overview",
    open: "Show what visitors click",
    close: "Hide",
    title: "What visitors click",
    subtitle: "Aggregate counts by element. No coordinates, no IP, no cookies, no sessions.",
    empty: "No click data collected yet.",
    total: "{count} clicks",
    unknownElement: "other",
  },
  telemetry: {
    label: "This page's real load metrics",
    ttfb: "TTFB",
    domContentLoaded: "DOM ready",
    loadComplete: "Loaded",
    unavailable: "not measurable in this browser",
  },
};

/**
 * The translation contract every locale must satisfy. Derived from the
 * reference catalog so the shape can never drift.
 */
export type Dictionary = typeof enUS;
