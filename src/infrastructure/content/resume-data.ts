import type { ResumeContent } from "@/domain/resume/types";

export const resumeContent: ResumeContent = {
  locale: "pt-BR",
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE · Remoto",
  contact: {
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Engenheiro Full Stack com o diferencial de unir engenharia de ponta a 15 anos de experiência em negócios e contabilidade. Traduzo regras corporativas complexas em arquiteturas web escaláveis, sistemas distribuídos e produtos que resolvem dores reais da operação.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Engenheiro de Software Sênior",
      period: "Jan/2026 – Presente",
      summary: "Modernização de sistemas legados e orquestração de microsserviços de alta volumetria.",
      highlights: [
        "C# (.NET), Go, Node.js, CQRS e arquitetura orientada a eventos",
        "RabbitMQ, Circuit Breaker e DLQs para 10 milhões de mensagens/dia",
        "DevOps/SRE, CI/CD zero-downtime, Kubernetes, Helm, HPA e Terraform",
        "Angular, React Native, micro-frontends e Core Web Vitals",
      ],
    },
    {
      company: "Antlia",
      role: "Engenheiro de Software Sênior",
      period: "Dez/2022 – Dez/2025",
      summary: "Liderança de desenvolvimento web para o setor financeiro.",
      highlights: [
        "Angular, React, Next.js e gestão de estado complexa",
        "Microsserviços DDD em Java Spring Boot e C# .NET Core",
        "AWS, Azure e infraestrutura como código com Terraform",
      ],
    },
    {
      company: "Banco Itaú",
      role: "Engenheiro de Software Pleno",
      period: "Mar/2022 – Nov/2022",
      summary: "Adoção de Clean Code e TDD em microsserviços altamente disponíveis.",
      highlights: ["C# e Java integrados a brokers de mensagens", "Mitigação de vulnerabilidades e evolução da cobertura de testes"],
    },
    {
      company: "Pollux Technologies",
      role: "Engenheiro de Software Pleno",
      period: "Jun/2021 – Jan/2022",
      summary: "Arquitetura de microsserviços, serverless e interfaces para startups.",
      highlights: ["TypeScript, NestJS, APIs RESTful e GraphQL", "React e Flutter"],
    },
    {
      company: "Empresas de Consultoria Contábil",
      role: "Analista Contábil & Gestor",
      period: "Jan/2005 – Dez/2020",
      summary: "15 anos liderando equipes financeiras e traduzindo lógica tributária em especificações técnicas.",
      highlights: ["Compliance, otimização de fluxo de caixa e consultoria estratégica", "Automação de rotinas operacionais"],
    },
  ],
  skillGroups: [
    { label: "Backend", skills: ["C# / .NET", "Java / Spring Boot", "Node.js / NestJS", "TypeScript", "Python", "Go"] },
    { label: "Frontend & Mobile", skills: ["React", "Next.js", "Angular", "Flutter", "React Native", "Redux", "Zustand"] },
    { label: "Arquitetura", skills: ["Microsserviços", "DDD", "CQRS", "Clean Architecture", "API Gateway", "BFF", "Event-Driven"] },
    { label: "Dados & IA", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Kafka", "RabbitMQ", "RAG"] },
    { label: "Cloud & SRE", skills: ["AWS", "Azure", "GCP", "Kubernetes", "Docker", "Terraform", "CI/CD"] },
    { label: "Qualidade & Segurança", skills: ["TDD", "Playwright", "Cypress", "K6", "OAuth 2.0", "OIDC", "JWT"] },
  ],
  education: [
    { title: "Engenharia da Computação", institution: "UNIVESP", period: "Jul/2021 – Jul/2025", description: "Arquitetura de computadores, inteligência artificial e estruturas de dados avançadas." },
    { title: "Ciências Contábeis", institution: "Estácio", period: "2017", description: "Contabilidade corporativa, governança e análise financeira." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Clean Code, testes automatizados e arquitetura de componentes." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Fundamentos de ciência da computação, algoritmos e matemática discreta." },
  ],
  languages: ["Português · Nativo", "Inglês · Profissional"],
};
