/**
 * The "Enterprise Java + Angular" variant in English.
 *
 * A translation of `variants/enterprise-java-br.ts`; the structure and the dates come from the shell.
 */
import { metrics, summary, type Variant } from "./shared";
import { JAVA_SUMMARY_BODY } from "./shared-en";

export const variant: Variant = {
  slug: "enterprise-java",
  label: "Enterprise Java + Angular",
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
  timeline: [],
};
