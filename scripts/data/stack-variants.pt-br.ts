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
            <div class="${opts.margin} keep-together">
                <div class="flex justify-between items-end mb-1">
                    <h4 class="font-bold text-slate-900 text-[13px]">${opts.title} <span class="text-slate-400 font-normal">| ${opts.company}</span>${opts.badge ?? ""}</h4>
                    <span class="text-xs font-semibold text-slate-600">${opts.period}</span>
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

/** Availability, compensation and the closing block. */
const extras = (fit: string): string => `
            <div class="grid grid-cols-2 gap-4 text-[11.5px] text-slate-700">
                <div>
                    <p class="mb-1"><strong>Disponibilidade &amp; Setup:</strong> Imediata (100% Remoto, Global). Infraestrutura própria de alto desempenho, início imediato (Zero Onboarding Tech Delay).</p>
                    <p><strong>Pretensão &amp; Contratação:</strong> CLT R$ 8.000 / PJ R$ 12.000. Apto a B2B/Contractor no Brasil, EUA e Europa.</p>
                </div>
                <div>
                    <p><strong>Fit Cultural &amp; Soft Skills:</strong> ${fit}</p>
                </div>
            </div>`;

const summary = (lead: string, body: string): string => `
            <p class="text-[12.5px] leading-relaxed text-slate-700 text-justify">
                <strong>${lead}</strong>${body}</p>`;

export const variants = [
  {
    slug: "enterprise-java",
    label: "Enterprise Java + Angular",
    title: "Marcelino Sandroni - Engenheiro Java e Angular",
    sections: {
      summary: summary(
        "Engenheiro de Software especializado em Java e Angular para sistemas bancários e de ativos, ",
        "com 6 anos de engenharia de software e 15 em governança financeira. Modernizei o BNP Paribas — de COBOL, VB e C# para Java/Spring e Angular em arquitetura orientada a eventos com Kafka —, com SOX e BACEN como restrição de projeto e não como burocracia. Sei o que custa levar um sistema regulado de batch para tempo real sem quebrar um fechamento contábil.",
      ),
      metrics: metrics([
        ["95%+", "Cobertura de Testes", "Suíte automatizada em legado bancário, com TDD obrigatório."],
        ["24h → &lt;1s", "Pagamentos", "Batch virou tempo real com Kafka e microsserviços Java."],
        ["8 devs", "Time Liderado", "Três plenos, mentoria ativa e code review como padrão."],
        ["+R$ 50 Mi", "Oportunidades", "Criadas por automação sob compliance SOX."],
      ]),
      experienceA:
        role({
          title: "Engenheiro de Software",
          company: "Antlia / Banco BNP Paribas",
          period: "Mar/2023 – Dez/2025 · Híbrido",
          margin: "mb-2 keep-together",
          tech: [
            "<strong>Java &amp; Angular:</strong> Java 17/21, Spring Boot 3, JPA/Hibernate, Angular, TypeScript, RxJS, Micro-frontends, JUnit 5, Testcontainers.",
            "<strong>Mensageria &amp; Dados:</strong> Apache Kafka, Event Sourcing, PostgreSQL, Oracle SQL, Redis, RabbitMQ.",
            "<strong>Arquitetura &amp; Regulação:</strong> Arquitetura Hexagonal, DDD, CQRS, TDD, SOX, BACEN, Jenkins, Helm, IBM Cloud.",
          ],
          bullets: [
            "<strong>Modernização de legado bancário crítico:</strong> Liderei a migração de 8 devs de COBOL, VB e C# para Java/Spring e Angular em arquitetura orientada a eventos com Kafka, com arquitetura hexagonal, DDD e TDD como padrão — cobertura de 95%+ sem interromper a operação e onboarding de devs caindo de meses para semanas.",
            "<strong>Pagamentos em tempo real (24h → &lt;1s):</strong> Substituí processamento em batch por microsserviços Java Spring especializados em validação, conciliação e compliance, com circuit breaker e retry policies para resiliência em picos de demanda.",
            "<strong>Liquidação D+0 sem impacto contábil:</strong> conciliação de fundos em tempo real com SLA de 100% de uptime e fechamento contábil inalterado sob auditoria SOX.",
            "<strong>+R$ 50 milhões em oportunidades:</strong> Automatizei a orquestração global de fundos ETF sob compliance SOX, criando capacidade operacional para captação de grandes fortunas institucionais.",
          ],
        }) + role({
          title: "Engenheiro de Software &amp; Tech Lead",
          company: "DGT Tecnologia",
          period: "Jan/2026 – Set/2026 · Remoto",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Java &amp; ecosystem:</strong> Maven, Microsserviços Java, Kafka, APIs REST, Angular, TypeScript, Design Systems.",
            "<strong>Enterprise:</strong> Kubernetes, Docker, Helm, Terraform, CI/CD, ClickHouse, Databricks.",
          ],
          bullets: [
            "<strong>Preservação de contrato de R$ 24M/ano:</strong> Liderei a reestruturação de motor de IA e visão computacional, elevando assertividade de leitura de placas de &lt;60% para 100% em 6 semanas.",
            "<strong>Liderança de 10 pessoas:</strong> Coordenei devs, QA, BA, PO e PM, cortando 40% do tempo de desenvolvimento com design system Angular e bibliotecas compartilhadas.",
          ],
        }),
      experienceB:
        role({
          title: "Engenheiro de Software",
          company: "Banco Itaú (Atacado)",
          period: "Mar/2022 – Fev/2023 · Híbrido",
          margin: "mb-4 keep-together",
          tech: [
            "<strong>Java &amp; Angular:</strong> Java (Spring Boot), Angular, RxJS, Design Systems, Micro-frontends.",
            "<strong>Dados &amp; Infra:</strong> Apache Kafka, PostgreSQL, SQL Server, Redis, AWS (EC2/S3), Docker, Kubernetes.",
            "<strong>Qualidade:</strong> JUnit, xUnit, Cypress, Testes E2E, CI/CD.",
          ],
          bullets: [
            "<strong>Custódia institucional de +R$ 100 Bi:</strong> Desenhei e sustentei plataforma B2B conectada à B3 para apuração contínua e visão unificada multi-carteira, atendendo investidores de altíssimo patrimônio.",
            "<strong>+45% de ativos sob gestão em 1 ano:</strong> Liquidação migrou de D+1 para tempo real e o uptime subiu de 95% para 100%, com integração B3, NYSE, LSE e Eurex.",
            "<strong>Resolução de incidente crítico em &lt;24h:</strong> Neutralizei gargalo de concorrência na mensageria sob tráfego volátil, com diagnóstico em menos de 4 horas e integridade transacional mantida.",
          ],
        }) + role({
          title: "Engenheiro de Software Pleno",
          company: "Pollux Technology",
          period: "Fev/2021 – Fev/2022 · Remoto",
          margin: "mb-4 keep-together",
          badge:
            ' <span class="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[9px] ml-1 uppercase font-bold">Promoção em 3 meses</span>',
          tech: [
            "<strong>Java &amp; Front:</strong> Java (Spring Boot), React, Next.js, Angular, TypeScript, Micro-frontends, Tailwind CSS.",
            "<strong>Dados &amp; Infra:</strong> PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, AWS, GCP, Kubernetes.",
            "<strong>Enterprise:</strong> Microsserviços, Orientação a Eventos, CI/CD, Serverless, Terraform.",
          ],
          bullets: [
            "<strong>Migração cloud em metade do prazo:</strong> Conduzi migração completa para AWS no prazo de 3 meses em vez de 6, com 30% de redução de custo e até 200% de ganho de performance.",
            "<strong>80% de entregas antecipadas:</strong> Com time de 5 pessoas em clientes de saúde, financeiro e esportes, sustentei 100% de pontualidade sob prazos apertados.",
          ],
        }) + role({
          title: "Analista Contábil &amp; Gestor Financeiro",
          company: "Consultoria Corporativa (15 Anos)",
          period: "Jul/2005 – Dez/2020 · São Paulo",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, IFRS &amp; CPC, SOX Compliance, Planejamento Tributário, Automação de ERP. Diferencial estratégico: visão de balanço e compliance para desenhar a regra certa.",
          ],
          bullets: [
            "<strong>Fechamento contábil de 30 para 2 dias:</strong> Redesenho de processos com visão de negócio, liberando capital de giro para o produto.",
            "<strong>Economia de +R$ 3 milhões:</strong> Planejamento tributário e reclassificação contábil executados com rigor auditável.",
          ],
        }),
      extras: extras(
        "<em>Extreme Ownership</em> (Postura de Dono), domínio do setor regulado (SOX, BACEN, IFRS), resiliência em incidentes críticos e comunicação assertiva direta do C-Level à base técnica. Autodidata para stacks novas.",
      ),
    },
  },

  {
    slug: "enterprise-dotnet",
    label: "Enterprise C# + Angular",
    title: "Marcelino Sandroni - Engenheiro C# e Angular",
    sections: {
      summary: summary(
        "Engenheiro de Software especializado em C#/.NET e Angular para plataformas de ativos e custódia, ",
        "com 6 anos de engenharia de software e 15 anos em governança financeira. No Itaú desenhei a plataforma que sustenta +R$ 100 bilhões em custódia e liderei a adoção de testes automatizados em .NET, Angular e Flutter que elevou a qualidade em 8x. Antes disso, modernizei sistemas C# monolíticos que eu próprio já tinha herdado — sei exatamente o que dói em um codebase de .NET quando ele precisa virar outra coisa.",
      ),
      metrics: metrics([
        ["+R$ 100 Bi", "Custódia em Custódia", "Plataforma B2B integrada à B3 com visão multi-carteira."],
        ["8x", "Qualidade", "Programa de testes em .NET, Angular e Flutter."],
        ["80%+", "Cobertura", "xUnit, JUnit e Cypress com pipeline por commit."],
        ["&lt;24h", "Resgate Crítico", "Lançamento com falha entregue no prazo."],
      ]),
      experienceA:
        role({
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
      experienceB:
        role({
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
          title: "Engenheiro de Software Pleno",
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
          period: "Jul/2005 – Dez/2020 · São Paulo",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, IFRS &amp; CPC, SOX Compliance, Planejamento Tributário, Automação de ERP. Diferencial estratégico: visão de balanço e compliance para desenhar a regra de negócio certa.",
          ],
          bullets: [
            "<strong>Fechamento contábil de 30 para 2 dias:</strong> Redesenho de processos liberando 20+ pessoas para funções de maior valor agregado.",
            "<strong>Economia de +R$ 3 milhões:</strong> Planejamento tributário e reclassificação contábil com rigor auditável.",
          ],
        }),
      extras: extras(
        "<em>Extreme Ownership</em> (Postura de Dono), resiliência em incidentes críticos, comunicação assertiva do C-Level à base técnica e mentoria ativa de devs júnior e pleno.",
      ),
    },
  },

  {
    slug: "modern-web",
    label: "Modern Node + Go + React",
    title: "Marcelino Sandroni - Engenheiro Node, Go e React",
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
      experienceA:
        role({
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
      experienceB:
        role({
          title: "Engenheiro de Software Pleno",
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
          title: "Analista Contábil &amp; Gestor Financeiro",
          company: "Consultoria Corporativa (15 Anos)",
          period: "Jul/2005 – Dez/2020 · São Paulo",
          margin: "mb-5 keep-together",
          tech: [
            "<strong>Core Business:</strong> FinOps, IFRS &amp; CPC, SOX Compliance, Planejamento Tributário, Automação de ERP. Diferencial estratégico: visão de negócios e compliance para desenvolvimento tech.",
          ],
          bullets: [
            "<strong>Fechamento contábil de 30 para 2 dias:</strong> Redesenho de processos liberando capital de giro e 20+ pessoas para funções estratégicas.",
            "<strong>Economia de +R$ 3 milhões:</strong> Planejamento tributário e alocação precisa de capital de giro.",
          ],
        }),
      extras: extras(
        "<em>Extreme Ownership</em> (Postura de Dono), performance como requisito e não como curiosidade, resiliência em incidentes críticos, comunicação assertiva direta do C-Level à base técnica e autodidatismo para stacks novas.",
      ),
    },
  },
] as const;
