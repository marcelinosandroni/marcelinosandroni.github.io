import { promises as fs } from "node:fs";
import { paginate } from "./paginate-resume";
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
  { from: "Engenheiro de Software &amp; IA<", to: "Software &amp; AI Engineer<" },

  // Contact block
  { from: "<strong>Localização:</strong> Fortaleza, CE (Atuação Remota)", to: "<strong>Location:</strong> Fortaleza, CE (Fully Remote)" },
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
  { from: "Criação e manutenção de aplicações críticas para custódia de fundos.", to: "Building and maintaining critical applications for fund custody." },
  { from: ">Liquidação Síncrona<", to: ">Synchronous Settlement<" },
  { from: "Engenharia de sistema de processamento de pagamentos em realtime.", to: "Engineering a real-time payment processing system." },
  { from: ">Alta Escala<", to: ">High Scale<" },
  { from: "Arquitetura de processamento assíncrono de eventos.", to: "Architecture for asynchronous event processing." },
  { from: ">Inteligência Artificial<", to: ">Artificial Intelligence<" },
  { from: "Contrato salvo com implementação e melhorias em IA de ponta.", to: "Contract saved through state-of-the-art AI implementation." },

  // Experience
  { from: ">Experiência Profissional<", to: ">Professional Experience<" },
  { from: ">Experiência Profissional (Continuação)<", to: ">Professional Experience (Continued)<" },
  { from: "Engenheiro de Software &amp; Tech Lead <span", to: "Software Engineer &amp; Tech Lead <span" },
  { from: "Engenheiro de Software <span class=\"text-slate-400 font-normal\">| Antlia", to: "Software Engineer <span class=\"text-slate-400 font-normal\">| Antlia" },
  { from: "| Antlia / Banco BNP Paribas</span>", to: "| Antlia / BNP Paribas</span>" },
  { from: "Engenheiro de Software <span class=\"text-slate-400 font-normal\">| Banco Itaú", to: "Software Engineer <span class=\"text-slate-400 font-normal\">| Banco Itaú" },
  { from: "Engenheiro de Software Pleno <span", to: "Full Software Engineer <span" },
  { from: ">Promoção em 3 meses<", to: ">Promoted in 3 months<" },
  { from: "Analista Contábil &amp; Gestor Financeiro <span", to: "Accounting Analyst &amp; Finance Manager <span" },
  { from: "| Consultoria Corporativa (15 Anos)</span>", to: "| Corporate Consulting (15 Years)</span>" },
  { from: "· Remoto</span>", to: " · Remote</span>" },
  { from: "· Híbrido</span>", to: " · Hybrid</span>" },
  { from: "· São Paulo</span>", to: " · Sao Paulo</span>" },

  // Tech box labels
  { from: "<strong>Front/Mobile:</strong>", to: "<strong>Front/Mobile:</strong>" },
  { from: "<strong>DevOps &amp; IA:</strong>", to: "<strong>DevOps &amp; AI:</strong>" },

  // DGT bullets
  {
    from:
      "<strong>Preservação de contrato de R$ 24M/ano (R$ 2M/mês):</strong> Liderei a reestruturação arquitetural de motor de IA e visão computacional, elevando assertividade de leitura de placas de &lt;60% para 100% absoluto.",
    to:
      "<strong>Rescued a R$ 24M/year contract (R$ 2M/month):</strong> Led the architectural rebuild of an AI and computer-vision engine, raising license-plate read accuracy from &lt;60% to a full 100%.",
  },
  {
    from:
      "<strong>Aceleração de 10x no processamento (100M+ eventos/dia):</strong> Migrei arquitetura relacional gargalo para cluster colunar ClickHouse integrado a ETLs e microsserviços distribuídos em Go/.NET.",
    to:
      "<strong>10x processing speed-up (100M+ events/day):</strong> Migrated a bottlenecked relational architecture to a ClickHouse columnar cluster with ETLs and distributed microservices in Go/.NET.",
  },
  {
    from:
      "<strong>Interfaces Mobile e Micro-frontends (Pixel Perfect):</strong> Desenvolvi interfaces web e apps robustos (React, Next.js, Angular, React Native) baseadas em micro-frontends reaproveitáveis, garantindo entregas pixel-perfect com foco em excelência de UI/UX para maximizar engajamento.",
    to:
      "<strong>Mobile interfaces and micro-frontends (pixel-perfect):</strong> Built robust web interfaces and apps (React, Next.js, Angular, React Native) on reusable micro-frontends, delivering pixel-perfect work with a UI/UX standard aimed at engagement.",
  },
  {
    from:
      "<strong>Automação CI/CD &amp; Agentes LLM:</strong> Implantei esteiras declarativas no Kubernetes com testes E2E (Playwright) e revisões de código automatizadas via IA Generativa, garantindo &gt;90% de cobertura.",
    to:
      "<strong>CI/CD automation &amp; LLM agents:</strong> Shipped declarative pipelines on Kubernetes with E2E tests (Playwright) and AI-generated code review, holding coverage above 90%.",
  },

  // Antlia
  {
    from:
      "<strong>Modernização de Monolito Bancário:</strong> Desacoplei sistemas legados críticos (COBOL, VB) em arquitetura orientada a eventos e micro-frontends, alcançando cobertura de testes de 95%.",
    to:
      "<strong>Core banking monolith modernisation:</strong> Decoupled critical COBOL and VB legacy systems into an event-driven architecture with micro-frontends, reaching 95% test coverage.",
  },
  {
    from:
      "<strong>Liquidação D+0 &amp; Pagamentos em Tempo Real:</strong> Substituí esteiras D+1 por conciliação síncrona/assíncrona de fundos em tempo real com SLA de 100% de uptime, sem impacto contábil.",
    to:
      "<strong>D+0 settlement &amp; real-time payments:</strong> Replaced D+1 pipelines with real-time synchronous and asynchronous fund reconciliation at a 100% uptime SLA, with no accounting impact.",
  },
  {
    from:
      "<strong>Economia e Escala (+R$ 50 Mi/ano):</strong> Automatizei orquestração global de fundos ETF sob compliance SOX, gerando capacidade operacional para captação de grandes fortunas institucionais.",
    to:
      "<strong>Cost and scale (+R$ 50M/year):</strong> Automated global ETF orchestration under SOX compliance, creating the operating capacity to attract large institutional fortunes.",
  },

  // Accounting
  {
    from:
      "Planejamento Tributário. Diferencial estratégico: visão de negócios, balanço e compliance para desenvolvimento tech.",
    to:
      "Tax Planning. Strategic edge: business insight, financial reporting and compliance applied to tech development.",
  },
  {
    from:
      "<strong>Fechamento Contábil Acelerado em 10x:</strong> Redesenho de processos reduzindo o ciclo temporal de 30 para 2 dias.",
    to:
      "<strong>Month-end close accelerated 10x:</strong> Redesigned processes cutting the cycle from 30 days to 2.",
  },
  {
    from:
      "<strong>Economia e Rentabilidade (+R$ 3M):</strong> Execução de planejamento tributário robusto gerando economia milionária e alocação precisa de capital de giro.",
    to:
      "<strong>Cost and profitability (+R$ 3M):</strong> Executed a rigorous tax plan that generated seven-figure savings and precise working-capital allocation.",
  },

  // Itaú
  {
    from:
      "<strong>Custódia Institucional Estratégica:</strong> Desenhei e sustentei plataforma B2B conectada à B3 para apuração contínua e visão unificada multi-carteira atendendo investidores de altíssimo patrimônio.",
    to:
      "<strong>Strategic institutional custody:</strong> Designed and sustained a B2B platform integrated with B3 for continuous accrual and a unified multi-portfolio view serving very high net worth investors.",
  },
  {
    from:
      "<strong>Gestão de Crise &amp; Resolução em &lt;24h:</strong> Neutralizei gargalo crítico de concorrência em mensageria sob tráfego de alta volatilidade, mantendo a integridade transacional ilesa.",
    to:
      "<strong>Crisis management and resolution in &lt;24h:</strong> Cleared a critical concurrency bottleneck in messaging under highly volatile traffic with transaction integrity intact.",
  },
  {
    from:
      "<strong>Mentoria e Full-Stack QA (8x Qualidade):</strong> Implementei e capacitei equipe em esteiras de testes automatizados ponta-a-ponta abrangendo Backend (Java/Node), Frontend (React) e arquitetura de dados.",
    to:
      "<strong>Mentorship and full-stack QA (8x quality):</strong> Built and trained the team on end-to-end automated testing across backend (Java/Node), frontend (React) and data architecture.",
  },

  // Pollux
  {
    from:
      "<strong>Migração Cloud Acelerada:</strong> Conduzi migração completa para infraestrutura AWS concluída na metade do prazo estimado, dobrando a performance sistêmica.",
    to:
      "<strong>Accelerated cloud migration:</strong> Led the full move to AWS infrastructure, delivered in half the estimated time and doubling system performance.",
  },
  {
    from:
      "<strong>FinOps e Otimização Cloud:</strong> Reduzi custos em 50% aplicando políticas de auto-scaling e right-sizing na AWS.",
    to:
      "<strong>FinOps and cloud optimisation:</strong> Cut costs by 50% through auto-scaling policies and right-sizing on AWS.",
  },

  // Education
  { from: "Formação Acadêmica &amp; Especializações", to: "Academic Education &amp; Specializations" },
  { from: "<strong>Bacharelado em Engenharia de Computação</strong>", to: "<strong>BSc in Computer Engineering</strong>" },
  { from: "<strong>Bacharelado em Ciências Contábeis</strong> — Estácio (Governança e Análise Financeira)", to: "<strong>BSc in Accounting</strong> — Estácio (Governance and Financial Analysis)" },
  { from: ">Concluído 2017<", to: ">Completed 2017<" },

  // Languages
  { from: ">Idiomas<", to: ">Languages<" },
  {
    from: "<strong>Português:</strong> Nativo. &nbsp; <strong>Espanhol:</strong> Básico (Apto para leitura técnica e comunicação assíncrona).",
    to: "<strong>Portuguese:</strong> Native. &nbsp; <strong>Spanish:</strong> Basic (able to read technical material and handle written communication).",
  },
  {
    from: "<strong>Inglês Profissional:</strong> Fluente para dinâmica de trabalho corporativo, condução de reuniões de negócio, negociações com clientes, discussões de arquitetura, dailies e Code Reviews.",
    to:
      "<strong>Professional English:</strong> Fluent across corporate work, business meetings, client negotiation, architecture discussions, stand-ups and code reviews.",
  },

  // Skills inventory
  {
    from: "Habilidades Técnicas &amp; Arquitetura de Software",
    to: "Technical Skills &amp; Software Architecture",
  },
  {
    from: "<strong>Frontend &amp; UI Architecture:</strong>",
    to: "<strong>Frontend &amp; UI Architecture:</strong>",
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

  // Additional information
  { from: "Informações Adicionais &amp; Perfil Profissional", to: "Additional Information &amp; Professional Profile" },
  {
    from: "<strong>Disponibilidade:</strong> Imediata para atuação 100% Remota (Global).",
    to: "<strong>Availability:</strong> Immediate, available for fully remote work (global).",
  },
  {
    from:
      "<strong>Contratação:</strong> Ampla flexibilidade. Apto para atuar em modelos Full-time (CLT ou B2B/PJ), Part-time, ou Consultoria sob demanda (Projetos de modernização de escopo fechado) para Brasil, EUA e Europa.",
    to:
      "<strong>Engagement:</strong> Wide flexibility. Available for full-time (employee or contractor), part-time, or on-demand consulting (fixed-scope modernisation projects) in Brazil, the US and Europe.",
  },
  {
    from:
      "<strong>Comunicação:</strong> Assertiva e transparente. Habilidade comprovada em negociar requisitos, alinhar expectativas de prazos e blindar o time técnico contra ruídos, garantindo clareza absoluta durante reportes executivos e gestão de incidentes críticos em produção.",
    to:
      "<strong>Communication:</strong> Assertive and transparent. Proven ability to negotiate requirements, align on delivery expectations and shield the engineering team from noise, keeping executive reporting and critical production incidents unambiguous.",
  },
  {
    from:
      "<strong>Liderança:</strong> Orquestração de esquadrões ágeis e transição fluida entre o alinhamento estratégico com C-Levels (Negócios) e a execução com times técnicos. Mentoria ativa focada em elevar a régua de desenvolvedores Júnior/Pleno.",
    to:
      "<strong>Leadership:</strong> Orchestrating agile squads and moving fluidly between strategic alignment with C-levels and execution with engineering teams. Active mentoring focused on raising the bar for junior and mid-level developers.",
  },
  {
    from:
      "<strong>Governança:</strong> Postura de dono absoluta e resiliência comprovada na gestão de crises. Especialista em traduzir regras complexas de negócios e regulamentações do mercado financeiro diretamente para a criação de sistemas de software seguros, escaláveis e de alta confiabilidade.",
    to:
      "<strong>Governance:</strong> Absolute ownership and proven resilience through crisis. Specialist at translating complex business rules and financial-market regulation directly into software systems that are secure, scalable and highly reliable.",
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
  "Currículo",
  "Página",
  "Continuação",
  "Promoção",
  "Diferencial",
  "Planejamento",
  "Mensageria",
  "Fechamento",
  "Custódia",
  "Gestão de Crise",
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
      /Engenheiro de Software &amp; IA — Currículo v1 — Página (\d+) de (\d+)/g,
      "Software &amp; AI Engineer — Resume v1 — Page $1 of $2",
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
    The same pagination the Portuguese documents get.

    The translation is not a different document with a different length - the same
    blocks, in English, which runs slightly longer per line and so can land on a
    different sheet. Letting each language paginate on its own is the only way the
    footers can be right; forcing both to two pages would mean cutting content
    because of a translation.
  */
  const { html, pages } = await paginate(out, {
    footer: (page, total) =>
      `Marcelino Sandroni Dias — Software &amp; AI Engineer — Resume v1 — Page ${page} of ${total}`,
  });

  await fs.writeFile(resolve("resume-recruiter-en-us.html"), html, "utf8");

  console.log(
    `wrote resume-recruiter-en-us.html (${html.length} chars, ${TEXT.length} replacements, ${pages} pages)`,
  );
}

main();