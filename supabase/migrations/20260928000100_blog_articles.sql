-- =============================================================================
-- Blog articles
--
-- Database-resident long-form content, one row per (article, locale).
--
-- Design notes:
--  * The `body` column is a JSONB array of typed blocks that mirrors
--    `ArticleBlock` in `src/domain/blog/article.ts`. Typed blocks instead of
--    Markdown so the presentation layer can render each block with the correct
--    design-system typography and so a malformed body fails at the edge rather
--    than being injected as raw HTML.
--  * `status` exists so a draft can be reviewed in place, but the read policies
--    and the repository both filter to `published` — a draft is never reachable
--    through the anonymous role.
--  * `id` is a stable UUID shared with the versioned catalog in
--    `src/infrastructure/content/blog/`, so the two sources reconcile on one key.
--  * The migration is idempotent so it can be re-run against a partially
--    provisioned project.
-- =============================================================================

create extension if not exists pgcrypto;

create type public.blog_category as enum (
  'distributed-systems',
  'data-platforms',
  'leadership',
  'ai-ml',
  'fintech'
);

create type public.article_status as enum ('published', 'draft');

create table if not exists public.blog_articles (
  id uuid primary key,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 96),
  category public.blog_category not null,
  status public.article_status not null default 'draft',
  title text not null check (length(btrim(title)) > 0),
  excerpt text not null check (length(btrim(excerpt)) > 0),
  reading_time_minutes smallint not null check (reading_time_minutes between 1 and 120),
  published_at date not null,
  updated_at date,
  featured boolean not null default false,
  tags text[] not null default '{}',
  body jsonb not null check (jsonb_typeof(body) = 'array' and jsonb_array_length(body) > 0),
  created_at timestamptz not null default now(),
  unique (locale, slug)
);

comment on table public.blog_articles is
  'Long-form engineering articles, one row per (article, locale). Read through the ArticleRepository port.';
comment on column public.blog_articles.body is
  'Array of ArticleBlock objects (paragraph, heading, list, quote, code, callout).';
comment on column public.blog_articles.updated_at is
  'Null when the article has never been revised after publication.';

-- Index for the blog index: newest first, per locale, published only.
create index if not exists blog_articles_feed_idx
  on public.blog_articles (locale, published_at desc)
  where status = 'published';

-- Index for the home page teaser query, which wants a small featured slice.
create index if not exists blog_articles_featured_idx
  on public.blog_articles (locale, published_at desc)
  where status = 'published' and featured;

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.blog_articles enable row level security;

-- Public read of published articles only. Drafts stay invisible to anon even
-- though the table is exposed, so an unreviewed article cannot leak.
drop policy if exists "published blog articles are publicly readable" on public.blog_articles;
create policy "published blog articles are publicly readable"
  on public.blog_articles
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= current_date);

-- No insert/update/delete policy on purpose: this site has no authoring UI, so
-- every write must go through a service-role client or a reviewed migration.

-- =============================================================================
-- Seed
--
-- Mirrors `src/infrastructure/content/blog/articles-*.ts`, which is both the
-- build-time fallback and the source of truth for these rows. Re-running this
-- migration refreshes the copy without duplicating it.
-- =============================================================================

insert into public.blog_articles (
  id, locale, slug, category, status, title, excerpt,
  reading_time_minutes, published_at, updated_at, featured, tags, body
) values
  (
    '1f0c9d2a-7b3e-4a51-9c6d-0e2f7a4b8d31',
    'pt-BR',
    'resilient-agent-swarms-on-kafka',
    'distributed-systems',
    'published',
    'Arquitetando swarms resilientes com event streams Kafka',
    'Broker de eventos sem perda, estratégias de particionamento e consumidores idempotentes ao orquestrar swarms de agentes de IA distribuídos.',
    8,
    '2026-06-18',
    '2026-07-02',
    true,
    array['Kafka', 'idempotência', 'exactly-once', 'agentes de IA', 'resiliência'],
    '[{"type":"paragraph","text":"Um swarm de agentes de IA parece um problema de orquestração. Na prática, é um problema de entrega de mensagens. Cada agente é um consumidor que pode morrer no meio de um efeito colateral, e o orquestrador precisa poder retomar sem duplicar trabalho e sem perder trabalho."},{"type":"paragraph","text":"A maioria dos designs que falham nesse cenário cometem o mesmo erro: tratar o broker como um detalhe de transporte. Quando a semântica de entrega é uma decisão de arquitetura, não uma configuração, cada agente individual precisa inventar sua própria estratégia de recuperação — e elas sempre divergem."},{"type":"heading","level":2,"text":"O contrato de entrega que realmente importa"},{"type":"paragraph","text":"Três propriedades, em ordem de importância prática: nenhuma mensagem aceita pode ser perdida; nenhuma mensagem pode ser processada com efeito duplicado; e a ordem deve ser preservada apenas dentro de uma entidade de agregação, nunca globalmente."},{"type":"list","ordered":true,"items":["Configure acks=all e replication.factor mínimo de 3, com min.insync.replicas=2. Um broker que confirma a escrita sem fsync é um incidente futuro.","Use chaves de partição estáveis derivadas da entidade, nunca do timestamp de chegada. A chave é o que garante a ordem por agregado e distribui a carga.","Registre o offset e o efeito colateral na mesma transação. É o único jeito de tornar a operação idempotente de verdade, e não de forma apenas convencional."]},{"type":"heading","level":2,"text":"Particionamento é uma decisão de domínio"},{"type":"paragraph","text":"Round-robin distribui a carga e destrói a ordem. Chave-por-entidade preserva a ordem e cria pontos quentes. Em um swarm de agentes, o padrão certo é chave-por-entidade com uma camada de sal, aplicada apenas quando um agregado específico passa a dominar o tráfego."},{"type":"code","language":"text","code":"# chave de partição: agregado + sal opcional\ndef partition_key(aggregate_id: str, salt: str | None = None) -> bytes:\n    if salt:\n        return f\"{aggregate_id}#{salt}\".encode()\n    return aggregate_id.encode()"},{"type":"heading","level":2,"text":"Consumidores idempotentes na prática"},{"type":"paragraph","text":"A idempotência não vem de uma biblioteca. Vem de uma restrição de banco ou de um registro de deduplicação consultado antes do efeito. Em sistemas com agentes de IA, há uma camada extra: a resposta do modelo precisa ser identificada pelo hash do prompt mais o da versão do modelo, senão um rebalance reexecuta inferência paga."},{"type":"callout","tone":"primary","title":"Regra prática","text":"Se reexecutar um consumidor puder custar dinheiro, chamar uma API de terceiros ou enviar uma mensagem a uma pessoa, então a operação não é idempotente até que exista uma chave de deduplicação persistida."},{"type":"heading","level":2,"text":"Rebalance, DLQ e o que fazer quando o agente não responde"},{"type":"paragraph","text":"Rebalance é normal, não é uma falha. O que é uma falha é tratar rebalance como erro. Configure session timeout acima do pior caso de processamento, aplique backoff exponencial com jitter no retry e use uma dead-letter queue por-partição com retenção longa o suficiente para auditoria."},{"type":"quote","text":"Um swarm de agentes é um sistema distribuído com custo por tentativa. Se você não comissionou cada tentativa, você está pagando duas vezes."},{"type":"paragraph","text":"Por fim, monitore a taxa de reprocessamento como uma métrica de primeira classe. Um consumer lag de zero com taxa de deduplicação alta é um sistema que está descartando trabalho de forma silenciosa — o pior modo de falha possível, porque os números parecem saudáveis."}]'::jsonb
  ),
  (
    '2b7e4c1d-8a95-4f62-bd70-1c3e5f9a2d44',
    'pt-BR',
    'rds-to-clickhouse-100m-messages-a-day',
    'data-platforms',
    'published',
    'De RDS para ClickHouse: 100M de mensagens/dia com p99 abaixo de 10ms',
    'Benchmark de fundo sobre como eliminar contenção de locks em bancos relacionais e migrar para armazenamento colunar em consultas de telemetria de sub-segundo.',
    12,
    '2026-04-02',
    null,
    true,
    array['ClickHouse', 'MySQL', 'latência', 'OLAP', 'ETL', 'Databricks'],
    '[{"type":"paragraph","text":"O sintoma era sempre o mesmo: o dashboard de telemetria levava 30 segundos para responder, e o time de infraestrutura respondia que o banco estava são. Estava. Ele só nunca foi desenhado para a pergunta que estávamos fazendo."},{"type":"heading","level":2,"text":"A causa raiz é o modelo de acesso, não o volume"},{"type":"paragraph","text":"Telemetria é um caso de leitura analítica puro: agregações de baixo cardinalidade sobre janelas de tempo, quase nunca de volta a uma linha individual. Um banco relacional transacional resolve esse padrão da forma mais cara possível: B-tree, page split, contenção de buffer pool e um plano de execução que precisa tocar milhões de linhas para responder o que é uma soma."},{"type":"paragraph","text":"Bancos colunares invertem todas essas decisões. Colunas são independentes, então uma agregação lê apenas as colunas necessárias. Partições por tempo tornam a poda quase gratuita. E a compressão por coluna reduz a varredura em uma ordem de grandeza."},{"type":"heading","level":2,"text":"O caminho, na ordem em que funciona"},{"type":"list","ordered":true,"items":["Não migre o banco. Migre a responsabilidade: extraia o fluxo de telemetria para um caminho de escrita dedicado e deixe o relacional cuidar do que ele faz bem.","ETL com Databricks para normalizar, deduplicar e agregar antes da carga. O mais rápido insert em ClickHouse é o que nunca aconteceu.","Escolha a chave de ordenação pela consulta mais frequente, não pela entidade. Em telemetria, quase sempre é (timestamp, device_id).","Materialize visões para as consultas que rodam a cada cinco minutos e mantenha o resto em consultas ad-hoc."]},{"type":"code","language":"sql","code":"CREATE TABLE telemetry_events (\n  occurred_at   DateTime64(3, ''UTC'') CODEC(Delta(8), ZSTD(1)),\n  device_id    UInt64          CODEC(ZSTD(1)),\n  event_type   LowCardinality(String) CODEC(ZSTD(1)),\n  payload      String          CODEC(ZSTD(3)),\n  ingested_at  DateTime64(3, ''UTC'') DEFAULT now()\n) ENGINE = MergeTree\nPARTITION BY toYYYYMM(occurred_at)\nORDER BY (event_type, occurred_at, device_id)\nTTL toDateTime(occurred_at) + INTERVAL 25 MONTH;"},{"type":"heading","level":2,"text":"Resultados medidos"},{"type":"list","ordered":false,"items":["Tempo da consulta do dashboard: 30s → 190ms.","Carga no banco relacional: −72%, porque ele deixou de ser o caminho analítico.","Throughput de ingestão: 100M de mensagens/dia com p99 de ingestão abaixo de 10ms.","Armazenamento: −88% frente ao relacional equivalente, por compressão colunar e TTL nativo."]},{"type":"callout","tone":"secondary","title":"O erro mais caro","text":"Tentar servir analytics de alta cardinalidade em um banco transacional. Ele não vai quebrar por falta de CPU; vai quebrar por contenção, e a contenção aparece como latência em produção, no pior dia possível."},{"type":"heading","level":2,"text":"Quando não migrar"},{"type":"paragraph","text":"Se a consulta é por chave primária, se o volume cabe folgadamente na memória e se ninguém precisa agregar milhões de linhas, o relacional continua sendo a escolha certa. Arquitetura séria inclui saber quando não usar a ferramenta que você acabou de dominar."}]'::jsonb
  ),
  (
    '3c8f5d2e-9ab6-4e73-8c81-2d4f6a0b3e55',
    'pt-BR',
    'dual-core-leader-accounting-rigor',
    'leadership',
    'published',
    'O líder de núcleo duplo: por que a rigor contábil corporativo forma melhores arquitetos',
    'Como a disciplina financeira converte dívida técnica em passivos calculados e move a velocidade de desenvolvimento de centro de custo para motor de lucro.',
    6,
    '2026-01-27',
    null,
    false,
    array['liderança', 'gestão', 'dívida técnica', 'ROI', 'carreira'],
    '[{"type":"paragraph","text":"Passei 15 anos fechando livros, auditando controles e defendendo demonstrativos financeiros. Só depois fui escrever software. E o que mudou na minha engenharia não foi o que eu esperava: não foi sintaxe, nem framework. Foi a incapacidade de separar o que é melhoria técnica do que é custo escondido."},{"type":"heading","level":2,"text":"A contabilidade já tinha a resposta"},{"type":"paragraph","text":"Dívida técnica é, em termos estritamente contábeis, um passivo. Ela consome capital ao longo do tempo, aparece como despesa de manutenção, e — este é o ponto que quase todo mundo perde — raramente aparece na lista que o comitê financeiro aprova. Fica na planilha da engenharia, invisível para quem decide sobre orçamento."},{"type":"list","ordered":true,"items":["Um serviço com 40% de cobertura de teste não é ''menos pronto''. É um passivo de alta taxa de juros, com pagamento certo e valor presente desconhecido.","Um incidente de produção não é um bug. É um custo de caixa direto, com cliente, hora e um ambiente inteiro afetado.","Uma consulta de 30 segundos em um dashboard de operação é um centro de custo rodando em horário integral."]},{"type":"heading","level":2,"text":"O que isso muda na prática de liderar"},{"type":"paragraph","text":"Três comportamentos concretos, que transferi da contabilidade para a engenharia sem esforço: orçar em vez de estimar, medir antes de otimizar, e privatizar o custo antes de privatizar o benefício. Um tech lead que consegue dizer o custo anual de uma decisão técnica em uma frase tem uma vantagem competitiva que nenhum framework entrega."},{"type":"quote","text":"Engenharia que conecta sistemas distribuídos, produto e resultado financeiro."},{"type":"callout","tone":"primary","title":"Para quem está contratando","text":"Pergunte ao candidato quanto custa um mês de indisponibilidade na solução dele. A resposta revela simultaneamente o rigor de raciocínio e a experiência com o custo real da decisão técnica."},{"type":"paragraph","text":"Não estou dizendo que se precisa de formação contábil. Estou dizendo que a capacidade de tratar software como um ativo e um passivo — e não como magia — é o que separa um time que entrega custo de um time que entrega valor. E essa capacidade se aprende, mas é muito mais rápida quando já se viu um fechamento mensal."}]'::jsonb
  ),
  (
    '4d9a6b3e-1c72-4f85-a0d4-6b8e2f1c7a96',
    'pt-BR',
    'engineering-delivery-with-ai-agents',
    'ai-ml',
    'published',
    'O que mudou na entrega: engenharia com agentes de IA',
    'O diff deixou de ser a unidade de trabalho e a revisão virou o gargalo. O que um engenheiro precisa dominar agora para continuar responsável pelo resultado.',
    9,
    '2026-09-22',
    null,
    true,
    array['agentes de IA', 'entrega', 'revisão de código', 'engenharia de software', 'dívida técnica'],
    '[{"type":"paragraph","text":"Meus 21 anos de carreira — 15 em governança financeira corporativa e 6 em engenharia de software — me deram um critério único para julgar qualquer mudança: o que ela altera no balanço. A entrada dos agentes de IA na entrega de software passa por esse critério sem dificuldade, e é por isso que acho a discussão improdutiva quando ela sai da pergunta útil. Ninguém precisa acreditar que agentes escrevem código. A pergunta é o que acontece com a atividade de revisão quando a quantidade de código plausível deixa de ser o recurso escasso."},{"type":"paragraph","text":"Quando comecei, a entrega era limitada por três coisas ao mesmo tempo: digitar, revisar e ter contexto de domínio. A digitação deixou de ser o gargalo, e o contexto de domínio nunca esteve escrito em lugar nenhum — sempre morou em quem revisava. O que continua escasso é atenção de revisão, e esse recurso não aparece em nenhum dashboard. É por isso que a entrega mudou de forma: não porque escrever ficou mais rápido, mas porque revisar ficou mais caro."},{"type":"heading","level":2,"text":"A unidade de trabalho deixou de ser o diff"},{"type":"paragraph","text":"Um diff grande não é uma entrega grande, é um custo de leitura grande. Com agentes, a tentação natural é delegar a implementação e revisar no fim. Funciona até a primeira vez em que a revisão deixa de ser leitura e vira auditoria, porque ninguém no processo tem contexto sobre por que cada decisão foi tomada. O que posso delegar com segurança é a implementação; o critério de aceitação nunca é delegável."},{"type":"callout","tone":"primary","title":"A regra","text":"Eu reviso o plano, não a digitação. Se não consigo descrever em uma tela por que a mudança está correta, ainda não é hora de gerar mil linhas."},{"type":"heading","level":2,"text":"Verificação substituiu autoria"},{"type":"paragraph","text":"Durante décadas, autoria era o sinal de qualidade: quem escreveu, entendeu. Com agentes, o sinal mais forte passa a ser o teste que prova o comportamento. A assimetria é favorável à engenharia: escrever 300 linhas de teste é muito mais barato que escrever 3.000 de implementação, e é exatamente o inverso do que a pressa promote. O ofício não encolheu; deslocou-se para o artefato que o código não pode substituir."},{"type":"list","ordered":true,"items":["Escreva a asserção antes de delegar. Sem critério de aceitação executável, um agente otimiza para parecer correto — e parecer correto é o modo de falha mais difícil de detectar em code review.","Trate a suíte de testes como especificação executável. É o único artefato que sobrevive à regeneração do código, e o único que um auditor aceita sem refazer o trabalho.","Automatize o que você não quer revisar. Uma verificação barata e automática vale mais que um bloco de código revisado com atenção parcial."]},{"type":"heading","level":2,"text":"O custo por tentativa é uma linha do demonstrativo"},{"type":"paragraph","text":"Um agente que chama uma API de terceiros, executa inferência paga ou toca um sistema de produção cobra por tentativa. E retry, nesse contexto, não é recuperação: é despesa. Na contabilidade isso se chama custo por tentativa, e é exatamente o número que desaparece quando a entrega parece gratuita."},{"type":"quote","text":"Se a entrega ficou mais barata para solicitar e mais cara para auditar, o saldo continua o mesmo. Só mudou para onde ele aparece."},{"type":"paragraph","text":"O antídoto não é disciplinear o time, é tornar a tentativa visível: orçamento por operação, idempotência onde existe efeito colateral e custo registrado no mesmo caminho da métrica de latência. Onde o time não consegue enxergar o custo, ele não consegue reduzi-lo."},{"type":"heading","level":2,"text":"Contexto é o novo gargalo de design"},{"type":"paragraph","text":"Antes, o design vivia no código e na cabeça de quem desenhou. Agora ele precisa viver no enunciado — o que é uma melhora, porque enunciado escrito e revisado é melhor que design implícito. Também é mais trabalho, e trabalho que não pode ser pulado. Um agente entrega exatamente o escopo que foi descrito, nem mais nem menos. A qualidade do escopo passa a ser a qualidade da entrega."},{"type":"code","language":"yaml","code":"tarefa:\n  contexto: \"<o domínio em três linhas>\"\n  invariantes:\n    - \"<o que não pode quebrar>\"\n  interface: \"<assinatura pública, sem detalhe interno>\"\n  exemplos:\n    - \"<entrada> -> <saída esperada>\"\n  nao_fazer:\n    - \"<o que está fora do escopo>\"\n  aceitacao: \"<o comando que prova que terminou>\""},{"type":"paragraph","text":"O item que a maioria dos prompts esquece é o nao_fazer. Sem ele, o agente otimiza por parecer completo e entrega refatoração, cobertura extra e abstração que ninguém pediu. Escopo declarado é o equivalente, na engenharia, de uma reconciliação: sem ela, qualquer número parece bonito e não significa nada."},{"type":"heading","level":2,"text":"O que não mudou"},{"type":"paragraph","text":"A responsabilidade pelo resultado continua sendo de uma pessoa, e a diferença é que essa pessoa agora precisa entender o suficiente para discordar. Quem não consegue avaliar o que foi gerado não deveria estar aprovando o que foi gerado. Isso valia há cinco anos; agora vale ainda mais, porque a quantidade aprovada é muito maior."},{"type":"list","ordered":false,"items":["O dono do resultado. Assinar o merge é assumir o comportamento em produção, inclusive o que o agente sugeriu.","A contabilidade da decisão. Toda mudança é um passivo com juros. Agente não altera essa equação; só aumenta a velocidade com que se contrai o passivo.","O ofício de revisar. Julgar código com rigor leva anos e não terceiriza para uma máquina que gera código plausível mais rápido do que se lê."]},{"type":"paragraph","text":"A soma é simples: 15 anos me ensinaram a ler demonstrativo, 6 anos a ler código. A combinação me faz desconfiar de qualquer promessa de que a atividade técnica deixou de exigir julgamento. Ela passou a exigir mais julgamento por unidade de código, e é por isso que a próxima década vai pertencer a quem sabe escolher o que revisar."},{"type":"callout","tone":"secondary","title":"Para quem está contratando","text":"Pergunte ao candidato o que ele delegaria a um agente, o que ele não delegaria e por quê. A resposta separa quem multiplicou a geração de código de quem entendeu que a única parte que não pode ser automatizada é o critério."}]'::jsonb
  ),
  (
    '7b1c4e2a-9d55-4a3c-8f71-2e0b6d4a9c13',
    'en-US',
    'resilient-agent-swarms-on-kafka',
    'distributed-systems',
    'published',
    'Architecting resilient swarms with Kafka event streams',
    'Designing zero-loss event brokers, partition strategies and idempotent consumers when orchestrating distributed AI agent fleets.',
    8,
    '2026-06-18',
    '2026-07-02',
    true,
    array['Kafka', 'idempotency', 'exactly-once', 'AI agents', 'resiliency'],
    '[{"type":"paragraph","text":"A swarm of AI agents looks like an orchestration problem. In practice it is a message-delivery problem. Every agent is a consumer that can die halfway through a side effect, and the orchestrator has to be able to resume without duplicating work and without losing it."},{"type":"paragraph","text":"Most designs that fail here make the same mistake: treating the broker as a transport detail. Once delivery semantics are an architectural decision rather than a configuration, each individual agent ends up inventing its own recovery strategy — and they always diverge."},{"type":"heading","level":2,"text":"The delivery contract that actually matters"},{"type":"paragraph","text":"Three properties, in order of practical importance: no accepted message may be lost; no message may be processed with a duplicated effect; and ordering must hold within an aggregate, never globally."},{"type":"list","ordered":true,"items":["Set acks=all with a replication factor of at least 3 and min.insync.replicas=2. A broker that acknowledges a write without an fsync is a future incident.","Derive partition keys from the aggregate, never from an arrival timestamp. The key is what preserves per-aggregate order while spreading load.","Record the offset and the side effect in the same transaction. It is the only way to make an operation genuinely idempotent rather than conventionally so."]},{"type":"heading","level":2,"text":"Partitioning is a domain decision"},{"type":"paragraph","text":"Round-robin spreads the load and destroys ordering. Key-per-aggregate preserves ordering and creates hot spots. For an agent swarm the right answer is key-per-aggregate with an optional salt layer, applied only when one specific aggregate starts to dominate traffic."},{"type":"code","language":"text","code":"# partition key: aggregate + optional salt\ndef partition_key(aggregate_id: str, salt: str | None = None) -> bytes:\n    if salt:\n        return f\"{aggregate_id}#{salt}\".encode()\n    return aggregate_id.encode()"},{"type":"heading","level":2,"text":"Idempotent consumers in practice"},{"type":"paragraph","text":"Idempotency does not come from a library. It comes from a database constraint or a de-duplication record consulted before the effect takes place. With AI agents there is one extra layer: the model response must be addressed by the hash of the prompt plus the model version, otherwise a rebalance re-runs inference you already paid for."},{"type":"callout","tone":"primary","title":"Rule of thumb","text":"If re-running a consumer can cost money, call a third-party API, or send a message to a human, then the operation is not idempotent until a persisted de-duplication key exists."},{"type":"heading","level":2,"text":"Rebalance, DLQ, and what to do when an agent goes quiet"},{"type":"paragraph","text":"A rebalance is normal, not a failure. Treating it as an error is the failure. Set the session timeout above your worst-case processing time, apply exponential backoff with jitter on retry, and use a per-partition dead-letter queue with retention long enough to audit."},{"type":"quote","text":"An agent swarm is a distributed system with a cost per attempt. If you have not metered each attempt, you are paying twice."},{"type":"paragraph","text":"Finally, monitor the re-processing rate as a first-class metric. Zero consumer lag with a high de-duplication rate is a system silently discarding work — the worst possible failure mode, because every number still looks healthy."}]'::jsonb
  ),
  (
    '8c2d5f3b-0e66-4b4d-9082-3f1c7e5b0d24',
    'en-US',
    'rds-to-clickhouse-100m-messages-a-day',
    'data-platforms',
    'published',
    'From RDS to ClickHouse: 100M messages/day at p99 under 10ms',
    'A deep-dive benchmark into eliminating lock contention in relational databases and moving to columnar storage for sub-second telemetry lookups.',
    12,
    '2026-04-02',
    null,
    true,
    array['ClickHouse', 'MySQL', 'latency', 'OLAP', 'ETL', 'Databricks'],
    '[{"type":"paragraph","text":"The symptom was always the same: the telemetry dashboard took 30 seconds to answer, and the infrastructure team reported the database as healthy. It was. It was simply never designed for the question we were asking it."},{"type":"heading","level":2,"text":"The root cause is the access pattern, not the volume"},{"type":"paragraph","text":"Telemetry is pure analytical read: low-cardinality aggregations over time windows, almost never a lookup back to a single row. A transactional relational database answers that pattern in the most expensive way possible — B-trees, page splits, buffer-pool contention, and an execution plan that has to touch millions of rows to compute a sum."},{"type":"paragraph","text":"Columnar stores invert every one of those decisions. Columns are independent, so an aggregation reads only the columns it needs. Time-based partition pruning becomes almost free. And column compression shrinks the scan by an order of magnitude."},{"type":"heading","level":2,"text":"The path, in the order that works"},{"type":"list","ordered":true,"items":["Do not migrate the database. Migrate the responsibility: move the telemetry stream to a dedicated write path and let the relational store keep doing what it is good at.","Use Databricks ETL to normalize, de-duplicate and pre-aggregate before the load. The fastest insert into ClickHouse is the one that never happened.","Choose the ORDER BY key from the most frequent query, not from the entity. For telemetry that is almost always (event_type, occurred_at, device_id).","materialize views for the queries that run every five minutes, and leave the rest as ad-hoc queries."]},{"type":"code","language":"sql","code":"CREATE TABLE telemetry_events (\n  occurred_at   DateTime64(3, ''UTC'') CODEC(Delta(8), ZSTD(1)),\n  device_id    UInt64          CODEC(ZSTD(1)),\n  event_type   LowCardinality(String) CODEC(ZSTD(1)),\n  payload      String          CODEC(ZSTD(3)),\n  ingested_at  DateTime64(3, ''UTC'') DEFAULT now()\n) ENGINE = MergeTree\nPARTITION BY toYYYYMM(occurred_at)\nORDER BY (event_type, occurred_at, device_id)\nTTL toDateTime(occurred_at) + INTERVAL 25 MONTH;"},{"type":"heading","level":2,"text":"Measured results"},{"type":"list","ordered":false,"items":["Dashboard query time: 30s → 190ms.","Load on the relational database: −72%, because it stopped being the analytical path.","Ingest throughput: 100M messages/day with p99 ingest below 10ms.","Storage: −88% versus the equivalent relational layout, from columnar compression and native TTL."]},{"type":"callout","tone":"secondary","title":"The most expensive mistake","text":"Trying to serve high-cardinality analytics from a transactional database. It will not fall over from lack of CPU; it will fall over from contention — and contention shows up as latency in production, on the worst possible day."},{"type":"heading","level":2,"text":"When not to migrate"},{"type":"paragraph","text":"If the query is by primary key, if the volume fits comfortably in memory, and if nobody needs to aggregate millions of rows, the relational store is still the right answer. Serious architecture includes knowing when not to use the tool you just mastered."}]'::jsonb
  ),
  (
    '9d3e604c-1f77-4c5e-a193-402d8f6c1e35',
    'en-US',
    'dual-core-leader-accounting-rigor',
    'leadership',
    'published',
    'The dual-core leader: why accounting rigor makes better software architects',
    'How financial discipline converts technical debt into calculated liabilities and shifts development velocity from cost center to profit engine.',
    6,
    '2026-01-27',
    null,
    false,
    array['leadership', 'management', 'technical debt', 'ROI', 'career'],
    '[{"type":"paragraph","text":"I spent 15 years closing books, auditing controls and defending financial statements before I wrote a line of software. What changed in my engineering was not what I expected: not syntax, not frameworks. It was the inability to stop separating real technical improvement from hidden cost."},{"type":"heading","level":2,"text":"Accounting already had the answer"},{"type":"paragraph","text":"Technical debt is, in strictly accounting terms, a liability. It consumes capital over time, shows up as a maintenance expense, and — this is the part almost everyone misses — it rarely appears on the list the finance committee approves. It sits in the engineering spreadsheet, invisible to whoever decides the budget."},{"type":"list","ordered":true,"items":["A service with 40% test coverage is not ''less finished''. It is a high-interest liability with a certain payment schedule and an unknown present value.","A production incident is not a bug. It is a direct cash cost, with a customer, an hour rate, and a whole environment affected.","A 30-second dashboard query is a cost center running a full shift."]},{"type":"heading","level":2,"text":"What this changes in the practice of leading"},{"type":"paragraph","text":"Three concrete behaviors, transferred from accounting into engineering with almost no friction: budget instead of estimate, measure before you optimize, and privatise the cost before you privatise the benefit. A tech lead who can state the annual cost of a technical decision in one sentence has a competitive advantage no framework will ever ship."},{"type":"quote","text":"Engineering that connects distributed systems, product and financial return."},{"type":"callout","tone":"primary","title":"If you are hiring","text":"Ask the candidate what a month of downtime costs in their system. The answer reveals their reasoning rigor and their experience with the true cost of a technical decision at the same time."},{"type":"paragraph","text":"I am not arguing that you need an accounting degree. I am arguing that treating software as both an asset and a liability — rather than as magic — is what separates a team that ships cost from a team that ships features. And that capability is learnable, but it is learned far faster once you have watched a month-end close."}]'::jsonb
  ),
  (
    '5e0b7c4f-2d83-4a96-b1e5-7c9f3a2d8b07',
    'en-US',
    'engineering-delivery-with-ai-agents',
    'ai-ml',
    'published',
    'What changed in delivery: engineering with AI agents',
    'The diff stopped being the unit of work and review became the bottleneck. What an engineer now has to master to stay accountable for the outcome.',
    9,
    '2026-09-22',
    null,
    true,
    array['AI agents', 'delivery', 'code review', 'software engineering', 'technical debt'],
    '[{"type":"paragraph","text":"My 21 years of career — 15 in corporate financial governance, 6 in software engineering — left me with one criterion for judging any change: what it does to the balance sheet. The arrival of AI agents in software delivery passes that criterion without difficulty, which is why I find the discussion unproductive when it drifts from the useful question. Nobody has to believe that agents write code. The question is what happens to the act of review once the amount of plausible code stops being the scarce resource."},{"type":"paragraph","text":"When I started, delivery was constrained by three things at once: typing, reviewing, and holding domain context. Typing stopped being the bottleneck, and domain context was never written down anywhere — it always lived in whoever was reviewing. What is still scarce is review attention, and that resource shows up on no dashboard. That is why delivery changed in shape: not because writing got faster, but because reviewing got more expensive."},{"type":"heading","level":2,"text":"The unit of work is no longer the diff"},{"type":"paragraph","text":"A large diff is not a large delivery; it is a large cost of reading. With agents the natural temptation is to delegate the implementation and review at the end. That works until the first time review stops being reading and becomes an audit, because nobody in the process knows why each decision was made. What I can safely delegate is the implementation. The acceptance criterion never is."},{"type":"callout","tone":"primary","title":"The rule","text":"I review the plan, not the typing. If I cannot describe on one screen why the change is correct, it is not time to generate a thousand lines."},{"type":"heading","level":2,"text":"Verification replaced authorship"},{"type":"paragraph","text":"For decades, authorship was the quality signal: the one who wrote it understood it. With agents, the strongest signal becomes the test that proves the behavior. The asymmetry favors engineering: writing 300 lines of test is far cheaper than writing 3,000 lines of implementation, and it is the exact inverse of what urgency rewards. The craft did not shrink; it moved to the artifact that code cannot replace."},{"type":"list","ordered":true,"items":["Write the assertion before you delegate. Without an executable acceptance criterion, an agent optimizes for looking correct — and looking correct is the hardest failure mode to catch in code review.","Treat the test suite as an executable specification. It is the only artifact that survives regeneration of the code, and the only one an auditor accepts without redoing the work.","Automate whatever you do not want to read. A cheap automatic check is worth more than a block of code reviewed at partial attention."]},{"type":"heading","level":2,"text":"Cost per attempt is a line on the statement"},{"type":"paragraph","text":"An agent that calls a third-party API, runs paid inference, or touches a production system charges you per attempt. And a retry, in that context, is not recovery: it is expense. In accounting terms that is cost per attempt, and it is exactly the number that goes missing when delivery appears to be free."},{"type":"quote","text":"If delivery got cheaper to request and more expensive to audit, the balance is unchanged. Only the line it appears on moved."},{"type":"paragraph","text":"The remedy is not to police the team; it is to make the attempt visible: a budget per operation, idempotency wherever a side effect exists, and cost recorded along the same path as the latency metric. Where the team cannot see the cost, the team cannot reduce it."},{"type":"heading","level":2,"text":"Context is the new design bottleneck"},{"type":"paragraph","text":"Design used to live in the code and in the head of whoever drew it. Now it has to live in the brief — which is an improvement, because a written and reviewed brief beats implicit design. It is also more work, and work that cannot be skipped. An agent delivers exactly the scope it was given, no more and no less. Scope quality is now delivery quality."},{"type":"code","language":"yaml","code":"task:\n  context: \"<the domain in three lines>\"\n  invariants:\n    - \"<what must not break>\"\n  interface: \"<public signature, no internal detail>\"\n  examples:\n    - \"<input> -> <expected output>\"\n  do_not:\n    - \"<what is out of scope>\"\n  acceptance: \"<the command that proves it is done>\""},{"type":"paragraph","text":"The item most prompts omit is do_not. Without it, an agent optimizes for appearing complete and hands you refactoring, extra coverage and abstractions nobody asked for. A declared scope is the engineering equivalent of a reconciliation: without it, every number looks clean and means nothing."},{"type":"heading","level":2,"text":"What did not change"},{"type":"paragraph","text":"Accountability for the outcome still belongs to a person, and the difference is that this person now has to understand enough to disagree. Someone who cannot evaluate what was generated should not be approving what was generated. That was true five years ago. It matters more now, because the volume being approved is much larger."},{"type":"list","ordered":false,"items":["Ownership of the outcome. Signing the merge means owning the production behavior, including the part the agent suggested.","The accounting of the decision. Every change is a liability with interest. Agents do not change that equation; they only raise the speed at which you take on the liability.","The craft of review. Judging code rigorously takes years and does not outsource to a machine that produces plausible code faster than a human can read it."]},{"type":"paragraph","text":"The arithmetic is simple: 15 years taught me to read a financial statement, 6 years taught me to read code. The combination makes me skeptical of any promise that technical work no longer requires judgment. It now requires more judgment per line of code, which is why the next decade belongs to whoever knows what not to review."},{"type":"callout","tone":"secondary","title":"If you are hiring","text":"Ask the candidate what they would delegate to an agent, what they would not, and why. The answer separates someone who multiplied code generation from someone who understood that the only part that cannot be automated is the criterion."}]'::jsonb
  )
on conflict (locale, slug) do update
set category = excluded.category,
    status = excluded.status,
    title = excluded.title,
    excerpt = excluded.excerpt,
    reading_time_minutes = excluded.reading_time_minutes,
    published_at = excluded.published_at,
    updated_at = excluded.updated_at,
    featured = excluded.featured,
    tags = excluded.tags,
    body = excluded.body;
