/**
 * The "Node + AI" variant in English.
 *
 * A translation of `variants/node-ia-br.ts`; the structure and the dates come
 * from the shell.
 */
import { metrics, summary, type Variant } from "./shared";

export const variant: Variant = {
  slug: "node-ia",
  label: "Node + AI",
  title: "Marcelino Sandroni - Node.js and AI Software Engineer",
  headline: "Senior Software Engineer | Node.js + AI",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "React, RSC, Next, SSG, SSR, ISR, Angular, Vue, JavaScript, TypeScript, HTML5, CSS3, Micro-frontends, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Node.js, TypeScript, NestJS, Express, Fastify, Go, Python, Prisma, TypeORM, Jest, Vitest, Supertest, TestContainers.",
    ],
    [
      "AI &amp; Data",
      "LLMs (Anthropic, OpenAI), Vercel AI SDK, LangChain.js, LangGraph, Python, Amazon Bedrock, Azure AI Studio, RAG, Agentic Workflows (Skills, Hooks, Function Calling), MCPs, SDD.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, Lambda, SQS, SNS, S3, RDS), Azure, GCP, Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Prometheus, Datadog, Grafana, Loki.",
    ],
    [
      "Architecture &amp; Messaging",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, BullMQ, Microservices, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Analytical Ecosystem &amp; Databases",
      "PostgreSQL, Oracle, MongoDB, Redis, Cassandra, DynamoDB, CosmosDB, ClickHouse, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus).",
    ],
  ],
  sections: {
    summary: summary(
      "A software engineer drawing on almost eight years in distributed architectures (Node.js, TypeScript, Go, Kafka) and fifteen in corporate and financial backgrounds. ",
      "I work from the conception of cloud-native ecosystems to decoupling critical systems. Focused on building microservices, micro-frontends and corporate AI (agents/RAG), delivering high performance, scalability and resilience for mission-critical systems, under an uncompromising testing and observability culture.",
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on Kafka and Node.js."],
      ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (Jest) and frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Node.js, NestJS, TypeScript, Python, LangChain.js, PostgreSQL, ClickHouse, Redis, gRPC, K8s, AWS.",
      bullets: [
        [
          "Technical Leadership & High Concurrency (Node.js / Go)",
          "Squad leadership restructuring critical ecosystems processing 100M+ messages/day. Application of non-blocking event loops, Go/Node workers, gRPC and CQRS architecture with Redis/PostgreSQL sharding to guarantee ultra-low latency.",
        ],
        [
          "Distributed Resilience & Messaging",
          "Event-driven architecture using Kafka, RabbitMQ and AWS SQS for asynchronous orchestration. Strict implementation of Saga patterns (consistency) and Circuit Breakers, shielding the system against cascading failures and sustaining 100% uptime.",
        ],
        [
          "Corporate AI & Process Automation",
          "Conception of real-time agentic flows integrating Vercel AI SDK, LangChain.js, Python and LLMs (RAG). Automation of critical operations that strangled manual bottlenecks and ensured the preservation of a R$ 24M/year contract.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Node.js (NestJS), TypeScript, Go, Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins.",
      bullets: [
        [
          "Event-Driven Architecture (EDA)",
          "Strangling monoliths (Strangler Fig) into highly decoupled Node.js and Go microservices. Design of an asynchronous mesh to guarantee high availability in critical transactions, with 95% test coverage.",
        ],
        [
          "Messaging & Fault Tolerance (Kafka)",
          "Migration from batch processing (D+1) to streaming (D+0). Heavy engineering in transactional idempotency, retry patterns and DLQs, guaranteeing zero message loss and 100% uptime in reconciliation.",
        ],
        [
          "Distributed Orchestration & Consistency",
          "Automation of integrations (B3/global exchanges) applying Circuit Breakers and Fallbacks. Mitigation of external network instability, guaranteeing consistency and unlocking +R$ 50 million in fundraising.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Node.js (NestJS), TypeScript, Angular, React, PostgreSQL, Redis, Kafka, AWS (EKS, SQS), K8s, Terraform.",
      bullets: [
        [
          "Strategic Institutional Custody (+R$ 100 Bn)",
          "Joint orchestration (15-engineer squad) designing and running a B2B platform connected to B3, on cloud-native AWS architecture with reactive Node.js APIs and Angular dashboards.",
        ],
        [
          "Crisis Management and Resilience",
          "Resolved Kafka concurrency bottlenecks under high volatility in under 24 hours, applying strict transactional idempotency.",
        ],
        [
          "8x Quality Improvement",
          "Technical mentoring and E2E automation (Jest, Cypress and CI/CD), shielding the ecosystem from critical regressions.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Node.js, Express, TypeScript, React, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Rapid Progression and Cloud",
          "Promoted from Junior to Mid-level within one year. An agile team of six developers refactoring monoliths into event-driven Node.js microservices and migrating to AWS in half the agreed schedule.",
        ],
        [
          "Transactional Resilience",
          "Structural remediation in asynchronous messaging (RabbitMQ) via Circuit Breakers and DLQs, ensuring 100% accuracy.",
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
