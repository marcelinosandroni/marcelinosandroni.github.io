/**
 * The "C# + IA" variant in English.
 *
 * A translation of `variants/csharp-ia-br.ts`; the structure and the dates come
 * from the shell.
 */
import { metrics, summary, type Variant } from "./shared";
import { JAVA_SUMMARY_BODY } from "./shared-en";

export const variant: Variant = {
  slug: "csharp-ia",
  label: "C# + AI",
  title: "Marcelino Sandroni - C# and AI Software Engineer",
  headline: "Senior Software Engineer | C# + AI",
  inventory: [
    [
      "Frontend & UI Architecture",
      "Angular, React, RSC, Next, SSG, SSR, ISR, Vue, JavaScript, TypeScript, HTML5, CSS3, Micro-frontends, Design Systems.",
    ],
    [
      "Backend & Frameworks",
      "C# (.NET 8/9, ASP.NET Core, EF Core, Dapper), Java (Spring Boot), Go, NodeJS, gRPC, REST, GraphQL, TestContainers, xUnit.",
    ],
    [
      "AI & Data",
      "LLMs (Anthropic, OpenAI), Semantic Kernel, LangChain, LangGraph, Python, Azure AI Studio, Amazon Bedrock, RAG, Agentic Workflows (Skills, Hooks, Function Calling), MCPs, SDD.",
    ],
    [
      "Cloud & DevOps",
      "Azure (AKS, Service Bus, Event Hubs, CosmosDB, Key Vault), AWS, GCP, Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Datadog, Grafana.",
    ],
    [
      "Architecture & Messaging",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Microservices, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Analytics Ecosystem & Databases",
      "SQL Server, PostgreSQL, Oracle, MongoDB, Redis, Cassandra, DynamoDB, CosmosDB, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus).",
    ],
  ],
  sections: {
    summary: summary(
      "A software engineer drawing on almost eight years in distributed architectures (C#/.NET, Java, Kafka, Azure) and fifteen in corporate and financial backgrounds. ",
      JAVA_SUMMARY_BODY,
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on messaging and .NET."],
      ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (xUnit) and frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "C#, Semantic Kernel, Angular, TypeScript, Micro-frontends, PostgreSQL, Redis, gRPC, K8s, Azure.",
      bullets: [
        [
          "Technical Leadership & High Concurrency (.NET / Go)",
          "Squad leadership restructuring critical ecosystems processing 100M+ messages/day. High-performance .NET, gRPC and CQRS architecture with Redis/PostgreSQL sharding to guarantee ultra-low latency under massive traffic.",
        ],
        [
          "Distributed Resilience (Azure Ecosystem)",
          "Event-driven architecture using Azure Event Hubs and Service Bus for asynchronous orchestration. Rigorous implementation of Saga patterns (consistency) and Circuit Breakers, shielding the system against cascading failures and sustaining 100% uptime.",
        ],
        [
          "Corporate AI & Process Automation",
          "Conception of real-time agentic flows integrating Semantic Kernel, Python and Azure AI Studio (LLMs/RAG). Automation of critical operations that strangled manual bottlenecks and ensured preservation of a R$ 24M/year contract.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "C#, Java, Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Event-Driven Architecture (EDA)",
          "Strangling monoliths (Strangler Fig) into highly decoupled .NET and Java microservices. Design of an asynchronous mesh to guarantee high availability in critical transactions, with 95% test coverage.",
        ],
        [
          "Messaging & Fault Tolerance (Kafka)",
          "Migration from batch processing (D+1) to streaming (D+0). Heavy engineering in transactional idempotency, retry patterns and DLQs, guaranteeing zero message loss and 100% uptime in reconciliation.",
        ],
        [
          "Distributed Orchestration & Consistency",
          "Automation of integrations (B3/global exchanges) applying Circuit Breakers and Fallbacks. Mitigation of external network instability, guaranteeing consistency and unlocking +R$ 50 million in inflows.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "C# (.NET), Java (Spring WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Strategic Institutional Custody (+R$ 100 Bn)",
          "Co-led a 15-engineer squad designing and running a B2B platform connected to B3, on cloud-native AWS with .NET Core/Java APIs and Angular dashboards.",
        ],
        [
          "Crisis Management and Resilience",
          "Resolved Kafka concurrency bottlenecks under heavy volatility in under 24 hours, enforcing strict transactional idempotency.",
        ],
        [
          "8x Quality Improvement",
          "Technical mentoring and E2E automation (CI/CD), shielding the ecosystem from critical regressions.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "C# (.NET), Go, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Rapid Progression and Cloud",
          "Promoted from Junior to Full within one year. An agile team of six engineers refactoring C# monoliths onto event-driven architecture, and migrated to AWS in half the agreed schedule.",
        ],
        [
          "Transactional Resilience",
          "Rebuilt asynchronous messaging reliability on RabbitMQ with circuit breakers and dead-letter queues, reaching 100% data accuracy.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Corporate Engineering Edge",
          "Team leadership and process redesign that cut the accounting close by 83%. Deep expertise in finance and tax rules, translated directly into software teams.",
        ],
      ],
    },
  ],
  timeline: [],
};
