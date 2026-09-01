import type { ResumeContent } from "@/domain/resume/types";

export const resumeContentEnUs: ResumeContent = {
  locale: "en-US",
  name: "Marcelino Sandroni Dias",
  title: "Senior Software Engineer",
  location: "Fortaleza, CE, Brazil · Remote",
  contact: {
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Senior Full Stack Software Engineer combining cutting-edge engineering with 15 years of solid experience in business and accounting. Expert in translating complex corporate financial rules into scalable web architectures, high-volume distributed systems, and products that maximize financial profitability while solving real operational pain points.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Senior Software Engineer",
      period: "Jan/2026 – Present",
      summary: "Modernizing legacy systems and orchestrating high-volume microservices.",
      highlights: [
        "C# (.NET), Go, Node.js, CQRS and event-driven architecture",
        "RabbitMQ, Circuit Breaker and DLQs for 10 million messages/day",
        "DevOps/SRE, zero-downtime CI/CD, Kubernetes, Helm, HPA and Terraform",
        "Angular, React Native, micro-frontends and Core Web Vitals optimization",
      ],
    },
    {
      company: "Antlia",
      role: "Senior Software Engineer",
      period: "Dec/2022 – Dec/2025",
      summary: "Leading web development for the financial sector.",
      highlights: [
        "Angular, React, Next.js and complex state management",
        "DDD microservices in Java Spring Boot and C# .NET Core",
        "AWS, Azure and infrastructure as code with Terraform",
      ],
    },
    {
      company: "Banco Itaú",
      role: "Software Engineer",
      period: "Mar/2022 – Nov/2022",
      summary: "Driving Clean Code and TDD adoption in highly available microservices.",
      highlights: ["C# and Java integrated with message brokers", "Vulnerability mitigation and test coverage evolution"],
    },
    {
      company: "Pollux Technologies",
      role: "Software Engineer",
      period: "Jun/2021 – Jan/2022",
      summary: "Architecting microservices, serverless applications and interfaces for startups.",
      highlights: ["TypeScript, NestJS, RESTful and GraphQL APIs", "React and Flutter"],
    },
    {
      company: "Accounting Consulting Firms",
      role: "Accounting Analyst & Manager",
      period: "Jan/2005 – Dec/2020",
      summary: "15 years leading financial teams and translating accounting logic into technical specifications.",
      highlights: ["Compliance, cash flow optimization and strategic consulting", "Process automation and operational efficiency"],
    },
  ],
  skillGroups: [
    { label: "Backend", skills: ["C# / .NET", "Java / Spring Boot", "Node.js / NestJS", "TypeScript", "Python", "Go"] },
    { label: "Frontend & Mobile", skills: ["React", "Next.js", "Angular", "Flutter", "React Native", "Redux", "Zustand"] },
    { label: "Architecture", skills: ["Microservices", "DDD", "CQRS", "Clean Architecture", "API Gateway", "BFF", "Event-Driven"] },
    { label: "Data & AI", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Kafka", "RabbitMQ", "RAG"] },
    { label: "Cloud & SRE", skills: ["AWS", "Azure", "GCP", "Kubernetes", "Docker", "Terraform", "CI/CD"] },
    { label: "Quality & Security", skills: ["TDD", "Playwright", "Cypress", "K6", "OAuth 2.0", "OIDC", "JWT"] },
  ],
  education: [
    { title: "Computer Engineering", institution: "UNIVESP", period: "Jul/2021 – Jul/2025", description: "Computer architecture, artificial intelligence and advanced data structures." },
    { title: "Accounting Sciences", institution: "Estácio", period: "2017", description: "Corporate accounting, governance and financial analysis." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Clean Code, automated testing and component architecture." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Fundamentals of computer science, algorithms and discrete mathematics." },
  ],
  languages: ["Portuguese · Native", "English · Professional"],
};
