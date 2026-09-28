import type { BlogArticle } from "@/domain/blog";

/**
 * Versioned article catalog — en-US.
 *
 * Same two jobs as the pt-BR catalog: the seed for the `blog_articles` table and
 * the build-time fallback behind `FallbackArticleRepository`. The `id` values are
 * identical across locales so the two catalogs describe the same three
 * documents and can be reconciled with a single join.
 */
export const articlesEnUS: BlogArticle[] = [
  {
    id: "1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
    locale: "en-US",
    slug: "resilient-agent-swarms-on-kafka",
    category: "distributed-systems",
    status: "published",
    title: "Architecting resilient swarms with Kafka event streams",
    excerpt:
      "Designing zero-loss event brokers, partition strategies and idempotent consumers when orchestrating distributed AI agent fleets.",
    readingTimeMinutes: 8,
    publishedAt: "2026-06-18",
    updatedAt: "2026-07-02",
    featured: true,
    tags: ["Kafka", "idempotency", "exactly-once", "AI agents", "resiliency"],
    body: [
      {
        type: "paragraph",
        text: "A swarm of AI agents looks like an orchestration problem. In practice it is a message-delivery problem. Every agent is a consumer that can die halfway through a side effect, and the orchestrator has to be able to resume without duplicating work and without losing it.",
      },
      {
        type: "paragraph",
        text: "Most designs that fail here make the same mistake: treating the broker as a transport detail. Once delivery semantics are an architectural decision rather than a configuration, each individual agent ends up inventing its own recovery strategy — and they always diverge.",
      },
      { type: "heading", level: 2, text: "The delivery contract that actually matters" },
      {
        type: "paragraph",
        text: "Three properties, in order of practical importance: no accepted message may be lost; no message may be processed with a duplicated effect; and ordering must hold within an aggregate, never globally.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Set acks=all with a replication factor of at least 3 and min.insync.replicas=2. A broker that acknowledges a write without an fsync is a future incident.",
          "Derive partition keys from the aggregate, never from an arrival timestamp. The key is what preserves per-aggregate order while spreading load.",
          "Record the offset and the side effect in the same transaction. It is the only way to make an operation genuinely idempotent rather than conventionally so.",
        ],
      },
      { type: "heading", level: 2, text: "Partitioning is a domain decision" },
      {
        type: "paragraph",
        text: "Round-robin spreads the load and destroys ordering. Key-per-aggregate preserves ordering and creates hot spots. For an agent swarm the right answer is key-per-aggregate with an optional salt layer, applied only when one specific aggregate starts to dominate traffic.",
      },
      {
        type: "code",
        language: "text",
        code: [
          "# partition key: aggregate + optional salt",
          "def partition_key(aggregate_id: str, salt: str | None = None) -> bytes:",
          "    if salt:",
          "        return f\"{aggregate_id}#{salt}\".encode()",
          "    return aggregate_id.encode()",
        ].join("\n"),
      },
      { type: "heading", level: 2, text: "Idempotent consumers in practice" },
      {
        type: "paragraph",
        text: "Idempotency does not come from a library. It comes from a database constraint or a de-duplication record consulted before the effect takes place. With AI agents there is one extra layer: the model response must be addressed by the hash of the prompt plus the model version, otherwise a rebalance re-runs inference you already paid for.",
      },
      {
        type: "callout",
        tone: "primary",
        title: "Rule of thumb",
        text: "If re-running a consumer can cost money, call a third-party API, or send a message to a human, then the operation is not idempotent until a persisted de-duplication key exists.",
      },
      { type: "heading", level: 2, text: "Rebalance, DLQ, and what to do when an agent goes quiet" },
      {
        type: "paragraph",
        text: "A rebalance is normal, not a failure. Treating it as an error is the failure. Set the session timeout above your worst-case processing time, apply exponential backoff with jitter on retry, and use a per-partition dead-letter queue with retention long enough to audit.",
      },
      {
        type: "quote",
        text: "An agent swarm is a distributed system with a cost per attempt. If you have not metered each attempt, you are paying twice.",
      },
      {
        type: "paragraph",
        text: "Finally, monitor the re-processing rate as a first-class metric. Zero consumer lag with a high de-duplication rate is a system silently discarding work — the worst possible failure mode, because every number still looks healthy.",
      },
    ],
  },

  {
    id: "2b7e4c1d-8a95-4f62-bd70-1c3e5f9a2d44",
    locale: "en-US",
    slug: "rds-to-clickhouse-100m-messages-a-day",
    category: "data-platforms",
    status: "published",
    title: "From RDS to ClickHouse: 100M messages/day at p99 under 10ms",
    excerpt:
      "A deep-dive benchmark into eliminating lock contention in relational databases and moving to columnar storage for sub-second telemetry lookups.",
    readingTimeMinutes: 12,
    publishedAt: "2026-04-02",
    updatedAt: null,
    featured: true,
    tags: ["ClickHouse", "MySQL", "latency", "OLAP", "ETL", "Databricks"],
    body: [
      {
        type: "paragraph",
        text: "The symptom was always the same: the telemetry dashboard took 30 seconds to answer, and the infrastructure team reported the database as healthy. It was. It was simply never designed for the question we were asking it.",
      },
      { type: "heading", level: 2, text: "The root cause is the access pattern, not the volume" },
      {
        type: "paragraph",
        text: "Telemetry is pure analytical read: low-cardinality aggregations over time windows, almost never a lookup back to a single row. A transactional relational database answers that pattern in the most expensive way possible — B-trees, page splits, buffer-pool contention, and an execution plan that has to touch millions of rows to compute a sum.",
      },
      {
        type: "paragraph",
        text: "Columnar stores invert every one of those decisions. Columns are independent, so an aggregation reads only the columns it needs. Time-based partition pruning becomes almost free. And column compression shrinks the scan by an order of magnitude.",
      },
      { type: "heading", level: 2, text: "The path, in the order that works" },
      {
        type: "list",
        ordered: true,
        items: [
          "Do not migrate the database. Migrate the responsibility: move the telemetry stream to a dedicated write path and let the relational store keep doing what it is good at.",
          "Use Databricks ETL to normalise, de-duplicate and pre-aggregate before the load. The fastest insert into ClickHouse is the one that never happened.",
          "Choose the ORDER BY key from the most frequent query, not from the entity. For telemetry that is almost always (event_type, occurred_at, device_id).",
          "Materialise views for the queries that run every five minutes, and leave the rest as ad-hoc queries.",
        ],
      },
      {
        type: "code",
        language: "sql",
        code: [
          "CREATE TABLE telemetry_events (",
          "  occurred_at   DateTime64(3, 'UTC') CODEC(Delta(8), ZSTD(1)),",
          "  device_id    UInt64          CODEC(ZSTD(1)),",
          "  event_type   LowCardinality(String) CODEC(ZSTD(1)),",
          "  payload      String          CODEC(ZSTD(3)),",
          "  ingested_at  DateTime64(3, 'UTC') DEFAULT now()",
          ") ENGINE = MergeTree",
          "PARTITION BY toYYYYMM(occurred_at)",
          "ORDER BY (event_type, occurred_at, device_id)",
          "TTL toDateTime(occurred_at) + INTERVAL 25 MONTH;",
        ].join("\n"),
      },
      { type: "heading", level: 2, text: "Measured results" },
      {
        type: "list",
        ordered: false,
        items: [
          "Dashboard query time: 30s → 190ms.",
          "Load on the relational database: −72%, because it stopped being the analytical path.",
          "Ingest throughput: 100M messages/day with p99 ingest below 10ms.",
          "Storage: −88% versus the equivalent relational layout, from columnar compression and native TTL.",
        ],
      },
      {
        type: "callout",
        tone: "secondary",
        title: "The most expensive mistake",
        text: "Trying to serve high-cardinality analytics from a transactional database. It will not fall over from lack of CPU; it will fall over from contention — and contention shows up as latency in production, on the worst possible day.",
      },
      { type: "heading", level: 2, text: "When not to migrate" },
      {
        type: "paragraph",
        text: "If the query is by primary key, if the volume fits comfortably in memory, and if nobody needs to aggregate millions of rows, the relational store is still the right answer. Serious architecture includes knowing when not to use the tool you just mastered.",
      },
    ],
  },

  {
    id: "3c8f5d2e-9ab6-4e73-8c81-2d4f6a0b3e55",
    locale: "en-US",
    slug: "dual-core-leader-accounting-rigor",
    category: "leadership",
    status: "published",
    title: "The dual-core leader: why accounting rigor makes better software architects",
    excerpt:
      "How financial discipline converts technical debt into calculated liabilities and shifts development velocity from cost centre to profit engine.",
    readingTimeMinutes: 6,
    publishedAt: "2026-01-27",
    updatedAt: null,
    featured: false,
    tags: ["leadership", "management", "technical debt", "ROI", "career"],
    body: [
      {
        type: "paragraph",
        text: "I spent 15 years closing books, auditing controls and defending financial statements before I wrote a line of software. What changed in my engineering was not what I expected: not syntax, not frameworks. It was the inability to stop separating real technical improvement from hidden cost.",
      },
      { type: "heading", level: 2, text: "Accounting already had the answer" },
      {
        type: "paragraph",
        text: "Technical debt is, in strictly accounting terms, a liability. It consumes capital over time, shows up as a maintenance expense, and — this is the part almost everyone misses — it rarely appears on the list the finance committee approves. It sits in the engineering spreadsheet, invisible to whoever decides the budget.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "A service with 40% test coverage is not 'less finished'. It is a high-interest liability with a certain payment schedule and an unknown present value.",
          "A production incident is not a bug. It is a direct cash cost, with a customer, an hour rate, and a whole environment affected.",
          "A 30-second dashboard query is a cost centre running a full shift.",
        ],
      },
      { type: "heading", level: 2, text: "What this changes in the practice of leading" },
      {
        type: "paragraph",
        text: "Three concrete behaviours, transferred from accounting into engineering with almost no friction: budget instead of estimate, measure before you optimise, and privatise the cost before you privatise the benefit. A tech lead who can state the annual cost of a technical decision in one sentence has a competitive advantage no framework will ever ship.",
      },
      {
        type: "quote",
        text: "Engineering that connects distributed systems, product and financial return.",
      },
      {
        type: "callout",
        tone: "primary",
        title: "If you are hiring",
        text: "Ask the candidate what a month of downtime costs in their system. The answer reveals their reasoning rigour and their experience with the true cost of a technical decision at the same time.",
      },
      {
        type: "paragraph",
        text: "I am not arguing that you need an accounting degree. I am arguing that treating software as both an asset and a liability — rather than as magic — is what separates a team that ships cost from a team that ships features. And that capability is learnable, but it is learned far faster once you have watched a month-end close.",
      },
    ],
  },
];
