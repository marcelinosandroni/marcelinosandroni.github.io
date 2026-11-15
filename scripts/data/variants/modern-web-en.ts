/**
 * The "Modern Node + Go + React" variant in English.
 *
 * A translation of `variants/modern-web-br.ts`; the structure and the dates come from the shell.
 */
import { metrics, summary, type RoleContent, type Variant } from "./shared";
import { MODERN_WEB_SUMMARY_BODY } from "./shared-en";

const MODERN_WEB_ROLES: ReadonlyArray<RoleContent> = [
  {
    key: "dgt",
    stack: "Node.js, React, Next.js, Go, Python, AI, PostgreSQL, ClickHouse, Redis, RabbitMQ, gRPC, Kubernetes, AWS.",
    bullets: [
      [
        "Technical Leadership & High Throughput",
        "Led a squad restructuring systems processing 100M+ messages/day. Migration to ClickHouse and heavy microservices in Go and Node.",
      ],
      [
        "Corporate AI Integration",
        "Implemented real-time agentic flows connecting the backend to LLMs (Python/LangChain), delivering absolute accuracy and protecting a R$ 24M/year contract.",
      ],
      [
        "Enterprise Micro-frontends",
        "Built complex web dashboards in React and Next.js with a micro-frontends architecture, keeping the experience fluid under heavy browser processing load.",
      ],
    ],
  },
  {
    key: "bnp-paribas",
    stack: "Node.js, React, Angular, Go, PostgreSQL, Kafka, OAuth2, Kubernetes, Jenkins, Helm.",
    bullets: [
      [
        "Monolith Modernisation",
        "Technical pillar decoupling legacy banking systems (COBOL/VB) into Node and Go microservices, reaching 95% test coverage.",
      ],
      [
        "D+0 Settlement & Real Time",
        "Replaced D+1 pipelines with real-time fund reconciliation on Kafka, lifting assets under management by 45% with a 100% uptime SLA.",
      ],
      [
        "Global Orchestration",
        "Automated institutional ETF funds, integrating B3 and international exchanges, with an estimated R$ 50 million in operational inflows for the bank.",
      ],
    ],
  },
  {
    key: "itau",
    stack: "Node.js, NestJS, React, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
    bullets: [
      [
        "Strategic Institutional Custody",
        "Full-stack development of a B2B portal focused on UX, pairing a React frontend with reactive, high-availability APIs orchestrated in Node.js.",
      ],
      [
        "Crisis Management and Resilience",
        "Surgical intervention in critical asynchronous messaging flows (Kafka) under heavy traffic, guaranteeing full transactional integrity of assets.",
      ],
      [
        "E2E Automation",
        "Led rigorous automated testing with Cypress, shielding the ecosystem from systemic regressions and accelerating the delivery pipeline.",
      ],
    ],
  },
  {
    key: "zup",
    stack: "Node.js, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
    bullets: [
      [
        "Accelerated Cloud Migration",
        "Promoted to Full within a year. Migrated infrastructure to AWS and refactored Node.js APIs for messaging in half the agreed schedule.",
      ],
      [
        "Transactional Resilience",
        "Structural fix to asynchronous messaging (RabbitMQ) with circuit breakers and DLQs, guaranteeing 100% transactional accuracy and failure recovery.",
      ],
    ],
  },
  {
    key: "consultoria",
    stack: null,
    bullets: [
      [
        "Corporate Engineering Edge",
        "Team leadership and process redesign that cut the accounting close by 83%. Financial expertise translated into high-ROI software.",
      ],
    ],
  },
];

export const variant: Variant = {
  slug: "modern-web",
  label: "Modern Node + Go + React",
  title: "Marcelino Sandroni - Node, Go and React Software Engineer",
  headline: "Senior Software Engineer | Node, React, Go & AI",
  inventory: [
    [
      "Frontend & Mobile",
      "React, Next.js, Angular, React Native, Flutter, Micro-frontends, Tailwind, SSR, Zustand, Redux, Design Systems.",
    ],
    [
      "Backend & Frameworks",
      "Node.js (NestJS, Express), Go, Python, RESTful, gRPC, WebSockets, GraphQL, OAuth2, OIDC, JWT, mTLS.",
    ],
    [
      "Artificial Intelligence & Data",
      "LLM integration (OpenAI, Claude, Gemini), RAG, agentic workflows, LangChain, vector databases (pgvector, Milvus).",
    ],
    [
      "Cloud & DevOps",
      "AWS (EKS, S3, SQS, Lambda), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Jenkins), Datadog.",
    ],
    [
      "Architecture & Messaging",
      "Microservices, clean architecture, DDD, CQRS, SOLID, EDA, Apache Kafka, RabbitMQ, circuit breakers.",
    ],
    [
      "Analytics Ecosystem & Databases",
      "PostgreSQL, MongoDB, Redis, ClickHouse, DynamoDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "A software engineer drawing on almost eight years in modern ecosystems (Node, Go, React, Python) and fifteen in corporate and financial backgrounds. ",
      MODERN_WEB_SUMMARY_BODY,
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["10x", "ETL Performance", "Relational to Go and Node microservices migration."],
      ["100M+ msgs/day", "High Scale", "Event-driven, serverless and fault-tolerant."],
      ["-50% Costs", "FinOps Optimisation", "Auto-scaling and right-sizing in cloud ecosystems (AWS)."],
    ]),
  },
  roles: MODERN_WEB_ROLES,
  timeline: [],
};
