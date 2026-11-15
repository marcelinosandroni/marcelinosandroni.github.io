/**
 * The "Modern Node + Go + React" variant in Brazilian Portuguese.
 *
 * Content only: the shell supplies the structure, the dates and the experience
 * every document shares, and `variants/shared.ts` supplies the type and the two
 * section fragments.
 */
import { metrics, summary, TIMELINE, type Variant } from "./shared";

export const variant: Variant = {
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
};
