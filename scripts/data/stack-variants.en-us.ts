/**
 * The English stack variants.
 *
 * ## Why this is a parallel module rather than a translation of the Portuguese one
 *
 * Because a translation rule set is a second answer to "what does this say", and the
 * two drift. The Portuguese variants are the source of truth; these are the same
 * variants written in English, and the build swaps them into the shell exactly as it
 * swaps the Portuguese ones in. The English document is therefore only ever as current
 * as the data here, and the swap asserts every section it replaces.
 *
 * ## What each variant carries
 *
 * The headline, the summary, the four metrics, the inventory and — for the four that
 * argue a different experience — the stack lines and bullets. Everything else is
 * inherited from the shell, which the shared translation rules turn into English.
 *
 * ## Why `enterprise-java` declares no roles
 *
 * It is the one variant whose experience is the shared one, exactly as in Portuguese.
 * Declaring roles for it would be a second copy of the same sentences, and the moment
 * the shared experience changed, one of the two copies would be wrong with nothing to
 * say so. The other four declare their own because they argue for a different stack.
 */
import type { RoleContent } from "./variant-roles";
import type { Variant } from "./stack-variants.pt-br";

const summary = (lead: string, body: string): string => `
            <p class="text-[12.5px] leading-relaxed text-slate-700 text-justify" data-rule="resumo">
                <strong>${lead}</strong>${body}</p>`;

const metrics = (cards: ReadonlyArray<readonly [string, string, string]>): string => `
            <div class="grid grid-cols-4 gap-3 text-center">
${cards
  .map(
    ([value, label, caption]) => `
                <div class="bg-white border border-slate-200 rounded p-2 flex flex-col justify-start items-center shadow-sm">
                    <div class="font-black text-slate-800 text-[16px] leading-none mb-1.5" data-rule="metrica-valor">${value}</div>
                    <div class="text-[9px] text-emerald-700 uppercase font-black tracking-wide leading-tight mb-1" data-rule="metrica-destaque">${label}</div>
                    <div class="text-[9px] text-slate-500 font-medium leading-tight" data-rule="metrica-descricao">${caption}</div>
                </div>`,
  )
  .join("\n")}
            </div>`;

/** The four Java and C# variants share a summary body; only the lead's stack differs. */
const JAVA_SUMMARY_BODY =
  "I work from greenfield cloud-native ecosystems through to decoupling critical systems, building microservices, micro-frontends and corporate AI (agents/RAG) — high performance, scalability and resilience for mission-critical systems, under an uncompromising testing and observability culture.";

const DOTNET_SUMMARY_BODY =
  "I work from greenfield cloud-native ecosystems through to decoupling critical systems, building microservices, micro-frontends and corporate AI (Semantic Kernel/RAG) — performance, scalability and resilience for mission-critical systems, under an uncompromising observability and test automation culture.";

const MODERN_WEB_SUMMARY_BODY =
  "I work from cloud-native greenfield systems through to decoupling critical systems, focused on high-scale microservices, micro-frontends and corporate AI (agents/RAG) — delivering performance, scalability and resilience for mission-critical applications under an uncompromising testing culture.";

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

const DOTNET_REACT_ROLES: ReadonlyArray<RoleContent> = [
  {
    key: "dgt",
    stack: "C#, .NET 9, React, Next.js, Micro-frontends, PostgreSQL, Redis, RabbitMQ, gRPC, Azure OpenAI, AWS.",
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
        "Complex web interfaces in React and Next.js, with optimised global state management (Zustand), keeping the experience smooth and lag-free under heavy data load.",
      ],
    ],
  },
  {
    key: "bnp-paribas",
    stack: "C# (.NET 8), React, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Azure DevOps, Helm.",
    bullets: [
      [
        "Bank Monolith Modernisation",
        "Technical pillar of a 12-engineer tribe, decoupling legacy systems (COBOL/VB) into event-driven C# microservices with modular React interfaces (95% test coverage with xUnit).",
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
    stack: "C# (.NET Core), React, TypeScript, PostgreSQL, Redis, Kafka, AWS (EKS/SQS), K8s, Terraform.",
    bullets: [
      [
        "Strategic Institutional Custody (+R$ 100 Bn)",
        "Co-led a 15-engineer squad designing a cloud-native B2B platform connected to B3, with ASP.NET Core APIs and React dashboards.",
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
    stack: "C#, .NET Core, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
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

export const VARIANTS_EN: ReadonlyArray<Variant> = [
  {
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
  },

  {
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
  },

  {
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
  },

  {
    slug: "enterprise-dotnet-react",
    label: "Enterprise C# + React",
    title: "Marcelino Sandroni - C# and React Software Engineer",
    headline: "Senior Software Engineer | C# .NET + React + AI",
    inventory: [
      [
        "Frontend & UI Architecture",
        "React, Next.js, TypeScript, JavaScript, HTML5, Micro-frontends, State (Zustand, Redux), SSR/SSG, Tailwind CSS, shadcn/ui, Styled Components, Design Systems.",
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
        "A software engineer drawing on eight years in distributed architectures (C#, .NET, React, Kafka) and fifteen in corporate and financial backgrounds. ",
        DOTNET_SUMMARY_BODY,
      ),
      metrics: metrics([
        ["+R$ 500Bn", "Asset Management", "B2B platforms for fund custody and orchestration."],
        ["D+0", "Real-Time Settlement", "From 24h (D+1) to under 1s, on Kafka and .NET."],
        ["100M+ msgs/day", "High Scale", "Event-driven, fault-tolerant."],
        ["95%", "Test Coverage", "QA and TDD culture in backend (xUnit) and frontend (Cypress)."],
      ]),
    },
    roles: DOTNET_REACT_ROLES,
    timeline: [],
  },

  {
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
  },
];








