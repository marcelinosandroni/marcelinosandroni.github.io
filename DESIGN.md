# DESIGN.md — Executive Engineering Design System

> **Status:** normative. This file is the source of truth for every visual and
> UX decision in this repository. Any UI change that contradicts this document is
> a bug, and any UI change that cannot be expressed with these tokens is a
> design debt.
>
> **Origin:** distilled from `design-assets/DESIGN.md` (the generated reference
> prototype in `design-assets/code.html`). The reference is the *visual* baseline;
> this file is the *implementation* contract. Where the two disagree on
> behaviour (not on looks), this file wins — see [§9 Deliberate deviations](#9-deliberate-deviations-from-the-reference-prototype).

---

## 1. Purpose and audience

This is the personal site of **Marcelino Sandroni Dias — Senior Software
Engineer & Tech Lead**. It has three simultaneous audiences, and every layout
decision is a trade-off between them:

| Audience | What they need in the first 5 seconds | What they do next |
| --- | --- | --- |
| **Technical evaluator** (staff/principal hiring manager) | Scale numbers, architecture decisions, correctness | Read the track record, open a case study, open an article |
| **Tech recruiter / talent partner** | Role, tenure, stack, availability, contact | Scan the KPI grid, download the PDF, hit LinkedIn |
| **CEO / owner / investor** | Financial impact, risk reduction, leadership | Read the headline, the fiscal KPIs, the CTA |

Consequences that are **not optional**:

- Every headline number is a *measured* number, never a vanity metric.
- Copy is written in the second person of the outcome ("R$ 24M/year protected"),
  never in the first person of the effort.
- A recruiter must be able to reach a contact channel without scrolling past
  the second section.
- The page must be fully legible and navigable with JavaScript disabled.

---

## 2. Brand and style

The system expresses the intersection of **high-tier distributed systems
engineering** and **senior executive fiscal stewardship**.

- The aesthetic merges the razor-sharp precision of developer tooling
  (Linear, Vercel) with the authoritative typographic discipline of Swiss
  architectural publishing and financial whitepapers (Stripe Press).
- Tone: high-frequency engineering execution balanced by institutional
  gravitas. Calculated, calm, unshakeable, profitable.
- Treatment is austere and dense yet impeccably readable.
- Surfaces are deep obsidian-tinted dark slates — never hollow absolute black —
  paired with crisp 1px micro-borders and deliberate lime/mint accents.
- Financial impacts, operational metrics and architecture summaries are staged
  with museum-grade typographic discipline.

**Voice rules.** The register is **corporate executive**, not engineering
showcase and not marketing. Sentence case in prose, uppercase mono for micro-labels.
No exclamation marks. No "passionate", "enthusiast", "guru", "ninja", "rockstar",
"cutting-edge", "seamless", "leverage" as a verb. First-person only for what was
personally delivered.

### 1.1 Copy rules (normative, machine-enforced)

These are asserted in `tests/unit/presentation/home-content.test.ts`, because a
copy rule that lives only in a review comment does not survive a content edit.

**No fiction naming.** Systems are named for what they do. Codenames borrowed from
films, pop culture or anime are banned, as are invented project names. The
predictive public-safety platform is *"Sistema Preditivo de Segurança Pública"* /
*"Predictive Public Safety System"* — not a movie title. Identifiers may be terse
(`// ID: MSD-01`) but never grandiose.

**Every figure is measurable and traceable.** A number on this site is R$,
percentage, or volumetry. It must come from the resume, and the arsenal chips must
be skills the resume claims in the same category. A bullet with no figure is a
bullet that should have been cut.

**Compression.** At most **three bullets per employer**, everywhere — home and
resume. The depth lives in the case studies on `/resume`, not in a wall of bullets.

**The arithmetic is stated, not implied.** Where the career spans two fields, the
sum is written out with both periods: *15 years of corporate financial governance
(2005–2020) plus 6 years of software engineering (2021–2026): 21 years of combined
expertise.* A reader must never have to add two date ranges themselves.

**Spelling is part of the voice.** en-US copy uses American spelling (a British
spelling tells a US recruiter the text was translated, not written). pt-BR copy
uses Brazilian Portuguese, never European forms.

**Closed taxonomy.** The technical arsenal is exactly four categories —
*Frontend & UI*, *Backend Core*, *DevOps & Cloud*, *Artificial Intelligence* — in
both the home arsenal and the resume skill groups, so the two never disagree.

---

## 3. Colour

A calibrated deep dark-slate spectrum. Pure monochrome black is rejected in
favour of blue-slate foundations that reduce glare and raise chromatic contrast.

### 3.1 Roles (authoritative)

| Token | Hex | Role |
| --- | --- | --- |
| `surface-base` | `#0A0D12` | Core obsidian ground. Page canvas, inset panels, form fields. |
| `surface-raised` | `#11151C` | Tier 1 — cards, data panels, all content blocks. |
| `surface-overlay` | `#181E27` | Tier 2 — elevated drawers, popovers, code headers, footer. |
| `surface-bright` | `#36393F` | Rare high-emphasis fills. Use sparingly. |
| `border-subtle` | `#1E2633` | The default 1px hairline. Roughly 70% of all borders. |
| `border-prominent` | `#2D384B` | Hover/focus boundary. Elevated drawers. |
| `text-primary` | `#F4F1EA` | Warm editorial off-white. Headlines and body. |
| `text-secondary` | `#94A3B8` | Supporting copy, descriptions, metadata. |
| `text-muted` | `#56657A` | Mono micro-labels, placeholders, decorative telemetry. |
| `primary-container` | `#BAF336` | Precision neon lime. The single accent. |
| `primary-fixed-dim` | `#A1D811` | Primary hover/active shade. |
| `secondary` | `#34D399` | Emerald mint. Stability, uptime, healthy state. |
| `tertiary` | `#93C5FD` | Architectural slate blue. Infrastructure badges, pipeline stages. |

Supporting Material-derived tokens (`on-primary-container`, `on-secondary`,
`surface-container-*`, `outline*`) are defined in `src/app/globals.css` for
components that need a proper Material pairing (e.g. a chip whose background is
the accent needs an `on-*` foreground). **Rule: never hand-pick a foreground
for an accent.** Look it up in the token table.

### 3.2 Accent discipline

- Lime is used with **surgical discretion**: critical state indicators, ROI
  highlights, interactive micro-cues, key metric calls. It commands priority
  without overwhelming the workspace.
- Mint means **stable / healthy / operational**: production telemetry, SLA
  uptime, positive fiscal differentials.
- Slate blue means **infrastructure**: cloud nodes, pipeline stages, technical
  taxonomy.
- **Budget:** at most one lime accent and one mint accent visible per viewport
  region. If a section starts competing with another, the section is wrong.
- Never use accent colour for body text. Never for background fills larger than
  a card. Never as a border on more than ~40% of a dense grid.

### 3.3 Contrast

- Body text on `surface-base` must be `text-primary` or `text-secondary`.
  `text-muted` is **never** used for text a reader must read to complete a
  task; it is for telemetry, units and disabled states.
- `on-primary-container` (`#253600`) is the only foreground on a lime fill.
- Focus rings are a crisp 1px lime hairline, never a thick glow, so keyboard
  focus is always visible against every surface tier.

---

## 4. Typography

A three-font matrix. Each family has exactly one job; mixing jobs is the
fastest way to look amateur.

| Family | Job | Loaded weights |
| --- | --- | --- |
| **Manrope** | Structural geometric core. Headlines, executive titles, body copy, big numeric callouts. | 400, 500, 600, 700, 800 |
| **JetBrains Mono** | Technical instrumentation. Metadata tags, protocol paths, metric units, step indexes, micro-labels. | 400, 500, 600, 700 |
| **Playfair Display** | Editorial nuance. High-level quotes, strategic framing, the job title line. | 500, 600 + italic |

### 4.1 Scale (authoritative — these are Tailwind theme tokens)

| Token | Family | Size / LH / Tracking / Weight | Use |
| --- | --- | --- | --- |
| `display-hero` | Manrope | 64 / 72 / −0.035em / 800 | Hero headline, desktop only |
| `display-hero-mobile` | Manrope | 38 / 44 / −0.025em / 800 | Hero headline < 1024px |
| `metric-stat` | Manrope | 48 / 52 / −0.03em / 700 | KPI monumental statistic |
| `metric-stat-mobile` | Manrope | 32 / 36 / −0.02em / 700 | KPI statistic < 768px |
| `editorial-quote` | Playfair | 26 / 36 / −0.01em / 500 | Pull quotes only |
| `headline-lg` | Manrope | 32 / 40 / −0.02em / 700 | Section headline |
| `headline-md` | Manrope | 24 / 32 / −0.015em / 600 | Company name, article title |
| `headline-sm` | Manrope | 18 / 26 / −0.01em / 600 | Group title, card title |
| `body-lg` | Manrope | 17 / 28 / 400 | Hero narrative, lead paragraph |
| `body-md` | Manrope | 15 / 24 / 400 | Bullet prose |
| `body-sm` | Manrope | 13 / 20 / 400 | Card descriptions, dense copy |
| `code-inline` | JetBrains Mono | 13 / 18 / −0.01em / 500 | Inline values, tech stack inline |
| `label-mono` | JetBrains Mono | 11 / 16 / 0.06em / 600 | Section kickers, metadata, chips |

Rules:

1. **Fluid clamp only where a token pair exists.** Never invent an intermediate
   size. Desktop value + `*-mobile` token is the whole responsive type system.
2. Mono micro-labels are uppercase with `0.06em` tracking to lock a monospaced
   rhythm. Mono is never used for sentences longer than ~60 characters.
3. Playfair is reserved. If a page contains more than three Playfair runs, one
   of them is not earning its place.
4. Numerals in metrics are Manrope 700/800, never mono — mono is for the
   *label* and the *unit*.

---

## 5. Layout and spacing

A 12-column grid on a strict vertical 8pt baseline.

- **Content width:** hard cap `1320px` (`max-w-[1320px]`), centred, inside
  high-contrast technical margin gutters.
- **Gutters:** `1rem` mobile → `2rem` tablet → `3rem` desktop
  (`px-margin md:px-margin-tablet lg:px-margin-desktop`).
- **Section rhythm:** major modules breathe at `space-2xl` on mobile and
  `space-3xl` on desktop. An uncluttered, museum-grade portfolio presence.
- **Density:** micro-components (data grids, metric clusters, tech stacks) use
  `space-sm` → `space-md` internal padding. Information density is a feature
  for engineering leaders; whitespace is reserved between sections, not inside
  them.

### 5.1 Breakpoints

| Range | Grid | Behaviour |
| --- | --- | --- |
| `< 768px` | 4 columns | Metric cards stack, architecture tiers become full-width border-separated rows, nav collapses to a sheet, `display-hero-mobile` + `metric-stat-mobile`. |
| `768–1024px` | 8 columns | Dual-metric card rows, condensed sidebars. |
| `> 1024px` | 12 columns | Full multi-tier canvases, side-by-side technical deep dives, hero 7/5 split. |

### 5.2 Structural rules

- Every `<section>` carries an `id` and is reachable by in-page anchor from the
  header. The header must contain a link to every section it is expected to
  offer.
- The page must have **exactly one `<h1>`**. Heading levels never skip.
- Sections alternate surface tiers (`base` → `raised/40` → `base` → `raised/60`)
  to create rhythm without shadows. Never two identical adjacent section
  backgrounds.

---

## 6. Elevation and depth

Depth avoids heavy muddy drop shadows in favour of precise tiering, frosted
glass and razor micro-borders.

- **Tier 0 — Base canvas.** `surface-base` plus a faint 1px micro-dot structural
  grid at `rgba(255,255,255,0.03)`, fixed, non-interactive, behind everything.
- **Tier 1 — Cards & data panels.** `surface-raised`, 1px `border-subtle`.
- **Tier 2 — Modals, terminals, hover focus.** `surface-overlay`, 1px
  `border-prominent`, localised micro-glow.
- **Atmospheric depth.** Diffused radial gradients only:
  `rgba(186,243,54,0.04)` and `rgba(52,211,153,0.03)`, `blur-3xl`,
  `pointer-events-none`, `-z-10`. Never a gradient with a hard edge, never a
  gradient behind body text.
- **Glass.** Sticky rails and status bars: `backdrop-blur-xl` +
  `rgba(10,13,18,0.82)` + 1px `border-subtle` hairline.
- Shadows, when used at all, are coloured lime at 5–20% alpha and reserved for
  primary actions.

---

## 7. Shape

Disciplined soft curvature. Radii are strictly bounded and never arbitrary.

| Token | Value | Use |
| --- | --- | --- |
| `rounded` (DEFAULT) | `0.25rem` / 4px | Buttons, inputs, micro-chips — preserves the industrial CAD/IDE feel |
| `rounded-md` | `0.375rem` / 6px | Dense inline controls |
| `rounded-lg` | `0.5rem` / 8px | Cards and data modules |
| `rounded-xl` | `0.75rem` / 12px | Feature panels, framed assets |
| `rounded-2xl` | `1rem` / 16px | Hero asset frame, contact panel |
| `rounded-full` | `9999px` | **Reserved** for live-status / availability pills only |

- Border widths are fixed at **1px** hairline precision.
- A pill shape is a semantic claim ("this is a live status"). Never use
  `rounded-full` decoratively.

---

## 8. Components

### 8.1 Buttons

- **Primary (executive action / contact).** `bg-primary-container`,
  `text-on-primary-container`, Manrope 600. Hover → `bg-primary-fixed-dim` plus
  `shadow-lg shadow-primary-container/20`. Active → `scale-[0.98]`. One per
  viewport region maximum.
- **Secondary (deep dive / download).** Transparent, 1px `border-subtle`,
  `text-text-primary`. Hover → border `text-secondary`, background
  `rgba(255,255,255,0.04)`.
- **Focus.** `focus-visible:ring-1 focus-visible:ring-primary-container`
  plus `focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base`.
  Never remove the focus ring; never rely on it alone for hover parity.
- **Minimum target:** 40px tall on touch, 32px on desktop.

### 8.2 Executive KPI metric cards

The highest-value component on the site. Two-part construction:

1. Top mono header (`label-mono`, uppercase) + status dot + icon.
2. Monumental statistic (`metric-stat`).
3. Annotated subtext (`body-sm`, `text-secondary`) describing technical scope
   and business ROI.
4. Footer strip in `surface-overlay/50` with a left key and a right value in
   lime or mint — the *proof* of the number above it.

Subtle inner `1px solid border-subtle`, plus a discrete lime top-corner glow on
hover. The stat value transitions to lime/mint on hover to tie card to accent
budget.

### 8.3 Architecture & system-flow diagrams

- Dark-slate node containers connected by 1px vectors.
- Active nodes render with mint/lime pulsing status rings; legacy layers render
  `text-muted`.
- Interactive detail slides in from the right edge with code snippets, latency
  benchmarks and architectural decisions (Hexagonal, Event-Driven, DDD).

### 8.4 Chips & technology taxonomy badges

JetBrains Mono 11px uppercase, padding `4px 8px`, radius 4px.

- Default: `bg-surface-overlay`, `border-subtle`, `text-text-secondary`.
- Highlight: `bg-primary-container/8`, `border-primary-container/40`,
  `text-primary-container`.
- Tertiary: `bg-tertiary/8`, `border-tertiary/40`, `text-tertiary`.

A chip is a **taxonomy label, not a button**. If it navigates, it must be an
anchor with a real `href`.

### 8.5 Project showcase / recruiter drawer

- Split layout: metric breakdown left, architecture or stack breakdown right.
- Recruiter scanning bar up front: role, team size, scale, core tech, fiscal
  impact. This bar must be visible **without interaction**.
- Expandable drawer structured as *Problem* → *Scale & Complexity* →
  *Architectural Decision* → *Measured Outcome*.

### 8.6 Inputs & terminal fields

`bg-surface-base`, 1px `border-subtle`, placeholder `text-muted`, radius 4px.
Focus transitions the hairline border to `primary-container` — no thick outline,
no box-shadow halo. Labels are always visible (`label-mono`, 10px, uppercase,
`text-muted`) and never serve as placeholders. Every field has a real `<label>`.

### 8.7 Section heading (mandatory anatomy)

Every section opens with the same two-part header so the page scans as a
system:

```
// MONO KICKER        ← label-mono, primary-container, uppercase
Section Headline     ← headline-lg, text-primary
Supporting note      ← body-sm, text-muted, max-w-md, right-aligned on desktop
```

### 8.8 Status pill

`rounded-full`, `surface-overlay` background, 8px pulsing dot, `label-mono`
uppercase text. Colour of the dot encodes availability: lime = open to work,
mint = systems healthy, tertiary = in progress.

---

## 9. Deliberate deviations from the reference prototype

The reference in `design-assets/code.html` is the visual baseline. These
behaviours were **deliberately rejected** because they damage the primary goal
(first impression for recruiters, evaluators and executives):

| Reference behaviour | Decision here | Why |
| --- | --- | --- |
| Full-screen boot overlay that blocks the page for 2.5s | Non-blocking `BootSequence` that auto-dismisses, is skipped on repeat visits, and is disabled entirely under `prefers-reduced-motion` | A 2.5s gate before any content is a measurable conversion loss and reads as a gimmick to a CTO. The first paint must contain the headline. |
| Overlay that must be dismissed by a click or `Enter` | Dismissed on any pointer/key/scroll input, and on a short timer | Content must never be gated on interaction. |
| Web Audio ambient drone | Removed entirely | Autoplay is blocked by browsers anyway; unsolicited audio is hostile, and it costs CPU on a page whose job is to be fast. |
| "Full-screen code-rain canvas behind the whole page | Canvas confined to the boot sequence only, `prefers-reduced-motion` aware, and cleaned up on unmount | A permanently animating full-viewport canvas costs battery and dominates the CPU profile on a performance-scored site. |
| `100M msgs/day` and other metrics hardcoded in markup | Every metric, title and description lives in `src/infrastructure/content/home/*` | Content must be configurable and bilingual; the design is a template, the data is not in the markup. |
| Codename and pop-culture naming (`NEO`, `AnimateMatrix`, `Minority Report`, "neural uplink") | Systems named for what they do; identifiers reduced to `// ID: MSD-01` | See §1.1. A codename borrowed from a film is a tell that the copy was dressed up rather than earned, and it invites the question of what else is invented. |
| Boot sequence labelled `COGNITIVE SYS_INIT` / `NEURAL UPLINK READY` | `// SESSION INIT` / `READY. AWAITING INSTRUCTION...`, with the career arithmetic as the payload | The one thing a reader can usefully learn in the first second is the 15 + 6 = 21 progression, not a joke. |
| Material Symbols icon font | Local inline SVG icon component | No third-party font request, no FOUT, no layout shift, tree-shakeable. |

Anything else in the reference that can be reproduced faithfully **must** be
reproduced faithfully.

---

## 10. Accessibility contract (non-negotiable)

- **Contrast** — body text ≥ 4.5:1, large text and UI borders ≥ 3:1. Every
  pairing used in the app has been chosen against the token table in §3.
- **Keyboard** — every interactive element reachable and operable by keyboard,
  in DOM order, with a visible lime focus ring. Drawers/menus trap nothing and
  close on `Escape`.
- **Semantics** — one `h1`; no skipped heading levels; `<nav>` with
  `aria-label`; `<article>` for each experience/article; `<time datetime>` for
  every date; decorative SVGs `aria-hidden`; meaningful SVGs given a `<title>`.
- **Status** — loading states use `aria-busy`; errors use `role="alert"`.
- **Motion** — `@media (prefers-reduced-motion: reduce)` disables the boot
  sequence, pulses, gradient drift and all transitions that move content.
- **Zoom** — the layout survives 200% zoom; no horizontal scroll at 320px.
- **No-JS** — the whole of the resume, home and blog content is server-rendered
  HTML. The only client islands are the PDF download button and the boot
  sequence.

---

## 11. Performance contract

| Budget | Value |
| --- | --- |
| Client JS on the home route | < 40 kB gzip, excluding React/Next runtime |
| Web fonts | 3 families, `next/font` self-hosted, `display: swap`, preconnect only to self |
| Third-party requests | 0 on first load |
| LCP element | the `display-hero` `<h1>` — never an image, never a canvas |
| LCP budget | < 2.0s on a mid-tier mobile connection |
| CLS budget | < 0.02 — every image and frame has an intrinsic aspect ratio |
| Long tasks | none over 50ms attributable to first-party code |

Rules:

- The hero image is `next/image` with a fixed aspect box, `priority`, and
  explicit `sizes`. Never a raw `<img>` with an unconstrained layout.
- Resume and home datasets are read in Server Components only. **No component
  that imports resume or home content may be a Client Component** — this is
  enforced by the e2e bundle test.
- Animations are CSS-only. No animation library.

---

## 12. Content configuration contract

Design is applied through data, never through hardcoded markup.

- **Home page copy** — `src/infrastructure/content/home/home-{locale}.ts`,
  typed against `src/domain/portfolio/home-content.ts`. Every string a visitor
  reads on the home route exists there, in both `pt-BR` and `en-US`.
- **Resume document** — `src/infrastructure/content/resume-data*.ts`, typed
  against `src/domain/resume/types.ts`. Untouched by the redesign; it remains
  the single source for the resume route, the PDF pipeline and the home page's
  track record, KPI and education sections.
- **Blog** — database-stored articles (`blog_articles`), read through the
  `ArticleRepository` port. The versioned catalog under
  `src/infrastructure/content/blog/` is a build-time fallback used only when the
  database is unreachable, so the site never renders an empty blog.
- **UI chrome** — `src/i18n/dictionaries/*.ts`. A missing key is a build error,
  not an untranslated string.
- **Site identity** — `src/domain/site/site-info.ts`.

Adding a section, metric, chip, article or language must be a data change plus
one new component — never an edit to a shared layout file.

---

## 13. Anti-patterns

Never ship any of these:

1. A hardcoded hex, px or font size inside a component. Use the tokens.
2. A user-facing string literal in a component. Use the catalog or the content
   module.
3. A Client Component that imports resume or home content.
4. A card grid where every card is identical in structure and emphasis — vary
   the stat scale (`metric-stat` vs `headline-lg`) so the eye finds the number
   that matters, as the reference KPI grid does.
5. `rounded-full` on anything that is not a live status.
6. A shadow heavier than `shadow-lg` with a non-accent colour.
7. A gradient with a visible edge, or a gradient behind body text.
8. An animation that runs while the element is off-screen.
9. `alert()`, `confirm()`, or any blocking browser dialog.
10. A second `<h1>`, a skipped heading level, or a removed focus ring.
11. A skeleton that replaces server-rendered content. The content is already
    there; a skeleton only makes it slower.
12. Lorem ipsum, placeholder metrics, or metrics that cannot be defended in an
    interview.

---

## 14. Definition of done for any UI change

- [ ] Uses only tokens from §3–§7.
- [ ] Every string comes from the catalog or the content module.
- [ ] Still server-rendered; no new client JS unless the change is genuinely
      interactive.
- [ ] Keyboard operable with a visible focus ring.
- [ ] Passes the contrast floor in §10.
- [ ] Verified at 320px, 768px, 1024px and 1440px, and at 200% zoom.
- [ ] Verified with `prefers-reduced-motion: reduce`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:unit` and
      `npm run test:e2e` all green.
- [ ] No new library added without a note in this file.
