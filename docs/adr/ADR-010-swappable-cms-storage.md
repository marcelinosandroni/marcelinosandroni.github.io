# ADR-010: Armazenamento do CMS trocável atrás de uma porta de domínio

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: — (o Product Spec cobre EPIC-01 a EPIC-04 e nenhum deles é o CMS; a tarefa correspondente precisa ser criada no `specs/tasks/tasks-catalog.md`)
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: o par `PostRepository` / `NewPostRecord` declarado dentro de `src/application/blog/manage-posts.ts`, e a função `getPostRepository()` exportada por `src/infrastructure/repositories/supabase-post-repository.ts`

## Contexto

O CMS do dono funcionava, mas o armazenamento estava soldado ao arquivo que o
escrevia:

| Problema | Impacto |
|---|---|
| A porta `PostRepository` vivia na camada de aplicação | A raiz de composição tinha que atravessar `application` para achar o contrato que os adaptadores implementam — a direção que a matriz de dependências proíbe |
| `getPostRepository()` era exportada pelo próprio adaptador do Supabase | A escolha do adaptador estava no mesmo arquivo que um adaptador, ou seja, em `n` lugares conforme o número de adaptadores |
| Não existia seleção por ambiente | Trocar o armazenamento era um commit de código, não uma configuração — o oposto do que ADR-009 fez com o email |
| Um valor desconhecido cairia no padrão em silêncio | Um deploy que pensa estar em um store e escreve em outro é pior que um deploy quebrado |
| Não havia adaptador sem banco | Um clone novo, um fork ou um `next dev` sem `.env` não tinha CMS nenhum; contributor e agente de CI ficavam sem caminho |

O argumento a favor de mexer não é estética. ADR-009 já mostrou que a troca é
configuração quando existe uma porta; aqui a porta existia, estava no lugar
errado e não havia segunda implementação, então a propriedade nunca chegou a ser
exercida.

## Decisão

Mover a porta para o domínio e escolher o adaptador por `CMS_STORAGE`, com
**Supabase como padrão** e um adaptador em memória como caminho sem credencial.

```
src/
├── domain/blog/post-repository.ts               # PostRepository, NewPostRecord,
│                                                # PostAdapterId, PostStorageNotConfiguredError
├── application/blog/manage-posts.ts             # use cases; só conhece a porta
├── infrastructure/repositories/
│   ├── index.ts                                 # resolvePostRepository(), getPostRepository()
│   ├── supabase-post-repository.ts              # adaptador postgres (inalterado)
│   └── inmemory-post-repository.ts              # adaptador em memória
└── app/api/admin/posts/{route.ts,[id]/route.ts} # HTTP; pede a porta, não o adaptador
```

### 1. A porta é um conceito de domínio

`PostRepository` e `NewPostRecord` foram para `src/domain/blog/post-repository.ts`,
ao lado do vocabulário que nomeiam (`PostDraft`, `PostSummary`, `BlogArticle`,
locale, status). A justificativa não é purismo: `NewPostRecord` é front matter já
validado mais um corpo, e `PostRepository` fala em `PostDraft` — os dois são tipos
de domínio, não de aplicação.

`src/domain/blog/index.ts` passou a reexportar os três módulos (`article`,
`post-draft`, `post-repository`). O barrel já era a fonte única do vocabulary do
blog; `post-draft` simplesmente não estava nele, o que obrigava cada consumidor a
conhecer o caminho do arquivo.

### 2. A escolha acontece em um lugar só

`resolvePostRepository(env)` em `src/infrastructure/repositories/index.ts` é a
única função do repositório que sabe que os dois adaptadores existem:

```bash
CMS_STORAGE=supabase   # padrão; blog_post_drafts via chave secreta
CMS_STORAGE=memory     # posts e artigos neste processo, sem banco
```

O valor é normalizado (`trim` + `toLowerCase`) porque é digitado por um operador,
e `EnvironmentLike` é parâmetro em vez de `process.env` lido no topo, para que um
teste prove cada ramo sem processo filho.

### 3. Valor desconhecido é erro de deploy, nunca fallback

Um seletor que não nomeia adaptador algum devolve `configured: false` com o
motivo, e **não** resolve para o padrão. O motivo nomeia a variável e os
adaptadores conhecidos, então é seguro logar e seguro responder `503`. É o mesmo
argumento de ADR-009 §5, e a razão é a mesma: um deploy que acha estar no
Supabase e está gravando em memória é pior do que um deploy que diz estar
misconfigurado.

### 4. O padrão continua sendo Supabase

`DEFAULT_POST_ADAPTER_ID = "supabase"`. A migration revoga todo grant de
`blog_post_drafts` para `anon` e `authenticated` e não cria policy nenhuma, então
não existe chave que um browser possa segurar para ler ou escrever um post não
publicado. Deixar a variável ausente escolher o armazenamento em memória
transformaria o CMS em algo que esquece tudo a cada restart sem ninguém pedir.

### 5. O adaptador em memória é honesto, não um stub

`InMemoryPostRepository` guarda os posts e os artigos publicados em dois `Map` e
replica, para cada escrita, um `check` de
`supabase/migrations/20260930000200_blog_post_cms.sql`:

| Regra | Migration | O que o adaptador faz |
|---|---|---|
| `locale in ('pt-BR','en-US')` | linha 49 | recusa locale desconhecido |
| `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length <= 96` | linha 50 | recusa pelo próprio `ArticleSlug.create`, com o mesmo motivo |
| `status in ('draft','published','archived')` | linha 51 | recusa status fora do enum |
| `length(btrim(title)) > 0`, idem `excerpt` | linhas 52-53 | recusa título ou resumo vazio |
| `category` do enum `blog_category` | linha 54 | recusa categoria desconhecida |
| `markdown not null check (length(btrim(markdown)) > 0)` | linha 61 | recusa corpo vazio |
| `id uuid primary key` | linha 48 | recusa id repetido e id vazio |
| `unique (locale, slug)` | linha 65 | `isSlugTaken` consulta posts **e** artigos |
| `reading_time_minutes between 1 and 120` | `20260928000100` | recusa tempo de leitura fora da faixa |

Isso não é decoração. `SupabasePostRepository.toDraft` já trata uma linha que
quebra uma dessas regras como linha que não pode ser lida de volta; um adaptador
que as aceitasse deixaria um caso de uso gravar algo que o store real recusa, e a
falha só apareceria em produção.

Toda leitura e escrita copia o valor na entrada e na saída. O adaptador do
Supabase serializa por JSONB e devolve um objeto novo a cada leitura; uma
referência compartilhada deixaria um chamador mutar o estado guardado através do
valor que recebeu, coisa que o store real não permite e que nenhum teste pegaria.

`entries()` e `publishedArticles()` existem para asserção e devolvem cópias, para
que um teste não segure o `Map` interno.

### 6. `getPostRepository()` continua devolvendo `null`

A porta HTTP não mudou. `getPostRepository()` ainda devolve `PostRepository |
null`, e o `guard()` das duas rotas continua respondendo `503 cms_not_configured`.
O que mudou é que o motivo é logado (`console.error("[cms] …")`) antes do `null`,
porque `null` sozinho não diz ao operador qual dos dois modos de falha ele está.

### 7. O clock é injetado

`InMemoryPostRepository` recebe `now`, pelo mesmo motivo de `CreatePost` receber
um `PostIdFactory`: um teste afirma sobre um valor fixo em vez de casar um com
regex.

## Consequências

### Positivas

- **A troca é configuração.** `CMS_STORAGE` e nada mais — sem commit, sem deploy.
- **A porta está no lugar certo.** `Application` continua sem conhecer
  `Infrastructure`, e `Infrastructure` acha o contrato sem passar por
  `application`.
- **Os casos de uso são testáveis sem infraestrutura.** `tests/unit/domain/post-repository.test.ts`
  roda o ciclo completo — criar, listar, publicar, arquivar, restaurar, apagar —
  contra o adaptador em memória.
- **O CMS funciona sem banco.** Clone novo, fork, agente de CI e `next dev` sem
  `.env` têm um CMS de verdade, e um fork sem schema aplicado deixa de ser um
  problema para quem escreve conteúdo.
- **O comportamento do Supabase não mudou.** Nenhuma linha de `list`, `findById`,
  `insert`, `update`, `remove`, `publish`, `withdraw` ou `isSlugTaken` foi tocada;
  a mudança foi de onde a porta e a fábrica moram.
- **Nenhum status da API mudou.** `400`, `401`, `404`, `409`, `503` e `204`, e o
  `cache-control: no-store`, seguem idênticos nas duas rotas.

### Negativas e riscos

- **O armazenamento em memória não é durável.** É memória de processo: um restart
  esvazia, e cada instância de um deploy multi-instância tem a sua própria cópia.
  É um adaptador de desenvolvimento e de teste.
- **Ele também não publica.** Um artigo escrito com `CMS_STORAGE=memory` fica em
  memória; o blog público lê `blog_articles` por **outro** repositório. Publicar de
  verdade exige o adaptador do Supabase, e a assinatura idêntica da porta é o que
  torna essa troca uma configuração e não uma migração.
- **Ele não transaciona.** `remove` apaga o post e o artigo no mesmo bloco
  síncrono, o que é atômico do ponto de vista de quem observa o event loop, mas
  não tem rollback. O adaptador do Supabase recebe a garantia de verdade de
  `delete_post_with_article`, que é uma transação do banco.
- **Ele não é um provedor de identidade.** `CMS_STORAGE=memory` não dá um CMS sem
  Supabase: o `guard()` responde `503 auth_not_configured` antes de resolver
  armazenamento, porque a identidade do dono é do Supabase (ver ADR-011). Um
  adaptador de armazenamento que também autorizasse seria uma porta com duas
  responsabilidades.
- **A raiz de composição conhece os dois adaptadores.** É o preço de uma porta com
  duas implementações, e está confinado a um arquivo.
- **Um store em memória por processo** é memorizado no módulo, porque um store novo
  por requisição faria o CMS parecer quebrado em desenvolvimento (cria num pedido,
  lista no seguinte, e sumiu). Testes que precisam de isolamento constroem
  `InMemoryPostRepository` direto.
- **O barrel do blog agora reexporta tudo.** `export *` em vez de lista escrita à
  mão: um nome que existe e falta no barrel só aparece no ponto de import, e um
  barrel que ninguém precisa lembrar de atualizar não deriva.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| Deixar a porta em `application` e só mover a fábrica | Resolve metade do problema e mantém a raiz de composição atravessando `application` para achar o contrato |
| `POST_STORAGE` em vez de `CMS_STORAGE` | O armazenamento não é a única coisa que o CMS usa; "storage" também nomeia, no Supabase, o bucket de artefatos, que é outra decisão (ADR-003) |
| Seletor com fallback silencioso para o padrão | Um deploy que acha estar em um store e está em outro é pior do que um deploy quebrado |
| Deixar o padrão ser o adaptador em memória | Transforma o CMS em algo que esquece a cada restart sem ninguém pedir |
| Manter `getPostRepository()` no arquivo do adaptador do Supabase | A escolha fica no arquivo de um adaptador, ou seja, em `n` lugares |
| Um `PostRepository` por tabela, para `insert`/`update` e `publish`/`withdraw` | Publicar é escrita nas duas; a porta já separa por significado, não por tabela |
| Stub em memória que responde e não guarda | Não é teste de caso de uso nem desenvolvimento local; só faz o código passar |
| Adaptador em memória sem invariantes | Um fake que concorda com um banco que ele não parece não serve para nada |
| Propagar `PostStorageNotConfiguredError` para a rota | A rota já tem `503 cms_not_configured` e o contrato HTTP não pode mudar |

## Validação

- `npm run typecheck` — sem erros.
- `npm run lint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run tests/unit/application/manage-posts.test.ts tests/unit/domain/post-repository.test.ts tests/unit/infrastructure/inmemory-post-repository.test.ts` — 102 testes: contrato da porta e vocabulário do adaptador, ciclo do CMS sem infraestrutura, invariantes do adaptador em memória e seleção por `CMS_STORAGE`.
- `npm run build` — build de produção sem erros.