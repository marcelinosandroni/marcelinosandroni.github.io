import type { HomeContent } from "@/domain/portfolio";

/**
 * Home page content — en-US.
 *
 * Structurally identical to the pt-BR catalog (enforced by the `satisfies
 * HomeContent` contract and by the bilingual content tests), but independently
 * written: it states the same career in the language an international hiring
 * panel actually reads. American spelling throughout, because the audience is
 * US-based recruiters and a British spelling is a tell that the copy was
 * translated rather than written.
 *
 * The same copy rules apply as in pt-BR: no fiction naming, every figure
 * measurable and traceable to the resume, and the career arithmetic stated
 * explicitly.
 */
export const homeContentEnUS: HomeContent = {
  locale: "en-US",

  hero: {
    statusPill: "Available for fractional leadership and consulting",
    name: "Marcelino Sandroni Dias",
    headlineLead: "Software engineering that moves",
    headlineAccent: "revenue and",
    headlineTail: "scale.",
    role: "Senior Software Engineer & Tech Lead",
    narrative:
      "15 years of corporate financial governance (2005–2020) plus 6 years of software engineering (2021–2026): 21 years of combined expertise. Working end to end across architecture, backend, frontend, mobile and DevOps, with measured results of R$ 24 million/year in protected contracts, 100 million messages processed per day and 10x throughput gains.",
    metaDescription:
      "Living resume of Marcelino Sandroni Dias: 21 years of combined expertise across financial governance and software engineering — R$ 24M/year and 100M msgs/day of measured impact.",
    primaryAction: {
      label: "Schedule a conversation",
      href: "#contact",
      icon: "calendar",
    },
    secondaryAction: {
      label: "See the track record",
      href: "#experience",
    },
    availability: "Available for fractional leadership, architecture consulting and mentoring",
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
        id: "email",
        label: "EMAIL",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
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

  blog: {
    id: "blog",
    kicker: "// TECHNICAL WRITING",
    title: "Whitepapers and field notes",
    note: "DATA ENGINEERING AND TECHNICAL LEADERSHIP",
    ctaLabel: "Read all articles",
    limit: 3,
    items: [
      {
        slug: "resilient-agent-swarms-on-kafka",
        category: "DISTRIBUTED SYSTEMS",
        readingTimeMinutes: 8,
        title: "Architecting resilient agent swarms with Kafka event streams",
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
    title: "Let's talk.",
    narrative:
      "Hire an architect who prices the depreciation of your infrastructure before writing the first line of distributed Go, Java or .NET.",
    portalLabel: "// DIRECT CONTACT CHANNEL",
    statusNote: "RESPONSE WITHIN 1 BUSINESS DAY // NO FORM, NO TRACKING",
    channels: [
      {
        id: "email",
        label: "EMAIL",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
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
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "Within 1 business day",
        icon: "verified",
        external: false,
      },
    ],
    brief: {
      ctaLabel: "Open a pre-filled brief",
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
            id: "mail",
            label: "Email",
            href: "mailto:marcelino.sandroni@gmail.com",
            value: "marcelino.sandroni@gmail.com",
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
