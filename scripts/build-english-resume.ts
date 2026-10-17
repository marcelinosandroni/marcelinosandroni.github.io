import { promises as fs } from "node:fs";
import { paginate } from "./paginate-resume";
import { checkLayout } from "./check-layout";
import {
  TONES,
  TIMELINE_CSS,
  assertTimelineMatchesRoles,
  buildTimeline,
  type TimelineRole,
} from "./data/career-timeline";
import { resolve } from "node:path";

/**
 * Builds the English resume from the approved Portuguese one.
 *
 * ## Why a script and not a hand-copy
 *
 * Because the two documents must stay *structurally* identical: same blocks, same
 * utilities, same typography, same print rules. That is what makes the page count
 * in one locale evidence about the other, and a translated copy that drifts -
 * a section left behind, a utility renamed, a print rule dropped - would fail
 * silently as a different page count rather than as an obvious mistake.
 *
 * So the shared parts are never rewritten here. Only visible text is replaced, and
 * every replacement is asserted: a phrase the script cannot find is an error, not
 * a leftover in Portuguese inside an English résumé.
 */
type Rule = { readonly from: string; readonly to: string };

const TEXT: ReadonlyArray<Rule> = [
    // Head and identity
    { from: "Marcelino Sandroni - Curriculo", to: "Marcelino Sandroni - Resume" },
    { from: "Engenheiro de Software Sênior &amp; IA<", to: "Senior Software &amp; AI Engineer<" },
    // Contact block
    { from: "<strong>Localização:</strong>", to: "<strong>Location:</strong>" },
    { from: "Fortaleza, CE (Atuação Remota)", to: "Fortaleza, CE (Fully Remote)" },
    { from: "<strong>Email:</strong>", to: "<strong>Email:</strong>" },
    { from: "<strong>WhatsApp:</strong>", to: "<strong>WhatsApp:</strong>" },
    { from: "<strong>LinkedIn:</strong>", to: "<strong>LinkedIn:</strong>" },
    { from: "<strong>Git:</strong>", to: "<strong>Git:</strong>" },
    { from: "<strong>Portfólio:</strong>", to: "<strong>Portfolio:</strong>" },
    // Summary
    { from: "Resumo Profissional", to: "Professional Summary" },
    {
      from:
        "<strong>Engenheiro Full Stack de verdade, </strong>unindo visão estratégica e análise de negócio à execução end-to-end em UI/UX, mobile, frontend, backend, DevOps, engenharia de dados e IA, com 6 anos em engenharia de software e 15 em governança financeira, criando soluções escaláveis e sistemas críticos que movimentam bilhões de reais.",
      to:
        "<strong>A genuine full-stack engineer, </strong>pairing strategic vision and business analysis with end-to-end delivery across UI/UX, mobile, frontend, backend, DevOps, data engineering and AI. Six years in software engineering and fifteen in financial governance, building scalable solutions and critical systems that move billions of reais.",
    },
    // Metrics
    { from: "Principais Métricas de Impacto em Produção", to: "Key Production Impact Metrics" },
    { from: "+R$ 500 Bi<", to: "+R$ 500Bn<" },
    { from: ">Gestão de Ativos<", to: ">Asset Management<" },
    { from: "Aplicações críticas de custódia de fundos.", to: "Critical applications for fund custody." },
    { from: ">Liquidação Síncrona<", to: ">Synchronous Settlement<" },
    { from: "Sistema de processamento de pagamentos em tempo real.", to: "Real-time payment processing system." },
    { from: ">Alta Escala<", to: ">High Scale<" },
    { from: "Arquitetura de processamento assíncrono de eventos.", to: "Architecture for asynchronous event processing." },
    { from: ">Inteligência Artificial<", to: ">Artificial Intelligence<" },
    { from: "Contrato salvo com implementação e melhorias em IA de ponta.", to: "Contract saved through state-of-the-art AI implementation." },
  // Experience
    { from: ">Experiência Profissional<", to: ">Professional Experience<" },
    { from: ">Linha do Tempo de Carreira<", to: ">Career Timeline<" },
    /*
      Titles carry their level again, so the translation carries it too.
      "Sênior" and "Pleno" are not decoration in Portuguese and dropping them here
      would produce an English document that claims less than the Portuguese one it
      was made from - the reader would compare the two and one of them would be
      wrong. The levels themselves are the conventional English ones rather than
      literal ones: "Sênior" is Senior, "Pleno" is Full.
    */
    { from: "Engenheiro de Software Sênior &amp; Tech Lead", to: "Senior Software Engineer &amp; Tech Lead" },
    { from: "Engenheiro de Software Sênior", to: "Senior Software Engineer" },
    { from: "Engenheiro de Software Pleno", to: "Full Software Engineer" },
    { from: "Analista Contábil &amp; Gestor Financeiro", to: "Accounting Analyst &amp; Finance Manager" },
    /*
      The company names are shortened to their first word, so the title line reads
      "DGT", "BNP Paribas", "ITAÚ", "ZUP" and "Consultoria Corporativa". Brazilian
      institutions keep their own names in English - an English reader knows Itaú,
      and translating it to "Itaú Bank" or "Itaú Corporation" says nothing they did
      not already assume.
    */
    { from: "<strong>Stack:</strong>", to: "<strong>Stack:</strong>" },
    /*
      The role bodies.
      Eleven sentences, written rather than derived. The previous list translated the
      experience as a set of word swaps, which worked while the text was the same
      across the variants and stops working the moment the experience is rewritten:
      every one of those rules now points at a sentence that no longer exists, and a
      rule that cannot match takes the build down rather than quietly translating
      nothing.
    */
    {
      from:
        "<strong>Liderança Técnica &amp; Integração IA:</strong> Liderança de squad (8 pessoas) na reestruturação de sistemas críticos processando 100M+ mensagens/dia. IA Corporativa conectando o backend via Spring AI para fluxos agênticos em tempo real, preservando contrato de R$ 24M/ano.",
      to:
        "<strong>Technical Leadership &amp; AI Integration:</strong> Led an 8-person squad through the restructuring of critical systems processing 100M+ messages/day. Corporate AI wired into the backend through Spring AI for real-time agentic flows, protecting a R$ 24M/year contract.",
    },
    {
      from:
        "<strong>Aceleração de 10x no Processamento:</strong> Migração de arquitetura relacional gargalo para microsserviços em Java, com tuning de JVM (ZGC) e baixa latência via gRPC e RabbitMQ.",
      to:
        "<strong>10x Faster Processing:</strong> Migrated a bottlenecked relational architecture to Java microservices, with JVM tuning (ZGC) and low latency over gRPC and RabbitMQ.",
    },
    {
      from:
        "<strong>Micro-frontends Enterprise:</strong> Interfaces web complexas em Angular, com gerenciamento reativo (RxJS/NgRx), assegurando UX fluida sob alta carga.",
      to:
        "<strong>Enterprise Micro-frontends:</strong> Complex web interfaces in Angular, with reactive state (RxJS/NgRx), keeping the experience smooth under heavy load.",
    },
    {
      from:
        "<strong>Modernização de Monolito Bancário:</strong> Pilar técnico de tribo (12 devs) no desacoplamento de sistemas legados (COBOL, VB) para arquitetura orientada a eventos em Java e interfaces modulares em Angular (95% de testes).",
      to:
        "<strong>Bank Monolith Modernisation:</strong> Technical pillar of a 12-engineer tribe, decoupling legacy systems (COBOL, VB) into event-driven architecture in Java with modular Angular interfaces (95% test coverage).",
    },
    {
      from:
        "<strong>Liquidação D+0 &amp; Tempo Real:</strong> Substituição de esteiras D+1 por conciliação de fundos em tempo real via Apache Kafka e Spring Batch, gerando +45% nos ativos geridos com SLA de 100% uptime.",
      to:
        "<strong>D+0 Settlement &amp; Real Time:</strong> Replaced D+1 pipelines with real-time fund reconciliation on Apache Kafka and Spring Batch, lifting assets under management by 45% with a 100% uptime SLA.",
    },
    {
      from:
        "<strong>Economia e Orquestração Global:</strong> Automação de fundos ETF institucionais, integrando B3 e bolsas internacionais, com impacto estimado de +R$ 50 Milhões em captação.",
      to:
        "<strong>Global Cost and Orchestration:</strong> Automated institutional ETF orchestration across B3 and international exchanges, with an estimated R$ 50 million in new inflows.",
    },
    {
      from:
        "<strong>Custódia Institucional Estratégica (+R$ 100 Bi):</strong> Orquestração conjunta (squad de 15 engenheiros) desenhando e sustentando plataforma B2B conectada à B3, com arquitetura cloud-native (AWS), APIs reativas em Java e painéis Angular.",
      to:
        "<strong>Strategic Institutional Custody (+R$ 100 Bn):</strong> Co-led a 15-engineer squad designing and running a B2B platform connected to B3, on cloud-native AWS with reactive Java APIs and Angular dashboards.",
    },
    {
      from:
        "<strong>Gestão de Crises e Resiliência:</strong> Resolução de gargalos de concorrência no Kafka sob alta volatilidade em menos de 24h, aplicando estrita idempotência transacional.",
      to:
        "<strong>Crisis Management and Resilience:</strong> Resolved Kafka concurrency bottlenecks under heavy volatility in under 24 hours, enforcing strict transactional idempotency.",
    },
    {
      from:
        "<strong>Aumento de 8x na Qualidade:</strong> Mentoria técnica e automação E2E (CI/CD), blindando o ecossistema contra regressões críticas.",
      to:
        "<strong>8x Quality Improvement:</strong> Technical mentoring and E2E automation (CI/CD), shielding the codebase from critical regressions.",
    },
    {
      from:
        "<strong>Evolução Rápida e Cloud:</strong> Promovido de Júnior a Pleno em 1 ano. Time ágil de 6 devs refatorando monolitos Java para eventos e migração AWS na metade do prazo estipulado.",
      to:
        "<strong>Rapid Progression and Cloud:</strong> Promoted from Junior to Full within one year. An agile team of six engineers refactoring Java monoliths onto event-driven architecture, and migrated to AWS in half the agreed schedule.",
    },
    {
      from:
        "<strong>Resiliência Transacional:</strong> Correção estrutural em mensageria assíncrona (RabbitMQ) via Circuit Breakers e DLQs, garantindo 100% de assertividade.",
      to:
        "<strong>Transactional Resilience:</strong> Rebuilt asynchronous messaging reliability on RabbitMQ with circuit breakers and dead-letter queues, reaching 100% data accuracy.",
    },
    {
      from:
        "<strong>Diferencial em Engenharia Corporativa:</strong> Liderança de equipes e redesenho de processos que reduziu o fechamento contábil em 83%. Profunda expertise em finanças e regras tributárias traduzidas diretamente para equipes de software.",
      to:
        "<strong>Corporate Engineering Edge:</strong> Team leadership and process redesign that cut the accounting close by 83%. Deep expertise in finance and tax rules, translated directly into software teams.",
    },
    // Education
    { from: "Formação Acadêmica &amp; Especializações", to: "Academic Education &amp; Specializations" },
    { from: "<strong>Bacharelado em Engenharia de Computação</strong>", to: "<strong>BSc in Computer Engineering</strong>" },
    { from: "<strong>Bacharelado em Ciências Contábeis</strong> — Estácio, concluído 2017", to: "<strong>BSc in Accounting</strong> — Estácio, completed 2017" },
    // Languages
    { from: ">Idiomas<", to: ">Languages<" },
    { from: ">Espanhol:<", to: ">Spanish:<" },
    { from: "leitura técnica e comunicação assíncrona.", to: "reading technical material and written communication." },
    { from: "<strong>Inglês Profissional:</strong> Fluente — reuniões, negociações, arquitetura e code review.", to: "<strong>Professional English:</strong> Fluent — meetings, negotiation, architecture and code review." },
    // Skills inventory
    {
      from: "Habilidades Técnicas &amp; Arquitetura de Software",
      to: "Technical Skills &amp; Software Architecture",
    },
    {
      from: "<strong>Frontend &amp; UI:</strong>",
      to: "<strong>Frontend &amp; UI:</strong>",
    },
    {
      from: "<strong>Dados &amp; Mensageria:</strong>",
      to: "<strong>Data &amp; Messaging:</strong>",
    },
    {
      from: "<strong>Backend &amp; Frameworks:</strong>",
      to: "<strong>Backend &amp; Frameworks:</strong>",
    },
    {
      from: "<strong>Cloud, DevOps &amp; SRE:</strong>",
      to: "<strong>Cloud, DevOps &amp; SRE:</strong>",
    },
    {
      from: "<strong>IA &amp; Governança:</strong>",
      to: "<strong>AI &amp; Governance:</strong>",
    },
];

/** Portuguese words that would betray an untranslated leftover in the output. */
const LEFTOVERS: ReadonlyArray<string> = [
  "Experiência",
  "Profissional",
  "Conhecida",
  "Engenheiro",
  "Gestão",
  "Liquidação",
  "Escala",
  "Remoto",
  "Híbrido",
  "Atuação",
  "Formação",
  "Idiomas",
  "Nativo",
  "Bacharelado",
    "Contratação",
  "Disponibilidade",
  "Continuação",
  "Promoção",
  "Diferencial",
  "Planejamento",
  "Mensageria",
  "Fechamento",
  "Custódia",
  "Gestão de Crise",
  /*
    Tenure and date vocabulary, covered by the pattern pass rather than by `TEXT`.
    Listed here so a change to the shell that introduces a sixth month abbreviation
    or a new duration shape fails the build instead of printing in Portuguese.
  */
  " anos",
  " ano",
  " meses",
  " mês",
  "Fev/",
  "Abr/",
  "Mai/",
  "Ago/",
  "Set/",
  "Out/",
  "Dez/",
];


/*
  The career timeline, in English.

  Written out rather than translated from the Portuguese one, because the levels
  are words rather than markup and a translation rule that matched `Sênior` would
  also match the one place in the Portuguese document it is allowed to appear.

  The periods stay Portuguese: they are read for the month counts and never
  printed, and the date pass below rewrites the ones the reader does see.
*/
const TIMELINE_EN: ReadonlyArray<TimelineRole> = [
  { label: "ZUP", period: "Mar/2019 – Jun/2020 · Remoto", level: "Junior → Full", tone: TONES.lightest },
  { label: "ITAÚ", period: "Jul/2020 – Nov/2022 · Híbrido", level: "Full", tone: TONES.light },
  { label: "BNP Paribas", period: "Dez/2022 – Set/2025 · Híbrido", level: "Senior", tone: TONES.mid },
  { label: "DGT", period: "Out/2025 – Set/2026 · Remoto", level: "Tech Lead", tone: TONES.dark },
];

async function main(): Promise<void> {
  const source = await fs.readFile(resolve("resume-shell.html"), "utf8");
  let out = source;

  const missing: string[] = [];

  for (const rule of TEXT) {
    if (!out.includes(rule.from)) {
      missing.push(rule.from.slice(0, 60));
      continue;
    }
    out = out.split(rule.from).join(rule.to);
  }

  if (missing.length > 0) {
    console.error("These phrases were not found in the source, so nothing was replaced:");
    for (const phrase of missing) {
      console.error(`  - ${phrase}`);
    }
    process.exit(1);
  }

  // Structure and comments are Portuguese on purpose; only reader-facing text changed.
  out = out
    .replace(/<title>[\s\S]*?<\/title>/, "<title>Marcelino Sandroni - Resume</title>")
    .replace(
      /Engenheiro de Software Sênior &amp; IA — Currículo v1 — Página (\d+) de (\d+)/g,
      "Senior Software &amp; AI Engineer — Resume v1 — Page $1 of $2",
    );

  /*
    The bar goes in before the date pass, not after it.

    The guard compares the timeline's periods against the dates the document
    actually carries, and the date pass below rewrites `Fev/2021` to `Feb/2021`.
    Fill the bar afterwards and the two disagree about a month that was never in
    dispute - which is the guard doing its job, on a document that is right.
  */
  const placeholder = '<div id="carreira-timeline"></div>';

  if (!out.includes(placeholder)) {
    throw new Error("the shell has no timeline placeholder");
  }

  assertTimelineMatchesRoles("en-US", TIMELINE_EN, out);
  out = out.replace(placeholder, buildTimeline(TIMELINE_EN));

  /*
    Tenures and dates, which no phrase rule ever covered.

    Both live in the role header as `2 anos e 10 meses (Mar/2023 – Dez/2025)`, and
    both are reader-facing - so the English document had been shipping
    "9 meses (Jan/2026 – Set/2026)" under a line that says "Software Engineer". A
    recruiter does not need to know Portuguese to notice.

    Written as patterns rather than as entries in `TEXT` because the durations are
    computed from the dates in the shell: they change when the dates change, and a
    hand-written rule would go stale the next time a role moves and quietly stop
    matching. `TEXT` requires every phrase to be found, which would have turned that
    staleness into a build failure - so these run after the leftover check instead,
    and the leftover list below is what keeps them honest.

    Only `y`/`yy`/`yyyy` counts as a date, so `Jan` inside a word cannot match, and
    the pattern only runs inside the parentheses that hold the range.
  */
  const MONTHS: ReadonlyArray<readonly [RegExp, string]> = [
    [/Fev/g, "Feb"],
    [/Abr/g, "Apr"],
    [/Mai/g, "May"],
    [/Ago/g, "Aug"],
    [/Set/g, "Sep"],
    [/Out/g, "Oct"],
    [/Dez/g, "Dec"],
  ];

  /*
    Month abbreviations, matched by the year that follows them.

    The old rule only looked inside the parentheses that held a date range, which
    worked while the dates were written `(Mar/2023 – Dez/2025)`. The role header
    now carries them outside - `(2 years and 10 months) &middot; Dez/2022 – Set/2025`
    - so a parenthesis-scoped rule translated nothing and the English document
    shipped with Portuguese months under an English heading.

    Requiring a four-digit year after the slash is what keeps this safe to run over
    the whole document: `Set` on its own is an English word, `Set/2025` is not.
  */
  for (const [pattern, english] of MONTHS) {
    const scoped = new RegExp(`${pattern.source}(?=\\/\\d{4})`, "g");

    out = out.replace(scoped, english);
  }

  /*
    Tenures, across the whole document.

    `2 anos e 10 meses` sits *outside* the parentheses that hold the dates, so it
    cannot be translated in the same pass - a first attempt translated the months
    and left the tenure in Portuguese, which is worse than either being wrong,
    because it looks done.
  */
  out = out
    .replace(
      /\b(\d+)\s+anos?\s+e\s+(\d+)\s+m[eê]s(?:es)?\b/g,
      (_tenure: string, years: string, months: string): string => {
        const yearPart = years === "1" ? "1 year" : `${years} years`;
        const monthPart = months === "1" ? "1 month" : `${months} months`;

        return `${yearPart} and ${monthPart}`;
      },
    )
    .replace(/\b(\d+)\s+anos?\b/g, (_tenure: string, years: string): string =>
      years === "1" ? "1 year" : `${years} years`,
    )
    .replace(/\b(\d+)\s+m[eê]s(?:es)?\b/g, (_tenure: string, months: string): string =>
      months === "1" ? "1 month" : `${months} months`,
    );


  const found = LEFTOVERS.filter((word) => {
    const body = out.slice(out.indexOf("<body"));
    return body.includes(word);
  });

  if (found.length > 0) {
    console.error("Untranslated Portuguese text is still visible in the body:");
    for (const word of found) {
      const rows = out.slice(out.indexOf("<body")).split("\n");
      const at = rows.findIndex((row) => row.includes(word));
      console.error(`  - ${word}  (line ${at + 100})`);
      if (at >= 0) {
        console.error(`      ${rows[at].trim().slice(0, 120)}`);
      }
    }
    process.exit(1);
  }

  /*
    The same pagination the Portuguese documents get, and the same layout contract.

    The translation is not a different document with a different length - the same
    blocks, in English, which runs slightly longer per line and so can land on a
    different sheet. Letting each language paginate on its own is the only way the
    footers can be right; forcing both to two pages would mean cutting content
    because of a translation.

    English gets its own measurement because English sets wider. The contract is
    about lines, and a line of English holds fewer characters than a line of
    Portuguese at the same size, so a document that fits in pt-BR can go over in
    en-US without anything being wrong in either - and the character budgets in the
    contract were set from the Portuguese line, which is the wider of the two.
    Which means the en-US check is the one that will fail first, and that is
    correct: the same limits, honestly measured.
  */
  out = out.replace("</style>", `${TIMELINE_CSS}\n        </style>`);

  const { html, pages } = await paginate(out, { slug: "en-US" });

  await checkLayout([{ slug: "en-US", html: out }]);

  await fs.writeFile(resolve("resume-recruiter-en-us.html"), html, "utf8");

  console.log(
    `wrote resume-recruiter-en-us.html (${html.length} chars, ${TEXT.length} replacements, ${pages} pages)`,
  );
}

main();
