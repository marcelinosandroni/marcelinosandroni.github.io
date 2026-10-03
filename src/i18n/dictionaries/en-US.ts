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
  /**
   * Attribution for a licensed still in a section's artwork layer
   * (`docs/section-artwork.md`).
   *
   * The only user-visible string the artwork layer has. The layer itself is
   * `aria-hidden`, but a film still is a use of someone else's copyrighted work
   * and attribution is neither decoration nor a detail — so the credit is ordinary
   * readable text, and it is translated like every other string on the site. It
   * renders only when an image is configured: the generated plate is original
   * artwork and carries no credit.
   */
  artwork: {
    credit: "Image: {title} — {rights}.",
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
   * The soundtrack control, which lives in the header.
   *
   * Muted by default, so these read as "turn it on" more often than not. A label
   * that says "sound" alone would be ambiguous about the current state, and a
   * button whose label changes with its state is the one a screen reader announces
   * correctly for free.
   */
  soundtrack: {
    start: "Unmute the soundtrack",
    stop: "Mute the soundtrack",
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

  /**
   * The occasional Matrix easter eggs.
   *
   * Five eggs and four of them are silent — a glitch, a reversed rain and a
   * frozen rain say nothing at all, and they are here because an effect that
   * talks is an interruption. The strings below are the whole spoken part: one
   * status line, one takeover sentence, one quiet line, one key hint and one
   * button.
   *
   * The takeover line is the site's own copy register, not a film quote. The
   * reference in question is a joke nobody paid for; quoting it would make the
   * page the thing it is making fun of. `handshake` is the word the boot
   * sequence already uses for what this site does when you arrive, so the line
   * lands on something the reader has already seen once.
   *
   * `wakeUp` is the fifteen-years jab at itself. Self-deprecating is the only
   * version of that joke this site can afford — the alternative is a résumé
   * congratulating itself, which is exactly the tone the rest of the catalog
   * spends its effort avoiding.
   */
  easterEgg: {
    dismiss: "Dismiss",
    glitchStatus: "// DECODING RECORD",
    whitePill: "Everything you have read so far was a handshake.",
    whitePillHint: "Esc to continue",
    wakeUp: "Wake up. This résumé has been loading for fifteen years.",
  },

  /**
   * The `/eastereggs` page, which exists because the trigger rules make the
   * effects genuinely hard to see otherwise.
   */
  easterEggs: {
    title: "Every effect, on demand",
    intro:
      "Five eggs fire at most once per visit, in a window after you have been reading for a little while, and only in the matrix theme. This page shows each one and states the rules, so the gating is visible rather than folklore.",
    replay: "Replay",
    rulesHeading: "The rules",
    back: "Back",
    clear: "Clear selection",
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
    placeholder: "How did you save the 24M contract?",
    closeLabel: "Close the terminal",
    exitHint: "exit, Esc, or Ctrl+C to close",
    welcome:
      "Grounded in the published resume only. Type a question, or pick one below. Nothing here is inferred — if the corpus cannot support an answer, it says so.",
    send: "Ask",
    thinking: "Searching the resume…",
    sourcesLabel: "Sources",
    openLabel: "Open the resume terminal",
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
  /**
   * The visitor's chat.
   *
   * A visitor is not offered this. The owner opens a conversation first, and only
   * then does a widget appear — so most readers of this site never see a word of
   * it, which is the point: a chat box on every page is an invitation to write to
   * a stranger, and the reply is content this site would then be holding.
   *
   * `agentNotice` and `agentReply` are the two halves of the automated reply, and
   * both are here rather than in the code because both are said to a stranger.
   * The notice is a label rendered *above* the message and read out by a screen
   * reader; the reply says in the first person that it is a machine. Neither can
   * be mistaken for the owner, and the domain refuses to build the message at all
   * without the notice.
   */
  chat: {
    title: "Direct line",
    open: "Talk to me",
    openLabel: "Open the direct line",
    closeLabel: "Close the conversation",
    sendLabel: "Send the message",
    placeholder: "Write a message…",
    transcriptLabel: "Conversation",
    messageLabel: "Your message",
    privacyNote:
      "Kept: a random id in this browser and when it was last seen. Not kept: your address, your device, your screen size, your fingerprint.",
    exitHint: "Esc or a click outside closes this",
    waiting: "Sent. Marcelino has not answered yet.",
    youLabel: "You",
    ownerLabel: "Marcelino",
    agentNotice: "AUTOMATED REPLY — not a person",
    agentReply:
      "I am Agent Smith: an automated stand-in, not Marcelino. Your message reached the desk and this reply is the queue acknowledging it. If it matters, expect the person in this thread shortly.",
    failed: "The message was not sent. Try again.",
    rateLimited: "Too many messages. Try again in {seconds}s.",
    withdrawn: "This conversation was closed.",
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
    /**
     * The sign-in email itself.
     *
     * The one place a link is rendered, so `{link}` is a contract rather than a
     * convenience: the delivery adapter substitutes the one-time link it
     * generated, and `MAGIC_LINK_PLACEHOLDER` in the domain is the name both
     * sides agree on. A body that lost the placeholder would still typecheck and
     * would still send — an email with a hole where the link belongs — so the
     * catalogs are asserted to carry it.
     *
     * Only the Resend adapter reads this. The Supabase adapter hands the wording
     * back to the template in the Supabase dashboard, which is the price of
     * keeping both.
     */
    email: {
      magicLinkSubject: "Your sign-in link",
      magicLinkBody: `Use this link to sign in to your site. It expires shortly and can be used once.

{link}

If you did not ask for it, ignore this message — nothing was changed.`,
    },
    /**
     * The blog CMS.
     *
     * Every string the editor shows lives here, including one entry per
     * `PostIssueCode`. The domain returns codes rather than sentences precisely
     * so this table can be the only place a reason is ever written down — a
     * validation message that lived in the domain would be English in a
     * Portuguese editor.
     */
    posts: {
      sectionTitle: "Blog CMS",
      sectionDescription:
        "Write a post in Markdown. Publishing compiles it into the same article the blog already renders, so nothing here is a second kind of page.",
      listLabel: "Your posts",
      newPost: "New post",
      empty: "No posts yet.",
      loadFailed:
        "The CMS could not be reached. Check that the blog_post_cms migration is applied and that SUPABASE_SECRET_KEY is set.",
      statusLabel: "Status",
      statusDraft: "Draft",
      statusPublished: "Published",
      statusArchived: "Archived",
      localeEnUS: "English",
      localePtBR: "Portuguese",
      formLabel: "Post details",
      createTitle: "New post",
      editTitle: "Editing {title}",
      edit: "Edit",
      fieldTitle: "Title",
      fieldSlug: "Slug",
      fieldSlugHint: "Leave blank to derive one from the title.",
      fieldLocale: "Language",
      fieldCategory: "Category",
      fieldExcerpt: "Excerpt",
      fieldExcerptHint: "One or two sentences. Used as the page description and by search engines.",
      fieldTags: "Tags",
      fieldTagsHint: "Comma separated.",
      fieldFeatured: "Feature on the home page",
      fieldPublishedAt: "Publication date",
      fieldBody: "Body (Markdown)",
      bodyHint:
        "Blank line between blocks. ## and ### for headings, - for a list, 1. for a numbered list, > for a quote, three backticks for code, and ::: for a callout.",
      bodySafetyNote:
        "Raw HTML is not rendered. Anything that looks like a tag is shown as the text you typed.",
      inlineFormattingNote:
        "Bold, italics and links are not supported yet and stay as the literal characters you typed.",
      wordCount: "{count} words",
      estimatedReading: "About {minutes} min read",
      previewLabel: "Preview",
      previewEmpty: "Write something and the preview appears here.",
      save: "Save draft",
      saving: "Saving…",
      cancel: "Cancel",
      publish: "Publish",
      withdraw: "Archive",
      restore: "Restore and publish",
      remove: "Delete",
      removeConfirm: "Confirm delete",
      removeCancel: "Keep it",
      removing: "Deleting…",
      removeWarning:
        "Deleting removes the article from the blog. The Markdown goes with it and cannot be recovered from here.",
      savedDraft: "Saved as a draft.",
      savedPublished: "Saved and republished.",
      published: "Published. The post is on the blog.",
      archived: "Archived. The post is off the blog and the text is kept.",
      restored: "Restored and published.",
      removed: "Post deleted.",
      failed: "The post was not saved. Nothing was changed.",
      slugTaken: "That slug is already used by another post in this language.",
      issuesLabel: "Fix these before saving",
      viewOnBlog: "View on the blog",
      issues: {
        document_unreadable: "The post could not be read. Send it again.",
        front_matter_missing:
          "The document must start with a --- line, then the fields, then another --- line.",
        front_matter_unterminated: "The --- that closes the fields is missing.",
        front_matter_line_invalid: "This line is not a field. Use `name: value`.",
        front_matter_key_unknown: "{field} is not a field this editor knows.",
        front_matter_key_repeated: "{field} is written more than once.",
        front_matter_key_missing: "{field} is missing.",
        value_not_a_string: "{field} must be a single value, not a list.",
        value_required: "{field} is required.",
        value_too_long: "{field} is too long.",
        value_not_a_boolean: "{field} must be true or false.",
        value_not_a_list: "{field} must be a comma separated list.",
        value_not_a_date: "{field} must be a date as YYYY-MM-DD.",
        slug_invalid:
          "The slug must be lowercase words joined by single hyphens, with no accents or spaces.",
        locale_unknown: "Choose one of the published languages.",
        category_unknown: "Choose a category from the list.",
        tags_too_many: "Too many tags.",
        body_empty: "The body is empty.",
      },
    },
    /**
     * The presence board and the owner's half of the chat.
     *
     * `availabilityAnswering` and friends name the three states from
     * `OwnerActivityState` rather than describing them, so the badge and the rule
     * cannot drift: "Answering" is shown exactly when `canOwnerAnswer` is true.
     *
     * The last-seen strings are relative because an absolute timestamp on a live
     * board is read as "when did I look at this page". Three granularities rather
     * than one formatted date, because a board that says "27/09/2026 14:02:11"
     * for somebody who is online *right now* has buried the one fact it exists to
     * convey.
     */
    chat: {
      sectionTitle: "Who is reading",
      sectionDescription:
        "Anonymous visitors on the site right now, and the conversations you have started. A random id and a last-seen time — no address, no device, no fingerprint, no cookie.",
      online: "{count} online",
      onlineNone: "Nobody is reading",
      lastSeenNow: "just now",
      lastSeenMinutes: "{minutes}m ago",
      lastSeenHours: "{hours}h ago",
      visitorsLabel: "Visitors",
      noVisitors: "No visitor has sent a heartbeat in the last day.",
      availabilityLabel: "You are",
      availabilityAnswering: "answering",
      availabilityIdle: "idle",
      availabilitySignedOut: "signed out",
      availabilityHint:
        "Answering while this page is open and looked at, idle after an hour of quiet, signed out the moment your session ends.",
      startChat: "Start a conversation",
      reopenChat: "Open again",
      openTranscript: "Read the transcript",
      started: "Conversation started. Their widget has just appeared.",
      closeChat: "Stop answering",
      closeChatWarning: "Stop answering keeps the transcript. The visitor is offered nothing.",
      conversationLabel: "Conversation with {session}",
      replyPlaceholder: "Reply…",
      sendReply: "Reply",
      transcriptLabel: "Transcript",
      emptyConversation: "No messages yet.",
      stateLabel: "State",
      stateUnopened: "Not started",
      stateOpen: "Open",
      stateClosed: "Closed",
      youLabel: "You",
      visitorLabel: "Visitor",
      failed: "That did not go through. Nothing was changed.",
      rateLimited: "Too many messages. Try again in {seconds}s.",
      sessionEnded: "Your session ended. Reload the page to sign in again.",
      loadFailed:
        "The console could not be reached. Check that the presence_and_chat migration is applied and that SUPABASE_SECRET_KEY is set.",
    },
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
    /*
      Deliberately not translated, and not prose.

      `TTFB`, `DOM` and `load` are the names the browser itself uses for these three
      events — they are what shows up in a DevTools panel and in every performance
      conversation anyone will have about this page. Translating them would make the
      bar unreadable to the one reader most likely to check whether the numbers are
      real, which is the reader this bar exists for.

      `DOM ready` and `Loaded` were the previous wording and were both wrong twice
      over: translated away from the event names, and long enough that on a 390px
      screen the bar wrapped to three lines to say the same thing in more words.
     */
    ttfb: "TTFB",
    domContentLoaded: "DOM",
    loadComplete: "load",
    unavailable: "not measurable in this browser",
    /*
      Tooltip for the build stamp at the right of the bar, naming what the number is
      rather than restating it. It exists because the stamp is UTC and minute-wide
      and means nothing to a reader who has not been told it is a build time, and
      "build" alone reads as the noun rather than as the verb — a build of what.
    */
    buildTitle: "This deployment was built at",
  },
  /**
   * Open Graph cards — the 1200x630 image a social platform shows when a link
   * is shared, and the `og:image:alt` that accompanies it.
   *
   * These live in the catalog rather than in the card components because they
   * are user-visible in the sense that matters most here: they are read by
   * someone who never loaded the site, in a language that may not be the one the
   * article was written in. `monogram` is identical in every locale on purpose —
   * it is the wordmark, and translating a wordmark is a rebranding.
   */
  og: {
    monogram: "MSD",
    siteKicker: "// DOCUMENT OF RECORD",
    alt: "Marcelino Sandroni Dias — Senior Software Engineer & Tech Lead",
    articleAlt: "Blog article by Marcelino Sandroni Dias",
    /**
     * One entry per `ArticleCategory`. A category missing from this table still
     * renders — `resolveCategoryLabel` falls back to the slug — so adding a
     * category to the domain does not require a card to fail.
     */
    categories: {
      "distributed-systems": "Distributed Systems",
      "data-platforms": "Data Platforms",
      leadership: "Leadership",
      "ai-ml": "AI & ML",
      fintech: "Fintech",
    },
  },
};

/**
 * The translation contract every locale must satisfy. Derived from the
 * reference catalog so the shape can never drift.
 */
export type Dictionary = typeof enUS;
