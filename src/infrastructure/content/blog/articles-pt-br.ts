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
 * `id` values are stable UUIDs: they are the join key between this file and the
 * database rows, and must never be regenerated.
 */
export const articlesPtBR: BlogArticle[] = [
  {
    id: "1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31",
    locale: "pt-BR",
    slug: "resilient-agent-swarms-on-kafka",
    category: "distributed-systems",
    status: "published",
    title: "Arquitetando enxames resilientes com event streams Kafka",
    excerpt:
      "Broker de eventos sem perda, estratégias de particionamento e consumidores idempotentes ao orquestrar frotas de agentes de IA distribuídos.",
    readingTimeMinutes: 8,
    publishedAt: "2026-06-18",
    updatedAt: "2026-07-02",
    featured: true,
    tags: ["Kafka", "idempotência", "exactly-once", "agentes de IA", "resiliência"],
    body: [
      {
        type: "paragraph",
        text: "Um enxame de agentes de IA parece um problema de orquestração. Na prática, é um problema de entrega de mensagens. Cada agente é um consumidor que pode morrer no meio de um efeito colateral, e o orquestrador precisa poder retomar sem duplicar trabalho e sem perder trabalho.",
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
        text: "Round-robin distribui a carga e destrói a ordem. Chave-por-entidade preserva a ordem e cria pontos quentes. Em um enxame de agentes, o padrão certo é chave-por-entidade com uma camada de sal, aplicada apenas quando um agregado específico passa a dominar o tráfego.",
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
        text: "A idempotência não vem de uma biblioteca. Vem de uma restrição de banco ou de um registro de deduplicação consultado antes do efeito. Em sistemas com agentes de IA, há uma camada extra: a resposta do modelo precisa ser addressed pelo hash do prompt mais o da versão do modelo, senão um rebalance reexecuta inferência paga.",
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
        text: "Um enxame de agentes é um sistema distribuído com custo por tentativa. Se você não comissionou cada tentativa, você está pagando duas vezes.",
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
        text: "O sintoma era sempre o mesmo: o dashboard de telemetria levava 30 segundos para responder, e o time deinfraestrutura respondia que o banco estava são. Estava. Ele só nunca foi desenhado para a pergunta que estávamos fazendo.",
      },
      { type: "heading", level: 2, text: "A causa raiz é o modelo de acesso, não o volume" },
      {
        type: "paragraph",
        text: "Telemetria é um caso de leitura analítica puro: agregações de baixo cardinalidade sobre janelas de tempo, quase nunca de volta a uma linha individual. Um banco relacional transacional resolve esse padrão da forma mais cara possível: B-tree, page split, contenção de buffer pool e um plano de execução que precisa tocar milhões de linhas para responder o que é uma soma.",
      },
      {
        type: "paragraph",
        text: "Bancos colares invertem todas essas decisões. Colunas são independentes, então uma agregação lê apenas as colunas necessárias. Partições por tempo tornam a poda quase gratuita. E a compressão por coluna reduz a varredura em uma ordem de grandeza.",
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
        text: "Se a consulta é por chave primária, se o volume cabe folgadamente na memória e se ninguém precisa agregar milhões de linhas, o relacional continua sendo a escolha certa. Arquitetura séria inclui saber quando não usar a ferramenta que você acabou de mastering.",
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
        text: "Dívida técnica é, em termos estritamente contábeis, um passivo. Ela consome capital ao longo do tempo, aparece como despesa de manutenção, e — este é o ponto que quase todo mundo perde — raramente aparece na lista que o comitê financeiro aprova. Fica na planilha do engineering, invisível para quem decide sobre orçamento.",
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
        text: "Três comportamentos concretos, que transferi da contabilidade para a engenharia sem esforço: orçar em vez de estimar, medir antes de otimizar, e privatizar o custo antes de privatizar o benefício. Um tech lead que consegue dizer o custo anual de uma decisão técnica em uma frase tem uma vantagem competitive que nenhum framework entrega.",
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
        text: "Não estou dizendo que se precisa de formação contábil. Estou dizendo que a capacidade de tratar software como um ativo e um passivo — e não como magia — é o que separa um time que entrega custo de um time que entrega_feature. E essa capacidade se aprende, mas é muito mais rápida quando já se viu um fechamento mensal.",
      },
    ],
  },
];
