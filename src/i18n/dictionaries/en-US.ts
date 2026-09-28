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
 * Placeholders use `{name}` and are filled by `formatMessage`.
 */
export const enUS = {
  metadata: {
    title: "Marcelino Sandroni Dias | Senior Software Engineer",
    jobTitle: "Senior Software Engineer",
    description:
      "Living, interactive resume of Marcelino Sandroni Dias. Senior full-stack software engineer specialised in distributed systems, scalable architecture and corporate finance.",
    siteName: "Marcelino Sandroni Dias — Resume",
    openGraphDescription:
      "Living resume of Marcelino Sandroni Dias, senior full-stack software engineer.",
    structuredDataDescription:
      "Senior full-stack software engineer combining cutting-edge engineering with 15 years of experience in business and accounting.",
    keywords: [
      "Marcelino Sandroni Dias",
      "Senior Software Engineer",
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
      "DDD",
    ],
    knowsAbout: [
      "Software Engineering",
      "Distributed Systems",
      "Cloud Computing",
      "DDD",
      "CQRS",
      "TypeScript",
      "C#",
      ".NET",
      "Java",
      "Go",
      "Python",
      "React",
      "Next.js",
    ],
  },
  nav: {
    backToTop: "Back to top",
    mainNavigation: "Main navigation",
    experience: "Experience",
    skills: "Skills",
    education: "Education",
  },
  hero: {
    liveResume: "Live Resume · v{version} · Updated {period}",
    exploreTrajectory: "Explore trajectory",
    getInTouch: "Get in touch",
    profileLabel: "Professional profile",
    note: "Engineering connecting distributed systems, product and financial outcomes.",
  },
  signal: {
    available: "Available for opportunities",
    disciplines: "Backend · Frontend · Cloud · Architecture",
    localePair: "EN-US / PT-BR",
  },
  experience: {
    title: "Experience",
    subtitle: "A trajectory across technology, operations and business.",
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
  footer: {
    tagline: "Let's build something solid.",
    versionedResume: "Versioned Resume",
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
    },
    referenceSections: {
      summary: "Executive Summary",
      skills: "Core Skills & Software Architecture",
      experience: "Professional Experience",
      education: "Education & Certifications",
      languages: "Languages",
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
};

/**
 * The translation contract every locale must satisfy. Derived from the
 * reference catalog so the shape can never drift.
 */
export type Dictionary = typeof enUS;
