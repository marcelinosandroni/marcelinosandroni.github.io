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
      "Frontend &amp; UI Architecture",
      "Angular, React, RSC, Next, SSG, SSR, ISR, Javascript, Typescript, HTML5, CSS3, Microfrontends, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Java, Kotlin, Spring (Boot, MVC, Cloud, WebFlux, Batch, Security, Data), Quarkus, Go, NodeJS, TestContainers, Playwright.",
    ],
    [
      "IA &amp; Dados",
      "LLMs (Anthropic, OpenAI), Spring AI, LangChain4j, Python, LangChain, LangGraph, Amazon Bedrock, Azure AI Studio, RAG, Agentic Workflows (Skills, Hooks, Function Calling), MCPs, SDD.",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS, Azure, Docker, Kubernetes, Helm, Terraform, CI/CD, GitHub Actions, Jenkins, OpenTelemetry, Prometheus, Datadog, Grafana, Loki.",
    ],
    [
      "Arquitetura &amp; Mensageria",
      "REST, gRPC, GraphQL, WebSockets, SSE, EDA, Kafka, RabbitMQ, Microserviços, Clean, Hexagonal, Circuit Breakers, Saga, DDD, CQRS, SOLID.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "PostgreSQL, Oracle, MongoDB, Redis, Cassandra, DynamoDB, CosmosDB, Snowflake, Databricks, ETL/ELT, Vector DBs (pgvector, Milvus).",
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
  roles: [
    {
      key: "dgt",
      stack: "Java, Spring Boot, Spring AI, Angular, TypeScript, Micro-frontends, PostgreSQL, Redis, gRPC, K8s, Azure.",
      bullets: [
        [
          "Liderança Técnica & Alta Concorrência (Java 21)",
          "Liderança de squad na reestruturação de ecossistemas críticos processando 100M+ mensagens/dia. Aplicação de Virtual Threads (Loom), gRPC e arquitetura CQRS com Redis/PostgreSQL sharding p/ garantir ultrabaixa latência sob tráfego massivo.",
        ],
        [
          "Resiliência Distribuída (Ecossistema Azure)",
          "Arquitetura orientada a eventos utilizando Azure Event Hubs e Service Bus p/ orquestração assíncrona. Implementação rigorosa de padrões Saga (consistência) e Circuit Breakers, blindando o sistema contra falhas em cascata e sustentando 100% de uptime.",
        ],
        [
          "IA Corporativa & Automação de Processos",
          "Concepção de fluxos agênticos em tempo real integrando Spring AI e Azure AI Studio (LLMs/RAG). Automação de operações críticas que estrangulou gargalos manuais e assegurou a preservação de contrato de R$ 24M/ano.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Java (Spring Boot/Batch), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Arquitetura Orientada a Eventos (EDA)",
          "Estrangulamento de monolitos (Strangler Fig) para microsserviços Java altamente desacoplados. Desenho de malha assíncrona p/ garantir alta disponibilidade em transações críticas, com 95% de cobertura de testes.",
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
      stack: "Java (Spring WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 100 Bi)",
          "Orquestração conjunta (squad de 15 engenheiros) desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native (AWS), APIs reativas em Java e painéis Angular.",
        ],
        [
          "Gestão de Crises e Resiliência",
          "Resolução de gargalos de concorrência no Kafka sob alta volatilidade em menos de 24h, aplicando estrita idempotência transacional.",
        ],
        [
          "Aumento de 8x na Qualidade",
          "Mentoria técnica e automação E2E (CI/CD), blindando o ecossistema contra regressões críticas.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "Java, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
      bullets: [
        [
          "Evolução Rápida e Cloud",
          "Promovido de Júnior a Pleno em 1 ano. Time ágil de 6 devs refatorando monolitos Java para eventos e migração AWS na metade do prazo estipulado.",
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
