/**
 * Maps a technology name to a semantic category.
 *
 * ## Why a map rather than free text
 *
 * A bullet that says "deployed on {{cloud}}" has to know which token in the role's
 * stack *is* the cloud. The stack is a comma-separated list with no structure, so
 * the only honest way to answer "which of these is the cloud" is to classify each
 * token. A variant that writes `{{cloud}}` and ships a stack without a cloud token
 * gets the placeholder back untouched, which fails visibly rather than silently
 * substituting the wrong technology.
 *
 * The keys are lower-cased and trimmed, so "AWS", "aws" and " AWS " all resolve.
 * A technology that is not in this map simply has no category, which is fine: it
 * still appears in the stack line, it just cannot be referenced by a placeholder.
 */
export type TechnologyCategory =
  | "cloud"
  | "language"
  | "backend"
  | "frontend"
  | "mobile"
  | "devops"
  | "observability"
  | "messaging"
  | "database"
  | "ai";

const CATEGORY_MAP: Readonly<Record<string, TechnologyCategory>> = {
  // cloud
  aws: "cloud",
  azure: "cloud",
  gcp: "cloud",
  "google cloud": "cloud",
  // language
  java: "language",
  typescript: "language",
  javascript: "language",
  python: "language",
  go: "language",
  "c#": "language",
  "node.js": "language",
  nodejs: "language",
  "node js": "language",
  // backend
  "spring boot": "backend",
  spring: "backend",
  "spring cloud": "backend",
  "spring webflux": "backend",
  "spring batch": "backend",
  "spring security": "backend",
  ".net": "backend",
  "asp.net": "backend",
  "asp.net core": "backend",
  nestjs: "backend",
  express: "backend",
  quarkus: "backend",
  hibernate: "backend",
  "hibernate/jpa": "backend",
  jpa: "backend",
  // frontend
  angular: "frontend",
  react: "frontend",
  "next.js": "frontend",
  next: "frontend",
  "next js": "frontend",
  tailwind: "frontend",
  "tailwind css": "frontend",
  rxjs: "frontend",
  ngrx: "frontend",
  "shadcn/ui": "frontend",
  "styled components": "frontend",
  "angular material": "frontend",
  sass: "frontend",
  html5: "frontend",
  css3: "frontend",
  // mobile
  "react native": "mobile",
  flutter: "mobile",
  // devops
  docker: "devops",
  kubernetes: "devops",
  k8s: "devops",
  terraform: "devops",
  helm: "devops",
  jenkins: "devops",
  "ci/cd": "devops",
  "github actions": "devops",
  bitbucket: "devops",
  // observability
  opentelemetry: "observability",
  datadog: "observability",
  cloudwatch: "observability",
  // messaging
  kafka: "messaging",
  rabbitmq: "messaging",
  "service bus": "messaging",
  "event hubs": "messaging",
  sqs: "messaging",
  sns: "messaging",
  // database
  postgresql: "database",
  postgres: "database",
  oracle: "database",
  "oracle sql": "database",
  "sql server": "database",
  mongodb: "database",
  redis: "database",
  cassandra: "database",
  neo4j: "database",
  dynamodb: "database",
  cosmosdb: "database",
  documentdb: "database",
  snowflake: "database",
  databricks: "database",
  // ai
  "spring ai": "ai",
  langchain: "ai",
  langchain4j: "ai",
  "amazon bedrock": "ai",
  "azure ai studio": "ai",
  llms: "ai",
  rag: "ai",
  "vector db": "ai",
  "vector databases": "ai",
  "pgvector": "ai",
  milvus: "ai",
};

export function normalizeTechnology(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function classifyTechnology(name: string): TechnologyCategory | null {
  return CATEGORY_MAP[normalizeTechnology(name)] ?? null;
}

/**
 * Resolves a set of named parameters from a stack string.
 *
 * The first technology of each category wins, so a stack that lists "AWS, Azure"
 * resolves `cloud` to "AWS". A variant can override any of these through its
 * own `params` field.
 */
export function resolveParamsFromStack(
  stack: string,
  overrides?: Partial<Record<TechnologyCategory, string>>,
): Partial<Record<TechnologyCategory, string>> {
  const params: Partial<Record<TechnologyCategory, string>> = {};

  for (const raw of stack.split(",")) {
    const token = raw.trim();
    if (token === "") {
      continue;
    }
    const category = classifyTechnology(token);
    if (category !== null && params[category] === undefined) {
      params[category] = token;
    }
  }

  if (overrides !== undefined) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) {
        params[key as TechnologyCategory] = value;
      }
    }
  }

  return params;
}

/**
 * Interpolates `{{key}}` placeholders in a string.
 *
 * Unknown keys are left untouched, so a typo fails visibly in the rendered
 * document rather than being swallowed.
 */
export function interpolate(text: string, params: Partial<Record<TechnologyCategory, string>>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = params[key as TechnologyCategory];
    return value === undefined ? match : value;
  });
}
