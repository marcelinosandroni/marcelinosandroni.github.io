/**
 * Bootstraps the technology catalog's **shape**: what kind each technology is,
 * what it rests on, and a first description.
 *
 * ## Why this is separate from the document bootstrap
 *
 * Because it answers questions about tools rather than about the résumé. The
 * document says "React was used at Pollux"; this says "React is a framework
 * that uses TypeScript". Mixing them would mean a correction to a category could
 * re-run the document pass and re-derive chips the owner has since reassigned.
 *
 * ## Why it is safe to re-run
 *
 * Relations are inserted with `ignore-duplicates` on their composite primary
 * key, so an edge is written once. Descriptions are only written where the
 * column is **empty**: the bootstrap supplies a starting sentence and the
 * owner's own wording wins from the first edit onwards. Overwriting it would
 * make a bootstrap destructive, which is the one thing here that must not
 * happen — and the same rule the document bootstrap follows.
 */

import { CATEGORIES, FALLBACK_CATEGORY, LANGUAGES, RELATIONS, classify, classifyKind, normalizeLabel, sameTool } from "./technology-taxonomy";

/**
 * What each tool is, in one line, for the hover tooltip.
 *
 * Written by hand rather than generated from the label, because the point of a
 * description is to say something the acronym does not. "Structured Query
 * Language" is true of SQL and says nothing; "the datastore behind the event
 * pipeline" is what a reader deciding whether to ask about it needs.
 *
 * Matched longest-first, so "Java Spring Boot" never picks up the "Java" entry.
 */
export const DESCRIPTIONS: ReadonlyArray<{ match: string; text: string }> = [
  { match: "React", text: "Component model behind the front end; the basis for the Next.js work." },
  { match: "Next.js", text: "React framework for server rendering and routing; builds on Node.js." },
  { match: "Node.js", text: "Server runtime for the services and the build step." },
  { match: "NestJS", text: "Opinionated Node.js framework — dependency injection, modules, transport layers." },
  { match: "TypeScript", text: "Typed superset of JavaScript; the language most service code is written in." },
  { match: "JavaScript", text: "The language the browser runs, and the runtime layer under Node.js." },
  { match: "Angular", text: "Full framework with its own dependency injection and tooling." },
  { match: "Java", text: "JVM language behind the Spring services." },
  { match: "Java Spring Boot", text: "JVM service framework used on the payments and asset platforms." },
  { match: ".NET", text: "CLR runtime behind the earlier enterprise work." },
  { match: "Go", text: "Compiled language behind the Kubernetes ecosystem tooling and services." },
  { match: "Python", text: "Used for data work and for tooling around it." },
  { match: "PostgreSQL", text: "Primary relational store; the event sourcing and the read models run on it." },
  { match: "Kafka", text: "Event backbone for the high-volume pipelines." },
  { match: "RabbitMQ", text: "Broker for the exchange-facing messaging, where topic exchanges matter." },
  { match: "Redis", text: "Cache and fast-lookup layer in front of the relational store." },
  { match: "ClickHouse", text: "Columnar store for the event analytics and the dashboard queries." },
  { match: "Docker", text: "Container build and runtime, local and in CI." },
  { match: "Kubernetes", text: "Orchestration for the services that run in the cloud." },
  { match: "AWS", text: "Primary cloud provider for the production workloads." },
  { match: "Terraform", text: "Infrastructure as code for the cloud environments." },
  { match: "OpenTelemetry", text: "Tracing and metrics instrumentation across the services." },
  { match: "Playwright", text: "End-to-end browser testing for the user-facing paths." },
  { match: "DDD", text: "Domain modelling: bounded contexts, aggregates, and a language shared with the business." },
  { match: "CQRS", text: "Separate read and write models — the pattern behind the dashboard queries." },
  { match: "Clean Architecture", text: "Dependencies pointing inward; domain rules with no framework attached." },
];

/** The description for a label, if one was written. */
export function describe(label: string): string | null {
  const normalized = normalizeLabel(label);

  const candidates = DESCRIPTIONS.filter(
    (entry) =>
      normalizeLabel(entry.match).includes(normalized) || normalized.includes(normalizeLabel(entry.match)),
  ).sort((a, b) => b.match.length - a.match.length);

  return candidates[0]?.text ?? null;
}

export { CATEGORIES, FALLBACK_CATEGORY, RELATIONS, LANGUAGES, classify, classifyKind, normalizeLabel, sameTool };