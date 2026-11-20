/**
 * The "Java + AI" variant in English.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, type Variant } from "./shared";

export const variant: Variant = {
  slug: "java-ia",
  label: "Java + AI",
  title: "Marcelino Sandroni - Java and AI Software Engineer",
  headline: "Senior Software Engineer | Java + AI",
  inventory: [
    [
      "Backend &amp; Frameworks",
      "Java, Virtual Threads, Kotlin, Spring (Boot, MVC, Cloud, WebFlux, Batch, Security, Data), Quarkus, Hibernate/JPA, MapStruct, Go, Node, JUnit 5, Mockito, WireMock, Resilience4j, TestContainers.",
    ],
    [
      "AI &amp; Data",
      "LLMs (Anthropic, OpenAI), Spring AI, LangChain4j, Python, LangChain, LangGraph, Bedrock, Azure AI, RAG (Hybrid Search, Reranking), Embeddings, Structured Outputs, Function Calling, MCPs, Multi-Agent, Guardrails, Evals, Semantic Caching, AI Gateway, FinOps (Token Optimization), AI Governance.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, ECS, S3, SQS, Lambda), Azure (AKS, Service Bus), GCP, Docker, Kubernetes, Helm, Terraform, ArgoCD, Vault, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Prometheus, Grafana, Datadog.",
    ],
    [
      "Architecture &amp; Messaging",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Microservices, Clean, Hexagonal, Inbox/Outbox, Circuit Breakers, Saga, DDD, CQRS, SOLID, OAuth2, OIDC, JWT, mTLS.",
    ],
    [
      "Databases &amp; Data",
      "PostgreSQL (pgvector), Oracle, SQL Server, MySQL, MongoDB, Redis, Elasticsearch, ClickHouse, Cassandra, DynamoDB, CosmosDB, Neo4j, Snowflake, Databricks, BigQuery, ETL/ELT, OpenSearch",
    ],
    [
      "Frontend &amp; UI Architecture",
      "React, RSC, Next, SSG/SSR/ISR, Angular, Vue, React Native, Flutter, JS, Typescript, HTML5, CSS3, Tailwind, RxJS, NgRx, Zustand, TanStack Query, Microfrontends, Design Systems, Playwright.",
    ],
  ],

  sections: {
    summary: summary(
      "Senior Software Engineer combining 8 years in end-to-end engineering (Java, Spring, Kafka, Cloud) with 15 years of corporate and financial background. ",
      "With strong experience in banks and fintechs, I translate market and business vision into software across the full lifecycle — from discovery to cloud deployment — decoupling legacy systems into distributed microservices, enterprise AI (Agents, RAG, Spring AI), and web/mobile apps with high scale, resilience, governance, compliance, testing, and observability.",
    ),
    metrics: metrics([
      ["+BRL 500B", "Custody & Settlement", "Global B2B platforms boosting fundraising and returns by +28%."],
      ["100M+ msgs/day", "Scale & Availability", "Real-time mission-critical systems with a strict 99.99% SLA."],
      ["BRL 100M/year", "AI & New Contracts", "New contracts via Autonomous Agents, GraphRAG, and Evals."],
      ["99%", "Quality & Reliability", "True business rule validation beyond the metric."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Java 21+, Spring Boot, Spring AI, LangChain4j, Angular, TypeScript, PostgreSQL, Redis, gRPC, K8s, Azure.",
      bullets: [
        [
          "Technical Leadership, Discovery & High Concurrency (Java 21+)",
          "End-to-end leadership — from stakeholder refinement to architecture — in restructuring mission-critical systems handling 100M+ messages/day, applying Virtual Threads, gRPC, and CQRS with Redis/PostgreSQL sharding for ultra-low latency.",
        ],
        [
          "Distributed Resilience & 99.99% SLA (Azure)",
          "Event-driven architecture with Azure Event Hubs and Service Bus for asynchronous orchestration, applying Saga, Inbox/Outbox, and Circuit Breaker patterns to prevent cascading failures and sustain a 99.99% SLA.",
        ],
        [
          "Advanced AI Engineering & Revenue (BRL 100M/year)",
          "Architecture of Multi-Agent ecosystems, GraphRAG, MCPs, and Evals using Spring AI, LangChain4j, and Azure AI Studio (Structured Outputs, Guardrails, and Semantic Caching), automating critical workflows and enabling BRL 100M/year in new contracts.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Java (Spring Boot/Batch), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2/OIDC, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Legacy Modernization, DDD & Quality (99%)",
          "Monolith modernization (Strangler Fig) into decoupled Java microservices using Clean Architecture and DDD, achieving 99% test coverage with rigorous validation of financial rules and edge cases.",
        ],
        [
          "Real-Time Settlement & Fault Tolerance (Kafka)",
          "Migration of batch pipelines to real-time streaming via Kafka, applying transactional idempotency, retry patterns, and DLQs to ensure zero message loss and maximum reconciliation availability.",
        ],
        [
          "Global Integrations & Growth (+28% Fundraising)",
          "Resilient orchestration of integrations with B3 and global stock exchanges applying Circuit Breakers and Fallbacks, neutralizing external network instabilities and increasing fundraising and returns by +28% (+BRL 75 Million).",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Java (Spring WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Strategic Institutional Custody (+BRL 500B)",
          "End-to-end execution within a 15-engineer squad architecting and scaling a B2B platform connected to B3, featuring cloud-native infrastructure on AWS, reactive Java APIs (WebFlux), and Angular dashboards.",
        ],
        [
          "Crisis Resolution & Distributed Concurrency",
          "Diagnosis and resolution of severe Kafka concurrency bottlenecks under high market volatility in under 24 hours, applying strict transactional idempotency policies and distributed locking in Redis.",
        ],
        [
          "Quality Engineering & E2E Automation",
          "Mentoring and automation of contract, integration, and E2E testing in CI/CD (JUnit 5, TestContainers, Cypress), safeguarding critical business rules against regressions.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Java, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Accelerated Growth & Cloud Migration",
          "Promoted from Junior to Mid-level in 1 year. Refactoring Java monoliths into event-driven architectures and delivering AWS migration in half projected timeline.",
        ],
        [
          "Transactional Resilience & Messaging",
          "Structural remediation of asynchronous messaging (RabbitMQ) via Circuit Breakers, retries, and DLQs, ensuring 100% processing accuracy.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Financial Management & Domain Engineering",
          "83% reduction in monthly closing time via Python/SQL and BRL 1.2M/year in cost savings, translating SOX and IFRS/CPC rules into software systems and DDD modeling.",
        ],
      ],
    },
  ],
  timeline: [],
};
