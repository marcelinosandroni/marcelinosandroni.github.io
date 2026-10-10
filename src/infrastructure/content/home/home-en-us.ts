import type { HomeContent } from "@/domain/portfolio";
import { toWhatsAppHref } from "@/domain/portfolio";
import { SITE_OWNER } from "@/domain/site/site-info";

/** Prefilled message, so the conversation starts with context instead of "hi". */
const WHATSAPP_MESSAGE = "Hi Marcelino,\n\nCompany: {company}\nI need help with: {scope}\n";

/**
 * Home page content — en-US.
 *
 * Structurally identical to the pt-BR catalog (enforced by the `satisfies
 * HomeContent` contract and by the bilingual content tests), but independently
 * written: it states the same career in the language an international hiring
 * panel actually reads. American spelling throughout, because the audience is
 * readers based in the US and a British spelling is a tell that the copy was
 * translated rather than written.
 *
 * The same copy rules apply as in pt-BR: no fiction naming, every figure
 * measurable and traceable to the resume, and the career arithmetic stated
 * explicitly.
 */
export const homeContentEnUS: HomeContent = {
  locale: "en-US",

  hero: {
    statusPill: "Open to senior engineering and tech lead roles",
    name: "Marcelino Sandroni Dias",
    headlineLead: "Software engineering that moves",
    headlineAccent: "revenue and",
    headlineTail: "scale.",
    role: "Senior Software Engineer & Tech Lead",
    narrative:
      "Six years writing software (2021–2026), on top of fifteen years in corporate financial governance (2005–2020). I work end to end across architecture, backend, frontend and DevOps — Go, distributed systems, ClickHouse, Kafka and Kubernetes at fintech scale — and I lead the teams that ship it. The accounting background is not a detour: it is why I can price compute cost and operational risk as a balance-sheet liability instead of guessing.",
    metaDescription:
      "Senior Software Engineer and Tech Lead: Go, distributed systems, ClickHouse and Kafka at fintech scale. R$ 24M/year in contract value rescued, 100M telemetry events/day, deploys cut from 4h to 15min.",
    primaryAction: {
      label: "Get in touch",
      href: "#contact",
      icon: "calendar",
    },
    secondaryAction: {
      label: "See the track record",
      href: "#experience",
    },
    availability: "Available for senior engineer and tech lead roles",
    proof: [
      { id: "contractValueSaved", label: "Revenue protected" },
      { id: "messagesPerDay", label: "Scale handled" },
      { id: "deployAfterMinutes", label: "Deploy, from 4h" },
    ],
    channels: [
      {
        id: "github",
        label: "GITHUB",
        href: "https://github.com/marcelinosandroni",
        value: "github.com/marcelinosandroni",
        icon: "code",
        external: true,
      },
      {
        id: "linkedin",
        label: "LINKEDIN",
        href: "https://linkedin.com/in/marcelinosandroni",
        value: "linkedin.com/in/marcelinosandroni",
        icon: "external",
        external: true,
      },
      {
        id: "whatsapp",
        label: "WHATSAPP",
        href: toWhatsAppHref(SITE_OWNER.phone),
        value: SITE_OWNER.phone,
        icon: "whatsapp",
        external: true,
      },
      {
        id: "email",
        label: "EMAIL",
        href: "mailto:" + SITE_OWNER.email,
        value: SITE_OWNER.email,
        icon: "mail",
        external: false,
      },
    ],
    portrait: {
      src: "/portrait.jpg",
      alt: "Portrait of Marcelino Sandroni Dias, Tech Lead and Software Architect",
      cornerMarks: ["// ID: MSD-01", "[NOMINAL]", "// STACK: FULL", "LATENCY < 0.1ms"],
      badge: "100% ACCURACY",
      caption: "// TECH LEAD & SOFTWARE ARCHITECT",
      captionMeta: "Go · .NET · Java · Kafka",
      ticker: ["THROUGHPUT: 100M MSGS/DAY", "100% SLA COMPLIANT"],
    },
  },

  kpis: {
    id: "kpis",
    kicker: "// FINANCIAL & OPERATIONAL IMPACT",
    title: "Engineering measured in capital, scale and availability",
    note: "Zero vanity metrics. Auditable return, zero-downtime architecture and compliance under stewardship.",
    items: [
      {
        id: "track",
        label: "COMBINED EXPERIENCE",
        value: "21 years",
        scale: "monumental",
        description:
          "15 years of corporate financial governance (2005–2020) plus 6 years of software engineering (2021–2026). The accounting background is what lets me price compute cost and operational risk as balance-sheet liability.",
        icon: "account",
        accent: "primary",
        footnote: { label: "MONTH-END", value: "30→5 DAYS (-83%)" },
      },
      {
        id: "throughput",
        label: "BACKEND CORE",
        value: "100M+",
        scale: "monumental",
        description:
          "Telemetry messages processed per day across distributed pipelines, with Apache Kafka partitioning, ClickHouse columnar storage and p99 edge latency under 10ms.",
        icon: "server",
        accent: "secondary",
        footnote: { label: "PROTECTED REVENUE", value: "R$ 24M/YEAR" },
      },
      {
        id: "platform",
        label: "DEVOPS & CLOUD",
        value: "-95%",
        scale: "monumental",
        description:
          "Deploy time cut from 4 hours to 15 minutes, with automatic rollback in under 2 minutes, 80% fewer production incidents and infrastructure as code across AWS, Azure and GCP.",
        icon: "cloud",
        accent: "primary",
        footnote: { label: "DEPLOY", value: "4H → 15MIN" },
      },
      {
        id: "ai",
        label: "ARTIFICIAL INTELLIGENCE",
        value: "100%",
        scale: "monumental",
        description:
          "100% accuracy on license-plate recognition with computer vision, alongside enterprise RAG, pgvector similarity search and TensorRT-optimized real-time video inference.",
        icon: "cpu",
        accent: "secondary",
        footnote: { label: "RECALL", value: "100% PROD" },
      },
    ],
  },

  stack: {
    id: "arsenal",
    kicker: "// TECHNICAL ARSENAL",
    title: "Four disciplines, one decision per problem",
    note: "Closed categories, each traceable to the resume. Every technology listed here appears in the resume, in the category it appears in here.",
    clusters: [
      {
        id: "frontend",
        title: "Frontend & UI",
        description:
          "Enterprise microfrontends, accessible design systems and high-frequency rendering with no performance regression.",
        icon: "devices",
        accent: "primary",
        items: [
          "React",
          "Next.js (RSC, SSR)",
          "Angular",
          "Flutter",
          "React Native",
          "Tailwind CSS",
          "Design System",
          "Storybook",
        ],
      },
      {
        id: "backend",
        title: "Backend Core",
        description:
          "Hexagonal architecture, domain-driven design, high-throughput messaging and both relational and columnar data modeling.",
        icon: "server",
        accent: "secondary",
        items: [
          "Go",
          "Java (Spring Boot)",
          "C# (.NET Core)",
          "Node.js (NestJS)",
          "Apache Kafka",
          "PostgreSQL",
          "ClickHouse",
          "Redis",
        ],
      },
      {
        id: "platform",
        title: "DevOps & Cloud",
        description:
          "Infrastructure as code, Kubernetes orchestration, distributed observability and continuous delivery with quality gates.",
        icon: "cloud",
        accent: "primary",
        items: [
          "Docker",
          "K8s (Helm, HPA)",
          "IaC (Terraform)",
          "AWS",
          "Azure",
          "GCP",
          "OpenTelemetry",
          "CI/CD",
        ],
      },
      {
        id: "intelligence",
        title: "Artificial Intelligence",
        description:
          "GenAI applied to the development cycle, context-augmented retrieval and real-time edge inference.",
        icon: "cpu",
        accent: "secondary",
        items: [
          "LLM Integration (OpenAI, Claude, Gemini)",
          "RAG",
          "pgvector",
          "Qdrant",
          "TensorRT",
          "LangChain",
          "Autonomous Agents",
        ],
      },
    ],
  },

  trackRecord: {
    id: "experience",
    kicker: "// TRACK RECORD",
    title: "Track Record: Production Systems Experience",
    note: "THREE OUTCOMES PER EMPLOYER // PROVABLE IMPACT ONLY",
    ctaLabel: "Open the full resume",
    resumeCtaLabel: "FULL RESUME",
    currentCompany: "DGT Tecnologia",
    annotations: [
      {
        company: "DGT Tecnologia",
        impact: { label: "IMPACT", value: "R$ 24M/YEAR SAVED", accent: "primary" },
        blueprintLabel: "// ROLE STACK",
        blueprint: ["Go", "ClickHouse", "Kafka", "Docker", "Kubernetes", "Playwright"],
        teamLine: "LEADERSHIP: 10 PEOPLE (DEV, QA, BA, PO, PM)",
      },
      {
        company: "Antlia",
        impact: { label: "IMPACT", value: "+45% ASSETS UNDER MGMT", accent: "secondary" },
        blueprintLabel: "// ROLE STACK",
        blueprint: ["Java Spring", "Kafka", "Angular", "Hexagonal Architecture", "Kubernetes"],
        teamLine: "LEADERSHIP: 8 DEVELOPERS (3 PRINCIPAL) + PO, QA, PM, 2 BAs",
      },
      {
        company: "Banco Itaú",
        impact: { label: "SCALE", value: "+R$ 100B UNDER CUSTODY", accent: "primary" },
        blueprintLabel: "// ROLE STACK",
        blueprint: [".NET Core", "Flutter", "Angular", "AWS", "Messaging"],
        teamLine: "MULTI-DISCIPLINE SQUAD: 9 PEOPLE",
      },
      {
        company: "Pollux Technologies",
        impact: { label: "CLOUD SAVINGS", value: "-50% INFRA COSTS", accent: "secondary" },
        blueprintLabel: "// ROLE STACK",
        blueprint: ["TypeScript", "AWS", "Serverless", "React", "Python"],
        teamLine: "PROMOTED JUNIOR TO MID-LEVEL IN 3 MONTHS // 80% OF PROJECTS AHEAD OF SCHEDULE",
      },
      {
        company: "Accounting Consulting Firms",
        impact: { label: "MONTH-END", value: "30 DAYS → 5 DAYS (-83%)", accent: "primary" },
        blueprintLabel: "// DISCIPLINES",
        blueprint: [
          "Integrated Accounting Systems",
          "Integration APIs",
          "Cloud Platforms",
          "ERP Management Systems",
        ],
        teamLine: "BSC IN ACCOUNTING // 20+ PEOPLE REALLOCATED",
      },
    ],
  },

  /**
   * How I lead.
   *
   * The track record above is achievement-dense: 24 case studies, 96 metrics, and
   * almost nothing about how a team is actually run. That is the gap a hiring
   * manager for a tech lead reads this section to close — what does he do on the
   * first day, in a code review, when a deadline is at risk.
   *
   * Every `evidence` line here is traceable to a case study already on the resume.
   * Nothing in this section is a claim that is not made somewhere else with the
   * detail to support it.
   */
  leadership: {
    id: "leadership",
    kicker: "// HOW I LEAD",
    title: "The part that is not a project",
    note: "A tech lead is judged on decisions and people, not on commits. These are the decisions and the people, with what came out of them.",
    items: [
      {
        id: "crisis",
        title: "Crises, first",
        practice:
          "A production problem is a prioritization problem before it is a technical one. I map the defects, rank them by business impact, and put the team on the critical path within hours.",
        evidence:
          "Took over a public-sector contract that was weeks from cancellation, mapped 47 critical defects in 48 hours, and shipped daily hotfixes to production until the accuracy gap closed.",
        icon: "bolt",
      },
      {
        id: "decisions",
        title: "Decisions in the open",
        practice:
          "Architecture goes through pull requests and written rationale, not hallway agreement. When I overrule the room I write down why, so the next person can disagree with the reason instead of the outcome.",
        evidence:
          "Moved a monolith onto 12 Go and .NET services with a columnar store behind it, and the split became the reference pattern other teams adopted.",
        icon: "shield",
      },
      {
        id: "reuse",
        title: "Leave the team faster than you found it",
        practice:
          "Anything solved twice gets written down once. Shared libraries, a design system and real onboarding docs are how a team stops being one person's memory.",
        evidence:
          "Onboarding went from 3 months to 3 weeks, new features 40% faster, and 50+ shared components across 15+ projects.",
        icon: "devices",
      },
      {
        id: "commercial",
        title: "Translate for the room that pays",
        practice:
          "I can defend a cost decision in the language of the balance sheet, not only in the language of the codebase. Fifteen years of financial governance is what makes that a habit rather than a translation.",
        evidence:
          "A MySQL columnar migration turned a 30s dashboard query into 200ms and cut infrastructure load 70% — reported to leadership as time and storage, not as a benchmark.",
        icon: "verified",
      },
    ],
  },

  blog: {
    id: "blog",
    kicker: "// TECHNICAL BLOG",
    title: "Whitepapers and field notes",
    note: "DATA ENGINEERING AND TECHNICAL LEADERSHIP",
    ctaLabel: "Read all articles",
    limit: 4,
    items: [
      {
        slug: "engineering-delivery-with-ai-agents",
        category: "AI AGENTS",
        readingTimeMinutes: 9,
        title: "What changed in delivery: engineering with AI agents",
        excerpt:
          "The diff stopped being the unit of work and review became the bottleneck. What an engineer now has to master to stay accountable for the outcome.",
        ctaLabel: "READ ESSAY",
        accent: "primary",
      },
      {
        slug: "resilient-agent-swarms-on-kafka",
        category: "DISTRIBUTED SYSTEMS",
        readingTimeMinutes: 8,
        title: "Architecting resilient swarms with Kafka event streams",
        excerpt:
          "Zero-loss event brokers, partition strategies and idempotent consumers when orchestrating distributed AI agent fleets.",
        ctaLabel: "READ ESSAY",
        accent: "primary",
      },
      {
        slug: "rds-to-clickhouse-100m-messages-a-day",
        category: "DATA PLATFORMS",
        readingTimeMinutes: 12,
        title: "From RDS to ClickHouse: 100M messages/day at p99 under 10ms",
        excerpt:
          "How to eliminate concurrency contention in relational databases and move analytics to columnar storage with sub-second queries.",
        ctaLabel: "READ BENCHMARK",
        accent: "secondary",
      },
      {
        slug: "dual-core-leader-accounting-rigor",
        category: "TECHNICAL LEADERSHIP",
        readingTimeMinutes: 6,
        title: "The dual-core leader: why accounting rigor makes better software architects",
        excerpt:
          "How financial discipline converts technical debt into a calculated liability and moves development velocity from cost center to profit engine.",
        ctaLabel: "READ ESSAY",
        accent: "primary",
      },
    ],
  },

  contact: {
    id: "contact",
    kicker: "// CONTACT",
    title: "Let's solve it.",
    narrative:
      "Describe the problem on WhatsApp and we will work it from there. If you would rather write, the brief below is already structured for you.",
    // See the note on the Portuguese pair in `home-pt-br.ts`: new copy, marked for
    // review, and the two locales must keep promising the same thing.
    narrativeWithoutWhatsApp:
      "Describe the problem by email and the brief below is already structured for you, so the reply can pick up the context on its first line.",
    statusNoteWithoutWhatsApp: "EMAIL // RESPONSE WITHIN 1 BUSINESS DAY",
    portalLabel: "// DIRECT CONTACT CHANNEL",
    statusNote: "WHATSAPP OR EMAIL // RESPONSE WITHIN 1 BUSINESS DAY",
    channels: [
      {
        id: "whatsapp",
        label: "WHATSAPP",
        href: toWhatsAppHref(SITE_OWNER.phone),
        value: SITE_OWNER.phone,
        icon: "whatsapp",
        external: true,
      },
      {
        id: "email",
        label: "EMAIL",
        href: "mailto:" + SITE_OWNER.email,
        value: SITE_OWNER.email,
        icon: "mail",
        external: false,
      },
      {
        id: "location",
        label: "BASE",
        href: "https://www.google.com/maps/search/?api=1&query=Fortaleza+CE+Brazil",
        value: "Fortaleza, CE (remote worldwide)",
        icon: "location",
        external: true,
      },
      {
        id: "response",
        label: "RESPONSE",
        href: "mailto:" + SITE_OWNER.email,
        value: "Within 1 business day",
        icon: "verified",
        external: false,
        link: false,
      },
    ],
    whatsapp: {
      ctaLabel: "Message on WhatsApp",
      message: WHATSAPP_MESSAGE,
    },
    brief: {
      ctaLabel: "Open the email brief",
      subject: "Technical conversation — {company}",
      bodyTemplate:
        "Hello Marcelino,\n\nCompany: {company}\nScope: {scope}\n\nGoal for the conversation:\n\nDesired timeline:\n\nThank you!",
    },
  },

  footer: {
    id: "footer",
    kicker: "// CONTACT",
    title: "Architecture, scale and financial return",
    narrative:
      "Available for strategic advisory, principal architecture consulting and fractional leadership in high-volume enterprise systems.",
    columns: [
      {
        id: "direct",
        title: "DIRECT",
        items: [
          {
            id: "session",
            label: "Schedule a conversation",
            href: "#contact",
            value: "Schedule a conversation",
            icon: "calendar",
            external: false,
          },
          {
            id: "whatsapp",
            label: "WhatsApp",
            href: toWhatsAppHref(SITE_OWNER.phone),
            value: SITE_OWNER.phone,
            icon: "whatsapp",
            external: true,
          },
          {
            id: "mail",
            label: "Email",
            href: "mailto:" + SITE_OWNER.email,
            value: SITE_OWNER.email,
            icon: "mail",
            external: false,
          },
          {
            id: "resume",
            label: "Resume PDF",
            href: "/resume",
            value: "Download PDF",
            icon: "download",
            external: false,
          },
        ],
      },
      {
        id: "networks",
        title: "NETWORKS",
        items: [
          {
            id: "github",
            label: "GitHub",
            href: "https://github.com/marcelinosandroni",
            value: "github.com/marcelinosandroni",
            icon: "code",
            external: true,
          },
          {
            id: "linkedin",
            label: "LinkedIn",
            href: "https://linkedin.com/in/marcelinosandroni",
            value: "linkedin.com/in/marcelinosandroni",
            icon: "external",
            external: true,
          },
          {
            id: "blog",
            label: "Technical blog",
            href: "/blog",
            value: "Whitepapers",
            icon: "document",
            external: false,
          },
        ],
      },
    ],
    legalNote: "All rights reserved.",
  },
};
