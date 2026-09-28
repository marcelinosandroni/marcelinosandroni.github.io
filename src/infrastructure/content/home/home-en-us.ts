import type { HomeContent } from "@/domain/portfolio";

/**
 * Home page content — en-US.
 *
 * Structurally identical to the pt-BR catalog (enforced by the `satisfies
 * HomeContent` contract and by the bilingual content tests), but independently
 * written: it states the same career in the language an international hiring
 * panel actually reads.
 */
export const homeContentEnUS: HomeContent = {
  locale: "en-US",

  hero: {
    statusPill: "Executive Engineering // AnimateMatrix Spec v6.0",
    name: "Marcelino Sandroni Dias",
    headlineLead: "Engineering the future of",
    headlineAccent: "AI & financial",
    headlineTail: "systems.",
    role: "Senior Software Engineer & Tech Lead",
    narrative:
      "21 years connecting corporate financial governance, high-volume AI pipelines and ultra-high-concurrency fintech architectures. A proven record of protecting millions in mission-critical public-safety and banking contracts — and of turning every technical decision into auditable financial return.",
    metaDescription:
      "Living resume of Marcelino Sandroni Dias: 15 years across financial governance, AI pipelines and high-concurrency fintech — R$ 24M/year and 100M msgs/day of measured impact.",
    primaryAction: {
      label: "Schedule an executive call",
      href: "#contact",
      icon: "calendar",
    },
    secondaryAction: {
      label: "Explore the trajectory",
      href: "#experience",
    },
    availability: "Available for fractional leadership, architecture consulting and technical advisory",
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
        label: "DIRECT EMAIL",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
        icon: "mail",
        external: false,
      },
    ],
    portrait: {
      src: "/portrait.jpg",
      alt: "Portrait of Marcelino Sandroni Dias, Tech Lead and Software Architect",
      cornerMarks: ["// SEC_ID: NEO-001", "[SYS_OK]", "// CIPHER: HEX-256", "LATENCY < 0.1ms"],
      badge: "ZERO FALSE POSITIVE",
      caption: "NEO // TECH ARCHITECT",
      captionMeta: "Distributed Cores · SOX · GenAI",
      ticker: ["UPLINK: ACTIVE // 100M MSGS/DAY", "100% SLA COMPLIANT"],
    },
  },

  kpis: {
    id: "kpis",
    kicker: "// HARD METRICS & FISCAL IMPACT",
    title: "Engineering rigor measured in capital and speed",
    note: "Zero vanity metrics. Auditable balance-sheet returns, zero-downtime architectures and deep compliance stewardship.",
    items: [
      {
        id: "finance",
        label: "FINANCIAL SOVEREIGNTY",
        value: "15 Yrs",
        scale: "monumental",
        description:
          "Corporate accounting and strategy foundation. IFRS, SOX controls and tax governance translated directly into zero-deficit software architectures.",
        icon: "account",
        accent: "primary",
        footnote: { label: "CLOSING CYCLE", value: "-83% COMPRESSION" },
      },
      {
        id: "throughput",
        label: "HIGH-THROUGHPUT BACKEND",
        value: "100M+",
        scale: "monumental",
        description:
          "Daily telemetry messages processed through distributed Go pipelines, Apache Kafka partitioning, ClickHouse analytics and sub-10ms p99 edge latency.",
        icon: "bolt",
        accent: "secondary",
        footnote: { label: "PROTECTED REVENUE", value: "R$ 24M/YEAR" },
      },
      {
        id: "product",
        label: "DESIGN SYSTEM & UX",
        value: "Pixel-perfect",
        scale: "headline",
        description:
          "Flawless frontend systems and microfrontends built with Next.js, React, Tailwind and Flutter. Zero regressions, AA accessibility and instant load times.",
        icon: "brush",
        accent: "primary",
        footnote: { label: "REUSABILITY", value: "+40% SPRINT VELOCITY" },
      },
      {
        id: "ai",
        label: "AI & COGNITIVE SWARMS",
        value: "Applied AI",
        scale: "headline",
        description:
          "Autonomous agents, enterprise RAG workflows, pgvector similarity clustering and TensorRT-optimised models for real-time video stream inference.",
        icon: "brain",
        accent: "secondary",
        footnote: { label: "MODEL RECALL", value: "100% RATE" },
      },
    ],
  },

  stack: {
    id: "arsenal",
    kicker: "// TECHNICAL ARSENAL",
    title: "Purpose-built for scale, resiliency and speed",
    note: "No dogmatic attachments. Every language, database and broker is chosen strictly to resolve high-concurrency bottlenecks and enforce business stability.",
    clusters: [
      {
        id: "frontend",
        title: "Frontend Engineering & Design Systems",
        description:
          "Enterprise microfrontends, accessible component libraries, state management and high-frequency real-time updates.",
        icon: "devices",
        accent: "primary",
        items: [
          "React",
          "Next.js (SSR/RSC)",
          "Angular",
          "React Native",
          "Flutter",
          "Tailwind CSS",
          "Module Federation",
          "Design Systems",
        ],
      },
      {
        id: "backend",
        title: "Backend & Distributed Architecture",
        description:
          "Domain-Driven Design, Hexagonal Architecture, CQRS, the transactional outbox pattern and high-volume partition routing.",
        icon: "server",
        accent: "secondary",
        items: [
          "Go (Golang)",
          "Node.js (NestJS)",
          "C# .NET Core",
          "Java (Spring Boot)",
          "Python",
          "Apache Kafka",
          "ClickHouse",
          "PostgreSQL",
        ],
      },
      {
        id: "platform",
        title: "DevOps, Cloud & Site Reliability",
        description:
          "Infrastructure as code, immutable deployments, automated canary rollouts, distributed telemetry and zero-trust policies.",
        icon: "cloud",
        accent: "primary",
        items: [
          "Kubernetes (K8s)",
          "Docker",
          "Terraform (IaC)",
          "AWS Cloud",
          "Azure",
          "GCP",
          "OpenTelemetry",
          "Datadog",
        ],
      },
      {
        id: "intelligence",
        title: "AI, Multi-Agent Swarms & Inference",
        description:
          "Production GenAI integration, low-latency video analytics, contextual embeddings and automated dev-team copilots.",
        icon: "cpu",
        accent: "secondary",
        items: [
          "LLM (GPT/Claude)",
          "pgvector & Qdrant",
          "RAG Pipelines",
          "TensorRT Edge",
          "LangChain",
          "Autonomous Swarms",
          "Playwright AI QA",
        ],
      },
    ],
  },

  trackRecord: {
    id: "experience",
    kicker: "// CAREER VELOCITY",
    title: "Track Record: Mission-Critical Experience",
    note: "PUNCHY SCANNABLE DATA // ZERO FLUFF",
    ctaLabel: "Open the full resume",
    resumeCtaLabel: "FULL RESUME",
    currentCompany: "DGT Tecnologia",
    annotations: [
      {
        company: "DGT Tecnologia",
        impact: { label: "IMPACT", value: "R$ 24M/YEAR SAVED", accent: "primary" },
        blueprintLabel: "// STACK BLUEPRINT",
        blueprint: ["Go", "ClickHouse", "Kafka", "TensorRT", "Kubernetes", "Playwright"],
        teamLine: "TEAM LEADERSHIP: 10 ENGINEERS (DEVS, QA, BA, PO, PM)",
      },
      {
        company: "Antlia",
        impact: { label: "IMPACT", value: "+45% ASSETS UNDER MGMT", accent: "secondary" },
        blueprintLabel: "// STACK BLUEPRINT",
        blueprint: [
          "Java Spring Boot",
          "Kafka",
          "Angular MFE",
          "Hexagonal Arch",
          "Kubernetes",
        ],
        teamLine: "TEAM LEADERSHIP: 8 DEVS (3 PRINCIPAL/SENIOR), PO, QA, 2 BAs",
      },
      {
        company: "Banco Itaú",
        impact: { label: "SCALE", value: "+R$ 100B UNDER CUSTODY", accent: "primary" },
        blueprintLabel: "// STACK BLUEPRINT",
        blueprint: ["C# .NET", "Flutter", "Angular", "AWS", "Kafka"],
        teamLine: "COHORT: 9-ENGINEER MULTI-DISCIPLINE SQUAD",
      },
      {
        company: "Pollux Technologies",
        impact: { label: "CLOUD SAVINGS", value: "-50% INFRA COSTS", accent: "secondary" },
        blueprintLabel: "// STACK BLUEPRINT",
        blueprint: ["Node.js", "TypeScript", "AWS Serverless", "React"],
        teamLine: "METRIC: 80% OF PROJECTS DELIVERED AHEAD OF SCHEDULE",
      },
      {
        company: "Accounting Consulting Firms",
        impact: { label: "MONTH-END", value: "30 DAYS → 5 DAYS (-83%)", accent: "primary" },
        blueprintLabel: "// CORE DISCIPLINES",
        blueprint: ["IFRS / SOX", "Tax Planning", "ERP Integration", "Auditing"],
        teamLine: "QUALIFICATION: BSc in Accounting (Estácio)",
      },
    ],
  },

  blog: {
    id: "blog",
    kicker: "// INTELLECTUAL CAPITAL",
    title: "Selected architectural whitepapers",
    note: "ENGINEERING & FISCAL STRATEGY",
    ctaLabel: "Read all articles",
    limit: 3,
    items: [
      {
        slug: "resilient-agent-swarms-on-kafka",
        category: "DISTRIBUTED SYSTEMS",
        readingTimeMinutes: 8,
        title: "Architecting resilient swarms with Kafka event streams",
        excerpt:
          "Designing zero-loss event brokers, partition strategies and idempotent consumers when orchestrating distributed AI agent fleets.",
        ctaLabel: "READ ESSAY",
        accent: "primary",
      },
      {
        slug: "rds-to-clickhouse-100m-messages-a-day",
        category: "HIGH-THROUGHPUT OLAP",
        readingTimeMinutes: 12,
        title: "From RDS to ClickHouse: 100M messages/day at p99 under 10ms",
        excerpt:
          "A deep-dive benchmark into eliminating lock contention in relational databases and moving to columnar storage for sub-second telemetry lookups.",
        ctaLabel: "READ BENCHMARK",
        accent: "secondary",
      },
      {
        slug: "dual-core-leader-accounting-rigor",
        category: "TECH EXECUTIVE",
        readingTimeMinutes: 6,
        title: "The dual-core leader: why accounting rigor makes better software architects",
        excerpt:
          "How financial discipline converts technical debt into calculated liabilities and shifts development velocity from cost centre to profit engine.",
        ctaLabel: "READ ESSAY",
        accent: "primary",
      },
    ],
  },

  contact: {
    id: "contact",
    kicker: "// INITIATE ENGAGEMENT",
    title: "Let's talk.",
    narrative:
      "Retain an architect who can calculate the financial depreciation of your cloud infrastructure before writing a single line of distributed Go or Java.",
    portalLabel: "// EXECUTIVE ACCESS PORTAL",
    statusNote: "STATUS: ALL SYSTEMS NOMINAL // ZERO TRUST // SUB-MS CONSENSUS",
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
        value: "Fortaleza, CE (Remote global / available for key onsite summits)",
        icon: "location",
        external: true,
      },
      {
        id: "response",
        label: "RESPONSE TIME",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "Within 1 business day",
        icon: "verified",
        external: false,
      },
    ],
    brief: {
      ctaLabel: "Open a pre-filled brief",
      subject: "Executive conversation — {company}",
      bodyTemplate:
        "Hello Marcelino,\n\nContext: {company}\nScope: {scope}\n\nGoal for the conversation:\n\nDesired timeline:\n\nThank you!",
    },
  },

  footer: {
    id: "footer",
    kicker: "// CONTACT GATEWAY",
    title: "Let's talk architecture, scale & ROI",
    narrative:
      "Available for strategic advisory, principal architecture consulting and selective fractional leadership roles in high-throughput enterprise systems.",
    columns: [
      {
        id: "direct",
        title: "DIRECT CHANNELS",
        items: [
          {
            id: "session",
            label: "Book an executive session",
            href: "#contact",
            value: "Book session",
            icon: "calendar",
            external: false,
          },
          {
            id: "mail",
            label: "Direct email",
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
            label: "GitHub profile",
            href: "https://github.com/marcelinosandroni",
            value: "github.com/marcelinosandroni",
            icon: "code",
            external: true,
          },
          {
            id: "linkedin",
            label: "LinkedIn profile",
            href: "https://linkedin.com/in/marcelinosandroni",
            value: "linkedin.com/in/marcelinosandroni",
            icon: "external",
            external: true,
          },
          {
            id: "blog",
            label: "Engineering blog",
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
