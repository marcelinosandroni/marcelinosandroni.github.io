/**
 * The "Python + AI" variant in English.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, type Variant } from "./shared";

export const variant: Variant = {
  slug: "python-ia",
  label: "Python + AI",
  title: "Marcelino Sandroni - Python and AI Software Engineer",
  headline: "Senior Software Engineer | Python + AI",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "React, RSC, Next, SSG, SSR, ISR, Angular, Vue, Javascript, Typescript, HTML5, CSS3, Microfrontends, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Python (FastAPI, Django, Flask, AsyncIO, Pydantic, SQLAlchemy), Node.js (NestJS, Express, Fastify, Prisma), Go (Gin, Fiber, Goroutines), Pytest, Vitest, Jest, TestContainers.",
    ],
    [
      "AI &amp; Data",
      "LLMs (Anthropic, OpenAI, Llama), LangChain, LangGraph, CrewAI, RAG (Hybrid Search, Reranking), Agentic Workflows (Function Calling, MCPs), Evals, Guardrails, Fine-tuning (LoRA), vLLM, HuggingFace, SDD.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, Bedrock, Lambda, SQS), Azure (AKS, AI Studio, Service Bus), GCP (GKE, Vertex AI), Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Datadog.",
    ],
    [
      "Architecture &amp; Messaging",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Celery, BullMQ, Microservices, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Analytical Ecosystem &amp; Databases",
      "PostgreSQL, Oracle, MongoDB, Redis, ClickHouse, DynamoDB, CosmosDB, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus, Qdrant).",
    ],
  ],
  sections: {
    summary: summary(
      "Senior Software Engineer and AI Engineer combining nearly 8 years in distributed architectures (Python, Node.js, Go, Kafka) with 15 years of corporate and financial background. ",
      "I work from cloud-native conception to decoupling critical systems, high-scale microservices, and AI engineering (Agents, RAG, Evals, MCPs), ensuring low latency, resilience, and financial impact under a strong testing and observability culture.",
    ),
    metrics: metrics([
      ["+R$ 500 Bn", "Asset Management", "B2B custody and fund orchestration platforms."],
      ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s via Kafka, Python, and Go."],
      ["100M+ msgs/day", "High Scale", "Event-driven and fault-tolerant architecture."],
      ["95%", "Test Coverage", "QA and TDD culture in backend (Pytest) and frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Python, FastAPI, Node.js, Go, LangGraph, RAG, PostgreSQL, ClickHouse, Redis, gRPC, K8s, AWS/Azure.",
      bullets: [
        [
          "Technical Leadership &amp; High Throughput (Python / Go)",
          "Squad leadership in restructuring critical systems processing 100M+ msgs/day, applying async Python (FastAPI/AsyncIO), Go workers, gRPC, and CQRS with Redis/ClickHouse for ultra-low latency.",
        ],
        [
          "AI Engineering, Agents &amp; Production RAG",
          "Architecture of agentic pipelines and hybrid RAG (LangGraph, pgvector, reranking, guardrails, and evals) integrated with Bedrock and Azure AI Studio, automating critical workflows and preserving a R$ 24M/year contract.",
        ],
        [
          "Distributed Resilience &amp; Messaging",
          "Event-driven asynchronous orchestration with Kafka, RabbitMQ, and Azure Service Bus/Event Hubs, applying Saga patterns, Circuit Breakers, and DLQs to sustain 100% uptime without cascading failures.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Python, Node.js (NestJS), Go, Angular, Oracle SQL, PostgreSQL, Kafka, OAuth2, K8s, Jenkins, Helm, GCP.",
      bullets: [
        [
          "Monolith Modernization &amp; EDA",
          "Strangling legacy monoliths (Strangler Fig) into Python, Node.js, and Go microservices with Clean Architecture and DDD, reaching 95% test coverage with Pytest and Jest.",
        ],
        [
          "D+0 Settlement &amp; Streaming (Kafka)",
          "Migration from batch pipelines (D+1) to real-time streaming (D+0) via Kafka, applying transactional idempotency, retry patterns, and DLQs for zero message loss and 100% uptime.",
        ],
        [
          "Global Integrations &amp; Fundraising (+R$ 50M)",
          "Automation of financial integrations with B3 and global exchanges applying Circuit Breakers and Fallbacks, mitigating external instabilities and unlocking +R$ 50 Million in fundraising.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Python (FastAPI), Node.js, Go, Angular, PostgreSQL, Redis, Kafka, AWS (EKS, SQS), K8s, Terraform.",
      bullets: [
        [
          "Strategic Institutional Custody (+R$ 100 Bn)",
          "Worked in a 15-engineer squad designing and maintaining a B2B platform connected to B3, featuring cloud-native AWS architecture, high-availability Python/Node.js APIs, and Angular dashboards.",
        ],
        [
          "Crisis Management &amp; Concurrency",
          "Resolved Kafka concurrency bottlenecks under high volatility in under 24h, applying strict transactional idempotency policies and distributed locking in Redis.",
        ],
        [
          "Quality &amp; E2E Automation",
          "Technical mentorship and test automation (Pytest, Jest, TestContainers, and Cypress) integrated into CI/CD, shielding the ecosystem against critical regressions.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Python, Node.js, Go, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, GCP, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Rapid Progression &amp; Cloud Migration",
          "Promoted from Junior to Mid-level in 1 year. Agile team refactoring monoliths into event-driven microservices in Python, Node.js, and Go with cloud migration completed in half the estimated time.",
        ],
        [
          "Transactional Resilience",
          "Structural remediation in asynchronous messaging (RabbitMQ) via Circuit Breakers and DLQs, ensuring 100% processing accuracy.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Engineering &amp; Data Differentiator",
          "Team leadership and process automation with Python and SQL that reduced accounting close time by 83%, translating complex financial and tax rules into software.",
        ],
      ],
    },
  ],
  timeline: [],
};