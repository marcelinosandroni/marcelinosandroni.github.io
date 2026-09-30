# ADR-011: Supabase para Conteúdo e Identidade, com Catálogo Versionado como Caminho sem Credencial

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: EPIC-02 — Internacionalização, EPIC-04 — Blog (parcial); as demais decisões de produto ainda não têm épico registrado
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: o uso ad hoc de PostgREST direto nas páginas, sem porta nem catálogo versionado

## Contexto

O site é de um dono só e guarda quatro coisas no Supabase: o catálogo de
artigos, os agregados de feedback de tema, a presença (quem está lendo) e a
identidade do dono. Nada disso está decidido em um lugar, e cada decisão foi
tomada dentro do arquivo que a implementava.

| Problema | Impacto |
|---|---|
| `createClient` era chamado no topo do módulo | Um build sem `SUPABASE_URL` quebrava ao carregar o módulo, e não ao tentar ler |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estava disponível no bundle | Uma credencial no browser sem que nenhum código de browser precise dela |
| "Configurado" queria dizer três coisas diferentes | Já aconteceu: cliente construído com a chave e sem a URL, e toda escrita falhando |
| Um blog vazio degrada um portfólio de forma inaceitável | Build de CI, fork e preview sem credencial não podem falhar por isso |
| Uma indisponibilidade do banco em cada visita | Página lenta para todo mundo por causa de uma falha transitória |
| Policy de RLS aerobicamente implícita | Uma tabela nova sem `revoke` herdava o grant implícito de `public` |

O ponto que atravessa tudo: **o Supabase guarda conteúdo público e identidade
privada na mesma superfície**, e as duas exigem chaves diferentes. Uma chave para ler
artigo publicado é aceitável no browser; a mesma chave não pode ler rascunho, e
não pode escrever nada.

## Decisão

Supabase para conteúdo e identidade, com quatro decisões que fecham o problema
acima: uma **chave de leitura** separada da **chave secreta**, uma **definição
única de "configurado"**, um **catálogo de conteúdo versionado** como caminho sem
credencial, e **privacidade imposta pela forma da porta**, não por comentário.

```
src/
├── infrastructure/supabase/server.ts              # EnvironmentLike, supabaseConfigFromEnv,
│                                                 #   supabaseReadConfigFromEnv, isAuthEnabled
├── infrastructure/supabase/supabase-client.ts     # cliente de LEITURA (chave publicável)
├── infrastructure/content/blog/index.ts           # VersionedArticleRepository (fallback)
├── infrastructure/repositories/index.ts           # ArticleRepository + PostRepository
├── infrastructure/feedback/repository.ts          # ThemeFeedbackRepository
├── infrastructure/analytics/repository.ts         # ClickAggregateRepository
├── infrastructure/auth/owner-session.ts           # identidade do dono
├── infrastructure/storage/supabase-storage-repository.ts  # artefatos PDF
└── supabase/migrations/*.sql                      # onde a privacidade é imposta
```

### 1. Duas chaves, dois papéis

`SUPABASE_PUBLISHABLE_KEY` é o que lê conteúdo, e toda leitura de conteúdo passa
por ela — portanto continua sujeita a RLS, e a migration dá leitura ao papel
anônimo **de propósito**: um erro em uma query de conteúdo devolve nada em vez de
devolver um rascunho.

`SUPABASE_SECRET_KEY` contorna RLS e é reservada a dois usos: a troca do OTP de
login, que a API do Supabase exige com privilégio quando acontece no servidor, e as
escritas onde o papel anônimo não pode escrever (agregados de clique, feedback de
tema, CMS). Ela nunca é `NEXT_PUBLIC_`, e o projeto inteiro roda sem
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

O site não precisa de cliente Supabase no browser: o sign-in é pedido a uma Route
Handler justamente para que a allowlist seja avaliada *antes* de um email ser
enviado, e a sessão é lida de um Server Component. Publicar a chave publicável
para o bundle seria aceitar uma exposição permanente e permanente sem nenhum
benefício.

### 2. Uma definição de "configurado"

`supabaseConfigFromEnv` (par do sign-in e das escritas) e `supabaseReadConfigFromEnv`
(leitura de conteúdo) são separados porque respondem a perguntas diferentes — um
deploy pode servir o site inteiro do catálogo versionado sem banco nenhum. Mas
ambos tratam configuração parcial como **ausente**, e ambos vivem no mesmo módulo.
Já houve uma máquina com a chave e sem a URL, e todas as escritas falhavam em vez
de degradar; com uma definição só, essa classe de bug não volta em um lugar e não
no outro.

### 3. O conteúdo tem uma segunda fonte, e ela é o seed

`blog_articles` é a fonte da verdade do blog, e
`src/infrastructure/content/blog/` é ao mesmo tempo o seed da migration e a rede
de segurança. `VersionedArticleRepository` implementa **a mesma porta**
`ArticleRepository` e serve o mesmo contrato `published`-only, então um fallback
não pode expor rascunho.

`FallbackArticleRepository` embrulha o adaptador do Supabase, e a raiz de composição
tem as duas peças de resiliência:

1. **Degradação graciosa.** Sem `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, o
   catálogo versionado é usado direto, e o módulo que chama `createClient` nunca é
   avaliado.
2. **Circuit breaker.** Depois de uma falha, o breaker abre por 60 s e o catálogo
   versionado responde sem tocar a rede. O adaptador tem prazo de 2 s por consulta
   (`supabase-article-repository.ts`), porque o fallback só é alcançado depois que a
   chamada assenta.

O corpo do artigo é **blocos tipados**, nunca HTML, e o `id` uuid estável é a chave
de reconciliação entre as duas fontes — há teste garantindo que elas descrevem os
mesmos documentos.

### 4. Onde a privacidade é imposta, e por quê ali

Cada restrição vive no **banco**, e cada uma é redundante de propósito:

| Restrição | Onde | Como |
|---|---|---|
| Artigo publicado é legível pelo público | `20260928000100_blog_articles.sql:72-80` | RLS com uma policy só para `status = 'published'` |
| Rascunho é ilegível por qualquer papel alcançável pelo PostgREST | `20260930000200_blog_post_cms.sql:97-108` | RLS ligado com **zero policies** e `revoke all … from anon, authenticated` |
| Um rascunho não chega ao blog público por construção | `20260930000200_blog_post_cms.sql:9-13` | A tabela de rascunhos não é lida pelo blog; só publicar escreve em `blog_articles` |
| Um rascunho não é editável por um browser | `20260930000200_blog_post_cms.sql:144-146` | `revoke execute … from public, anon, authenticated`; só `service_role` |
| Ninguém detecta rascunho com chave publicável | `src/infrastructure/repositories/index.ts` | O CMS usa a chave secreta; a publicável é inútil ali por construção |
| Nenhum role anônimo toca presença ou chat | `20260930000300_presence_and_chat.sql:268-271` | `revoke all` nas quatro tabelas, nenhuma policy de `select` |
| Só duas funções, e nenhuma devolve linha de outra sessão | `20260930000300_presence_and_chat.sql:278-283` | `security definer`, `set search_path`, `grant execute` explícito |
| A identidade não vem do token | `src/infrastructure/auth/owner-session.ts:47-67` | `getUser()` revalida no Supabase e a autorização é re-derivada da allowlist **a cada requisição** |
| `ADMIN_EMAIL` ausente não autoriza ninguém | `src/domain/admin` | Membership exato, falha fechada |
| Um endereço não autorizado nunca gera email | `src/application/email/send-owner-magic-link.ts:135-146` | Gate **antes** da criação do token; depois seria inútil, o email já teria saído |
| Feedback de tema: escrita só no servidor | `src/infrastructure/feedback/repository.ts:12-18` | Incremento com chave secreta, num handler server-side |
| Agregado de clique: escrita só no servidor | `src/infrastructure/analytics/repository.ts:11-15` | Mesma razão; a policy só dá leitura ao papel anônimo |

RLS é um interruptor que alguém pode desligar numa migration; um grant ausente
sobrevive a isso. As duas coisas juntas significam que um erro em uma **não** é
invasão por si só — e é por isso que as duas estão em toda tabela sensível.

### 5. Privacidade que é uma propriedade do **tipo**, não de um comentário

A presença é o caso mais delicado: quantos visitantes anônimos estão no site e
quando cada um foi visto pela última vez.

`PresenceRepository.touch(heartbeat)` não tem argumento para endereço, user agent,
referer, viewport, device ou fingerprint — porque a porta não tem esses
parâmetros. Um `firstSeenAt` ou um contador também não: ambos são do repositório
derivar, e uma porta que os aceitasse deixaria um chamador afirmar que uma sessão
existe desde a semana passada. O id são 128 bits de `crypto.getRandomValues`
gerados no browser, não derivados da máquina — portanto não é uma impressão
digital com outro nome.

A retenção é **um dia sem sinal** (`PRESENCE_RETENTION_MS`), e a remoção é feita
pela aplicação (`repository.forget`), não por trigger, para que a regra seja
testável. O custo é dito e não escondido: a mesma pessoa numa janela anônima é
uma desconhecida, e esse é o preço de ser inrastreável entre sites.

## Consequências

### Positivas

- **O site inteiro roda sem banco.** Catálogo versionado como fallback, `next dev`
  sem `.env`, CI e fork funcionam.
- **Uma indisponibilidade custa uma requisição, não uma visita.** Prazo de 2 s e
  breaker de 60 s.
- **Nenhuma credencial no bundle.** Nenhum nome `NEXT_PUBLIC_` de Supabase existe no
  projeto.
- **Duas fontes que reconciliam por um id estável**, verificadas por teste.
- **A privacidade das tabelas sensíveis sobrevive a um erro de configuração**,
  porque RLS e `revoke` são camadas independentes.
- **Os dados de presença não têm onde guardar um identificador**, e isso é uma
  afirmação sobre a forma, não sobre a intenção.
- **Feature opcional degrada para no-op.** Feedback e clique caem para o repositório
  em processo quando o Supabase não está configurado, e a página não quebra.

### Negativas e riscos

- **Duas fontes precisam concordar.** Divergem em duas fontes, e o teste de paridade
  é a única rede.
- **Vendor lock-in parcial.** Portas, chaves, RLS e duas funções `security definer`
  são específicos do Supabase. Trocar de fornecedor é reescrita de adaptador, não
  de página — o que é exatamente o que ADR-010 e ADR-009 compraram.
- **O `id` uuid estável é contrato.** Um artigo novo sem id no catálogo versionado
  aparece só no banco, e o teste de paridade é quem avisa.
- **O caminho sem credencial é unidirecional.** Artigos semeados aparecem sem banco;
  um artigo escrito no CMS com `CMS_STORAGE=memory` (ADR-010) não chega ao blog
  público, que lê `blog_articles` por outro repositório.
- **Retenção de 24 h em aplicação** depende de alguém abrir o console. Sem isso a
  tabela cresce; é por isso que a varredura roda antes da leitura
  (`ListOnlineVisitors`), e não depois.
- **Uma definição de "configurado" por função, duas funções.** São duas de
  propósito (perguntas diferentes), o risco é a terceira surgir.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| Só arquivos versionados, sem banco | O CMS do dono precisa de escrita e data de publicação; versionar é a fonte do currículo, não do blog |
| Só banco, sem catálogo versionado | Build de CI, fork e preview sem credencial quebram, e um blog vazio degrada um portfólio |
| Cliente Supabase no browser com a chave publicável | Publica uma credencial permanente sem nenhum código de browser que precise dela |
| `SERVICE_ROLE_KEY` em toda query de conteúdo | Contorna RLS, e aí um erro de query devolve rascunho em vez de nada |
| Um único par `SUPABASE_URL` + uma chave | Apaga a distinção entre ler conteúdo e escrever/identificar, que é a fronteira de segurança do projeto |
| Nomear o par ausente no log de erro | Registra informação de ambiente; o motivo é útil, o valor não |
| RLS sozinho, sem `revoke` | RLS é um interruptor que uma migration pode desligar |
| `revoke` sozinho, sem RLS | Um grant futuro reintroduz o acesso sem que nenhuma policy precise mudar |
| Trigger de retenção em presença | A regra de retenção deixa de ser testável em TypeScript e passa a exigir um banco para testar |
| IP, user agent ou fingerprint para contar visitantes | Transforma "alguém está lendo" em vigilância; e não há coluna para eles |
| Um `Postgrest` global como singleton | Cacheia as cookies de uma requisição e as leva para a de outro visitante |

## Validação

- `npm run typecheck` — sem erros.
- `npm run lint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run tests/unit/presentation/blog-catalog.test.ts tests/unit/domain/presence.test.ts tests/unit/domain/blog-seed.test.ts tests/unit/application/track-visitors.test.ts tests/unit/infrastructure/supabase-server.test.ts` — paridade do catálogo versionado, contrato e retenção de presença, e a definição única de "configurado".
- `npm run build` — build de produção sem erros, sem import-time de `createClient`.