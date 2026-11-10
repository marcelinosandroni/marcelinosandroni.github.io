/**
 * Skill descriptions for tooltips.
 *
 * Short, one-line descriptions of each skill/technology. Used as tooltips
 * on the resume and home page skill chips. The cheatsheetSlug links to the
 * corresponding term on the cheatsheet page.
 */
export const SKILL_DESCRIPTIONS: Record<string, { description: string; cheatsheetSlug?: string }> = {
  // Frontend & UI
  "React": { description: "Biblioteca JS para UI declarativa e componentizada", cheatsheetSlug: "react" },
  "Next.js (RSC, SSR)": { description: "Framework React com SSR, SSG e Server Components", cheatsheetSlug: "nextjs" },
  "Angular": { description: "Framework TypeScript para SPAs enterprise", cheatsheetSlug: "angular" },
  "Vue.js": { description: "Framework progressivo para UIs reativas", cheatsheetSlug: "vue" },
  "TypeScript": { description: "JavaScript com tipagem estática", cheatsheetSlug: "typescript" },
  "JavaScript": { description: "Linguagem de programação web", cheatsheetSlug: "javascript" },
  "HTML5": { description: "Linguagem de marcação para web", cheatsheetSlug: "html5" },
  "CSS3": { description: "Folhas de estilo para web", cheatsheetSlug: "css3" },
  "Tailwind CSS": { description: "Utility-first CSS framework", cheatsheetSlug: "tailwind" },
  "Micro-frontends": { description: "Arquitetura de frontend modular e independente", cheatsheetSlug: "micro-frontends" },
  "Redux": { description: "State management centralizado para React", cheatsheetSlug: "redux" },
  "Zustand": { description: "State management leve para React", cheatsheetSlug: "zustand" },
  "React Native": { description: "Framework para apps nativos com React", cheatsheetSlug: "react-native" },
  "Flutter": { description: "Framework Google para apps nativos multiplataforma", cheatsheetSlug: "flutter" },
  // Backend & Frameworks
  "C# (.NET Core)": { description: "Linguagem Microsoft para backend", cheatsheetSlug: "csharp" },
  "Java (Spring Boot)": { description: "Framework Java enterprise", cheatsheetSlug: "java" },
  "Node.js (NestJS)": { description: "Runtime JS server-side com framework enterprise", cheatsheetSlug: "nodejs" },
  "Go": { description: "Linguagem compilada, concorrente, de alta performance", cheatsheetSlug: "go" },
  "Python": { description: "Linguagem versátil para backend, dados e IA", cheatsheetSlug: "python" },
  "PostgreSQL": { description: "RDBMS avançado com JSONB, full-text, extensions", cheatsheetSlug: "postgresql" },
  "MongoDB": { description: "Document DB NoSQL", cheatsheetSlug: "mongodb" },
  "Redis": { description: "In-memory data store para cache, session, rate limiting", cheatsheetSlug: "redis" },
  "Kafka": { description: "Plataforma de streaming distribuído", cheatsheetSlug: "kafka" },
  "RabbitMQ": { description: "Message broker AMQP", cheatsheetSlug: "rabbitmq" },
  "gRPC": { description: "Framework RPC de alta performance com Protocol Buffers", cheatsheetSlug: "grpc" },
  "GraphQL": { description: "Query language para APIs", cheatsheetSlug: "graphql" },
  // DevOps & Cloud
  "Docker": { description: "Containerização de aplicações", cheatsheetSlug: "docker" },
  "Kubernetes": { description: "Orquestração de containers", cheatsheetSlug: "kubernetes" },
  "AWS": { description: "Cloud provider Amazon", cheatsheetSlug: "aws" },
  "Azure": { description: "Cloud provider Microsoft", cheatsheetSlug: "azure" },
  "GCP": { description: "Cloud provider Google", cheatsheetSlug: "gcp" },
  "Terraform": { description: "Infrastructure as Code", cheatsheetSlug: "terraform" },
  "Jenkins": { description: "CI/CD automation server", cheatsheetSlug: "jenkins" },
  "Kubernetes (Helm)": { description: "Package manager para K8s", cheatsheetSlug: "helm" },
  // AI & Data
  "LLMs (Claude, GPT)": { description: "Large Language Models", cheatsheetSlug: "llm" },
  "RAG": { description: "Retrieval-Augmented Generation", cheatsheetSlug: "rag" },
  "ClickHouse": { description: "Column-oriented DB para analytics", cheatsheetSlug: "clickhouse" },
  "Databricks": { description: "Plataforma unificada de dados e IA", cheatsheetSlug: "databricks" },
  "ETL": { description: "Extract, Transform, Load", cheatsheetSlug: "etl" },
  // Architecture
  "Microservices": { description: "Arquitetura de serviços independentes", cheatsheetSlug: "microservices" },
  "DDD": { description: "Domain-Driven Design", cheatsheetSlug: "ddd" },
  "CQRS": { description: "Command Query Responsibility Segregation", cheatsheetSlug: "cqrs" },
  "Clean Architecture": { description: "Camadas concêntricas com dependências para dentro", cheatsheetSlug: "clean-architecture" },
  "Event-Driven Architecture": { description: "Comunicação via eventos assíncronos", cheatsheetSlug: "event-driven" },
  "Circuit Breaker": { description: "Padrão que interrompe chamadas a serviço falhando", cheatsheetSlug: "circuit-breaker" },
  "TDD": { description: "Test-Driven Development", cheatsheetSlug: "tdd" },
  "SOLID": { description: "Princípios de design orientado a objetos", cheatsheetSlug: "solid" },
};
