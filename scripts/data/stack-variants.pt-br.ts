/**
 * The Portuguese stack variants.
 *
 * Each one is the same document argued for a different stack, using only material
 * that already exists in the project's content: the case studies, the technologies
 * and the outcomes recorded per role. Nothing here is invented, because a résumé
 * that overstates a stack is the one error a technical recruiter is guaranteed to
 * catch in the first five minutes.
 *
 * ## Why the roles do not move
 *
 * The variants reorder emphasis, not history. A stack-focused résumé that moved a
 * role up to flatter the stack would be a document about a career nobody had, and
 * the first question in the interview - "when did you work here?" - would end it.
 *
 * What changes is which bullet leads, which technology is named first in the tech
 * box, and which metrics are given the four headline slots.
 */

/**
 * How long a role lasted, worked out from its own dates.
 *
 * Computed rather than typed, because a duration written next to the dates it
 * describes is a second copy of the same fact - and the second copy is the one
 * that goes stale. Someone moves the start date, the "2 anos" beside it keeps
 * saying 2 anos, and nothing on the page contradicts the reader. It just quietly
 * becomes wrong, which is the kind of error a résumé cannot afford.
 *
 * Read out of the period string, so editing a date corrects the duration on the
 * next build with no second edit to remember.
 */
const MONTH_INDEX: Readonly<Record<string, number>> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

const duration = (period: string): string => {
  /*
    Only the dates, never the whole period string.

    The period carries the location too - "Out/2025 – Set/2026 · Remoto" - and
    splitting that on "/" leaves "2026 · Remoto" as the year, which parses to NaN
    and prints "NaN anos e NaN meses" on the document. A recruiter would read that
    as a bug in the résumé, and rightly so.
  */
  const [from, to] = period
    .split("·")[0]
    .split("–")
    .map((part) => part.trim());

  if (from === undefined || to === undefined) {
    throw new Error(`period is not a range: "${period}"`);
  }

  const [fromMonth, fromYear] = from.split("/");
  const [toMonth, toYear] = to.split("/");

  const startMonth = MONTH_INDEX[(fromMonth ?? "").toLowerCase()];
  const endMonth = MONTH_INDEX[(toMonth ?? "").toLowerCase()];
  const startYear = Number(fromYear);
  const endYear = Number(toYear);

  if (
    startMonth === undefined ||
    endMonth === undefined ||
    Number.isNaN(startYear) ||
    Number.isNaN(endYear)
  ) {
    throw new Error(`cannot read a range out of period: "${period}"`);
  }

  /*
    Inclusive: both the first month and the last one are counted.

    A job held from October to September was worked in twelve months, not eleven,
    and everyone describing a tenure counts it that way - "I was there a year"
    is the truth of the calendar, and the month you joined is a month you worked.
    Strict subtraction reads a one-year contract as eleven months, which is a
    rounding that happens to be wrong about the candidate's only job.
  */
  const total = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

  if (total < 1) {
    throw new Error(`period ends before it starts: "${period}"`);
  }

  const years = Math.floor(total / 12);
  const months = total % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }

  if (months === 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`;
  }

  /*
    Long tenures drop the months.

    Past a decade the remainder is noise: "15 anos e 6 meses" and "15 anos" are
    the same statement to a reader, and the first one is long enough to wrap the
    period onto a second line in a header that already carries the dates and the
    location. Under ten years the months still carry information - "2 anos e 10
    meses" tells a recruiter the role ran long enough to matter - so they stay.
  */
  if (years >= 10) {
    return `${years} anos`;
  }

  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
};

/** The wrapper the role block uses in the shell, repeated per role. */
const role = (opts: {
  readonly title: string;
  readonly company: string;
  readonly period: string;
  readonly tech: ReadonlyArray<string>;
  readonly bullets: ReadonlyArray<string>;
  readonly margin: string;
  readonly badge?: string;
}): string => `
            <div class="${opts.margin} keep-together" data-block="cargo">
                <div class="flex justify-between items-end mb-1">
                    <h4 class="font-bold text-slate-900 text-[13px]">${opts.title} <span class="text-slate-400 font-normal">| ${opts.company}</span>${opts.badge ?? ""}</h4>
                    <span class="text-xs font-semibold text-slate-600">${duration(opts.period)} (${opts.period.split("·")[0].trim()}) · ${opts.period.split("·")[1]?.trim() ?? ""}</span>
                </div>
                <div class="tech-box">
${opts.tech.map((line) => `                    ${line}<br>`).join("\n").replace(/<br>$/, "")}
                </div>
                <ul class="list-disc pl-4 text-[11.5px] text-slate-700 space-y-1.5 mt-2">
${opts.bullets.map((b) => `                    <li>${b}</li>`).join("\n")}
                </ul>
            </div>`;

/** The four headline metric cards. */
const metrics = (cards: ReadonlyArray<readonly [string, string, string]>): string => `
            <div class="grid grid-cols-4 gap-3 text-center">
${cards
  .map(
    ([value, label, caption]) => `
                <div class="bg-white border border-slate-200 rounded p-2 flex flex-col justify-start items-center shadow-sm">
                    <div class="font-black text-slate-800 text-[16px] leading-none mb-1.5">${value}</div>
                    <div class="text-[9px] text-emerald-700 uppercase font-black tracking-wide leading-tight mb-1">${label}</div>
                    <div class="text-[9px] text-slate-500 font-medium leading-tight">${caption}</div>
                </div>`,
  )
  .join("\n")}
            </div>`;

/* The closing block is not defined here.

   Availability, engagement, communication, leadership and governance are the same
   words in all four documents, so they live in the shell and every variant
   inherits them. Defining them per-variant would have meant four copies of the
   same paragraph and a fourth place to forget to update - which is how "identical
   across all versions" quietly stops being true. */

const summary = (lead: string, body: string): string => `
            <p class="text-[12.5px] leading-relaxed text-slate-700 text-justify">
                <strong>${lead}</strong>${body}</p>`;

export const variants = [
  {
slug: "enterprise-java",
    label: "Enterprise Java + Angular",
    title: "Marcelino Sandroni - Engenheiro Java e Angular",
    headline: "Engenheiro de Software | Angular + Java",
    skills: `<div class="text-[11.5px] text-slate-700">
                <p class="mb-1" data-item><strong>Frontend &amp; UI Architecture:</strong> Angular (v8 à v22), TypeScript, JavaScript, HTML5, CSS3, SASS, Micro-frontends (Module Federation), Estado/Reatividade (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, shadcn, Design Systems.</p>
                <p class="mb-1" data-item><strong>Backend &amp; Frameworks:</strong> Java (do 8 ao 25 LTS), Spring Boot 3.x (AOT/GraalVM), Spring Cloud, Spring WebFlux (Project Reactor), Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA (N+1), Tuning de JVM (ZGC/G1GC).</p>
                <p class="mb-1" data-item><strong>Inteligência Artificial &amp; Dados:</strong> LLMs corporativos via Spring AI e LangChain4j, Amazon Bedrock (Claude/Titan), RAG, Agentic Workflows (Function Calling), Vector Databases (pgvector, Milvus).</p>
                <p class="mb-1" data-item><strong>Cloud (AWS), DevOps &amp; SRE:</strong> AWS (EKS/ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, CloudWatch), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Bitbucket Pipelines, Jenkins), Observabilidade (OpenTelemetry, Datadog).</p>
                <p class="mb-1" data-item><strong>Arquitetura, APIs &amp; Mensageria:</strong> RESTful Nível 3, gRPC, GraphQL, WebSockets/SSE, Apache Kafka (partições, idempotência), RabbitMQ (topic exchanges, DLQ), Circuit Breakers, Clean Architecture, DDD, CQRS, SOLID.</p>
                <p class="mb-1" data-item><strong>Ecossistema Analítico &amp; Bancos:</strong> Oracle, PostgreSQL, SQL Server, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.</p>
            </div>`,
    sections: {
      summary: summary(
        "Engenheiro de Software unindo 6+ anos em arquiteturas distribuídas (Java, Spring, Angular, Kafka) a 15 anos de background corporativo e financeiro. ",
        "Atuo da concepção de ecossistemas cloud-native do zero ao desacoplamento de sistemas críticos. Foco na construção de microsserviços, micro-frontends e IA corporativa (Agentes/RAG), garantindo alta performance, escalabilidade e resiliência para sistemas de missão crítica, sob extrema cultura de testes e observabilidade.",
      ),
      metrics: metrics([
        ["+R$ 500 Bi", "Gestão de Ativos", "Plataformas B2B de custódia e orquestração de fundos."],
        ["D+0", "Liquidação Real-Time", "De 24h (D+1) para menos de 1s, via Kafka e microsserviços Java."],
        ["100M+ msgs/dia", "Alta Escala", "Orientada a eventos, tolerante a falhas."],
        ["95%", "Cobertura de Testes", "Cultura de QA e TDD em backend (JUnit) e frontend (Cypress)."],
      ]),
    },
    experience: [        role({
          title: "Engenheiro de Software &amp; Tech Lead",
          company: "DGT Tecnologia",
          period: "Out/2025 – Set/2026 · Remoto",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Stack Enterprise:</strong> Java, Spring Boot, Spring AI, Angular, TypeScript, Micro-frontends, PostgreSQL (pgvector), Redis, RabbitMQ, gRPC, Kubernetes, AWS.",
          ],
          bullets: [
            "<strong>Liderança Técnica &amp; Integração IA:</strong> Liderança de squad multidisciplinar de 8 pessoas (Back, Front, QA e Dados) na reestruturação de sistemas críticos processando 100M+ mensagens/dia. IA Corporativa conectando o backend via Spring AI e Amazon Bedrock para fluxos agênticos em tempo real, com assertividade absoluta (contrato de R$ 24M/ano preservado).",
            "<strong>Aceleração de 10x no Processamento:</strong> Migração de arquitetura relacional gargalo para um ecossistema de microsserviços distribuídos em Java, otimizado com tuning de JVM (ZGC) e comunicação de baixa latência via gRPC e RabbitMQ.",
            "<strong>Micro-frontends Enterprise:</strong> Interfaces web complexas em Angular sobre micro-frontends reaproveitáveis, com gerenciamento reativo (RxJS/NgRx) via WebSockets, assegurando UX fluida sob alta carga.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Banco BNP Paribas (via Antlia)",
          period: "Dez/2022 – Set/2025 · Híbrido",
          margin: "mb-2 keep-together",
          tech: [
            "<strong>Stack Enterprise:</strong> Java (Spring Boot/Cloud/Batch), Angular, Micro-frontends, Oracle SQL, Kafka, OAuth2, Kubernetes, Jenkins, Helm, Arquitetura Hexagonal.",
          ],
          bullets: [
            "<strong>Modernização de Monolito Bancário:</strong> Pilar técnico de uma tribo de 12 desenvolvedores no desacoplamento de sistemas legados críticos (COBOL, VB) do maior cliente do banco para arquitetura orientada a eventos com Java e interfaces modulares em Angular, alcançando 95% de cobertura em testes.",
            "<strong>Liquidação D+0 &amp; Tempo Real:</strong> Substituição de esteiras obsoletas (D+1) por conciliação de fundos em tempo real via Apache Kafka e rotinas massivas com Spring Batch, gerando +45% nos ativos geridos em 1 ano com SLA de 100% uptime.",
            "<strong>Economia e Orquestração Global:</strong> Automação da orquestração de fundos ETF institucionais, integrando B3 e bolsas internacionais (EUA/Europa), com impacto estimado de +R$ 50 Milhões em captação.",
          ],
        }),
      ].flat().concat([        role({
          title: "Engenheiro de Software",
          company: "Banco Itaú",
          period: "Jul/2020 – Nov/2022 · Híbrido",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Stack Enterprise:</strong> Java (Spring Boot/WebFlux), Angular, TypeScript, PostgreSQL, Redis, Kafka, AWS, Docker, Kubernetes, Terraform.",
          ],
          bullets: [
            "<strong>Custódia Institucional Estratégica (+R$ 100 Bi):</strong> Orquestração conjunta em esquadrão de 15 engenheiros e especialistas desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native na AWS (EKS, RDS, SQS), APIs reativas em Java e painéis Angular.",
            "<strong>Gestão de Crises e Resiliência:</strong> Resolução de gargalos críticos de concorrência em mensageria Kafka sob tráfego de alta volatilidade em menos de 24h, aplicando políticas estritas de idempotência para manter a integridade transacional.",
            "<strong>Aumento de 8x na Qualidade de Software:</strong> Mentoria técnica para desenvolvedores juniores e implementação de esteiras CI/CD com automação E2E, blindando o ecossistema contra regressões críticas.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Zup Innovation",
          period: "Mar/2019 – Jun/2020 · Remoto",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Stack Enterprise:</strong> Java, Angular, TypeScript, PostgreSQL, Redis, RabbitMQ, AWS, Docker, Kubernetes, CI/CD.",
          ],
          bullets: [
            "<strong>Evolução de Carreira e Migração Cloud:</strong> Contratado no início da carreira técnica e promovido em 1 ano pelo impacto em entregas críticas. Time ágil de 6 desenvolvedores refatorando serviços monolíticos em Java para arquiteturas baseadas em eventos, migrando para AWS na metade do prazo.",
            "<strong>Resiliência e Circuit Breakers:</strong> Correção estrutural em integrações de mensageria assíncrona com RabbitMQ, implementando Circuit Breakers e Dead Letter Queues (DLQs), elevando a assertividade de dados transacionais para 100%.",
          ],
        }) + role({
          title: "Analista Contábil &amp; Gestor Financeiro",
          company: "Consultoria Corporativa",
          period: "Jul/2003 – Dez/2018 · Presencial",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, Automação de Processos ERP, Compliance SOX, IFRS/CPC, Planejamento Tributário e Integração de Dados.",
          ],
          bullets: [
            "<strong>Diferencial em Engenharia Corporativa:</strong> Liderança de equipes e redesenho de processos que reduziu o fechamento contábil de 30 para 5 dias (-83%), com 15 anos em FinOps, ERP, SOX e planejamento tributário e expertise em regras financeiras traduzidas para equipes de software (DDD).",
          ],
        }),
      ]),
  },

  {
    slug: "enterprise-dotnet",
    label: "Enterprise C# + Angular",
    title: "Marcelino Sandroni - Engenheiro C# e Angular",
    headline: "Engenheiro de Software | C# &amp; Angular",
    skills: `<div class="text-[11.5px] text-slate-700">
                <p class="mb-1" data-item><strong>Frontend &amp; UI Architecture:</strong> Angular, TypeScript, RxJS, NgRx, Micro-frontends (Module Federation), SSR, Design Systems, Tailwind CSS, Angular Material, Cypress, Flutter.</p>
                <p class="mb-1" data-item><strong>Backend &amp; Frameworks:</strong> C# (.NET Core 6/8), ASP.NET Core, Entity Framework Core, xUnit, REST, gRPC, Clean Architecture, DDD, CQRS, SOLID.</p>
                <p class="mb-1" data-item><strong>Cloud, DevOps &amp; Mensageria:</strong> AWS (EKS, ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, Secrets Manager, KMS), Docker, Kubernetes (Helm), Terraform, CI/CD (Jenkins, GitHub Actions), Apache Kafka, RabbitMQ, OpenTelemetry, Prometheus.</p>
                <p class="mb-1" data-item><strong>Dados &amp; Analítico:</strong> SQL Server, PostgreSQL, MySQL, Oracle, Redis, MongoDB, ClickHouse, Databricks, RAG, LangChain.</p>
            </div>`,
    sections: {
      summary: summary(
        "Engenheiro de Software especializado em C#/.NET e Angular para plataformas de ativos e custódia, ",
        "com 6 anos de engenharia de software e 15 em governança financeira. No Itaú desenhei a plataforma que sustenta +R$ 100 bilhões em custódia e liderei a adoção de testes automatizados em .NET, Angular e Flutter que elevou a qualidade em 8x.",
      ),
      metrics: metrics([
        ["+R$ 100 Bi", "Custódia", "Plataforma B2B integrada à B3 com visão multi-carteira."],
        ["8x", "Qualidade", "Programa de testes em .NET, Angular e Flutter."],
        ["80%+", "Cobertura", "xUnit, JUnit e Cypress com pipeline por commit."],
        ["&lt;24h", "Resgate Crítico", "Lançamento com falha entregue no prazo."],
      ]),
    },
    experience: [        role({
          title: "Engenheiro de Software &amp; Tech Lead",
          company: "DGT Tecnologia",
          period: "Jan/2026 – Set/2026 · Remoto",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>C# &amp; .NET:</strong> .NET Core, ASP.NET, NuGet, xUnit, Microsserviços .NET, Entity Framework.",
            "<strong>Front/Mobile:</strong> Angular, TypeScript, Storybook, Design Systems, Micro-frontends.",
            "<strong>Dados &amp; Infra:</strong> MySQL, ClickHouse, Databricks, Redis, RabbitMQ, Kubernetes, Terraform.",
          ],
          bullets: [
            "<strong>10x de performance (100M+ eventos/dia):</strong> Decomponho monolito em .NET em 12 microsserviços — Go para processamento de vídeo, .NET Core para regras de negócio — com escalabilidade horizontal independente.",
            "<strong>Consultas de 30s para &lt;200ms:</strong> Migrei MySQL para ClickHouse com pipeline ETL em Databricks, reduzindo em 70% a carga sobre o banco transacional.",
            "<strong>R$ 24M/ano preservados:</strong> assertividade de leitura de placas elevada de &lt;60% para 100% em 6 semanas, com TDD e automação E2E com Playwright no lugar de validação manual de QA.",
            "<strong>Cultura de reutilização em .NET:</strong> Bibliotecas NuGet e Maven privadas, design system Angular documentado em Storybook e portal de arquitetura com ADRs, onboarding de meses para semanas.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Antlia / Banco BNP Paribas",
          period: "Mar/2023 – Dez/2025 · Híbrido",
          margin: "mb-2 keep-together",
          tech: [
            "<strong>C# &amp; .NET:</strong> .NET Core, ASP.NET, NuGet, xUnit, Entity Framework.",
            "<strong>Java &amp; Front:</strong> Java (Spring Boot), Angular, TypeScript, Micro-frontends, Design Systems.",
            "<strong>Dados &amp; Regulação:</strong> Oracle SQL, PostgreSQL, Kafka, Redis, SOX, Helm, Kubernetes, IBM Cloud.",
          ],
          bullets: [
            "<strong>Migração de legado C# e VB para arquitetura orientada a eventos:</strong> Desacoplei sistemas em COBOL, VB e C# com Kafka, quebrando monolitos em microsserviços e Angular, alcançando 95%+ de cobertura de testes.",
            "<strong>Arquitetura hexagonal como padrão do banco:</strong> SOLID e Clean Code em todos os serviços, com code review sistemático e definição clara de DoR/DoD.",
          ],
        }),
      ].flat().concat([        role({
          title: "Engenheiro de Software",
          company: "Banco Itaú (Atacado)",
          period: "Mar/2022 – Fev/2023 · Híbrido",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>C# &amp; .NET:</strong> .NET Core, ASP.NET, Entity Framework, xUnit, Testes de integração com banco embutido.",
            "<strong>Angular &amp; Mobile:</strong> Angular, TypeScript, RxJS, Cypress, Flutter, Micro-frontends.",
            "<strong>Enterprise:</strong> AWS (EC2, S3, Lambda, SQS, RDS), Docker, Kubernetes, Terraform, CI/CD.",
          ],
          bullets: [
            "<strong>Custódia institucional de +R$ 100 Bi:</strong> Desenhei e sustentei plataforma B2B conectada à B3 para apuração contínua e visão unificada multi-carteira atendendo investidores de altíssimo patrimônio.",
            "<strong>Qualidade em 8x:</strong> Implementei e capacitei time de 9 pessoas em testes unitários .NET e Java (80%+ de cobertura), E2E com Cypress nos fluxos críticos de Angular e mobile com Flutter Test.",
            "<strong>+45% de ativos sob gestão em 1 ano:</strong> Liquidação migrou de D+1 para tempo real e o uptime subiu de 95% para 100%, com lançamento de novos produtos em semanas em vez de meses.",
            "<strong>Resgate de lançamento crítico em &lt;24h:</strong> Corrigi microsserviços de mensageria e integrações quebradas com observabilidade estruturada, entregando o lançamento no prazo.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Pollux Technology",
          period: "Fev/2021 – Fev/2022 · Remoto",
          margin: "mb-4 keep-together",
          badge:
            ' <span class="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[9px] ml-1 uppercase font-bold">Promoção em 3 meses</span>',
          tech: [
            "<strong>C# &amp; Front:</strong> .NET, React, Next.js, Angular, TypeScript, Micro-frontends, Tailwind CSS, Design System.",
            "<strong>Dados &amp; Infra:</strong> PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, AWS, GCP, Kubernetes, Terraform.",
            "<strong>Enterprise:</strong> Serverless, CI/CD.",
          ],
          bullets: [
            "<strong>Redução de 50% em custo de cloud:</strong> Políticas de auto-scaling e right-sizing na AWS, somando a migração concluída em metade do prazo.",
            "<strong>80% de entregas antecipadas:</strong> Com time de 5 pessoas em clientes de saúde, financeiro e esportes, sustentei 100% de pontualidade sob prazos apertados.",
          ],
        }) + role({
          title: "Analista Contábil &amp; Gestor Financeiro",
          company: "Consultoria Corporativa (15 Anos)",
          period: "Jul/2005 – Dez/2020 · Presencial",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, IFRS &amp; CPC, SOX Compliance, Planejamento Tributário, Automação de ERP. Diferencial estratégico: visão de balanço e compliance para desenhar a regra de negócio certa.",
          ],
          bullets: [
            "<strong>Fechamento contábil de 30 para 2 dias:</strong> Redesenho de processos liberando 20+ pessoas para funções de maior valor agregado.",
            "<strong>Economia de +R$ 3 milhões:</strong> Planejamento tributário e reclassificação contábil com rigor auditável.",
          ],
        }),
      ]),
  },

  {
    slug: "modern-web",
    label: "Modern Node + Go + React",
    title: "Marcelino Sandroni - Engenheiro Node, Go e React",
    headline: "Engenheiro de Software | Node, Go &amp; React",
    skills: `<div class="text-[11.5px] text-slate-700">
                <p class="mb-1" data-item><strong>Frontend &amp; UI:</strong> React, Next.js (RSC, SSR), Angular, Vue.js, React Native, TypeScript, Micro-frontends (Module Federation), Storybook, Tailwind CSS, Design Systems.</p>
                <p class="mb-1" data-item><strong>Backend &amp; Distribuídos:</strong> Node.js, NestJS, Go, Java (Spring Boot), .NET Core, Python, REST, gRPC, WebSockets, Circuit Breakers, RabbitMQ (DLQ), Apache Kafka, Serverless.</p>
                <p class="mb-1" data-item><strong>Dados &amp; Analítico:</strong> PostgreSQL, MySQL, MongoDB, Redis, ClickHouse, Databricks, ETL, Pipelines de Dados.</p>
                <p class="mb-1" data-item><strong>Cloud, DevOps &amp; SRE:</strong> AWS (EKS, ECS, Lambda, S3, RDS, DynamoDB, SQS, EventBridge, API Gateway), GCP, Azure, Docker, Kubernetes (Helm), Terraform, CI/CD (Jenkins, GitHub Actions), Prometheus, Grafana, Jaeger, OpenTelemetry.</p>
                <p class="mb-1" data-item><strong>IA &amp; Dados Aplicacionais:</strong> PyTorch, TensorFlow, YOLOv8, LangChain, MLflow, Agentes LLM, Visão Computacional, SDD (Spec Driven Development).</p>
            </div>`,
    sections: {
      summary: summary(
        "Engenheiro de Software focado em Node, Go e React para sistemas de alta escala, ",
        "com 6 anos de engenharia de software e 15 em governança financeira. Entrego performance onde ela é medida — 10x em 100 milhões de mensagens por dia, consultas de 30s para menos de 200ms, deploy de 4 horas para 15 minutos — com microsserviços em Go, APIs em NestJS e interfaces em React e Next.js em Kubernetes.",
      ),
      metrics: metrics([
        ["10x", "Performance", "100M+ mensagens processadas por dia em Go."],
        ["30s → 200ms", "Consultas", "MySQL para ClickHouse com ETL em Databricks."],
        ["4h → 15min", "Deploy", "Pipeline declarativo em Kubernetes."],
        ["-50%", "Custo Cloud", "Auto-scaling e right-sizing na AWS."],
      ]),
    },
    experience: [        role({
          title: "Engenheiro de Software &amp; Tech Lead",
          company: "DGT Tecnologia",
          period: "Jan/2026 – Set/2026 · Remoto",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Go &amp; Node:</strong> Go (processamento de imagem e vídeo), Node.js, NestJS, TypeScript, REST, RabbitMQ, Circuit Breaker, Dead Letter Queues.",
            "<strong>React &amp; Front:</strong> React, Next.js, Angular, React Native, Micro-frontends, Storybook, TailwindCSS, Design Systems.",
            "<strong>Infra &amp; Dados:</strong> ClickHouse, Databricks, Redis, Kubernetes, Docker, Helm, Terraform, Prometheus, Grafana, Jaeger, OpenTelemetry.",
          ],
          bullets: [
            "<strong>Arquitetura de alto volume em Go:</strong> Decomposição de monolito em 12 microsserviços — Go para o processamento intensivo de imagem e vídeo, .NET Core para regras de negócio — com escalabilidade horizontal independente.",
            "<strong>10x de performance e 99% menos latência:</strong> Migração MySQL para ClickHouse, ETL em Databricks e cache Redis com invalidação inteligente cortaram a carga do banco em 70% e levaram dashboards de 30s para &lt;200ms.",
            "<strong>Entrega contínua construída do zero:</strong> Jenkins + Kubernetes + Helm + Terraform, com Prometheus/Grafana/Jaeger/OpenTelemetry: deploy de 4h para 15min, releases de 1/semana para 4/dia, incidentes -80% e rollback em &lt;2min.",
            "<strong>R$ 24M/ano preservados em 6 semanas:</strong> assertividade de leitura de placas de &lt;60% para 100%, com TDD e Playwright E2E substituindo validação manual.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Antlia / Banco BNP Paribas",
          period: "Mar/2023 – Dez/2025 · Híbrido",
          margin: "mb-2 keep-together",
          tech: [
            "<strong>Node &amp; Front:</strong> React, Next.js, Angular, TypeScript, RxJS, Micro-frontends, Design Systems.",
            "<strong>Dados &amp; Infra:</strong> Kafka, PostgreSQL, Oracle SQL, Redis, Docker, Jenkins, Kubernetes, Helm, IBM Cloud.",
            "<strong>Arquitetura:</strong> Microsserviços, Orientação a Eventos, Arquitetura Hexagonal, DDD, TDD, SOX.",
          ],
          bullets: [
            "<strong>Desacoplamento de legado:</strong> Sistema bancário em COBOL e VB reescrito como arquitetura orientada a eventos com Kafka e micro-frontends, alcançando 95%+ de cobertura de testes.",
            "<strong>Pagamentos em tempo real:</strong> Liquidação migrou de D+1 para tempo real com SLA de 100% de uptime e sem impacto contábil sob auditoria SOX.",
            "<strong>+R$ 50 milhões em oportunidades:</strong> Automatizei a orquestração global de fundos ETF sob compliance SOX.",
          ],
        }),
      ].flat().concat([        role({
          title: "Engenheiro de Software",
          company: "Banco Itaú (Atacado)",
          period: "Mar/2022 – Fev/2023 · Híbrido",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Front &amp; Mobile:</strong> Angular, React, Flutter, TypeScript, Micro-frontends, Design Systems, Cypress.",
            "<strong>Back/Data:</strong> Node.js, C# (.NET), Java (Spring), PostgreSQL, Redis, Kafka, RabbitMQ.",
            "<strong>Cloud:</strong> AWS (EC2, S3, Lambda, SQS, SNS, RDS, API Gateway), Docker, Kubernetes, Terraform, CI/CD.",
          ],
          bullets: [
            "<strong>Custódia institucional de +R$ 100 Bi:</strong> Desenhei e sustentei plataforma B2B conectada à B3 com visão unificada multi-carteira em tempo real para investidores de altíssimo patrimônio.",
            "<strong>+45% de ativos sob gestão em 1 ano:</strong> Liquidação migrou de D+1 para tempo real e o uptime subiu de 95% para 100%.",
          ],
        }) + role({
          title: "Engenheiro de Software",
          company: "Pollux Technology",
          period: "Fev/2021 – Fev/2022 · Remoto",
          margin: "mb-4 keep-together",
          badge:
            ' <span class="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[9px] ml-1 uppercase font-bold">Promoção em 3 meses</span>',
          tech: [
            "<strong>React &amp; Next:</strong> React, Next.js (RSC, SSR), Angular, Vue.js, React Native, TypeScript, Micro-frontends, Tailwind CSS, Design System.",
            "<strong>Node &amp; Go:</strong> NestJS, Node.js, Go, Java (Spring), Python, .NET, PostgreSQL, MongoDB, Redis, RabbitMQ.",
            "<strong>Cloud &amp; Infra:</strong> AWS, GCP, Azure, Kubernetes, Docker, Terraform, Serverless, DynamoDB, EventBridge, CI/CD.",
          ],
          bullets: [
            "<strong>Migração cloud na metade do prazo:</strong> Conduzi migração completa para AWS em 3 meses em vez de 6, com redução de 50% em custo e até 200% de ganho de performance.",
            "<strong>80% de entregas antecipadas:</strong> Com time de 5 pessoas em clientes de saúde, financeiro e esportes, sustentei 100% de pontualidade sob prazos apertados.",
          ],
        }) + role({
          title: "Analista Contábil &amp; Gestor Financeiro",
          company: "Consultoria Corporativa (15 Anos)",
          period: "Jul/2005 – Dez/2020 · Presencial",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, IFRS &amp; CPC, SOX Compliance, Planejamento Tributário, Automação de ERP. Diferencial estratégico: visão de negócios e compliance para desenvolvimento tech.",
          ],
          bullets: [
            "<strong>Fechamento contábil de 30 para 2 dias:</strong> Redesenho de processos liberando capital de giro e 20+ pessoas para funções estratégicas.",
            "<strong>Economia de +R$ 3 milhões:</strong> Planejamento tributário e alocação precisa de capital de giro.",
          ],
        }),
      ]),
  },
] as const;
