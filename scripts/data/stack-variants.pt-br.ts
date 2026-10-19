/**
 * The Portuguese stack variants.
 *
 * Each one is the same document argued for a different stack, using only material
 * that already exists in the project's content: the case studies, the technologies
 * and the outcomes recorded per role. Nothing here is invented, because a résumé
 * that overstates a stack is the one error a technical recruiter is guaranteed to
 * catch in the first five minutes.
 *
 * ## What a variant does not carry
 *
 * The experience, the degrees, the languages and the contact details. All five
 * documents share them, in the shell, because the thing that makes them credible as
 * a set is that they are one set - and a variant that declared its own roles would
 * be a fifth place for a date to go stale in.
 *
 * This file used to carry a full copy of the experience per variant, including a
 * company the document no longer lists. Nothing read it: the roles moved into the
 * shell when the documents were unified, and the copies stayed behind as a second,
 * wrong answer to "what does this document say". A file that describes a résumé
 * nobody ships is not documentation, it is a contradiction waiting for someone to
 * believe it.
 *
 * ## What changes between variants
 *
 * The headline under the name, the summary, the four headline metrics, and the
 * technical inventory. Everything else is inherited.
 */
import { TONES, type TimelineRole } from "./career-timeline";
import type { RoleContent } from "./variant-roles";

export type { RoleContent };

/*
  The career timeline - one bar, because the experience is one.

  It restates the technology roles and nothing else. The fifteen years of finance
  before them are real and are in the document, but putting them on this bar would
  squeeze six years of engineering into a twentieth of the width and turn the shape
  into a claim that the bar contradicts.

  Ordered oldest first, because a timeline reads left to right and the career did
  not start on the right. There is one of these for the whole set now: the experience is
  the same in every document, so a variant bar that differed would be showing a
  career the page does not contain.

  The periods are written out rather than derived, which is a second copy of a
  fact that also lives in the roles - so `assertTimelineMatchesRoles` fails the
  build if the two stop agreeing. Writing the dates twice and checking them is
  cheaper than threading structured data through a renderer that was built to take
  strings.
*/
export const TIMELINE: ReadonlyArray<TimelineRole> = [
  { label: "ZUP", period: "Mar/2019 – Jun/2020 · Remoto", level: "Júnior → Pleno", tone: TONES.lightest },
  { label: "ITAÚ", period: "Jul/2020 – Nov/2022 · Híbrido", level: "Pleno", tone: TONES.light },
  { label: "BNP Paribas", period: "Dez/2022 – Set/2025 · Híbrido", level: "Sênior", tone: TONES.mid },
  { label: "DGT", period: "Out/2025 – Set/2026 · Remoto", level: "Tech Lead", tone: TONES.dark },
];

/**
 * The four headline metric cards.
 *
 * `data-rule` on each of the three parts is what the layout contract measures: the
 * value is one line, the green name of the achievement is one line, and the caption
 * is two. A card that does not fit that shape is a card whose row no longer lines
 * up, and the build says which caption went over rather than leaving it to be found
 * on the printed page.
 */
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

/**
 * The summary: five lines, the same size as everything else.
 *
 * `data-rule="resumo"` and the five-line budget are why the second sentence here is
 * a sentence and not a paragraph. A summary is the argument the whole document
 * rests on, and past five lines a reader is reading prose rather than a précis.
 */
const summary = (lead: string, body: string): string => `
            <p class="text-[12.5px] leading-relaxed text-slate-700 text-justify" data-rule="resumo">
                <strong>${lead}</strong>${body}</p>`;

/** One variant's reader-facing differences from the shared document. */
export type Variant = {
  readonly slug: string;
  /** The reader-facing label the selector shows. */
  readonly label: string;
  /** The document title, which is also the first thing a recruiter reads. */
  readonly title: string;
  /**
   * The line under the name.
   *
   * This is the one place a variant states what it is *for*, and it is the only
   * sentence a recruiter is certain to read. The general résumé gets a broad
   * description here because it has to answer for everything; a specialist gets
   * its stack named, because a reader who is choosing between these documents is
   * looking for exactly that and should not have to infer it.
   *
   * One line, under the layout contract - so the stack is named here rather than
   * running into a second line that pushes the summary off its own budget.
   */
  readonly headline: string;
  /**
   * The technical inventory, as label-and-items pairs.
   *
   * The general résumé has no inventory of its own: every role above already
   * carries its own stack, and a list that repeats them is the part of a résumé a
   * recruiter stops reading.
   *
   * A specialist document is the case where the trade goes the other way - the
   * reader arrived asking "does this person run Java in production", and an
   * inventory answers that faster than any paragraph. So it is allowed here, and
   * the layout contract decides whether each group actually fits in two lines
   * rather than anyone guessing in advance.
   */
  readonly inventory?: ReadonlyArray<readonly [string, string]>;
  /** The summary and the four metric cards. */
  readonly sections: {
    readonly summary: string;
    readonly metrics: string;
  };
  /**
   * Each role's stack line and bullets, when this variant argues a different stack.
   *
   * ## What stays shared, and why that is not a compromise
   *
   * The role, the company, the dates and the tenure are one set across all five
   * documents, because they are facts rather than arguments: a date that exists in
   * five places is five places to let it go stale, and `assertTimelineMatchesRoles`
   * would catch the drift only after it had already shipped in a document or two.
   *
   * The stack line and the bullets are the argument, though, and they were reading
   * as the general résumé's argument - a document that names Node, Go and React under
   * the name and then credits Spring Boot and RxJS through the middle of its
   * experience reads as carelessness rather than breadth. So those move here.
   *
   * Declaring `roles` opts a variant in completely: a variant that declares some of
   * them and not the others fails the build, because a partial declaration is
   * indistinguishable at a glance from a complete one and leaves half the experience
   * arguing for the other stack. A variant that declares none inherits all of them,
   * which is what the two variants written before this field existed still do.
   */
  readonly roles?: ReadonlyArray<RoleContent>;
  /** The roles the career timeline shows, oldest first. */
  readonly timeline: ReadonlyArray<TimelineRole>;
};

export const variants: ReadonlyArray<Variant> = [
  {
    slug: "enterprise-java",
    label: "Enterprise Java + Angular",
    title: "Marcelino Sandroni - Engenheiro Java e Angular",
    headline: "Engenheiro de Software Sênior | Angular + Java + AI",
    inventory: [
      [
        "Frontend &amp; UI Architecture",
        "Angular (8 ao 22), TypeScript, JavaScript, HTML5, CSS3, SASS, Micro-frontends, Estado/Reatividade (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, Design Systems.",
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
  },

  {
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
  },

  {
    slug: "enterprise-dotnet",
    label: "Enterprise C# + Angular",
    title: "Marcelino Sandroni - Engenheiro C# e Angular",
    headline: "Engenheiro de Software Sênior | C# .NET + Angular + AI",
    inventory: [
      [
        "Frontend &amp; UI Architecture",
        "Angular (8 ao 22), TypeScript, JavaScript, HTML5, SASS, Micro-frontends, Estado/Reatividade (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, Design Systems.",
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
        "Engenheiro de Software unindo 8 anos em arquiteturas distribuídas (C#, .NET, Angular, Kafka) a 15 anos de background corporativo e financeiro. ",
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
        stack: "C#, .NET 9, Angular, Micro-frontends, PostgreSQL, Redis, RabbitMQ, gRPC, K8s, Azure OpenAI, AWS.",
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
            "Interfaces web complexas em Angular, com gerenciamento reativo avançado (RxJS/NgRx), assegurando UX fluida e sem travamentos sob alta carga de dados.",
          ],
        ],
      },
      {
        key: "bnp-paribas",
        stack: "C# (.NET 8), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, K8s, Azure DevOps, Helm.",
        bullets: [
          [
            "Modernização de Monolito Bancário",
            "Pilar técnico de tribo (12 devs) no desacoplamento de sistemas legados (COBOL/VB) para microsserviços orientados a eventos em C# e interfaces em Angular (95% de testes com xUnit).",
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
        stack: "C# (.NET Core), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS (EKS/SQS), K8s, Terraform.",
        bullets: [
          [
            "Custódia Institucional Estratégica (+R$ 100 Bi)",
            "Orquestração conjunta (squad de 15 engenheiros) desenhando plataforma B2B cloud-native conectada à B3, com APIs em ASP.NET Core e painéis Angular.",
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
        stack: "C#, .NET Core, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
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
  },

  {
    slug: "modern-web",
    label: "Modern Node + Go + React",
    title: "Marcelino Sandroni - Engenheiro Node, Go e React",
    headline: "Engenheiro de Software Sênior | Node, React, Go &amp; IA",
    inventory: [
      [
        "Frontend &amp; Mobile",
        "React, Next.js, Angular, React Native, Flutter, Micro-frontends, Tailwind, SSR, Zustand, Redux, Design Systems.",
      ],
      [
        "Backend &amp; Frameworks",
        "Node.js (NestJS, Express), Go, Python, RESTful, gRPC, WebSockets, GraphQL, OAuth2, OIDC, JWT, mTLS.",
      ],
      [
        "Inteligência Artificial &amp; Dados",
        "Integração LLMs (OpenAI, Claude, Gemini), RAG, Agentic Workflows, LangChain, Vector DBs (pgvector, Milvus).",
      ],
      [
        "Cloud &amp; DevOps",
        "AWS (EKS, S3, SQS, Lambda), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Jenkins), Datadog.",
      ],
      [
        "Arquitetura &amp; Mensageria",
        "Microsserviços, Clean Architecture, DDD, CQRS, SOLID, EDA, Apache Kafka, RabbitMQ, Circuit Breakers.",
      ],
      [
        "Ecossistema Analítico &amp; Bancos",
        "PostgreSQL, MongoDB, Redis, ClickHouse, DynamoDB, DocumentDB, Snowflake, Databricks.",
      ],
    ],
    sections: {
      summary: summary(
        "Engenheiro de Software unindo quase 8 anos em ecossistemas modernos (Node, Go, React, Python) a 15 anos de background corporativo. ",
        "Atuo da concepção cloud-native ao desacoplamento de sistemas críticos. Foco em microsserviços de alta escala, micro-frontends e IA corporativa (Agentes/RAG), garantindo performance, escalabilidade e resiliência para aplicações de missão crítica, sob extrema cultura de testes.",
      ),
      metrics: metrics([
        ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
        ["10x", "Performance ETL", "Migração relacional para microsserviços em Go e Node."],
        ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, serverless e tolerante a falhas."],
        ["-50% Custos", "Otimização FinOps", "Auto-scaling e right-sizing em ecossistemas cloud (AWS)."],
      ]),
    },
    roles: [
      {
        key: "dgt",
        stack:
          "Node.js, React, Next.js, Go, Python, IA, PostgreSQL, ClickHouse, Redis, RabbitMQ, gRPC, K8s, AWS.",
        bullets: [
          [
            "Liderança Técnica &amp; Alta Volumetria",
            "Liderança de squad na reestruturação de sistemas processando 100M+ mensagens/dia. Migração para ClickHouse e microsserviços pesados em Go e Node.",
          ],
          [
            "Integração de IA Corporativa",
            "Implementação de fluxos agênticos em tempo real conectando backend a LLMs (Python/LangChain), entregando assertividade absoluta e preservando contrato de R$ 24M/ano.",
          ],
          [
            "Micro-frontends Enterprise",
            "Construção de painéis web complexos utilizando React e Next.js em arquitetura de micro-frontends, garantindo UX fluida sob alta carga de processamento do browser.",
          ],
        ],
      },
      {
        key: "bnp-paribas",
        stack: "Node.js, React, Angular, Go, PostgreSQL, Kafka, OAuth2, Kubernetes, Jenkins, Helm.",
        bullets: [
          [
            "Modernização de Monolitos",
            "Pilar técnico no desacoplamento de sistemas bancários legados (COBOL/VB) para microsserviços em Node e Go, alcançando 95% de cobertura de testes.",
          ],
          [
            "Liquidação D+0 &amp; Tempo Real",
            "Substituição de esteiras D+1 por conciliação de fundos em tempo real via Kafka, gerando +45% nos ativos geridos com SLA de 100% de uptime em liquidações.",
          ],
          [
            "Orquestração Global",
            "Automação de fundos ETF institucionais, integrando B3 e bolsas internacionais, com impacto estimado de +R$ 50 Milhões em captação operacional para o banco.",
          ],
        ],
      },
      {
        key: "itau",
        stack: "Node.js, NestJS, React, TypeScript, PostgreSQL, Redis, Kafka, AWS, Kubernetes, Terraform.",
        bullets: [
          [
            "Custódia Institucional Estratégica",
            "Desenvolvimento full-stack de portal B2B focado em UX, unindo frontend React com APIs reativas e de alta disponibilidade orquestradas em Node.js.",
          ],
          [
            "Gestão de Crises e Resiliência",
            "Intervenção cirúrgica em fluxos críticos de mensageria assíncrona (Kafka) sob forte tráfego, garantindo total integridade transacional dos ativos.",
          ],
          [
            "Automação E2E",
            "Liderança na implementação rigorosa de testes automatizados com Cypress, blindando o ecossistema contra regressões sistêmicas e acelerando o pipeline de delivery.",
          ],
        ],
      },
      {
        key: "zup",
        stack: "Node.js, React, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, CI/CD.",
        bullets: [
          [
            "Migração Cloud Acelerada",
            "Promovido a Pleno em 1 ano. Executou migração de infraestrutura para AWS e refatorou APIs em Node.js para mensageria na metade do prazo estipulado.",
          ],
          [
            "Resiliência Transacional",
            "Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers e DLQs, garantindo 100% de assertividade transacional e recuperação de falhas.",
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
            "Liderança de equipes e redesenho de processos que reduziu fechamento contábil em 83%. Expertise financeira traduzida para software de alto ROI.",
          ],
        ],
      },
    ],
    timeline: TIMELINE,
  },
];