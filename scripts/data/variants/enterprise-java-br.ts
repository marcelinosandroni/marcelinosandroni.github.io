/**
 * The "Enterprise Java + Angular" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "enterprise-java",
  label: "Enterprise Java + Angular",
  title: "Marcelino Sandroni - Engenheiro Java e Angular",
  headline: "Engenheiro de Software Sênior | Angular + Java + AI",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "Angular (8 ao 22), React (16 ao 19), Next, TypeScript, JavaScript, HTML5, CSS3, SASS, Micro-frontends, Estado/Reatividade, SSR, Tailwind CSS, Angular Material, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Java (8 ao 25), Spring Boot 3.x, Spring Cloud, Spring WebFlux, Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA, Quarkus, Go, NodeJS (NestJS, Express).",
    ],
    [
      "Inteligência Artificial &amp; Dados",
      "LLMs corporativos via Spring AI e LangChain4j, Python, LangChain/LangGraph, Amazon Bedrock, Azure AI Studio, RAG, Agentic Workflows (Function Calling), Vector DBs (pgvector, Milvus).",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS/ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, CloudWatch), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Bitbucket, Jenkins), Observabilidade (OpenTelemetry, Datadog).",
    ],
    [
      "Arquitetura, APIs &amp; Mensageria",
      "REST Nível 3, gRPC, GraphQL, WebSockets, Kafka (partições, idempotência), RabbitMQ (exchanges, DLQ), Circuit Breakers, Saga, Clean, Hexagonal, DDD, CQRS, SOLID, EDA, Microsserviços.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "Oracle, PostgreSQL, SQL Server, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, CosmosDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "Engenheiro de Software unindo quase 8 anos em arquiteturas distribuídas (Java, Spring, Angular, Kafka) a 15 anos de background corporativo e financeiro. ",
      "Atuo da concepção de ecossistemas cloud-native do zero ao desacoplamento de sistemas críticos. Foco na construção de microsserviços, micro-frontends e IA corporativa (Agentes/RAG), garantindo alta performance, escalabilidade e resiliência para sistemas de missão crítica, sob extrema cultura de testes e observabilidade.",
    ),
    metrics: metrics([
      ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
      ["D+0", "Liquidação Real-Time", "De 24h (D+1) para menos de 1s, via Kafka e Java."],
      ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, tolerante a falhas."],
      ["95%", "Cobertura de Testes", "Cultura de QA e TDD em backend (JUnit) e frontend (Cypress)."],
    ]),
  },
  timeline: TIMELINE,
};
