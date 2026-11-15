/**
 * The "Enterprise C# + Angular" variant in English.
 *
 * A translation of `variants/enterprise-dotnet-br.ts`; the structure and the dates come from the shell.
 */
import { metrics, summary, type RoleContent, type Variant } from "./shared";
import { DOTNET_SUMMARY_BODY } from "./shared-en";

const DOTNET_ANGULAR_ROLES: ReadonlyArray<RoleContent> = [
  {
    key: "dgt",
    stack: "C#, .NET 9, Angular, Micro-frontends, PostgreSQL, Redis, RabbitMQ, gRPC, K8s, Azure OpenAI, AWS.",
    bullets: [
      [
        "Technical Leadership & AI Integration",
        "Led an 8-person squad restructuring systems processing 100M+ messages/day. AI wired into the backend through Semantic Kernel and Azure OpenAI for real-time agentic flows (R$ 24M/year contract protected).",
      ],
      [
        "10x Faster Processing",
        "Migrated a bottlenecked relational architecture to .NET 9 microservices, with extreme I/O and thread optimisation and low latency over gRPC and RabbitMQ.",
      ],
      [
        "Enterprise Micro-frontends",
        "Complex web interfaces in Angular, with advanced reactive state management (RxJS/NgRx), keeping the experience smooth and lag-free under heavy data load.",
      ],
    ],
  },
  {
    key: "bnp-paribas",
    stack: "C# (.NET 8), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Azure DevOps, Helm.",
    bullets: [
      [
        "Bank Monolith Modernisation",
        "Technical pillar of a 12-engineer tribe, decoupling legacy systems (COBOL/VB) into event-driven C# microservices with modular Angular interfaces (95% test coverage with xUnit).",
      ],
      [
        "D+0 Settlement & Real Time",
        "Replaced D+1 pipelines with real-time fund reconciliation on Apache Kafka and .NET worker services, lifting assets under management by 45% with a 100% uptime SLA.",
      ],
      [
        "Global Cost and Orchestration",
        "Automated institutional ETF orchestration across B3 and international exchanges (US/Europe), with an estimated R$ 50 million in new inflows.",
      ],
    ],
  },
  {
    key: "itau",
    stack: "C# (.NET Core), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS (EKS/SQS), K8s, Terraform.",
    bullets: [
      [
        "Strategic Institutional Custody (+R$ 100 Bn)",
        "Co-led a 15-engineer squad designing a cloud-native B2B platform connected to B3, with ASP.NET Core APIs and Angular dashboards.",
      ],
      [
        "Crisis Management and Resilience",
        "Resolved Kafka concurrency bottlenecks under extreme volatility in under 24 hours, enforcing strict transactional idempotency in event consumption.",
      ],
      [
        "8x Quality Improvement",
        "Technical mentoring and E2E automation in CI/CD, shielding the .NET ecosystem from critical regressions and accelerating the delivery pipeline.",
      ],
    ],
  },
  {
    key: "zup",
    stack: "C#, .NET Core, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
    bullets: [
      [
        "Rapid Progression and Cloud",
        "Promoted from Junior to Full within one year. An agile team of six engineers refactoring C# monoliths into event-driven microservices, and migrated to AWS in half the agreed schedule.",
      ],
      [
        "Transactional Resilience",
        "Rebuilt asynchronous messaging reliability on RabbitMQ with circuit breakers (Polly) and dead-letter queues, reaching 100% data accuracy and failure recovery.",
      ],
    ],
  },
  {
    key: "consultoria",
    stack: null,
    bullets: [
      [
        "Corporate Engineering Edge",
        "Team leadership and process redesign that cut the accounting close by 83%. Deep financial expertise (DDD) translated into software.",
      ],
    ],
  },
];

export const variant: Variant = {
  slug: "enterprise-dotnet",
  label: "Enterprise C# + Angular",
  title: "Marcelino Sandroni - C# and Angular Software Engineer",
  headline: "Senior Software Engineer | C# .NET + Angular + AI",
  inventory: [
    [
      "Frontend & UI Architecture",
      "Angular (8 to 22), TypeScript, JavaScript, HTML5, SASS, Micro-frontends, State/Reactivity (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, Design Systems.",
    ],
    [
      "Backend & Frameworks",
      "C# (.NET Core 3.1 to 9), ASP.NET Core, EF Core, Dapper, gRPC, SignalR, OAuth2/OIDC, JWT, mTLS, BenchmarkDotNet, high-performance async, worker services, minimal APIs.",
    ],
    [
      "Artificial Intelligence & Data",
      "Corporate LLMs via Semantic Kernel and Azure OpenAI, LangChain, Amazon Bedrock, RAG, agentic workflows (function calling), vector databases (pgvector, Milvus).",
    ],
    [
      "Cloud & DevOps",
      "Azure / AWS (AKS/EKS, App Services, Blob, Service Bus, SQS), Docker, Kubernetes (Helm), Terraform, CI/CD (Azure DevOps, GitHub Actions), observability (OpenTelemetry).",
    ],
    [
      "Architecture, APIs & Messaging",
      "REST Level 3, gRPC, WebSockets, Kafka (partitions, idempotency), RabbitMQ (exchanges, DLQ), circuit breakers, clean architecture, DDD, CQRS, SOLID, EDA.",
    ],
    [
      "Analytics Ecosystem & Databases",
      "SQL Server, Oracle, PostgreSQL, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "A software engineer drawing on eight years in distributed architectures (C#, .NET, Angular, Kafka) and fifteen in corporate and financial backgrounds. ",
      DOTNET_SUMMARY_BODY,
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on Kafka and .NET."],
      ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (xUnit) and frontend (Cypress)."],
    ]),
  },
  roles: DOTNET_ANGULAR_ROLES,
  timeline: [],
};
