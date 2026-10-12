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
 * The graph: what rests on what, and what merely uses what.
 *
 * ## Why these are written out rather than inferred
 *
 * Because every edge is a claim, and `built_on` in particular is one that is
 * easy to get subtly wrong. NestJS does rest on Node.js; React does *not* rest
 * on JavaScript — it runs in a browser and is written in JavaScript, which is
 * `uses`. Guessing the distinction from a label would get that backwards and
 * produce a focus view that promotes a browser library to a language.
 *
 * So the owner writes them. The table is small — about forty edges for a
 * hundred and twenty technologies — and every one of them is checkable at a
 * glance by someone who knows the tools, which is exactly what an inferred edge
 * is not.
 *
 * ## Why `uses` is not traversed upward
 *
 * Because it would be wrong. A `uses` edge says "this is composed with that",
 * and the thing it is composed with is not underneath it. Walking them for
 * promotion is how a résumé focused on React ends up claiming JavaScript
 * expertise, which it may well have — but not by that argument.
 */
export const RELATIONS: ReadonlyArray<{
  from: string;
  to: string;
  kind: "built_on" | "uses";
}> = [
  // --- JavaScript ecosystem -------------------------------------------
  { from: "TypeScript", to: "JavaScript", kind: "built_on" },
  { from: "Node.js", to: "JavaScript", kind: "built_on" },
  { from: "NestJS", to: "Node.js", kind: "built_on" },
  { from: "NestJS", to: "TypeScript", kind: "uses" },
  { from: "Next.js", to: "React", kind: "built_on" },
  { from: "Next.js", to: "Node.js", kind: "built_on" },
  { from: "Next.js", to: "TypeScript", kind: "uses" },
  { from: "React", to: "TypeScript", kind: "uses" },
  { from: "React", to: "JavaScript", kind: "uses" },
  { from: "Angular", to: "TypeScript", kind: "uses" },
  { from: "Angular", to: "JavaScript", kind: "uses" },
  { from: "Vue.js", to: "JavaScript", kind: "uses" },
  { from: "Redux", to: "JavaScript", kind: "uses" },
  { from: "Zustand", to: "JavaScript", kind: "uses" },
  { from: "Tailwind CSS", to: "JavaScript", kind: "uses" },
  { from: "Storybook", to: "React", kind: "uses" },
  { from: "Flutter", to: "Dart", kind: "built_on" },
  { from: "React Native", to: "React", kind: "built_on" },

  // --- JVM --------------------------------------------------------------
  { from: "Java Spring", to: "Java", kind: "built_on" },
  { from: "Java Spring Boot", to: "Java Spring", kind: "built_on" },

  // --- .NET -------------------------------------------------------------
  { from: ".NET", to: "C#", kind: "built_on" },
  { from: ".NET Core", to: ".NET", kind: "built_on" },

  // --- Data -------------------------------------------------------------
  { from: "RabbitMQ", to: "Erlang", kind: "built_on" },
  { from: "Apache Kafka", to: "Java", kind: "uses" },
  { from: "Kafka", to: "Java", kind: "uses" },

  // --- Cloud and infrastructure -----------------------------------------
  { from: "Helm", to: "Kubernetes", kind: "built_on" },
  { from: "K8s (Helm, HPA)", to: "Kubernetes", kind: "built_on" },
  { from: "Terraform", to: "HCL", kind: "built_on" },
  { from: "IaC (Terraform)", to: "Terraform", kind: "built_on" },
  { from: "Prometheus", to: "Go", kind: "built_on" },
  { from: "Grafana", to: "Go", kind: "built_on" },
  { from: "Kubernetes", to: "Go", kind: "built_on" },
  { from: "Docker", to: "Go", kind: "built_on" },
  { from: "OpenTelemetry", to: "Go", kind: "built_on" },

  // --- Practices that rest on a language ---------------------------------
  { from: "Playwright", to: "TypeScript", kind: "uses" },
  { from: "Cypress", to: "JavaScript", kind: "uses" },
  { from: "SonarQube", to: "Java", kind: "uses" },
];

/**
 * Technologies that are languages.
 *
 * Only the ones the résumé actually uses. A language has nothing to rest on, so
 * it is the root of its chain — which is what makes it the thing a selection
 * expands *down to*.
 */
export const LANGUAGES: ReadonlyArray<string> = [
  "JavaScript",
  "TypeScript",
  "Java",
  "C#",
  "Python",
  "Go",
  "Dart",
  "Erlang",
  "HCL",
  "Ruby",
  "PHP",
  "SQL",
];

/**
 * What kind of thing a technology is, where it is not a language.
 *
 * The order of the lists is the order they are tested, so the specific wins:
 * checking "framework" before "library" is what keeps NestJS out of `library`,
 * and checking "infrastructure" before "observability" is what keeps Docker
 * from being filed as a monitoring tool.
 */
const KIND_RULES: ReadonlyArray<{ kind: string; terms: readonly string[] }> = [
  {
    kind: "framework",
    terms: ["nest", "spring", "next", "angular", "react", "vue", "flutter", "django", "flask", "fastapi", "rails", "native"],
  },
  {
    kind: "platform",
    terms: ["node", "dotnet", "net core", "kubernetes", "k8s", "aws", "azure", "gcp", "docker"],
  },
  { kind: "datastore", terms: ["postgres", "mysql", "mongo", "redis", "clickhouse", "dynamodb", "rds", "sqlite", "sql server", "databricks"] },
  { kind: "messaging", terms: ["kafka", "rabbitmq", "sqs", "sns", "eventbridge"] },
  { kind: "observability", terms: ["grafana", "prometheus", "opentelemetry", "datadog", "cloudwatch"] },
  { kind: "testing", terms: ["playwright", "cypress", "jest", "vitest", "selenium", "k6", "tdd"] },
  { kind: "infrastructure", terms: ["terraform", "hcl", "helm", "ansible", "jenkins", "bitbucket", "actions"] },
  { kind: "library", terms: ["redux", "zustand", "tailwind", "storybook", "langchain", "qdrant", "pgvector"] },
  { kind: "practice", terms: ["ddd", "tdd", "cqrs", "solid", "clean", "hexagonal", "observabilidade", "observability", "ci/cd", "circuit breaker", "microsservicos", "microservices", "sonar", "fortify", "event-driven", "orientacao"] },
  { kind: "domain", terms: ["b3", "etf", "erp", "contabeis", "accounting", "ativos", "asset", "pagamentos", "payments", "mercado", "financial", "dashboard", "planilha", "spreadsheet", "compliance", "integrated"] },
];

/** The kind a label belongs to, or `null` for anything not listed above. */
export function classifyKind(label: string): string | null {
  if (sameTool(label, LANGUAGES.find((language) => sameTool(language, label)) ?? "")) {
    return "language";
  }

  const normalized = normalizeLabel(label);

  for (const rule of KIND_RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.kind;
    }
  }

  return null;
}

/** Lower-case, accent-free, punctuation to spaces — shared by both classifiers. */
export function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[().]/g, " ")
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

/**
 * Technologies matched against the *text* of a bullet, for the provisional tags.
 *
 * ## Why this is safe where the role-level draft was not
 *
 * The role-level draft assumed a bullet delivered in a role whose stack includes
 * Kafka was about Kafka, which is false for the deployment bullets in the same
 * role. That is why it returned a résumé that looked filtered but filtered
 * nothing.
 *
 * This matches a **name that appears in the bullet itself**. "Migrating MySQL to
 * ClickHouse with Databricks" contains all three, so the inference is not a guess
 * about what the sentence means — it is a reading of what it says.
 *
 * ## Why the terms are conservative
 *
 * Every term is a full technology name, matched case-insensitively and on a word
 * boundary. Deliberately excluded are terms that would over-match:
 *
 *   * `Java` alone, which appears inside "JavaScript"
 *   * `Angular` where the sentence is about AngularJS (a different framework)
 *   * `NET`, which is a substring of several networks and platform names
 *
 * A term that matches a bullet it has nothing to do with writes a false
 * attribution into the document of record, which is the one thing this site
 * cannot do. So the list is short on purpose and the owner refines it.
 *
 * `word` is what to look for; `slug` is what to attach it to.
 */
export const BULLET_TERMS: ReadonlyArray<{ word: string; slug: string }> = [
  { word: "MySQL", slug: "mysql" },
  { word: "PostgreSQL", slug: "postgresql" },
  { word: "Postgres", slug: "postgresql" },
  { word: "SQL Server", slug: "sql-server" },
  { word: "ClickHouse", slug: "clickhouse" },
  { word: "Databricks", slug: "databricks" },
  { word: "MongoDB", slug: "mongodb" },
  { word: "Redis", slug: "redis" },
  { word: "Kafka", slug: "kafka" },
  { word: "RabbitMQ", slug: "rabbitmq" },
  { word: "Spring", slug: "java-spring-boot" },
  { word: "NestJS", slug: "nestjs" },
  { word: "Next.js", slug: "next-js" },
  { word: "Node.js", slug: "node-js" },
  { word: "TypeScript", slug: "typescript" },
  { word: "JavaScript", slug: "javascript" },
  { word: "Angular", slug: "angular" },
  { word: "React", slug: "react" },
  { word: "Vue.js", slug: "vue-js" },
  { word: ".NET", slug: "net-core" },
  { word: "Flutter", slug: "flutter" },
  { word: "Python", slug: "python" },
  { word: "COBOL", slug: "cobol" },
  { word: "Kubernetes", slug: "kubernetes" },
  { word: "k8s", slug: "kubernetes" },
  { word: "Docker", slug: "docker" },
  { word: "Terraform", slug: "terraform" },
  { word: "Helm", slug: "helm" },
  { word: "AWS", slug: "aws" },
  { word: "Azure", slug: "azure" },
  { word: "GCP", slug: "gcp" },
  { word: "Prometheus", slug: "prometheus" },
  { word: "Grafana", slug: "grafana" },
  { word: "Playwright", slug: "playwright" },
  { word: "Cypress", slug: "cypress" },
  { word: "Selenium", slug: "selenium" },
  { word: "Jenkins", slug: "jenkins" },
  { word: "GitHub Actions", slug: "github-actions" },
  { word: "SonarQube", slug: "sonarqube" },
  { word: "Fortify", slug: "fortify" },
  { word: "OpenTelemetry", slug: "opentelemetry" },
  { word: "Datadog", slug: "datadog" },
  { word: "Design System", slug: "design-system" },
  { word: "DDD", slug: "ddd" },
  { word: "DDD", slug: "ddd" },
];

/**
 * The slugs a bullet names, from terms that appear in it.
 *
 * `Java` is handled by an explicit rule rather than a term, because it is a
 * substring of `JavaScript` and a term list cannot express "match Java but not
 * JavaScript" with a word boundary alone.
 */
export function bulletsMention(body: string): string[] {
  const matched = new Set<string>();

  for (const { word, slug } of BULLET_TERMS) {
    // Word-boundary, case-insensitive. `.` and `+` are escaped because several
    // names contain them, and an unescaped dot matches any character — which
    // would make "Nodejs" match.
    const pattern = new RegExp(`(^|[^A-Za-z])${escape(word)}([^A-Za-z]|$)`, "i");

    if (pattern.test(body)) {
      matched.add(slug);
    }
  }

  const saysJava = /\bJava\b/.test(body);

  if (saysJava && !/\bJavaScript\b/i.test(body)) {
    matched.add("java");
  }

  return [...matched];
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The stack profiles.
 *
 * ## Why these are seeded and not left empty
 *
 * Because a profile is a *selection*, and the seeded ones are the selections the
 * owner asked for: React + Node, Angular + Java, Angular + .NET, Python. They are
 * content, so they belong in the same bootstrap as everything else — an owner
 * editing them later edits rows, and a re-run leaves those rows alone because
 * `ignore-duplicates` only fills what is missing.
 *
 * ## Why `primary` names the language and the framework both
 *
 * Because the graph reaches the language anyway, and naming it says the owner
 * means it. `expandFocus` seeds its root set from `primary`, so React and
 * TypeScript listed together promote TypeScript, while React alone reaches it —
 * which is the difference between "I am strong in React" and "I am strong in
 * React and in the language it is written in."
 *
 * ## Why `listed` is not expanded
 *
 * Because a listed tool is shown, not adopted. Putting React in a Java profile's
 * `listed` list must not drag TypeScript and JavaScript into that profile.
 */
export const PROFILES: ReadonlyArray<{
  slug: string;
  description: string;
  primary: readonly string[];
  listed: readonly string[];
}> = [
  {
    slug: "react-node",
    description: "React, Node.js and TypeScript services and interfaces.",
    primary: ["react", "node-js", "next-js", "nestjs", "typescript", "javascript"],
    listed: ["angular", "java-spring-boot", "postgresql", "kafka", "docker", "kubernetes", "aws"],
  },
  {
    slug: "angular-java",
    description: "Angular front ends on Spring Boot services.",
    primary: ["angular", "java-spring-boot", "java-spring", "java", "typescript"],
    listed: ["postgresql", "postgres", "kafka", "rabbitmq", "docker", "kubernetes", "aws"],
  },
  {
    slug: "dotnet",
    description: "Angular on .NET services.",
    primary: ["angular", "net-core", "net", "typescript"],
    listed: ["c-sharp", "sql-server", "postgresql", "postgres", "azure", "docker"],
  },
  {
    slug: "python",
    description: "Python services and data work.",
    primary: ["python"],
    listed: ["postgresql", "postgres", "docker", "aws", "fastapi", "databricks"],
  },
];
/**
 * Two labels that name the same tool.
 *
 * "Java Spring Boot" and "Java Spring" are one technology; "Java" is another.
 * Merging the first two matters because they appear on different roles and a
 * focused resume that promoted one would then show only half the roles that
 * actually used it.
 */
export function sameTool(a: string, b: string): boolean {
  const normalize = (value: string): string =>
    value
      .normalize("NFD")
      .replace(/[́-ͯ]/g, "")
      .toLowerCase()
      .replace(/\(([^)]*)\)/g, " $1 ")
      .replace(/[^a-z0-9+]+/g, " ")
      .trim();

  return normalize(a) === normalize(b);
}

export { technologySlug };