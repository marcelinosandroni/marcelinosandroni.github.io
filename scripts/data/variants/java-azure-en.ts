/**
 * The "Enterprise Java + Angular (Azure)" variant in English.
 *
 * A translation of `variants/java-azure-br.ts`; the structure and the dates come from the shell.
 */
import { metrics, summary, type Variant } from "./shared";
import { JAVA_SUMMARY_BODY } from "./shared-en";

export const variant: Variant = {
  slug: "java-azure",
  label: "Enterprise Java + Angular (Azure)",
  title: "Marcelino Sandroni - Java and Angular Software Engineer",
  headline: "Senior Software Engineer | Angular + Java + AI",
  inventory: [
    [
      "Frontend & UI Architecture",
      "Angular (8 to 22), TypeScript, JavaScript, HTML5, CSS3, SASS, Micro-frontends, State/Reactivity (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, Design Systems.",
    ],
    [
      "Backend & Frameworks",
      "Java (8 to 25), Spring Boot 3.x (AOT/GraalVM), Spring Cloud, Spring WebFlux, Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA (N+1), JVM tuning (ZGC/G1GC).",
    ],
    [
      "Artificial Intelligence & Data",
      "Corporate LLMs via Spring AI and LangChain4j, Amazon Bedrock (Claude/Titan), Azure AI Studio, RAG, agentic workflows (function calling), vector databases (pgvector, Milvus).",
    ],
    [
      "Cloud & DevOps",
      "Azure (AKS, Service Bus, Event Hubs, Key Vault, Blob Storage), AWS (EKS, S3, RDS, SQS, Lambda), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions), observability (OpenTelemetry, Datadog).",
    ],
    [
      "Architecture, APIs & Messaging",
      "REST Level 3, gRPC, GraphQL, WebSockets, Kafka (partitions, idempotency), RabbitMQ (exchanges, DLQ), circuit breakers, clean, hexagonal, DDD, CQRS, SOLID, EDA, microservices.",
    ],
    [
      "Analytics Ecosystem & Databases",
      "Oracle, PostgreSQL, SQL Server, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "A software engineer drawing on almost eight years in distributed architectures (Java, Spring, Angular, Kafka) and fifteen in corporate and financial backgrounds. ",
      JAVA_SUMMARY_BODY,
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on Kafka and Java."],
      ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (JUnit) and frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack:
        "Java, Spring Boot, Spring AI, Angular, TypeScript, Micro-frontends, PostgreSQL, Redis, gRPC, K8s, Azure.",
      bullets: [
        [
          "Technical Leadership & High Concurrency (Java 21)",
          "Squad leadership restructuring critical ecosystems processing 100M+ messages/day. Application of Virtual Threads (Loom), gRPC and CQRS architecture with Redis/PostgreSQL sharding to guarantee ultra-low latency under massive traffic.",
        ],
        [
          "Distributed Resilience (Azure Ecosystem)",
          "Event-driven architecture using Azure Event Hubs and Service Bus for asynchronous orchestration. Rigorous implementation of Saga patterns (consistency) and Circuit Breakers, shielding the system against cascading failures and sustaining 100% uptime.",
        ],
        [
          "Corporate AI & Process Automation",
          "Conception of real-time agentic flows integrating Spring AI and Azure AI Studio (LLMs/RAG). Automation of critical operations that strangled manual bottlenecks and ensured preservation of a R$ 24M/year contract.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Java (Spring Boot/Batch), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Event-Driven Architecture (EDA)",
          "Strangling monoliths (Strangler Fig) into highly decoupled Java microservices. Design of an asynchronous mesh to guarantee high availability in critical transactions, with 95% test coverage.",
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
      stack: "Java (Spring WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Strategic Institutional Custody (+R$ 100 Bn)",
          "Co-led a 15-engineer squad designing and running a B2B platform connected to B3, on cloud-native AWS with reactive Java APIs and Angular dashboards.",
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
      stack: "Java, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Rapid Progression and Cloud",
          "Promoted from Junior to Full within one year. An agile team of six engineers refactoring Java monoliths onto event-driven architecture, and migrated to AWS in half the agreed schedule.",
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
