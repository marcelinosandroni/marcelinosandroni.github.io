import { technologySlug } from "@/domain/resume/technology";

/**
 * Bootstrap-only classification of a technology into a category.
 *
 * ## Why this lives in a script and not in `src/`
 *
 * Because the moment this ships in the domain, the typed catalog becomes
 * authoritative about the taxonomy again — which is the arrangement the
 * technology catalog was created to end. A new category added in the admin would
 * be re-filed by a list that lives in the repository and cannot see it.
 *
 * So this is scaffolding: it runs once, it writes rows, and afterwards the owner
 * owns them. Deleting this file once every row has been reviewed costs nothing.
 *
 * ## Why a keyword list and not inference
 *
 * The inputs are known — 90 hand-written labels the owner chose — so a lookup is
 * both sufficient and auditable. Anything cleverer would be guessing at a
 * classification nobody asked to be clever about, and a wrong guess is worse
 * than an "Other" the owner can see and fix.
 *
 * The order is the whole design: the first match wins, so the specific entries
 * come before the general ones. Without that, "AI Code Review" would land in
 * whatever category the word "Code" hits, which is not a category.
 */

export type CategorySlug =
  | "frontend-ui"
  | "backend-core"
  | "devops-cloud"
  | "data"
  | "ai-ml"
  | "quality"
  | "architecture"
  | "security"
  | "business-domain";

/** The categories, in display order. The label is translated per locale. */
export const CATEGORIES: ReadonlyArray<{ slug: CategorySlug; pt: string; en: string }> = [
  { slug: "frontend-ui", pt: "Frontend & UI", en: "Frontend & UI" },
  { slug: "backend-core", pt: "Backend Core", en: "Backend Core" },
  { slug: "devops-cloud", pt: "DevOps & Cloud", en: "DevOps & Cloud" },
  { slug: "data", pt: "Dados & Mensageria", en: "Data & Messaging" },
  { slug: "ai-ml", pt: "Inteligência Artificial", en: "Artificial Intelligence" },
  { slug: "quality", pt: "Qualidade & Testes", en: "Quality & Testing" },
  { slug: "architecture", pt: "Arquitetura & Práticas", en: "Architecture & Practices" },
  { slug: "security", pt: "Segurança", en: "Security" },
  { slug: "business-domain", pt: "Domínio de Negócio", en: "Business Domain" },
];

/** Where anything unmatched goes. Visible, not lost. */
export const FALLBACK_CATEGORY: CategorySlug = "business-domain";

/**
 * Matched against a *normalised* label, so the entries here are lower-case and
 * carry no punctuation. Keeping them that way is the point: an entry written
 * `React` would silently never match anything.
 */
const RULES: ReadonlyArray<{ category: CategorySlug; terms: readonly string[] }> = [
  // Specific before general — see the header.
  {
    category: "ai-ml",
    terms: [
      "llm", "llms", "openai", "claude", "gemini", "anthropic", "gpt", "rag",
      "pgvector", "qdrant", "tensorrt", "langchain", "machine learning",
      "inteligencia artificial", "artificial intelligence", "code review com ia",
      "ai code review", "agentes autonomos", "ai agents", "embedding",
    ],
  },
  {
    category: "frontend-ui",
    terms: [
      "react", "angular", "vue", "next js", "nextjs", "nuxt", "svelte", "flutter",
      "react native", "micro frontends", "microfrontends", "module federation",
      "redux", "zustand", "tailwind", "storybook", "design system", "css",
      "javascript", "typescript", "html", "web components", "sass",
      "micro frontends",
    ],
  },
  {
    category: "quality",
    terms: [
      "playwright", "cypress", "jest", "vitest", "selenium", "k6", "tdd",
      "testes unitarios", "unit testing", "testes", "testing", "e2e",
      "mutation testing", "sonarqube", "fortify", "code coverage",
      "cobertura de testes",
    ],
  },
  {
    category: "data",
    terms: [
      "postgresql", "postgres", "mysql", "sql server", "mssql", "mongodb",
      "mongo", "redis", "clickhouse", "databricks", "kafka", "rabbitmq", "sqs",
      "sns", "eventbridge", "dynamodb", "etl", "spark", "bigquery", "snowflake",
      "elasticsearch", "dbt", "olap", "data warehouse", "sqlite", "mssql server",
      "mensageria", "messaging",
    ],
  },
  {
    category: "devops-cloud",
    terms: [
      "aws", "azure", "gcp", "google cloud", "kubernetes", "k8s", "docker",
      "helm", "terraform", "jenkins", "bitbucket pipelines", "github actions",
      "gitlab ci", "ci cd", "pipelines", "pipelines ci cd", "opentelemetry",
      "datadog", "grafana", "prometheus", "linux", "nginx", "istio", "hpa",
      "eks", "fargate", "cloudformation", "ansible", "argocd", "vpc", "ec2",
      "s3", "lambda", "rds", "cloudwatch", "iam", "kms", "secrets manager",
      "api gateway", "cloud platforms", "plataformas cloud", "cloud migration",
      "cost optimization", "cost optimization", "serverless",
    ],
  },
  {
    category: "security",
    terms: [
      "oauth", "oidc", "jwt", "cors", "csp", "ssl", "tls", "vault", "waf",
      "seguranca", "security", "compliance automation", "lgpd",
    ],
  },
  {
    category: "architecture",
    terms: [
      "ddd", "cqrs", "solid", "clean architecture", "clean arch", "clean code",
      "hexagonal architecture", "arquitetura hexagonal", "event driven",
      "orientacao a eventos", "domain driven", "circuit breaker", "saga",
      "idempotencia", "observabilidade", "observability", "monitoramento em tempo real",
      "real time monitoring", "ddd tdd", "microservicos", "microsservicos",
      "microservices", "bff", "mvp", "technical leadership", "lideranca tecnica",
    ],
  },
  {
    category: "backend-core",
    terms: [
      "net", "net core", "c sharp", "java", "spring", "node", "nest", "nestjs",
      "express", "python", "go", "golang", "php", "ruby", "rails", "django",
      "flask", "fastapi", "graphql", "grpc", "rest", "api rest", "micro servicos",
      "autenticacao", "authentication",
    ],
  },
  {
    category: "business-domain",
    terms: [
      "b3", "etf", "etfs", "ativos", "asset management", "pagamentos", "payments",
      "mercado financeiro", "financial markets", "compliance", "contabeis",
      "accounting", "erp", "dashboards financeiros", "financial dashboards",
      "planilhas", "spreadsheets", "automacao", "automation tools", "ferramentas de automacao",
      "sistemas contabeis", "sistemas de gestao", "integrated accounting systems",
      "erp management systems", "vba", "macros",
    ],
  },
];

/**
 * The category a label belongs to.
 *
 * Returns the fallback rather than `null`. An unclassified tool still has to be
 * somewhere — it may well be legitimate, simply a category this list does not
 * have — and putting it in an "Other" bucket the owner can see is how it gets
 * filed. Dropping it would lose a technology the owner typed into the résumé.
 */
export function classify(label: string): CategorySlug {
  const normalized = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();

  for (const rule of RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.category;
    }
  }

  return FALLBACK_CATEGORY;
}

/**
 * Two labels that name the same tool.
 *
 * "Java Spring Boot" and "Java Spring" are one technology; "Java" is another.
 * Merging the first two matters because they appear on different roles and a
 * focused résumé that promoted one would then show only half the roles that
 * actually used it.
 */
export function sameTool(a: string, b: string): boolean {
  const normalize = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\(([^)]*)\)/g, " $1 ")
      .replace(/[^a-z0-9+]+/g, " ")
      .trim();

  return normalize(a) === normalize(b);
}

export { technologySlug };