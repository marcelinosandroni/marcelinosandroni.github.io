/**
 * The "Node + IA" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "node-ia",
  label: "Node + IA",
  title: "Marcelino Sandroni - Engenheiro Node.js e IA",
  headline: "Engenheiro de Software Sênior | Node.js + IA",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "React, RSC, Next, SSG, SSR, ISR, Angular, Vue, Javascript, Typescript, HTML5, CSS3, Microfrontends, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Node.js, TypeScript, NestJS, Express, Fastify, Go, Python, Prisma, TypeORM, Jest, Vitest, Supertest, TestContainers.",
    ],
    [
      "IA &amp; Dados",
      "LLMs (Anthropic, OpenAI), Vercel AI SDK, LangChain.js, LangGraph, Python, Amazon Bedrock, Azure AI Studio, RAG, Agentic Workflows (Skills, Hooks, Function Calling), MCPs, SDD.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, Lambda, SQS, SNS, S3, RDS), Azure, GCP, Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Prometheus, Datadog, Grafana, Loki.",
    ],
    [
      "Arquitetura &amp; Mensageria",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, BullMQ, Microserviços, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "PostgreSQL, Oracle, MongoDB, Redis, Cassandra, DynamoDB, CosmosDB, ClickHouse, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus).",
    ],
  ],
  sections: {
    summary: summary(
      "Engenheiro de Software unindo quase 8 anos em arquiteturas distribuídas (Node.js, TypeScript, Go, Kafka) a 15 anos de background corporativo e financeiro. ",
      "Atuo da concepção de ecossistemas cloud-native do zero ao desacoplamento de sistemas críticos. Foco na construção de microsserviços, micro-frontends e IA corporativa (Agentes/RAG), garantindo alta performance, escalabilidade e resiliência para sistemas de missão crítica, sob extrema cultura de testes e observabilidade.",
    ),
    metrics: metrics([
      ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
      ["D+0", "Liquidação Real-Time", "De 24h (D+1) para menos de 1s, via Kafka e Node.js."],
      ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, tolerante a falhas."],
      ["95%", "Cobertura de Testes", "Cultura de QA e TDD em backend (Jest) e frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Node.js, NestJS, TypeScript, Python, LangChain.js, Next.js, PostgreSQL, ClickHouse, Redis, gRPC, K8s, AWS.",
      bullets: [
        [
          "Liderança Técnica & Alta Concorrência (Node.js / Go)",
          "Liderança de squad na reestruturação de ecossistemas críticos processando 100M+ mensagens/dia. Aplicação de event-loop non-blocking, workers em Go/Node, gRPC e arquitetura CQRS com Redis/PostgreSQL sharding p/ garantir ultrabaixa latência.",
        ],
        [
          "Resiliência Distribuída & Mensageria",
          "Arquitetura orientada a eventos utilizando Kafka, RabbitMQ e AWS SQS p/ orquestração assíncrona. Implementação rigorosa de padrões Saga (consistência) e Circuit Breakers, blindando o sistema contra falhas em cascata e sustentando 100% de uptime.",
        ],
        [
          "IA Corporativa & Automação de Processos",
          "Concepção de fluxos agênticos em tempo real integrando Vercel AI SDK, LangChain.js, Python e LLMs (RAG). Automação de operações críticas que estrangulou gargalos manuais e assegurou a preservação de contrato de R$ 24M/ano.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Node.js (NestJS), TypeScript, Go, Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Arquitetura Orientada a Eventos (EDA)",
          "Estrangulamento de monolitos (Strangler Fig) para microsserviços Node.js e Go altamente desacoplados. Desenho de malha assíncrona p/ garantir alta disponibilidade em transações críticas, com 95% de cobertura de testes.",
        ],
        [
          "Mensageria & Tolerância a Falhas (Kafka)",
          "Migração de processamento batch (D+1) p/ streaming (D+0). Engenharia pesada em idempotência transacional, retry patterns e DLQs, garantindo zero perda de mensagens e 100% de uptime na conciliação.",
        ],
        [
          "Orquestração Distribuída & Consistência",
          "Automação de integrações (B3/bolsas globais) aplicando Circuit Breakers e Fallbacks. Mitigação de instabilidade de redes externas, garantindo consistência e destravando captação de +R$ 50 Milhões.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Node.js (NestJS), TypeScript, Angular, React, PostgreSQL, Redis, Kafka, AWS (EKS, SQS), K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 100 Bi)",
          "Orquestração conjunta (squad de 15 engenheiros) desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native (AWS), APIs reativas em Node.js e painéis Angular.",
        ],
        [
          "Gestão de Crises e Resiliência",
          "Resolução de gargalos de concorrência no Kafka sob alta volatilidade em menos de 24h, aplicando estrita idempotência transacional.",
        ],
        [
          "Aumento de 8x na Qualidade",
          "Mentoria técnica e automação E2E (Jest, Cypress e CI/CD), blindando o ecossistema contra regressões críticas.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Node.js, Express, TypeScript, React, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Evolução Rápida e Cloud",
          "Promovido de Júnior a Pleno em 1 ano. Time ágil de 6 devs refatorando monolitos para microsserviços Node.js orientados a eventos e migração AWS na metade do prazo estipulado.",
        ],
        [
          "Resiliência Transacional",
          "Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers e DLQs, garantindo 100% de assertividade.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Diferencial em Engenharia Corporativa",
          "Liderança de equipes e redesenho de processos que reduziu fechamento contábil em 83%. Profunda expertise em finanças e regras tributárias traduzidas diretamente para equipes de software.",
        ],
      ],
    },
  ],
  timeline: TIMELINE,
};