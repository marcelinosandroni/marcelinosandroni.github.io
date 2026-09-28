import type { HomeContent } from "@/domain/portfolio";

/**
 * Home page content — pt-BR.
 *
 * Every visitor-facing string on the home route lives here. The resume remains
 * the document of record: this file frames the *same* career as an executive
 * landing page without altering a single resume fact (DESIGN.md §12).
 *
 * Numbers are the ones defensible in an interview, sourced from the resume's own
 * case studies. Nothing here is a vanity metric.
 */
export const homeContentPtBR: HomeContent = {
  locale: "pt-BR",

  hero: {
    statusPill: "Engenharia Executiva // Especificação AnimateMatrix v6.0",
    name: "Marcelino Sandroni Dias",
    headlineLead: "Engenharia do futuro em",
    headlineAccent: "IA e finanças",
    headlineTail: "distribuídas.",
    role: "Engenheiro de Software Sênior & Tech Lead",
    narrative:
      "21 anos conectando governança financeira corporativa, enfileiramentos de IA de altíssimo volume e arquiteturas fintech de altíssima concurrência. Histórico comprovado protegendo milhões em contratos críticos de segurança pública e banco — e converter cada decisão técnica em retorno financeiro auditável.",
    metaDescription:
      "Currículo vivo de Marcelino Sandroni Dias: 15 anos entre governança financeira, pipelines de IA e fintech de alta concorrência — R$ 24M/ano e 100M msgs/dia de impacto medido.",
    primaryAction: {
      label: "Agendar uma conversa executiva",
      href: "#contact",
      icon: "calendar",
    },
    secondaryAction: {
      label: "Explorar a trajetória",
      href: "#experience",
    },
    availability: "Disponível para liderança fracionada, consultoria de arquitetura e mentoria técnica",
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
        label: "E-MAIL DIRETO",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "marcelino.sandroni@gmail.com",
        icon: "mail",
        external: false,
      },
    ],
    portrait: {
      src: null,
      alt: "Retrato de Marcelino Sandroni Dias, Tech Lead e Arquiteto de Software",
      cornerMarks: ["// SEC_ID: NEO-001", "[SYS_OK]", "// CIPHER: HEX-256", "LATÊNCIA < 0.1ms"],
      badge: "ASSERTIVIDADE 100%",
      caption: "NEO // ARQUITETO TÉCNICO",
      captionMeta: "Núcleos distribuídos · SOX · GenAI",
      ticker: ["UPLINK: ATIVO // 100M MSGS/DIA", "100% DE SLA"],
    },
  },

  kpis: {
    id: "kpis",
    kicker: "// MÉTRICAS DUAS & IMPACTO FISCAL",
    title: "Rigor de engenharia medido em capital e velocidade",
    note: "Zero métricas de vaidade. Retornos de balanço auditáveis, arquiteturas sem indisponibilidade e stewardship profundo de conformidade.",
    items: [
      {
        id: "finance",
        label: "SOBERANÇA FINANCEIRA",
        value: "15 anos",
        scale: "monumental",
        description:
          "Base em contabilidade e estratégia corporativa. IFRS, controles SOX e governança tributária traduzidos diretamente em arquiteturas de software sem déficit.",
        icon: "account",
        accent: "primary",
        footnote: { label: "CICLO DE FECHAMENTO", value: "−83% DE COMPRESSÃO" },
      },
      {
        id: "throughput",
        label: "BACKEND DE ALTA CONCURRÊNCIA",
        value: "100M+",
        scale: "monumental",
        description:
          "Mensagens de telemetria processadas por dia em pipelines distribuídos em Go, particionamento Apache Kafka, ClickHouse e latência p99 de borda abaixo de 10ms.",
        icon: "bolt",
        accent: "secondary",
        footnote: { label: "RECEITA PROTEGIDA", value: "R$ 24M/ANO" },
      },
      {
        id: "product",
        label: "DESIGN SYSTEM & UX",
        value: "Pixel-perfect",
        scale: "headline",
        description:
          "Sistemas frontend e microfrontends com Next.js, React, Tailwind e Flutter. Zero regressões, acessibilidade AA e carregamento instantâneo.",
        icon: "brush",
        accent: "primary",
        footnote: { label: "REUSABILIDADE", value: "+40% DE VELOCIDADE" },
      },
      {
        id: "ai",
        label: "ENXAMES COGNITIVOS & IA",
        value: "IA aplicada",
        scale: "headline",
        description:
          "Agentes autônomos, RAG empresarial, similaridade com pgvector e modelos otimizados com TensorRT para inferência em fluxos de vídeo em tempo real.",
        icon: "brain",
        accent: "secondary",
        footnote: { label: "ASSERTIVIDADE DO MODELO", value: "100% DE RECALL" },
      },
    ],
  },

  stack: {
    id: "arsenal",
    kicker: "// ARSENAL TÉCNICO",
    title: "Construído para escala, resiliência e velocidade",
    note: "Sem dogmas. Cada linguagem, banco e broker é escolhido estritamente para resolver gargalos de alta concorrência e garantir estabilidade do negócio.",
    clusters: [
      {
        id: "frontend",
        title: "Frontend & Design Systems",
        description:
          "Microfrontends empresariais, bibliotecas de componentes acessíveis, gerenciamento de estado e atualizações em tempo real de alta frequência.",
        icon: "devices",
        accent: "primary",
        items: [
          "React",
          "Next.js (SSR/RSC)",
          "Angular",
          "React Native",
          "Flutter",
          "Tailwind CSS",
          "Module Federation",
          "Design Systems",
        ],
      },
      {
        id: "backend",
        title: "Backend & Arquitetura Distribuída",
        description:
          "Domain-Driven Design, Arquitetura Hexagonal, CQRS, outbox transacional e roteamento de alto volume por partição.",
        icon: "server",
        accent: "secondary",
        items: [
          "Go (Golang)",
          "Node.js (NestJS)",
          "C# .NET Core",
          "Java (Spring Boot)",
          "Python",
          "Apache Kafka",
          "ClickHouse",
          "PostgreSQL",
        ],
      },
      {
        id: "platform",
        title: "DevOps, Cloud & Confiabilidade",
        description:
          "Infraestrutura como código, deploys imutáveis, canários automatizados, telemetria distribuída e políticas de confiança zero.",
        icon: "cloud",
        accent: "primary",
        items: [
          "Kubernetes (K8s)",
          "Docker",
          "Terraform (IaC)",
          "AWS Cloud",
          "Azure",
          "GCP",
          "OpenTelemetry",
          "Datadog",
        ],
      },
      {
        id: "intelligence",
        title: "IA, Enxames Multi-Agente & Inferência",
        description:
          "GenAI em produção, analítica de vídeo de baixa latência, embeddings contextuais e copilotos automatizados para times de desenvolvimento.",
        icon: "cpu",
        accent: "secondary",
        items: [
          "LLM (GPT/Claude)",
          "pgvector & Qdrant",
          "RAG Pipelines",
          "TensorRT Edge",
          "LangChain",
          "Enxames Autônomos",
          "Playwright AI QA",
        ],
      },
    ],
  },

  trackRecord: {
    id: "experience",
    kicker: "// VELOCIDADE DE CARREIRA",
    title: "Trajetória: Experiência em Sistemas Mission-Critical",
    note: "DADOS LEGÍVEIS EM SEGUNDOS // ZERO ENCHILVAÇÃO",
    ctaLabel: "Abrir o currículo completo",
    resumeCtaLabel: "CURRÍCULO COMPLETO",
    currentCompany: "DGT Tecnologia",
    annotations: [
      {
        company: "DGT Tecnologia",
        impact: { label: "IMPACTO", value: "R$ 24M/ANO SALVOS", accent: "primary" },
        blueprintLabel: "// BLUEPRINT DE STACK",
        blueprint: ["Go", "ClickHouse", "Kafka", "TensorRT", "Kubernetes", "Playwright"],
        teamLine: "LIDERANÇA DE TIME: 10 PESSOAS (DEV, QA, BA, PO, PM)",
      },
      {
        company: "Antlia",
        impact: { label: "IMPACTO", value: "+45% DE ATIVOS SOB GESTÃO", accent: "secondary" },
        blueprintLabel: "// BLUEPRINT DE STACK",
        blueprint: [
          "Java Spring Boot",
          "Kafka",
          "Angular MFE",
          "Arquitetura Hexagonal",
          "Kubernetes",
        ],
        teamLine: "LIDERANÇA DE TIME: 8 DEVS (3 PRINCIPAIS/SÊNIORES), PO, QA, 2 BAs",
      },
      {
        company: "Banco Itaú",
        impact: { label: "ESCALA", value: "+R$ 100 BI EM CUSTÓDIA", accent: "primary" },
        blueprintLabel: "// BLUEPRINT DE STACK",
        blueprint: ["C# .NET", "Flutter", "Angular", "AWS", "Kafka"],
        teamLine: "COORTE: ESQUADRILHA MULTIDISCIPLINAR DE 9 PESSOAS",
      },
      {
        company: "Pollux Technologies",
        impact: { label: "CUSTO EM NUVEM", value: "−50% DE INFRA", accent: "secondary" },
        blueprintLabel: "// BLUEPRINT DE STACK",
        blueprint: ["Node.js", "TypeScript", "AWS Serverless", "React"],
        teamLine: "MÉTRICA: 80% DOS PROJETOS ENTREGUES ANTES DO PRAZO",
      },
      {
        company: "Empresas de Consultoria Contábil",
        impact: { label: "FECHAMENTO MENSAL", value: "30 → 5 DIAS (−83%)", accent: "primary" },
        blueprintLabel: "// DISCIPLINAS NÚCLEO",
        blueprint: ["IFRS / SOX", "Planejamento Tributário", "Integração ERP", "Auditoria"],
        teamLine: "FORMAÇÃO: BACHARELADO EM CIÊNCIAS CONTÁBEIS (ESTÁCIO)",
      },
    ],
  },

  blog: {
    id: "blog",
    kicker: "// CAPITAL INTELECTUAL",
    title: "Whitepapers de arquitetura selecionados",
    note: "ENGENHARIA & ESTRATÉGIA FISCAL",
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
        category: "OLAP DE ALTA CONCURRÊNCIA",
        readingTimeMinutes: 12,
        title: "De RDS para ClickHouse: 100M de mensagens/dia com p99 abaixo de 10ms",
        excerpt:
          "Benchmark de fundo sobre como eliminar contenção de locks em bancos relacionais e migrar para armazenamento colunar em consultas de telemetria de sub-segundo.",
        ctaLabel: "LER O BENCHMARK",
        accent: "secondary",
      },
      {
        slug: "dual-core-leader-accounting-rigor",
        category: "LIDERANÇA TÉCNICA",
        readingTimeMinutes: 6,
        title: "O líder de núcleo duplo: por que a rigor contábil corporativo forma melhores arquitetos",
        excerpt:
          "Como a disciplina financeira converte dívida técnica em passivos calculados e move a velocidade de desenvolvimento de centro de custo para motor de lucro.",
        ctaLabel: "LER O ENSAIO",
        accent: "primary",
      },
    ],
  },

  contact: {
    id: "contact",
    kicker: "// INICIAR ENGAJAMENTO",
    title: "Vamos conversar.",
    narrative:
      "Contrate um arquiteto que calcula a depreciação financeira da sua infraestrutura em nuvem antes de escrever a primeira linha de Go ou Java distribuído.",
    portalLabel: "// PORTAL DE ACESSO EXECUTIVO",
    statusNote: "STATUS: TODOS OS SISTEMAS NOMINAIS // CONFIANÇA ZERO // CONSENSO SUB-MILISSEGUNDO",
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
        value: "Fortaleza, CE (Remoto global / disponível para encontros-chave)",
        icon: "location",
        external: true,
      },
      {
        id: "response",
        label: "PRAZO DE RESPOSTA",
        href: "mailto:marcelino.sandroni@gmail.com",
        value: "Até 1 dia útil",
        icon: "verified",
        external: false,
      },
    ],
    brief: {
      ctaLabel: "Abrir briefing pré-preenchido",
      subject: "Conversa executiva — {company}",
      bodyTemplate:
        "Olá Marcelino,\n\nContexto: {company}\nEscopo: {scope}\n\nObjetivo da conversa:\n\nPrazo desejado:\n\nObrigado!",
    },
  },

  footer: {
    id: "footer",
    kicker: "// GATEWAY DE CONTATO",
    title: "Vamos falar de arquitetura, escala e ROI",
    narrative:
      "Disponível para consultoria estratégica, arquitetura principal e papéis selecionados de liderança fracionada em sistemas corporativos de altíssimo volume.",
    columns: [
      {
        id: "direct",
        title: "CANAIS DIRETOS",
        items: [
          {
            id: "session",
            label: "Agendar sessão executiva",
            href: "#contact",
            value: "Agendar sessão",
            icon: "calendar",
            external: false,
          },
          {
            id: "mail",
            label: "E-mail direto",
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
            label: "Perfil no GitHub",
            href: "https://github.com/marcelinosandroni",
            value: "github.com/marcelinosandroni",
            icon: "code",
            external: true,
          },
          {
            id: "linkedin",
            label: "Perfil no LinkedIn",
            href: "https://linkedin.com/in/marcelinosandroni",
            value: "linkedin.com/in/marcelinosandroni",
            icon: "external",
            external: true,
          },
          {
            id: "blog",
            label: "Blog de engenharia",
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
