/**
 * The "Enterprise C# + React" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "enterprise-dotnet-react",
  label: "Enterprise C# + React",
  title: "Marcelino Sandroni - Engenheiro C# e React",
  headline: "Engenheiro de Software Sênior | C# .NET + React + AI",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "React, Next.js, TypeScript, JavaScript, HTML5, Micro-frontends, Estado (Zustand, Redux), SSR/SSG, Tailwind CSS, shadcn/ui, Styled Components, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "C# (.NET Core 3.1 ao 9), ASP.NET Core, EF Core, Dapper, gRPC, SignalR, OAuth2/OIDC, JWT, mTLS, BenchmarkDotNet, High-Performance Async, Worker Services, Minimal APIs.",
    ],
    [
      "Inteligência Artificial &amp; Dados",
      "LLMs corporativos via Semantic Kernel e Azure OpenAI, LangChain, Amazon Bedrock, RAG, Agentic Workflows (Function Calling), Vector DBs (pgvector, Milvus).",
    ],
    [
      "Cloud &amp; DevOps",
      "Azure / AWS (AKS/EKS, App Services, Blob, Service Bus, SQS), Docker, Kubernetes (Helm), Terraform, CI/CD (Azure DevOps, GitHub Actions), Observabilidade (OpenTelemetry).",
    ],
    [
      "Arquitetura, APIs &amp; Mensageria",
      "REST Nível 3, gRPC, WebSockets, Kafka (partições, idempotência), RabbitMQ (exchanges, DLQ), Circuit Breakers, Clean Arch, DDD, CQRS, SOLID, EDA.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "SQL Server, Oracle, PostgreSQL, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "Engenheiro de Software unindo 8 anos em arquiteturas distribuídas (C#, .NET, React, Kafka) a 15 anos de background corporativo e financeiro. ",
      "Atuo da concepção de ecossistemas cloud-native do zero ao desacoplamento de sistemas críticos. Foco em microsserviços, micro-frontends e IA corporativa (Semantic Kernel/RAG), garantindo performance, escalabilidade e resiliência para aplicações de missão crítica, sob extrema cultura de observabilidade e testes automatizados.",
    ),
    metrics: metrics([
      ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
      ["D+0", "Liquidação Real-Time", "De 24h (D+1) para menos de 1s, via Kafka e .NET."],
      ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, tolerante a falhas."],
      ["95%", "Cobertura de Testes", "Cultura de QA e TDD em backend (xUnit) e frontend (Cypress)."],
    ]),
  },
  roles: [
    {
      key: "dgt",
      stack: "C#, .NET 9, React, Next.js, Micro-frontends, PostgreSQL, Redis, RabbitMQ, gRPC, Azure OpenAI, AWS.",
      bullets: [
        [
          "Liderança Técnica &amp; Integração IA",
          "Liderança de squad (8 pessoas) reestruturando sistemas de 100M+ msgs/dia. IA conectando backend via Semantic Kernel e Azure OpenAI para fluxos agênticos em tempo real (contrato de R$ 24M/ano salvo).",
        ],
        [
          "Aceleração de 10x no Processamento",
          "Migração de arquitetura relacional gargalo para microsserviços em .NET 9, com otimização extrema de I/O, threads e comunicação de baixa latência via gRPC e RabbitMQ.",
        ],
        [
          "Micro-frontends Enterprise",
          "Interfaces web complexas em React e Next.js, com gerenciamento de estado otimizado (Zustand), assegurando UX fluida e sem travamentos sob alta carga de dados.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "C# (.NET 8), React, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Azure DevOps, Helm.",
      bullets: [
        [
          "Modernização de Monolito Bancário",
          "Pilar técnico de tribo (12 devs) no desacoplamento de sistemas legados (COBOL/VB) para microsserviços orientados a eventos em C# e interfaces em React (95% de testes com xUnit).",
        ],
        [
          "Liquidação D+0 &amp; Tempo Real",
          "Substituição de esteiras D+1 por conciliação de fundos em tempo real via Apache Kafka e Worker Services em .NET, gerando +45% nos ativos geridos com SLA de 100% uptime.",
        ],
        [
          "Economia e Orquestração Global",
          "Automação de fundos ETF institucionais, integrando B3 e bolsas internacionais (EUA/Europa), com impacto financeiro estimado de +R$ 50 Milhões em captação.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "C# (.NET Core), React, TypeScript, PostgreSQL, Redis, Kafka, AWS (EKS/SQS), K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 100 Bi)",
          "Orquestração conjunta (squad de 15 engenheiros) desenhando plataforma B2B cloud-native conectada à B3, com APIs em ASP.NET Core e painéis React.",
        ],
        [
          "Gestão de Crises e Resiliência",
          "Resolução de gargalos de concorrência no Kafka sob altíssima volatilidade em menos de 24h, aplicando estrita idempotência transacional no consumo de eventos.",
        ],
        [
          "Aumento de 8x na Qualidade",
          "Mentoria técnica e automação E2E em CI/CD, blindando o ecossistema .NET contra regressões críticas e acelerando o pipeline de entregas.",
        ],
      ],
    },
    {
      key: "zup",
      stack: "C#, .NET Core, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
      bullets: [
        [
          "Evolução Rápida e Cloud",
          "Promovido a Pleno em 1 ano. Time ágil de 6 devs refatorando monolitos C# para microsserviços baseados em eventos e migração AWS na metade do prazo estipulado.",
        ],
        [
          "Resiliência Transacional",
          "Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers (Polly) e DLQs, garantindo 100% de assertividade e recuperação de falhas.",
        ],
      ],
    },
    {
      key: "consultoria",
      /* A stack is what an engineering job was; this one was not. */
      stack: null,
      bullets: [
        [
          "Diferencial em Engenharia Corporativa",
          "Liderança de equipes e redesenho de processos que reduziu o fechamento contábil em 83%. Profunda expertise financeira (DDD) traduzida para software.",
        ],
      ],
    },
  ],
  timeline: TIMELINE,
};
