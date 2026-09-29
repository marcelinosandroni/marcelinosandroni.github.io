import type { BlogArticle } from "@/domain/blog";

/**
 * Versioned article catalog — pt-BR.
 *
 * This file has two jobs:
 *
 * 1. It is the **seed** the `blog_articles` migration inserts, so a fresh
 *    database starts with the same content the site already published.
 * 2. It is the **build-time fallback** behind `FallbackArticleRepository`, so the
 *    site still builds and renders when Supabase is unreachable — a build agent
 *    with no credentials, a preview deploy, a cold project or an outage.
 *
 * Because of (2) the bodies are complete articles, not stubs. The blog is the
 * primary proof of engineering depth for a technical evaluator, so a degraded
 * blog is not acceptable.
 *
 * `id` values are stable UUIDs: they are the primary key of `blog_articles`, so
 * every row needs its own — one per `(article, locale)`, never shared between
 * translations. The cross-locale join is `slug`, which is the stable key. The
 * ids must never be regenerated once a row exists.
 */
export const articlesPtBR: BlogArticle[] = [
  {
    id: "1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
    locale: "pt-BR",
    slug: "resilient-agent-swarms-on-kafka",
    category: "distributed-systems",
    status: "published",
    title: "Arquitetando swarms resilientes com event streams Kafka",
    excerpt:
      "Broker de eventos sem perda, estratégias de particionamento e consumidores idempotentes ao orquestrar swarms de agentes de IA distribuídos.",
    readingTimeMinutes: 8,
    publishedAt: "2026-06-18",
    updatedAt: "2026-07-02",
    featured: true,
    tags: ["Kafka", "idempotência", "exactly-once", "agentes de IA", "resiliência"],
    body: [
      {
        type: "paragraph",
        text: "Um swarm de agentes de IA parece um problema de orquestração. Na prática, é um problema de entrega de mensagens. Cada agente é um consumidor que pode morrer no meio de um efeito colateral, e o orquestrador precisa poder retomar sem duplicar trabalho e sem perder trabalho.",
      },
      {
        type: "paragraph",
        text: "A maioria dos designs que falham nesse cenário cometem o mesmo erro: tratar o broker como um detalhe de transporte. Quando a semântica de entrega é uma decisão de arquitetura, não uma configuração, cada agente individual precisa inventar sua própria estratégia de recuperação — e elas sempre divergem.",
      },
      { type: "heading", level: 2, text: "O contrato de entrega que realmente importa" },
      {
        type: "paragraph",
        text: "Três propriedades, em ordem de importância prática: nenhuma mensagem aceita pode ser perdida; nenhuma mensagem pode ser processada com efeito duplicado; e a ordem deve ser preservada apenas dentro de uma entidade de agregação, nunca globalmente.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Configure acks=all e replication.factor mínimo de 3, com min.insync.replicas=2. Um broker que confirma a escrita sem fsync é um incidente futuro.",
          "Use chaves de partição estáveis derivadas da entidade, nunca do timestamp de chegada. A chave é o que garante a ordem por agregado e distribui a carga.",
          "Registre o offset e o efeito colateral na mesma transação. É o único jeito de tornar a operação idempotente de verdade, e não de forma apenas convencional.",
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Particionamento é uma decisão de domínio" },
      {
        type: "paragraph",
        text: "Round-robin distribui a carga e destrói a ordem. Chave-por-entidade preserva a ordem e cria pontos quentes. Em um swarm de agentes, o padrão certo é chave-por-entidade com uma camada de sal, aplicada apenas quando um agregado específico passa a dominar o tráfego.",
      },
      {
        type: "code",
        language: "text",
        code: [
          "# chave de partição: agregado + sal opcional",
          "def partition_key(aggregate_id: str, salt: str | None = None) -> bytes:",
          "    if salt:",
          "        return f\"{aggregate_id}#{salt}\".encode()",
          "    return aggregate_id.encode()",
        ].join("\n"),
      },
      { type: "heading", level: 2, text: "Consumidores idempotentes na prática" },
      {
        type: "paragraph",
        text: "A idempotência não vem de uma biblioteca. Vem de uma restrição de banco ou de um registro de deduplicação consultado antes do efeito. Em sistemas com agentes de IA, há uma camada extra: a resposta do modelo precisa ser identificada pelo hash do prompt mais o da versão do modelo, senão um rebalance reexecuta inferência paga.",
      },
      {
        type: "callout",
        tone: "primary",
        title: "Regra prática",
        text: "Se reexecutar um consumidor puder custar dinheiro, chamar uma API de terceiros ou enviar uma mensagem a uma pessoa, então a operação não é idempotente até que exista uma chave de deduplicação persistida.",
      },
      { type: "heading", level: 2, text: "Rebalance, DLQ e o que fazer quando o agente não responde" },
      {
        type: "paragraph",
        text: "Rebalance é normal, não é uma falha. O que é uma falha é tratar rebalance como erro. Configure session timeout acima do pior caso de processamento, aplique backoff exponencial com jitter no retry e use uma dead-letter queue por-partição com retenção longa o suficiente para auditoria.",
      },
      {
        type: "quote",
        text: "Um swarm de agentes é um sistema distribuído com custo por tentativa. Se você não comissionou cada tentativa, você está pagando duas vezes.",
      },
      {
        type: "paragraph",
        text: "Por fim, monitore a taxa de reprocessamento como uma métrica de primeira classe. Um consumer lag de zero com taxa de deduplicação alta é um sistema que está descartando trabalho de forma silenciosa — o pior modo de falha possível, porque os números parecem saudáveis.",
      },
    ],
  },

  {
    id: "2b7e4c1d-8a95-4f62-bd70-1c3e5f9a2d44",
    locale: "pt-BR",
    slug: "rds-to-clickhouse-100m-messages-a-day",
    category: "data-platforms",
    status: "published",
    title: "De RDS para ClickHouse: 100M de mensagens/dia com p99 abaixo de 10ms",
    excerpt:
      "Benchmark de fundo sobre como eliminar contenção de locks em bancos relacionais e migrar para armazenamento colunar em consultas de telemetria de sub-segundo.",
    readingTimeMinutes: 12,
    publishedAt: "2026-04-02",
    updatedAt: null,
    featured: true,
    tags: ["ClickHouse", "MySQL", "latência", "OLAP", "ETL", "Databricks"],
    body: [
      {
        type: "paragraph",
        text: "O sintoma era sempre o mesmo: o dashboard de telemetria levava 30 segundos para responder, e o time de infraestrutura respondia que o banco estava são. Estava. Ele só nunca foi desenhado para a pergunta que estávamos fazendo.",
      },
      { type: "heading", level: 2, text: "A causa raiz é o modelo de acesso, não o volume" },
      {
        type: "paragraph",
        text: "Telemetria é um caso de leitura analítica puro: agregações de baixo cardinalidade sobre janelas de tempo, quase nunca de volta a uma linha individual. Um banco relacional transacional resolve esse padrão da forma mais cara possível: B-tree, page split, contenção de buffer pool e um plano de execução que precisa tocar milhões de linhas para responder o que é uma soma.",
      },
      {
        type: "paragraph",
        text: "Bancos colunares invertem todas essas decisões. Colunas são independentes, então uma agregação lê apenas as colunas necessárias. Partições por tempo tornam a poda quase gratuita. E a compressão por coluna reduz a varredura em uma ordem de grandeza.",
      },
      { type: "heading", level: 2, text: "O caminho, na ordem em que funciona" },
      {
        type: "list",
        ordered: true,
        items: [
          "Não migre o banco. Migre a responsabilidade: extraia o fluxo de telemetria para um caminho de escrita dedicado e deixe o relacional cuidar do que ele faz bem.",
          "ETL com Databricks para normalizar, deduplicar e agregar antes da carga. O mais rápido insert em ClickHouse é o que nunca aconteceu.",
          "Escolha a chave de ordenação pela consulta mais frequente, não pela entidade. Em telemetria, quase sempre é (timestamp, device_id).",
          "Materialize visões para as consultas que rodam a cada cinco minutos e mantenha o resto em consultas ad-hoc.",
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
      { type: "heading", level: 2, text: "Resultados medidos" },
      {
        type: "list",
        ordered: false,
        items: [
          "Tempo da consulta do dashboard: 30s → 190ms.",
          "Carga no banco relacional: −72%, porque ele deixou de ser o caminho analítico.",
          "Throughput de ingestão: 100M de mensagens/dia com p99 de ingestão abaixo de 10ms.",
          "Armazenamento: −88% frente ao relacional equivalente, por compressão colunar e TTL nativo.",
        ],
      },
      {
        type: "callout",
        tone: "secondary",
        title: "O erro mais caro",
        text: "Tentar servir analytics de alta cardinalidade em um banco transacional. Ele não vai quebrar por falta de CPU; vai quebrar por contenção, e a contenção aparece como latência em produção, no pior dia possível.",
      },
      { type: "heading", level: 2, text: "Quando não migrar" },
      {
        type: "paragraph",
        text: "Se a consulta é por chave primária, se o volume cabe folgadamente na memória e se ninguém precisa agregar milhões de linhas, o relacional continua sendo a escolha certa. Arquitetura séria inclui saber quando não usar a ferramenta que você acabou de dominar.",
      },
    ],
  },

  {
    id: "3c8f5d2e-9ab6-4e73-8c81-2d4f6a0b3e55",
    locale: "pt-BR",
    slug: "dual-core-leader-accounting-rigor",
    category: "leadership",
    status: "published",
    title: "O líder de núcleo duplo: por que a rigor contábil corporativo forma melhores arquitetos",
    excerpt:
      "Como a disciplina financeira converte dívida técnica em passivos calculados e move a velocidade de desenvolvimento de centro de custo para motor de lucro.",
    readingTimeMinutes: 6,
    publishedAt: "2026-01-27",
    updatedAt: null,
    featured: false,
    tags: ["liderança", "gestão", "dívida técnica", "ROI", "carreira"],
    body: [
      {
        type: "paragraph",
        text: "Passei 15 anos fechando livros, auditando controles e defendendo demonstrativos financeiros. Só depois fui escrever software. E o que mudou na minha engenharia não foi o que eu esperava: não foi sintaxe, nem framework. Foi a incapacidade de separar o que é melhoria técnica do que é custo escondido.",
      },
      { type: "heading", level: 2, text: "A contabilidade já tinha a resposta" },
      {
        type: "paragraph",
        text: "Dívida técnica é, em termos estritamente contábeis, um passivo. Ela consome capital ao longo do tempo, aparece como despesa de manutenção, e — este é o ponto que quase todo mundo perde — raramente aparece na lista que o comitê financeiro aprova. Fica na planilha da engenharia, invisível para quem decide sobre orçamento.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Um serviço com 40% de cobertura de teste não é 'menos pronto'. É um passivo de alta taxa de juros, com pagamento certo e valor presente desconhecido.",
          "Um incidente de produção não é um bug. É um custo de caixa direto, com cliente, hora e um ambiente inteiro afetado.",
          "Uma consulta de 30 segundos em um dashboard de operação é um centro de custo rodando em horário integral.",
        ],
      },
      { type: "heading", level: 2, text: "O que isso muda na prática de liderar" },
      {
        type: "paragraph",
        text: "Três comportamentos concretos, que transferi da contabilidade para a engenharia sem esforço: orçar em vez de estimar, medir antes de otimizar, e privatizar o custo antes de privatizar o benefício. Um tech lead que consegue dizer o custo anual de uma decisão técnica em uma frase tem uma vantagem competitiva que nenhum framework entrega.",
      },
      {
        type: "quote",
        text: "Engenharia que conecta sistemas distribuídos, produto e resultado financeiro.",
      },
      {
        type: "callout",
        tone: "primary",
        title: "Para quem está contratando",
        text: "Pergunte ao candidato quanto custa um mês de indisponibilidade na solução dele. A resposta revela simultaneamente o rigor de raciocínio e a experiência com o custo real da decisão técnica.",
      },
      {
        type: "paragraph",
        text: "Não estou dizendo que se precisa de formação contábil. Estou dizendo que a capacidade de tratar software como um ativo e um passivo — e não como magia — é o que separa um time que entrega custo de um time que entrega valor. E essa capacidade se aprende, mas é muito mais rápida quando já se viu um fechamento mensal.",
      },
    ],
  },

  {
    id: "4d9a6b3e-1c72-4f85-a0d4-6b8e2f1c7a96",
    locale: "pt-BR",
    slug: "engineering-delivery-with-ai-agents",
    category: "ai-ml",
    status: "published",
    title: "O que mudou na entrega: engenharia com agentes de IA",
    excerpt:
      "O diff deixou de ser a unidade de trabalho e a revisão virou o gargalo. O que um engenheiro precisa dominar agora para continuar responsável pelo resultado.",
    readingTimeMinutes: 9,
    publishedAt: "2026-09-22",
    updatedAt: null,
    featured: true,
    tags: [
      "agentes de IA",
      "entrega",
      "revisão de código",
      "engenharia de software",
      "dívida técnica",
    ],
    body: [
      {
        type: "paragraph",
        text: "Meus 21 anos de carreira — 15 em governança financeira corporativa e 6 em engenharia de software — me deram um critério único para julgar qualquer mudança: o que ela altera no balanço. A entrada dos agentes de IA na entrega de software passa por esse critério sem dificuldade, e é por isso que acho a discussão improdutiva quando ela sai da pergunta útil. Ninguém precisa acreditar que agentes escrevem código. A pergunta é o que acontece com a atividade de revisão quando a quantidade de código plausível deixa de ser o recurso escasso.",
      },
      {
        type: "paragraph",
        text: "Quando comecei, a entrega era limitada por três coisas ao mesmo tempo: digitar, revisar e ter contexto de domínio. A digitação deixou de ser o gargalo, e o contexto de domínio nunca esteve escrito em lugar nenhum — sempre morou em quem revisava. O que continua escasso é atenção de revisão, e esse recurso não aparece em nenhum dashboard. É por isso que a entrega mudou de forma: não porque escrever ficou mais rápido, mas porque revisar ficou mais caro.",
      },
      { type: "heading", level: 2, text: "A unidade de trabalho deixou de ser o diff" },
      {
        type: "paragraph",
        text: "Um diff grande não é uma entrega grande, é um custo de leitura grande. Com agentes, a tentação natural é delegar a implementação e revisar no fim. Funciona até a primeira vez em que a revisão deixa de ser leitura e vira auditoria, porque ninguém no processo tem contexto sobre por que cada decisão foi tomada. O que posso delegar com segurança é a implementação; o critério de aceitação nunca é delegável.",
      },
      {
        type: "callout",
        tone: "primary",
        title: "A regra",
        text: "Eu reviso o plano, não a digitação. Se não consigo descrever em uma tela por que a mudança está correta, ainda não é hora de gerar mil linhas.",
      },
      { type: "heading", level: 2, text: "Verificação substituiu autoria" },
      {
        type: "paragraph",
        text: "Durante décadas, autoria era o sinal de qualidade: quem escreveu, entendeu. Com agentes, o sinal mais forte passa a ser o teste que prova o comportamento. A assimetria é favorável à engenharia: escrever 300 linhas de teste é muito mais barato que escrever 3.000 de implementação, e é exatamente o inverso do que a pressa promote. O ofício não encolheu; deslocou-se para o artefato que o código não pode substituir.",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Escreva a asserção antes de delegar. Sem critério de aceitação executável, um agente otimiza para parecer correto — e parecer correto é o modo de falha mais difícil de detectar em code review.",
          "Trate a suíte de testes como especificação executável. É o único artefato que sobrevive à regeneração do código, e o único que um auditor aceita sem refazer o trabalho.",
          "Automatize o que você não quer revisar. Uma verificação barata e automática vale mais que um bloco de código revisado com atenção parcial.",
        ],
      },
      { type: "heading", level: 2, text: "O custo por tentativa é uma linha do demonstrativo" },
      {
        type: "paragraph",
        text: "Um agente que chama uma API de terceiros, executa inferência paga ou toca um sistema de produção cobra por tentativa. E retry, nesse contexto, não é recuperação: é despesa. Na contabilidade isso se chama custo por tentativa, e é exatamente o número que desaparece quando a entrega parece gratuita.",
      },
      {
        type: "quote",
        text: "Se a entrega ficou mais barata para solicitar e mais cara para auditar, o saldo continua o mesmo. Só mudou para onde ele aparece.",
      },
      {
        type: "paragraph",
        text: "O antídoto não é disciplinear o time, é tornar a tentativa visível: orçamento por operação, idempotência onde existe efeito colateral e custo registrado no mesmo caminho da métrica de latência. Onde o time não consegue enxergar o custo, ele não consegue reduzi-lo.",
      },
      { type: "heading", level: 2, text: "Contexto é o novo gargalo de design" },
      {
        type: "paragraph",
        text: "Antes, o design vivia no código e na cabeça de quem desenhou. Agora ele precisa viver no enunciado — o que é uma melhora, porque enunciado escrito e revisado é melhor que design implícito. Também é mais trabalho, e trabalho que não pode ser pulado. Um agente entrega exatamente o escopo que foi descrito, nem mais nem menos. A qualidade do escopo passa a ser a qualidade da entrega.",
      },
      {
        type: "code",
        language: "yaml",
        code: [
          "tarefa:",
          "  contexto: \"<o domínio em três linhas>\"",
          "  invariantes:",
          "    - \"<o que não pode quebrar>\"",
          "  interface: \"<assinatura pública, sem detalhe interno>\"",
          "  exemplos:",
          "    - \"<entrada> -> <saída esperada>\"",
          "  nao_fazer:",
          "    - \"<o que está fora do escopo>\"",
          "  aceitacao: \"<o comando que prova que terminou>\"",
        ].join("\n"),
      },
      {
        type: "paragraph",
        text: "O item que a maioria dos prompts esquece é o nao_fazer. Sem ele, o agente otimiza por parecer completo e entrega refatoração, cobertura extra e abstração que ninguém pediu. Escopo declarado é o equivalente, na engenharia, de uma reconciliação: sem ela, qualquer número parece bonito e não significa nada.",
      },
      { type: "heading", level: 2, text: "O que não mudou" },
      {
        type: "paragraph",
        text: "A responsabilidade pelo resultado continua sendo de uma pessoa, e a diferença é que essa pessoa agora precisa entender o suficiente para discordar. Quem não consegue avaliar o que foi gerado não deveria estar aprovando o que foi gerado. Isso valia há cinco anos; agora vale ainda mais, porque a quantidade aprovada é muito maior.",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "O dono do resultado. Assinar o merge é assumir o comportamento em produção, inclusive o que o agente sugeriu.",
          "A contabilidade da decisão. Toda mudança é um passivo com juros. Agente não altera essa equação; só aumenta a velocidade com que se contrai o passivo.",
          "O ofício de revisar. Julgar código com rigor leva anos e não terceiriza para uma máquina que gera código plausível mais rápido do que se lê.",
        ],
      },
      {
        type: "paragraph",
        text: "A soma é simples: 15 anos me ensinaram a ler demonstrativo, 6 anos a ler código. A combinação me faz desconfiar de qualquer promessa de que a atividade técnica deixou de exigir julgamento. Ela passou a exigir mais julgamento por unidade de código, e é por isso que a próxima década vai pertencer a quem sabe escolher o que revisar.",
      },
      {
        type: "callout",
        tone: "secondary",
        title: "Para quem está contratando",
        text: "Pergunte ao candidato o que ele delegaria a um agente, o que ele não delegaria e por quê. A resposta separa quem multiplicou a geração de código de quem entendeu que a única parte que não pode ser automatizada é o critério.",
      },
    ],
  },
];
