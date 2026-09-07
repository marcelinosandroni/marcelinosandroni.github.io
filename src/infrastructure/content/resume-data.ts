import type { ResumeContent } from "@/domain/resume/types";

export const resumeContent: ResumeContent = {
  locale: "pt-BR",
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE (Remoto)",
  contact: {
    phone: "+55 11 91446-1993",
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Engenheiro de Software Sênior Full Stack com o diferencial estratégico de unir engenharia de ponta a 15 anos de sólida experiência em negócios e contabilidade. Especialista em traduzir regras corporativas financeiras complexas em arquiteturas web escaláveis e sistemas distribuídos de alta volumetria. Atuo de ponta a ponta (Backend, Frontend, Mobile e DevOps) para construir produtos robustos que maximizam a rentabilidade financeira, escalam junto com a empresa e resolvem dores reais da operação sem quebrar o sistema. Atuo como referência técnica, combinando rigor metodológico, mentoria e uso de Inteligência Artificial para acelerar entregas com código limpo e sustentável.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Engenheiro de Software Sênior",
      period: "Jan/2026 – Presente",
      location: "Remoto",
      summary: "",
      highlights: [
        "Modernizou sistemas legados e orquestrou microsserviços de alta volumetria em C# (.NET), Go e Node.js com CQRS e Event-Driven.",
        "Arquitetou mensageria RabbitMQ (Topic Exchanges), Circuit Breaker e DLQs para 10 milhões de msgs/dia.",
        "Liderou cultura DevOps/SRE, CI/CD zero-downtime, Kubernetes com Helm/HPA, e IaC com Terraform.",
        "Desenvolveu arquiteturas reativas em Angular e React Native com Micro-frontends e otimização de Core Web Vitals.",
      ],
    },
    {
      company: "Antlia",
      role: "Engenheiro de Software Sênior",
      period: "Dez/2022 – Dez/2025",
      location: "Remoto",
      summary: "",
      highlights: [
        "Liderou desenvolvimento web para o setor financeiro em Angular, React e Next.js com gestão de estado complexa.",
        "Concebeu microsserviços DDD em Java (Spring Boot) e C# (.NET Core) garantindo transações ACID.",
        "Provisionou infraestrutura cloud (AWS/Azure) via Terraform, otimizando custos e redes seguras.",
      ],
    },
    {
      company: "Banco Itaú",
      role: "Engenheiro de Software Pleno",
      period: "Mar/2022 – Nov/2022",
      location: "Híbrido",
      summary: "",
      highlights: [
        "Conduziu adoção de Clean Code e TDD, elevando cobertura de testes e mitigando vulnerabilidades.",
        "Desenvolveu microsserviços altamente disponíveis em C# e Java integrados a brokers de mensagens.",
      ],
    },
    {
      company: "Pollux Technologies",
      role: "Engenheiro de Software Pleno",
      period: "Jun/2021 – Jan/2022",
      location: "Remoto",
      summary: "",
      highlights: [
        "Arquitetou microsserviços e aplicações serverless em TypeScript (NestJS), expondo APIs RESTful e GraphQL.",
        "Criou interfaces dinâmicas com aderência ágil ao mercado para startups utilizando React e Flutter.",
      ],
    },
    {
      company: "Empresas de Consultoria Contábil",
      role: "Analista Contábil & Gestor",
      period: "Jan/2005 – Dez/2020",
      location: "São Paulo",
      summary: "",
      highlights: [
        "Liderou equipes financeiras, executando consultoria estratégica focada em compliance e otimização de fluxo de caixa.",
        "Conduziu a automação de rotinas operacionais, traduzindo lógica tributária em especificações técnicas.",
      ],
    },
  ],
  skillGroups: [
    { label: "Arquitetura & Backend", skills: ["C# (.NET Core)", "Java (Spring Boot)", "Node.js (NestJS)", "TypeScript", "Python", "Go", "Microsserviços", "API Gateway", "BFF", "CQRS", "Clean Arch", "DDD"] },
    { label: "Frontend & Performance", skills: ["React", "Next.js (RSC, SSR)", "Angular", "Flutter", "React Native", "Micro-frontends (Module Federation)", "Redux", "Zustand"] },
    { label: "Mensageria & Resiliência", skills: ["RabbitMQ (Topic Exchanges)", "Kafka (Partitioning)", "Circuit Breaker", "Retry", "Throttling", "Dead Letter Queues (DLQ)"] },
    { label: "BD, Caches & IA", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Query Tuning", "Sharding", "Integração LLMs (OpenAI, Claude, Gemini)", "RAG"] },
    { label: "DevOps & SRE", skills: ["AWS", "Azure", "GCP", "K8s (Helm, HPA)", "Docker", "IaC (Terraform)", "CI/CD", "OpenTelemetry", "Datadog", "Grafana"] },
    { label: "Segurança & Testes", skills: ["TDD", "Cypress", "Playwright", "K6", "OAuth 2.0 (PKCE)", "OIDC", "JWT", "proteção contra XSS/CSRF", "CSP", "CORS"] },
  ],
  education: [
    { title: "Bacharelado em Engenharia da Computação", institution: "UNIVESP", period: "2021–2025", description: "Foco aprofundado em arquitetura de computadores, inteligência artificial e estruturas de dados avançadas, consolidando a base teórica para desenvolvimento de software escalável." },
    { title: "Bacharelado em Ciências Contábeis", institution: "Estácio", period: "2017", description: "Domínio pleno em contabilidade corporativa, governança e análise financeira. Base estratégica responsável pela expertise na criação de sistemas orientados a alto retorno sobre o investimento." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Imersão técnica intensiva no ecossistema web moderno, com aplicação rigorosa de Clean Code, testes automatizados e arquitetura de componentes em cenários reais." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Formação robusta nos fundamentos de ciência da computação, algoritmos e matemática discreta, reforçando a resolução algorítmica de problemas complexos." },
  ],
  languages: ["Inglês Profissional", "Português Nativo"],
};
