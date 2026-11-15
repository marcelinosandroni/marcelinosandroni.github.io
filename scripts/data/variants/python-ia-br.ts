/**
 * The "Python + IA" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "python-ia",
  label: "Python + IA",
  title: "Marcelino Sandroni - Engenheiro Python e IA",
  headline: "Engenheiro de Software Sênior | Python + IA",
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
      "IA &amp; Dados",
      "LLMs (Anthropic, OpenAI, Llama), LangChain, LangGraph, CrewAI, RAG (Hybrid Search, Reranking), Agentic Workflows (Function Calling, MCPs), Evals, Guardrails, Fine-tuning (LoRA), vLLM, HuggingFace, SDD.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS, Bedrock, Lambda, SQS), Azure (AKS, AI Studio, Service Bus), GCP (GKE, Vertex AI), Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Datadog.",
    ],
    [
      "Arquitetura &amp; Mensageria",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Celery, BullMQ, Microserviços, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "PostgreSQL, Oracle, MongoDB, Redis, ClickHouse, DynamoDB, CosmosDB, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus, Qdrant).",
    ],
  ],
  sections: {
    summary: summary(
      "Engenheiro de Software Sênior e AI Engineer unindo quase 8 anos em arquiteturas distribuídas (Python, Node.js, Go, Kafka) a 15 anos de background corporativo e financeiro. ",
      "Atuo da concepção cloud-native ao desacoplamento de sistemas críticos, microsserviços de alta escala e engenharia de IA (Agentes, RAG, Evals, MCPs), garantindo baixa latência, resiliência e impacto financeiro sob forte cultura de testes e observabilidade.",
    ),
    metrics: metrics([
      ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
      ["D+0", "Liquidação Real-Time", "De 24h (D+1) para menos de 1s via Kafka, Python e Go."],
      ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, tolerante a falhas."],
      ["95%", "Cobertura de Testes", "Cultura de QA e TDD em backend (Pytest) e frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "Python, FastAPI, Node.js, Go, LangGraph, RAG, PostgreSQL, ClickHouse, Redis, gRPC, K8s, AWS/Azure.",
      bullets: [
        [
          "Liderança Técnica & Alta Volumetria (Python / Go)",
          "Liderança de squad na reestruturação de sistemas críticos com 100M+ msgs/dia, aplicando Python assíncrono (FastAPI/AsyncIO), workers em Go, gRPC e CQRS com Redis/ClickHouse para ultrabaixa latência.",
        ],
        [
          "Engenharia de IA, Agentes & RAG em Produção",
          "Arquitetura de pipelines agênticos e RAG híbrido (LangGraph, pgvector, reranking, guardrails e evals) integrados a Bedrock e Azure AI Studio, automatizando fluxos críticos e preservando contrato de R$ 24M/ano.",
        ],
        [
          "Resiliência Distribuída & Mensageria",
          "Orquestração assíncrona orientada a eventos com Kafka, RabbitMQ e Azure Service Bus/Event Hubs, aplicando padrões Saga, Circuit Breakers e DLQs para sustentar 100% de uptime sem falhas em cascata.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Python, Node.js (NestJS), Go, Angular, Oracle SQL, PostgreSQL, Kafka, OAuth2, K8s, Jenkins, Helm, GCP.",
      bullets: [
        [
          "Modernização de Monolitos & EDA",
          "Estrangulamento de monolitos legados (Strangler Fig) para microsserviços em Python, Node.js e Go com Clean Architecture e DDD, alcançando 95% de cobertura de testes com Pytest e Jest.",
        ],
        [
          "Liquidação D+0 & Streaming (Kafka)",
          "Migração de esteiras batch (D+1) para streaming em tempo real (D+0) via Kafka, aplicando idempotência transacional, retry patterns e DLQs para zero perda de mensagens e 100% de uptime.",
        ],
        [
          "Integrações Globais & Captação (+R$ 50M)",
          "Automação de integrações financeiras com B3 e bolsas globais aplicando Circuit Breakers e Fallbacks, mitigando instabilidades externas e destravando +R$ 50 Milhões em captação.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Python (FastAPI), Node.js, Go, Angular, PostgreSQL, Redis, Kafka, AWS (EKS, SQS), K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 100 Bi)",
          "Atuação em squad de 15 engenheiros desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native na AWS, APIs de alta disponibilidade em Python/Node.js e painéis Angular.",
        ],
        [
          "Gestão de Crises & Concorrência",
          "Resolução de gargalos de concorrência no Kafka sob alta volatilidade em menos de 24h, aplicando política estrita de idempotência transacional e locking distribuído em Redis.",
        ],
        [
          "Qualidade & Automação E2E",
          "Mentoria técnica e automação de testes (Pytest, Jest, TestContainers e Cypress) integrados ao CI/CD, blindando o ecossistema contra regressões críticas.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Python, Node.js, Go, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, GCP, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Evolução Rápida & Migração Cloud",
          "Promovido de Júnior a Pleno em 1 ano. Time ágil refatorando monolitos para microsserviços orientados a eventos em Python, Node.js e Go com migração cloud na metade do prazo.",
        ],
        [
          "Resiliência Transacional",
          "Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers e DLQs, garantindo 100% de assertividade no processamento.",
        ],
      ],
    },
    {
      key: "consultoria",
      stack: null,
      bullets: [
        [
          "Diferencial em Engenharia & Dados",
          "Liderança de equipes e automação de processos com Python e SQL que reduziu o fechamento contábil em 83%, traduzindo regras financeiras e tributárias complexas para software.",
        ],
      ],
    },
  ],
  timeline: TIMELINE,
};