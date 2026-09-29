<div align="center">

# Marcelino Sandroni Dias

**Senior Software Engineer · Tech Lead**

Building systems that survive production — and the teams that run them.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-RLS-3ECF8E?logo=supabase)](https://supabase.com)

[🌐 Live site](https://marcelinosandroni.com) · [📄 Résumé](https://marcelinosandroni.com/en-us/resume) · [✍️ Writing](https://marcelinosandroni.com/en-us/blog) · [💼 LinkedIn](https://linkedin.com/in/marcelinosandroni) · [📫 Email](mailto:marcelino.sandroni@gmail.com)

</div>

---

## The short version

I am a senior engineer and tech lead with **15 years in corporate financial governance and 6 writing software** — 21 years of learning that most technical decisions are balance-sheet decisions wearing a technical costume.

That is the thesis of this repository. Everything below is either a claim I can point at in the code, or a number I can defend.

| | |
|---|---|
| **Protected revenue** | R$ 24M/year — a government contract rescued from cancellation |
| **Throughput** | 100M messages/day, p99 ingest under 10ms |
| **Migration** | RDS → ClickHouse, 30s dashboards → 190ms, −88% storage |
| **Uptime lifted** | 95% → 100% on a settlement system |
| **Delivery** | 4h → 15min deploys, 1/week → 4/day releases |

---

## Why this repo exists

I wanted one project that a technical reviewer could actually evaluate, rather than a list of claims they had to take on faith. So this is a **production portfolio site** — the same code path, the same constraints, the same obsession with detail that I bring to a client codebase.

Three things make it useful as evidence rather than decoration:

1. **It is real.** Running, deployed, and instrumented. The telemetry bar at the bottom of the page reports the load timings of *your* visit, measured by your browser.
2. **It is multilingual by construction.** PT-BR and EN-US are separate statically generated documents with their own URLs, `hreflang`, `openGraph:locale` and structured data. Not a translate button.
3. **It refuses to lie.** Several features in here were built specifically to *not* make claims. I will point them out below, because a portfolio that overstates is worth nothing to a reviewer who checks.

---

## What is in here

### 🌍 Internationalisation as a first-class concern

Most multi-language sites are one page with a language toggle. This one is a properly localised application:

- **Locale contract in pure domain code** — the canonical BCP-47 tag (`pt-BR`) is deliberately kept separate from the URL segment (`pt-br`), so routes stay canonical and free of duplicate-content variants
- **Static generation per locale** with `dynamicParams = false`, so an unsupported language 404s at the routing layer instead of being rendered on demand
- **Typed message catalogs** — `en-US` is the reference and defines the contract; `pt-BR` is typed against it, so a missing or misspelled key **fails the build** rather than shipping untranslated UI
- **Edge negotiation** (`proxy.ts`) honouring `Accept-Language` with real q-value parsing, plus legacy-link redirects
- **Per-locale SEO** — `canonical`, `hreflang` including `x-default`, Open Graph locale pairs, `sitemap.xml` with alternates, and JSON-LD carrying `inLanguage`

The payoff is measurable: the bilingual resume dataset — 74 KB of source — **does not reach the browser at all**. It is read on the server and rendered to HTML.

→ [`docs/adr/ADR-005-internationalization-strategy.md`](docs/adr/ADR-005-internationalization-strategy.md)

### 🤖 A resume copilot that answers or refuses

Ask the site a question and it answers from published content with a citation for every claim — or tells you it does not know.

The retrieval is a transparent BM25-style scorer, **not an LLM call**, and that is a deliberate architectural choice:

- **Inspectable.** A recruiter asking "how did he save 24M" can see exactly which passages were selected. An opaque similarity score cannot explain itself.
- **Unfabricable.** There is no generate step to hallucinate in.
- **Free and offline.** No key, no network, no per-request cost, so it cannot silently stop answering because a provider is down.

Refusal is a first-class code path, not an error. Two retrieval bugs were found and fixed while testing this, both of which had the copilot confidently citing unrelated content — a stop-word list missing `in`, and a relevance gate built on document frequency where discriminativeness (IDF) was the correct signal. A question about pizza now correctly returns *"nothing in this resume answers that"*.

### 🔐 Passwordless owner access, restricted by construction

`/admin` is protected by magic-link authentication. The interesting part is not the login screen, it is the authorisation:

- **Exact set membership, never a substring test.** `includes("a@b.com")` is true for `xa@b.com` and for `a@b.com.attacker.test`. That is the textbook allowlist bypass, so the comparison is `Set.has` on a normalised address — and there is a test asserting every near-miss is refused.
- **The allowlist gates token creation, not token use.** A stranger never receives a token in the first place.
- **Fails closed.** An unset `ADMIN_EMAIL` authorises *nobody*. Failing open would put an admin area behind no check.
- **No enumeration.** The same confirmation is shown whether an address is the owner or not.

→ [`src/domain/admin/admin-identity.ts`](src/domain/admin/admin-identity.ts)

### 📊 Analytics that cannot hold personal data

An aggregate click map, designed so that re-identification is *impossible* rather than merely discouraged:

- No coordinate, viewport, IP, user agent, referrer, session or cookie column exists — not as a policy, as a schema
- No per-event table: a click is folded into a counter at write time
- `element` is a constrained enum, so the signal set cannot grow by accident
- RLS grants the anonymous role **read-only**; writes happen server-side behind a service-role key, so a scraper cannot inflate the counters

The canvas heatmap still works: rectangles are measured with `getBoundingClientRect()` **in the visitor's browser** and never transmitted. Only the counters travel.

### 📄 Deterministic PDF generation

LaTeX compiled in a pinned Docker image, with a zero-dependency PDFKit fallback so a download never hard-fails when Docker is unavailable. Output is deterministic and cached by content hash.

### 🏗 Clean Architecture, actually enforced

Domain is pure. `src/domain` imports nothing from React, Next.js, or any SDK — which is what makes the locale contract, the admin allowlist, and the copilot's answer states all testable without standing up a framework.

```
domain  ←  application  ←  infrastructure
   ↑            ↑              ↑
   └────────────┴──────────────┘
        presentation (Next.js)
```

---

## Engineering standards I hold to

This is the part a reviewer can check mechanically, so it is worth being precise:

| Practice | Where it is enforced |
|---|---|
| Strict TypeScript, no `any` | `tsconfig.json`, 0 lint errors |
| Tests written against behaviour | 311 unit + 65 e2e |
| Bilingual content parity as a **build gate** | PT-BR is the source of truth; every figure, date and count is asserted |
| No visible string outside a catalog | Enforced by test, including for PDF headings |
| Accessibility | Semantic landmarks, real accessible names, keyboard-operable, `prefers-reduced-motion` |
| Privacy by schema, not by promise | Asserted against the migration SQL |

A few examples of tests that are worth more than their line count:

- **Content parity** — the English resume must mirror the Portuguese one in period, role, seniority, highlight count and case-study count. An abbreviated English version fails CI rather than shipping a weaker impression to an international recruiter.
- **Never hardcoded** — a test reads the renderer source and fails if a user-facing string reappears in it.
- **Honest telemetry** — a test fails if the metrics bar claims "uptime" or "99.99%".

---

## Tech stack

**Frontend** — Next.js 16 (App Router, RSC), React 19, TypeScript strict, Tailwind v4 with a token-based design system

**Backend** — Node.js, PostgreSQL (Supabase) with RLS, Auth.js, event-driven messaging (Kafka, RabbitMQ)

**Data** — ClickHouse for high-volume analytics, Redis, Databricks ETL

**Infrastructure** — AWS, Kubernetes, Terraform, Docker, Jenkins, OpenTelemetry

**Quality** — Vitest, Playwright, TDD, SonarQube

---

## What this project is *not*

I would rather state the limits than let you find them:

- **There is no LLM in the copilot.** It is lexical retrieval, and it will not answer a question phrased entirely in concepts rather than words. That is a deliberate trade for inspectability.
- **The click analytics need a migration applied.** Until then the counters read empty by design.
- **The admin area is a shell.** The authentication and authorisation are real and tested; the CMS behind it is not built yet.
- **Uptime is not shown anywhere.** This site has no monitoring, so it has no honest uptime number, and the telemetry bar says only what the browser can actually measure.

---

## A note on the other 15 years

Before software, I closed books, audited controls and defended financial statements. Technical debt is a liability: it consumes capital, it shows up as maintenance expense, and it almost never appears on the list the finance committee approves.

That discipline is why I budget instead of estimate, measure before optimising, and privatise the cost of a decision before privatising its benefit. It is also why this repository documents its decisions and their rejected alternatives — a tech lead who can state the cost of a technical decision in one sentence has an advantage no framework ships.

→ [Read the writing](https://marcelinosandroni.com/en-us/blog) on distributed systems, data platforms and engineering leadership.

---

<div align="center">

**Currently open to senior engineering and tech lead roles.**

[marcelino.sandroni@gmail.com](mailto:marcelino.sandroni@gmail.com) · [LinkedIn](https://linkedin.com/in/marcelinosandroni)

</div>
