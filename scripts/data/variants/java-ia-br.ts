/**
 * The "Java + IA" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "java-ia",
  label: "Java + IA",
  title: "Marcelino Sandroni - Engenheiro Java e IA",
  headline: "Engenheiro de Software Sênior | Java + IA",
  inventory: [
    [
      "Backend &amp; Frameworks",
      "Java, Virtual Threads, Kotlin, Spring (Boot, MVC, Cloud, WebFlux, Batch, Security, Data), Quarkus, Hibernate/JPA, MapStruct, Go, Node, JUnit 5, Mockito, WireMock, Resilience4j, TestContainers.",
    ],
    [
      "IA &amp; Dados",
      "LLMs (Anthropic, OpenAI), Spring AI, LangChain4j, Python, LangChain, LangGraph, Bedrock, Azure AI, RAG (Hybrid Search, Reranking), Embeddings, Structured Outputs, Function Calling, MCPs, Multi-Agent, Guardrails, Evals, Semantic Caching, AI Gateway, FinOps (Token Optimization), AI Governance.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, ECS, S3, SQS, Lambda), Azure (AKS, Service Bus), GCP, Docker, Kubernetes, Helm, Terraform, ArgoCD, Vault, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Prometheus, Grafana, Datadog.",
    ],
    [
      "Arquitetura &amp; Mensageria",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Microserviços, Clean, Hexagonal, Inbox/Outbox, Circuit Breakers, Saga, DDD, CQRS, SOLID, OAuth2, OIDC, JWT, mTLS.",
    ],
    [
      "Bancos &amp; Dados",
      "PostgreSQL (pgvector), Oracle, SQL Server, MySQL, MongoDB, Redis, Elasticsearch, ClickHouse, Cassandra, DynamoDB, CosmosDB, Neo4j, Snowflake, Databricks, BigQuery, ETL/ELT, OpenSearch, Qdrant, Milvus.",
    ],
    [
      "Frontend &amp; UI Architecture",
      "React, RSC, Next, SSG/SSR/ISR, Angular, Vue, React Native, Flutter, JS, Typescript, HTML5, CSS3, Tailwind, RxJS, NgRx, Zustand, TanStack Query, Microfrontends, Design Systems, Playwright.",
    ],
  ],
  
  sections: {
    summary: summary(
      "Engenheiro de Software Sênior unindo 8 anos em engenharia end-to-end (Java, Spring, Kafka, Cloud) a 15 anos de background corporativo e financeiro. ",
      "Com forte atuação em bancos e fintechs, traduzo visão de mercado e negócio em software liderando todo o ciclo — do discovery e refinamento à arquitetura e deploy em nuvem — desacoplando legados para microsserviços modernos e distribuídos, IA corporativa (Agentes, RAG, Spring AI) e interfaces web/mobile, com alta escala, resiliência, governança, compliance, testes e observabilidade.",
    ),
    metrics: metrics([
      ["+R$ 500 Bi", "Custódia & Liquidação", "Plataformas B2B globais elevando captação e retorno em +28%."],
      ["100M+ msgs/dia", "Escala & Disponibilidade", "Missão crítica em tempo real com SLA rigoroso de 99,99%."],
      ["R$ 100M/ano", "IA & Novos Contratos", "Novos contratos via Agentes Autônomos, GraphRAG e Evals."],
      ["99%", "Qualidade & Confiabilidade", "Validação real de regras de negócio, além da métrica."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Java 21+, Spring Boot, Spring AI, LangChain4j, Angular, TypeScript, PostgreSQL, Redis, gRPC, K8s, Azure.",
      bullets: [
        [
          "Liderança Técnica, Discovery & Alta Concorrência (Java 21+)",
          "Condução ponta a ponta — do refinamento com stakeholders à arquitetura — na reestruturação de sistemas críticos com 100M+ mensagens/dia, aplicando Virtual Threads, gRPC e CQRS com Redis/PostgreSQL sharding para ultrabaixa latência.",
        ],
        [
          "Resiliência Distribuída & SLA 99,99% (Azure)",
          "Arquitetura orientada a eventos com Azure Event Hubs e Service Bus para orquestração assíncrona, aplicando padrões Saga, Inbox/Outbox e Circuit Breakers para blindar contra falhas em cascata e sustentar SLA de 99,99%.",
        ],
        [
          "Engenharia de IA Avançada & Receita (R$ 100M/ano)",
          "Arquitetura de ecossistemas Multi-Agent, GraphRAG, MCPs e Evals com Spring AI, LangChain4j e Azure AI Studio (Structured Outputs, Guardrails e Semantic Caching), automatizando fluxos críticos e viabilizando R$ 100M/ano em novos contratos.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Java (Spring Boot/Batch), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2/OIDC, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Modernização de Legados, DDD & Qualidade (99%)",
          "Modernização de monolitos (Strangler Fig) para microsserviços Java desacoplados com Clean Architecture e DDD, atingindo 99% de cobertura de testes com validação rigorosa de regras financeiras e casos de borda.",
        ],
        [
          "Liquidação Real-Time & Tolerância a Falhas (Kafka)",
          "Migração de esteiras batch para streaming em tempo real via Kafka, aplicando idempotência transacional, retry patterns e DLQs para garantir zero perda de mensagens e máxima disponibilidade na conciliação.",
        ],
        [
          "Integrações Globais & Crescimento (+28% Captação)",
          "Orquestração resiliente de integrações com B3 e bolsas globais aplicando Circuit Breakers e Fallbacks, neutralizando instabilidades de redes externas e elevando a captação e o retorno em +28% (+R$ 75 Milhões).",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Java (Spring WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 500 Bi)",
          "Atuação ponta a ponta em squad de 15 engenheiros arquitetando e escalando plataforma B2B conectada à B3, com infraestrutura cloud-native na AWS, APIs reativas em Java (WebFlux) e painéis Angular.",
        ],
        [
          "Resolução de Crises & Concorrência Distribuída",
          "Diagnóstico e resolução de gargalos severos de concorrência no Kafka sob alta volatilidade de mercado em menos de 24h, aplicando política estrita de idempotência transacional e locking distribuído em Redis.",
        ],
        [
          "Engenharia de Qualidade & Automação E2E",
          "Mentoria e automação de testes de contrato, integração e E2E no CI/CD (JUnit 5, TestContainers, Cypress), blindando regras críticas contra regressões.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Java, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Evolução Acelerada & Migração Cloud",
          "Promovido de Júnior a Pleno em 1 ano. Squad de 6 engenheiros refatorando monolitos Java para eventos e entregando a migração AWS na metade do prazo.",
        ],
        [
          "Resiliência Transacional & Mensageria",
          "Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers, retries e DLQs, assegurando 100% de assertividade no processamento.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Gestão Financeira & Engenharia de Domínio",
          "Redução de 83% no fechamento mensal via Python/SQL e R$ 1,2M/ano em economia, traduzindo regras SOX e IFRS/CPC para sistemas e modelagem DDD.",
        ],
      ],
    },
  ],
  timeline: TIMELINE,
};
