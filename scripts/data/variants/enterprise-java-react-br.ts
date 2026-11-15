/**
 * The "Enterprise Java + React" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
  slug: "enterprise-java-react",
  label: "Enterprise Java + React",
  title: "Marcelino Sandroni - Engenheiro Java e React",
  headline: "Engenheiro de Software Sênior | React + Java + AI",
  inventory: [
    [
      "Frontend &amp; UI Architecture",
      "React, Next.js, TypeScript, JavaScript, HTML5, CSS3, Micro-frontends, Estado (Zustand, Redux), SSR/SSG, Tailwind CSS, shadcn/ui, Styled Components, Design Systems.",
    ],
    [
      "Backend &amp; Frameworks",
      "Java (8 ao 25), Spring Boot 3.x (AOT/GraalVM), Spring Cloud, Spring WebFlux, Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA (N+1), Tuning de JVM (ZGC/G1GC).",
    ],
    [
      "Inteligência Artificial &amp; Dados",
      "LLMs corporativos via Spring AI e LangChain4j, Amazon Bedrock (Claude/Titan), RAG, Agentic Workflows (Function Calling), Vector Databases (pgvector, Milvus).",
    ],
    [
      "Cloud &amp; DevOps",
      "AWS (EKS/ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, CloudWatch), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Bitbucket, Jenkins), Observabilidade (OpenTelemetry, Datadog).",
    ],
    [
      "Arquitetura, APIs &amp; Mensageria",
      "REST Nível 3, gRPC, GraphQL, WebSockets, Kafka (partições, idempotência), RabbitMQ (exchanges, DLQ), Circuit Breakers, Clean, Hexagonal, DDD, CQRS, SOLID, EDA, Microsserviços.",
    ],
    [
      "Ecossistema Analítico &amp; Bancos",
      "Oracle, PostgreSQL, SQL Server, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.",
    ],
  ],
  sections: {
    summary: summary(
      "Engenheiro de Software unindo quase 8 anos em arquiteturas distribuídas (Java, Spring, React, Kafka) a 15 anos de background corporativo e financeiro. ",
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
      /*
        `TypeScript` was in the written line and is not in this one.

        The list ran to 116 characters against a 112 budget, and the layout contract
        measured it 18px wider than its box - so it was never a question of the
        budget being tight, it does not fit on one line. Raising the limit would not
        have fixed it: the character count is a proxy for the line, and the line is
        what overflowed.

        Dropped from this stack rather than another because it is the weakest claim
        of the twelve - React, Next.js and Micro-frontends already name the frontend,
        and TypeScript is stated outright in the inventory above.
      */
      stack:
        "Java, Spring Boot, Spring AI, React, Next.js, Micro-frontends, PostgreSQL, Redis, gRPC, K8s, AWS.",
      bullets: [
        [
          "Liderança Técnica &amp; Integração IA",
          "Liderança de squad (8 pessoas) na reestruturação de sistemas críticos processando 100M+ mensagens/dia. IA Corporativa conectando o backend via Spring AI para fluxos agênticos em tempo real, preservando contrato de R$ 24M/ano.",
        ],
        [
          "Aceleração de 10x no Processamento",
          "Migração de arquitetura relacional gargalo para microsserviços em Java, com tuning de JVM (ZGC) e baixa latência via gRPC e RabbitMQ.",
        ],
        [
          "Micro-frontends Enterprise",
          "Interfaces web complexas em React e Next.js, com gerenciamento de estado global (Zustand), assegurando UX fluida sob alta carga.",
        ],
      ],
    },
    {
      key: "bnp-paribas",
      stack: "Java (Spring Boot/Batch), React, Next.js, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Jenkins, Helm.",
      bullets: [
        [
          "Modernização de Monolito Bancário",
          "Pilar técnico de tribo (12 devs) no desacoplamento de sistemas legados (COBOL, VB) para arquitetura orientada a eventos em Java e interfaces modulares em React (95% de testes).",
        ],
        [
          "Liquidação D+0 &amp; Tempo Real",
          "Substituição de esteiras D+1 por conciliação de fundos em tempo real via Apache Kafka e Spring Batch, gerando +45% nos ativos geridos com SLA de 100% uptime.",
        ],
        [
          "Economia e Orquestração Global",
          "Automação de fundos ETF institucionais, integrando B3 e bolsas internacionais, com impacto estimado de +R$ 50 Milhões em captação.",
        ],
      ],
    },
    {
      key: "itau",
      stack: "Java (Spring WebFlux), React, TypeScript, PostgreSQL, Redis, Kafka, AWS, K8s, Terraform.",
      bullets: [
        [
          "Custódia Institucional Estratégica (+R$ 100 Bi)",
          "Orquestração conjunta (squad de 15 engenheiros) desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native (AWS), APIs reativas em Java e painéis React.",
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
      stack: "Java, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
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
      /* A stack is what an engineering job was; this one was not. */
      stack: null,
      bullets: [
        [
          "Diferencial em Engenharia Corporativa",
          "Liderança de equipes e redesenho de processos que reduziu o fechamento contábil em 83%. Profunda expertise em finanças e regras tributárias traduzidas diretamente para equipes de software.",
        ],
      ],
    },
  ],
  timeline: TIMELINE,
};
