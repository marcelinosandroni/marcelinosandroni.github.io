import type { HomeContent } from "@/domain/portfolio";

/**
 * Home page content — pt-BR.
 *
 * Every visitor-facing string on the home route lives here. The resume remains
 * the document of record: this file frames the *same* career as an executive
 * landing page without altering a single resume fact (DESIGN.md §12).
 *
 * Copy rules enforced by the test suite, not by good intentions:
 *  - no fiction naming: no codenames, no film or pop-culture references, and no
 *    invented project names. Systems are named for what they do;
 *  - every figure is measurable — R$, %, or volumetry — and traceable to the
 *    resume, so nothing here is a vanity metric or a rounding of a rounding;
 *  - the career arithmetic is stated explicitly rather than left for the reader
 *    to infer from two date ranges.
 */
export const homeContentPtBR: HomeContent = {
  locale: "pt-BR",

  hero: {
    statusPill: "Disponível para liderança fracionada e consultoria",
    name: "Marcelino Sandroni Dias",
    headlineLead: "Engenharia de software com",
    headlineAccent: "impacto em R$",
    headlineTail: "e em escala.",
    role: "Engenheiro de Software Sênior & Tech Lead",
    narrative:
      "15 anos de governança financeira corporativa (2005–2020) somados a 6 anos de engenharia de software (2021–2026): 21 anos de expertise combinada. Atuação de ponta a ponta em arquitetura, backend, frontend, mobile e DevOps, com resultados medidos de R$ 24 milhões/ano em contratos protegidos, 100 milhões de mensagens processadas por dia e ganho de 10x em performance.",
    metaDescription:
      "Currículo vivo de Marcelino Sandroni Dias: 21 anos de expertise combinada entre governança financeira e engenharia de software — R$ 24M/ano e 100M msgs/dia de impacto medido.",
    primaryAction: {
      label: "Agendar uma conversa",
      href: "#contact",
      icon: "calendar",
    },
    secondaryAction: {
      label: "Ver a trajetória",
      href: "#experience",
    },
    availability: "Disponível para liderança fracionada, consultoria de arquitetura e mentoria",
    channels: [
      {
        id: "github",
        label: "GITHUB",
        href: "https://github.com/marcelinosandroni",
        value: "github.com/marcelinosandroni",
        icon: "code",
        external: true,
      },
      {
        id: "linkedin",
        label: "LINKEDIN",
        href: "https://linkedin.com/in/marcelinosandroni",
        value: "linkedin.com/in/marcelinosandroni",
        icon: "external",
        external: true,
      },
      {
        id: "email",
        label: "E-MAIL",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
        icon: "mail",
        external: false,
      },
    ],
    portrait: {
      src: "/portrait.jpg",
      alt: "Retrato de Marcelino Sandroni Dias, Tech Lead e Arquiteto de Software",
      cornerMarks: ["// ID: MSD-01", "[NOMINAL]", "// STACK: FULL", "LATÊNCIA < 0.1ms"],
      badge: "ASSERTIVIDADE 100%",
      caption: "// TECH LEAD & ARQUITETO DE SOFTWARE",
      captionMeta: "Go · .NET · Java · Kafka",
      ticker: ["PROCESSAMENTO: 100M MSGS/DIA", "100% DE SLA"],
    },
  },

  kpis: {
    id: "kpis",
    kicker: "// IMPACTO FINANCEIRO E OPERACIONAL",
    title: "Engenharia medida em capital, escala e disponibilidade",
    note: "Zero métrica de vaimento. Retorno auditável, arquitetura sem indisponibilidade e conformidade sob stewardship.",
    items: [
      {
        id: "track",
        label: "EXPERIÊNCIA COMBINADA",
        value: "21 anos",
        scale: "monumental",
        description:
          "15 anos de governança financeira corporativa (2005–2020) somados a 6 anos de engenharia de software (2021–2026). A base contábil é o que permite avaliar custo computacional e risco operacional como passivo de balanço.",
        icon: "account",
        accent: "primary",
        footnote: { label: "FECHAMENTO", value: "30→5 DIAS (-83%)" },
      },
      {
        id: "throughput",
        label: "BACKEND CORE",
        value: "100M+",
        scale: "monumental",
        description:
          "Mensagens de telemetria processadas por dia em pipelines distribuídos, com particionamento Apache Kafka, armazenamento colunar em ClickHouse e latência p99 de borda abaixo de 10ms.",
        icon: "server",
        accent: "secondary",
        footnote: { label: "RECEITA PROTEGIDA", value: "R$ 24M/ANO" },
      },
      {
        id: "platform",
        label: "DEVOPS & CLOUD",
        value: "-95%",
        scale: "monumental",
        description:
          "Tempo de deploy reduzido de 4 horas para 15 minutos, com rollback automático em menos de 2 minutos, 80% menos incidentes em produção e infraestrutura como código em AWS, Azure e GCP.",
        icon: "cloud",
        accent: "primary",
        footnote: { label: "DEPLOY", value: "4H → 15MIN" },
      },
      {
        id: "ai",
        label: "INTELIGÊNCIA ARTIFICIAL",
        value: "100%",
        scale: "monumental",
        description:
          "Assertividade de 100% em reconhecimento de placas com visão computacional, somada a RAG empresarial, similaridade com pgvector e inferência otimizada com TensorRT em fluxos de vídeo.",
        icon: "cpu",
        accent: "secondary",
        footnote: { label: "RECALL", value: "100% PROD" },
      },
    ],
  },

  stack: {
    id: "arsenal",
    kicker: "// ARSENAL TÉCNICO",
    title: "Quatro frentes, uma decisão por problema",
    note: "Categorias fechadas e rastreáveis ao currículo. Cada tecnologia listada aqui aparece no currículo, na categoria em que aparece aqui.",
    clusters: [
      {
        id: "frontend",
        title: "Frontend & UI",
        description:
          "Microfrontends empresariais, design systems acessíveis e renderização de alta frequência sem regressão de desempenho.",
        icon: "devices",
        accent: "primary",
        items: [
          "React",
          "Next.js (RSC, SSR)",
          "Angular",
          "Flutter",
          "React Native",
          "Tailwind CSS",
          "Design System",
          "Storybook",
        ],
      },
      {
        id: "backend",
        title: "Backend Core",
        description:
          "Arquitetura hexagonal, domain-driven design, mensageria de alta vazão e modelagem de dados relacional e colunar.",
        icon: "server",
        accent: "secondary",
        items: [
          "Go",
          "Java (Spring Boot)",
          "C# (.NET Core)",
          "Node.js (NestJS)",
          "Apache Kafka",
          "PostgreSQL",
          "ClickHouse",
          "Redis",
        ],
      },
      {
        id: "platform",
        title: "DevOps & Cloud",
        description:
          "Infraestrutura como código, orquestração com Kubernetes, observabilidade distribuída e entrega contínua com quality gates.",
        icon: "cloud",
        accent: "primary",
        items: [
          "Docker",
          "K8s (Helm, HPA)",
          "IaC (Terraform)",
          "AWS",
          "Azure",
          "GCP",
          "OpenTelemetry",
          "CI/CD",
        ],
      },
      {
        id: "intelligence",
        title: "Inteligência Artificial",
        description:
          "GenAI aplicada ao ciclo de desenvolvimento, recuperação aumentada por contexto e inferência de borda em tempo real.",
        icon: "cpu",
        accent: "secondary",
        items: [
          "Integração LLMs (OpenAI, Claude, Gemini)",
          "RAG",
          "pgvector",
          "Qdrant",
          "TensorRT",
          "LangChain",
          "Agentes autônomos",
        ],
      },
    ],
  },

  trackRecord: {
    id: "experience",
    kicker: "// TRAJETÓRIA",
    title: "Experiência: Execução em Sistemas de Produção",
    note: "TRÊS RESULTADOS POR EMPRESA // APENAS IMPACTO COMPROVÁVEL",
    ctaLabel: "Abrir o currículo completo",
    resumeCtaLabel: "CURRÍCULO COMPLETO",
    currentCompany: "DGT Tecnologia",
    annotations: [
      {
        company: "DGT Tecnologia",
        impact: { label: "IMPACTO", value: "R$ 24M/ANO SALVOS", accent: "primary" },
        blueprintLabel: "// STACK DO PAPEL",
        blueprint: ["Go", "ClickHouse", "Kafka", "Docker", "Kubernetes", "Playwright"],
        teamLine: "LIDERANÇA: 10 PESSOAS (DEV, QA, BA, PO, PM)",
      },
      {
        company: "Antlia",
        impact: { label: "IMPACTO", value: "+45% DE ATIVOS SOB GESTÃO", accent: "secondary" },
        blueprintLabel: "// STACK DO PAPEL",
        blueprint: ["Java Spring", "Kafka", "Angular", "Arquitetura Hexagonal", "Kubernetes"],
        teamLine: "LIDERANÇA: 8 DEVS (3 PRINCIPAIS) + PO, QA, PM, 2 BAs",
      },
      {
        company: "Banco Itaú",
        impact: { label: "ESCALA", value: "+R$ 100 BI EM CUSTÓDIA", accent: "primary" },
        blueprintLabel: "// STACK DO PAPEL",
        blueprint: [".NET Core", "Flutter", "Angular", "AWS", "Mensageria"],
        teamLine: "SQUAD MULTIDISCIPLINAR: 9 PESSOAS",
      },
      {
        company: "Pollux Technologies",
        impact: { label: "CUSTO EM NUVEM", value: "-50% DE INFRA", accent: "secondary" },
        blueprintLabel: "// STACK DO PAPEL",
        blueprint: ["TypeScript", "AWS", "Serverless", "React", "Python"],
        teamLine: "PROMOVIDO DE JÚNIOR A PLENO EM 3 MESES // 80% DOS PROJETOS ANTES DO PRAZO",
      },
      {
        company: "Empresas de Consultoria Contábil",
        impact: { label: "FECHAMENTO MENSAL", value: "30 → 5 DIAS (-83%)", accent: "primary" },
        blueprintLabel: "// DISCIPLINAS",
        blueprint: [
          "Sistemas Contábeis Integrados",
          "APIs de Integração",
          "Plataformas Cloud",
          "Sistemas de Gestão ERP",
        ],
        teamLine: "BACHARELADO EM CIÊNCIAS CONTÁBEIS // 20+ PESSOAS REALOCADAS",
      },
    ],
  },

  blog: {
    id: "blog",
    kicker: "// ESCRITOS TÉCNICOS",
    title: "Whitepapers e notas de campo",
    note: "ENGENHARIA DE DADOS E LIDERANÇA TÉCNICA",
    ctaLabel: "Ver todos os artigos",
    limit: 3,
    items: [
      {
        slug: "resilient-agent-swarms-on-kafka",
        category: "SISTEMAS DISTRIBUÍDOS",
        readingTimeMinutes: 8,
        title: "Arquitetando enxames resilientes com event streams Kafka",
        excerpt:
          "Broker de eventos sem perda, estratégias de particionamento e consumidores idempotentes ao orquestrar frotas de agentes de IA distribuídos.",
        ctaLabel: "LER O ENSAIO",
        accent: "primary",
      },
      {
        slug: "rds-to-clickhouse-100m-messages-a-day",
        category: "PLATAFORMAS DE DADOS",
        readingTimeMinutes: 12,
        title: "De RDS para ClickHouse: 100M de mensagens/dia com p99 abaixo de 10ms",
        excerpt:
          "Como eliminar contenção de concorrência em bancos relacionais e mover a análise para armazenamento colunar com consultas de sub-segundo.",
        ctaLabel: "LER O BENCHMARK",
        accent: "secondary",
      },
      {
        slug: "dual-core-leader-accounting-rigor",
        category: "LIDERANÇA TÉCNICA",
        readingTimeMinutes: 6,
        title: "O líder de núcleo duplo: por que a rigor contábil forma melhores arquitetos",
        excerpt:
          "Como a disciplina financeira converte dívida técnica em passivo calculado e move a velocidade de desenvolvimento de centro de custo para motor de lucro.",
        ctaLabel: "LER O ENSAIO",
        accent: "primary",
      },
    ],
  },

  contact: {
    id: "contact",
    kicker: "// CONTATO",
    title: "Vamos conversar.",
    narrative:
      "Contrate um arquiteto que dimensiona o custo de depreciação da sua infraestrutura antes de escrever a primeira linha de Go, Java ou .NET distribuído.",
    portalLabel: "// CANAL DE CONTATO DIRETO",
    statusNote: "RESPOSTA EM ATÉ 1 DIA ÚTIL // SEM FORMULÁRIO, SEM RASTREAMENTO",
    channels: [
      {
        id: "email",
        label: "E-MAIL",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
        icon: "mail",
        external: false,
      },
      {
        id: "location",
        label: "BASE",
        href: "https://www.google.com/maps/search/?api=1&query=Fortaleza+CE+Brasil",
        value: "Fortaleza, CE (remoto global)",
        icon: "location",
        external: true,
      },
      {
        id: "response",
        label: "RESPOSTA",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "Até 1 dia útil",
        icon: "verified",
        external: false,
      },
    ],
    brief: {
      ctaLabel: "Abrir briefing pré-preenchido",
      subject: "Conversa técnica — {company}",
      bodyTemplate:
        "Olá Marcelino,\n\nEmpresa: {company}\nEscopo: {scope}\n\nObjetivo da conversa:\n\nPrazo desejado:\n\nObrigado!",
    },
  },

  footer: {
    id: "footer",
    kicker: "// CONTATO",
    title: "Arquitetura, escala e retorno financeiro",
    narrative:
      "Disponível para consultoria estratégica, arquitetura principal e liderança fracionada em sistemas corporativos de altíssimo volume.",
    columns: [
      {
        id: "direct",
        title: "DIRETO",
        items: [
          {
            id: "session",
            label: "Agendar conversa",
            href: "#contact",
            value: "Agendar conversa",
            icon: "calendar",
            external: false,
          },
          {
            id: "mail",
            label: "E-mail",
            href: "mailto:marcelino.sandroni@gmail.com",
            value: "marcelino.sandroni@gmail.com",
            icon: "mail",
            external: false,
          },
          {
            id: "resume",
            label: "Currículo em PDF",
            href: "/resume",
            value: "Baixar PDF",
            icon: "download",
            external: false,
          },
        ],
      },
      {
        id: "networks",
        title: "REDES",
        items: [
          {
            id: "github",
            label: "GitHub",
            href: "https://github.com/marcelinosandroni",
            value: "github.com/marcelinosandroni",
            icon: "code",
            external: true,
          },
          {
            id: "linkedin",
            label: "LinkedIn",
            href: "https://linkedin.com/in/marcelinosandroni",
            value: "linkedin.com/in/marcelinosandroni",
            icon: "external",
            external: true,
          },
          {
            id: "blog",
            label: "Blog técnico",
            href: "/blog",
            value: "Whitepapers",
            icon: "document",
            external: false,
          },
        ],
      },
    ],
    legalNote: "Todos os direitos reservados.",
  },
};
