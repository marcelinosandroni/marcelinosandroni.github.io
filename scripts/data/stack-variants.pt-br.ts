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
    slug: "enterprise-dotnet",
    label: "Enterprise C# + Angular",
    title: "Marcelino Sandroni - Engenheiro C# e Angular",
    headline: "Engenheiro de Software Sênior | C# &amp; Angular",
    inventory: [
      [
        "Frontend &amp; UI Architecture",
        "Angular (8 ao 22), TypeScript, RxJS, NgRx, Micro-frontends, SSR, Tailwind CSS, Angular Material, Cypress, Design Systems.",
      ],
      [
        "Backend .NET",
        "C# (.NET Core 6/8), ASP.NET Core, Entity Framework Core, xUnit, REST, gRPC, Clean Architecture, DDD, CQRS, SOLID.",
      ],
      [
        "Cloud, DevOps &amp; Mensageria",
        "AWS (EKS, ECS, Lambda, S3, RDS, DynamoDB), Docker, Kubernetes (Helm), Terraform, CI/CD (Jenkins, GitHub Actions), Apache Kafka, RabbitMQ, OpenTelemetry, Prometheus.",
      ],
      [
        "Dados &amp; Analítico",
        "SQL Server, PostgreSQL, MySQL, Oracle, Redis, MongoDB, ClickHouse, Databricks, ETL, RAG.",
      ],
    ],
    sections: {
      summary: summary(
        "Engenheiro de Software especializado em C#/.NET e Angular para plataformas de ativos e custódia, ",
        "com quase 8 anos de engenharia de software e 15 em governança financeira. No Itaú desenhei a plataforma que sustenta +R$ 100 bilhões em custódia e liderei a adoção de testes automatizados em .NET, Angular e Flutter que elevou a qualidade em 8x.",
      ),
      metrics: metrics([
        ["+R$ 100 Bi", "Custódia", "Plataforma B2B integrada à B3 com visão multi-carteira."],
        ["8x", "Qualidade", "Programa de testes em .NET, Angular e Flutter."],
        ["80%+", "Cobertura", "xUnit, JUnit e Cypress com pipeline por commit."],
        ["&lt;24h", "Resgate Crítico", "Lançamento com falha entregue no prazo."],
      ]),
    },
    timeline: TIMELINE,
  },

  {
    slug: "modern-web",
    label: "Modern Node + Go + React",
    title: "Marcelino Sandroni - Engenheiro Node, Go e React",
    headline: "Engenheiro de Software Sênior | Node, Go &amp; React",
    inventory: [
      [
        "Frontend &amp; UI",
        "React, Next.js (RSC, SSR), Angular, Vue.js, React Native, TypeScript, Micro-frontends, Storybook, Tailwind CSS, Design Systems.",
      ],
      [
        "Backend &amp; Distribuídos",
        "Node.js, NestJS, Go, Java (Spring Boot), .NET Core, Python, REST, gRPC, WebSockets, Circuit Breakers, RabbitMQ (DLQ), Apache Kafka, Serverless.",
      ],
      [
        "Dados &amp; Analítico",
        "PostgreSQL, MySQL, MongoDB, Redis, ClickHouse, Databricks, ETL, Pipelines de Dados.",
      ],
      [
        "Cloud, DevOps &amp; SRE",
        "AWS (EKS, ECS, Lambda, S3, RDS, DynamoDB, SQS, API Gateway), GCP, Azure, Docker, Kubernetes (Helm), Terraform, CI/CD (Jenkins, GitHub Actions), Prometheus, Grafana, Jaeger, OpenTelemetry.",
      ],
      [
        "IA &amp; Dados Aplicacionais",
        "PyTorch, TensorFlow, YOLOv8, LangChain, MLflow, Agentes LLM, Visão Computacional, SDD (Spec Driven Development).",
      ],
    ],
    sections: {
      summary: summary(
        "Engenheiro de Software focado em Node, Go e React para sistemas de alta escala, ",
        "com quase 8 anos de engenharia de software e 15 em governança financeira. Entrego performance onde ela é medida — 10x em 100 milhões de mensagens por dia, consultas de 30s para menos de 200ms, deploy de 4 horas para 15 minutos — com microsserviços em Go, APIs em NestJS e interfaces em React e Next.js em Kubernetes.",
      ),
      metrics: metrics([
        ["10x", "Performance", "100M+ mensagens processadas por dia em Go."],
        ["30s → 200ms", "Consultas", "MySQL para ClickHouse com ETL em Databricks."],
        ["4h → 15min", "Deploy", "Pipeline declarativo em Kubernetes."],
        ["-50%", "Custo Cloud", "Auto-scaling e right-sizing na AWS."],
      ]),
    },
    timeline: TIMELINE,
  },
];