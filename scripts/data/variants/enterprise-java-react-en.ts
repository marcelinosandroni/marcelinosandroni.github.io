/**
 * The "Enterprise Java + React" variant in English.
 *
 * A translation of `variants/enterprise-java-react-br.ts`; the structure and the dates come from the shell.
 */
import { metrics, summary, type RoleContent, type Variant } from "./shared";
import { JAVA_SUMMARY_BODY } from "./shared-en";

const JAVA_REACT_ROLES: ReadonlyArray<RoleContent> = [
  {
    key: "dgt",
    stack: "Java, Spring Boot, Spring AI, React, Next.js, Micro-frontends, PostgreSQL, Redis, gRPC, K8s, AWS.",
    bullets: [
      [
        "Technical Leadership & AI Integration",
        "Led an 8-person squad restructuring critical systems processing 100M+ messages/day. Corporate AI wired into the backend through Spring AI for real-time agentic flows, protecting a R$ 24M/year contract.",
      ],
      [
        "10x Faster Processing",
        "Migrated a bottlenecked relational architecture to Java microservices, with JVM tuning (ZGC) and low latency over gRPC and RabbitMQ.",
      ],
      [
        "Enterprise Micro-frontends",
        "Complex web interfaces in React and Next.js, with global state management (Zustand), keeping the experience smooth under heavy load.",
      ],
    ],
  },
  {
    key: "bnp-paribas",
    stack: "Java (Spring Boot/Batch), React, Next.js, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
    bullets: [
      [
        "Bank Monolith Modernisation",
        "Technical pillar of a 12-engineer tribe, decoupling legacy systems (COBOL/VB) into event-driven Java microservices with modular React interfaces (95% test coverage).",
      ],
      [
        "D+0 Settlement & Real Time",
        "Replaced D+1 pipelines with real-time fund reconciliation on Apache Kafka and Spring Batch, lifting assets under management by 45% with a 100% uptime SLA.",
      ],
      [
        "Global Cost and Orchestration",
        "Automated institutional ETF orchestration across B3 and international exchanges, with an estimated R$ 50 million in new inflows.",
      ],
    ],
  },
  {
    key: "itau",
    stack: "Java (Spring WebFlux), React, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
    bullets: [
      [
        "Strategic Institutional Custody (+R$ 100 Bn)",
        "Co-led a 15-engineer squad designing and running a B2B platform connected to B3, on cloud-native AWS with reactive Java APIs and React dashboards.",
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
    stack: "Java, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
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
];

export const variant: Variant = {
  slug: "enterprise-java-react",
  label: "Enterprise Java + React",
  title: "Marcelino Sandroni - Java and React Software Engineer",
  headline: "Senior Software Engineer | React + Java + AI",
  inventory: [
    [
      "Frontend & UI Architecture",
      "React, Next.js, TypeScript, JavaScript, HTML5, CSS3, Micro-frontends, State (Zustand, Redux), SSR/SSG, Tailwind CSS, shadcn/ui, Styled Components, Design Systems.",
    ],
    [
      "Backend & Frameworks",
      "Java (8 to 25), Spring Boot 3.x (AOT/GraalVM), Spring Cloud, Spring WebFlux, Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA (N+1), JVM tuning (ZGC/G1GC).",
    ],
    [
      "Artificial Intelligence & Data",
      "Corporate LLMs via Spring AI and LangChain4j, Amazon Bedrock (Claude/Titan), RAG, agentic workflows (function calling), vector databases (pgvector, Milvus).",
    ],
    [
      "Cloud & DevOps",
      "AWS (EKS/ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, CloudWatch), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Bitbucket, Jenkins), observability (OpenTelemetry, Datadog).",
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
      "A software engineer drawing on almost eight years in distributed architectures (Java, Spring, React, Kafka) and fifteen in corporate and financial backgrounds. ",
      JAVA_SUMMARY_BODY,
    ),
    metrics: metrics([
      ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on Kafka and Java."],
      ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (JUnit) and frontend (Cypress)."],
    ]),
  },
  roles: JAVA_REACT_ROLES,
  timeline: [],
};
