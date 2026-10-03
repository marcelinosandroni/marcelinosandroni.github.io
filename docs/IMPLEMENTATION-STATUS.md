# Implementation Status

**Reconciliado com o código em 2026-10-02.** As seções de números abaixo são
medidas; as de estado são verificadas contra a árvore de arquivos.

## Estado por User Story

| User Story | Descrição | Status | Validação |
|:-----------|:----------|:-------|:----------|
| **US-01** | Visualizar currículo com perfil, experiência, habilidades e formação | 🟢 Completa | 1026 testes unitários + e2e |
| **US-02** | Alternar idioma entre PT-BR e EN-US com URL compartilhável | 🟢 Completa | `dictionaries.test.ts`, `content-locale.test.ts`, e2e |
| **US-03** | Explorar trajetória com navegação por teclado e design responsivo | 🟢 Completa | `mobile.spec.ts`, e2e de teclado e foco |
| **US-04** | Baixar currículo em PDF no idioma selecionado | 🟢 Completa | `pdf-download.spec.ts` compila e confere o arquivo real |
| **US-05** | Consultar versão publicada com identificador e imutabilidade | 🟡 **Parcial** | Sem histórico navegável |

### US-05 é a única incompleta, e é incompleta por omissão

O modelo de domínio, a migration com RLS e o adaptador de persistência existem e
estão testados. O que não existe é a tela: não há como pedir uma versão
específica (`getVersion` não está no adaptador) nem um histórico para navegar.

A causa é estrutural, não um bug. A versão vem de `package.json`, o Git é a fonte
canônica e há uma versão publicada por deploy — então o site sempre mostra a
atual, e "histórico de versões" é uma pergunta que o produto nunca chegou a fazer.

Três tarefas abertas: TASK-043 (UI de seleção), o `getVersion` de TASK-042, e
TASK-044 (testes de integração, que nunca exercitaram RLS).

## Números

Medidos em 2026-10-02, contra o build de produção.

```
Unit tests         1.031 em 59 arquivos          ~2,5s
E2E (Playwright)     303 em 23 arquivos          ~11,6min
Cobertura (gate)     96,59%  linhas, funcs, branches, statements
Cobertura (escopo)   src/domain + src/application (limiar 90% em vitest.config.ts)
TypeScript           0 erros
ESLint               0 erros, 3 warnings pré-existentes
Build               sucesso, Next.js 16.3.4
```

### Duas ressalvas sobre esses números

**O gate de cobertura não roda no CI.** `.github/workflows/ci.yml` executa
`npm run test:unit`, que é `vitest run` **sem** `--coverage`. Os limiares estão
declarados em `vitest.config.ts` mas nada no pipeline os exercita, então a
cobertura pode cair abaixo de 90% num build verde. Correção de uma linha, não
aplicada aqui porque altera o gate do CI.

**As feature flags precisam estar ligadas para o e2e passar.** `test:e2e` roda
com `NEXT_PUBLIC_FEATURE_WHATSAPP` e `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD` em
`on`; o estado padrão é verificado por `test:e2e:default-flags`. Um
`npm run build` manual sem essas variáveis produz um build que falha 8 testes de
PDF e WhatsApp sem que nada esteja errado — foi o que aconteceu durante o
desenvolvimento desta revisão.

## O que foi entregue, por área

### Fundação
- Next.js 16.3.4 com App Router, TypeScript estrito
- Clean Architecture: `domain` → `application` → `infrastructure` → `presentation`
- Release automation (Release Please + SemVer)
- Docker Alpine para a toolchain de PDF

### Domínio
- Contrato do currículo (`src/domain/resume/types.ts`) e `ResumeVersion` com SemVer
  e imutabilidade — a entidade com invariantes reais
- Locale como módulo puro (`src/domain/i18n`), sem React e sem Next.js
- Subtemas com comportamento testado: tema, blog, presence, chat, analytics,
  contact, e-mail, feature flags, intro, media

### Internacionalização
- Rotas `/en-us` e `/pt-br` com `dynamicParams = false`; locale não suportado é 404
- `src/proxy.ts` (não `middleware.ts`, depreciado no Next 16): negociação por
  `Accept-Language`, canonicalização 308, redirect 307 de `/`
- Catálogos tipados — chave errada **quebra a compilação**, e um teste garante
  paridade de chaves, placeholders e listas não vazias
- PT-BR declarado como fonte da verdade; EN-US é tradução, com paridade de fatos
  verificada em CI a cada build

### Conteúdo e blog
- Home como landing executiva, seções desacopladas, todo texto vindo de dados
  bilíngues — nenhum texto de usuário final em markup
- Currículo como documento de registro em `/[locale]/resume`, com os 24 estudos de
  caso preservados
- Blog persistido em `blog_articles` com RLS, circuit breaker de 2s no composition
  root, fallback versionado para builds sem credenciais, e seed bilíngue
- Artigos publicados após o build são acessíveis sem novo deploy

### PDF
- Renderer LaTeX determinístico, rótulos extraídos para os catálogos (nenhum
  literal de título no renderer, verificado por teste que lê o fonte)
- `DockerPDFCompiler` com timeout e fallback automático para PDFKit
- CLI `npm run compile:pdf`, workflow `compile-pdf.yml` publica em tags
- Contrato versionado junto com o template

### Mídia
- `npm run encode:portrait`: 2,8MB de master → **309KB** de WebM + MP4 + poster
  (**89% menor**), sem áudio, com nomes com hash de conteúdo
- Loop **boomerang** de exatamente 9,000000s (o master nunca retorna à pose de
  abertura, então um corte seria um salto no meio do gesto)
- O retrato toca **só no hero**, congelado fora da viewport. Não está no currículo e
  não está na intro
- Movimento reduzido e conexão limitada recebem a fotografia, com zero bytes de vídeo

### First-visit intro
- **Três beats** (`connecting` → `locking` → `enter`, 6,7s) com um único clock de
  `requestAnimationFrame`
- **Nenhuma imagem.** A chuva condensa em colunas de glifos que caem até resolverem
  `MARCELINO SANDRONI` — uma coluna por caractere, cada uma com a letra travada e
  uma trilha de ruído acima
- A cortina **sobe** (`clip-path: inset(0 0 B% 0)`) com uma linha de brilho viajando
  na borda, e o site está lá o tempo todo por baixo
- Script pré-paint que segura o site antes da primeira pintura — sem flash. O hold
  só é liberado por um `useLayoutEffect` indexado pela fase, ou seja **depois** que a
  cortina entrou no DOM. Liberar antes media 163ms de site pintável sem cortina
- O nome reusa o alfabeto e o gerador semeado do `MatrixRain`; sem `Math.random`,
  que quebraria a hidratação em toda carga
- Pulável por qualquer tecla ou clique, nunca repete num refresh, nunca roda sob
  `prefers-reduced-motion`, e tem timer de segurança caso a hidratação nunca aconteça

### Desempenho e acessibilidade
- Gate de cobertura de 90% no escopo `domain` + `application`
- 23 suítes e2e, serializadas de propósito (workers paralelos corrompiam o cache
  do `next dev`)
- `prefers-reduced-motion` respeitado em todo o site, com backstop em CSS além do
  gate em JavaScript
- Foco nunca preso em overlay; link "pular para o conteúdo" em ambas as rotas
- **Não medido**: contraste de cores, axe-core, leitores de tela reais. Ver TASK-004.

## Arquitetura

```
Presentation (Next.js App Router)
  [locale]/page · /resume · /blog · /blog/[slug]  →  Server Components
  islands client: ResumeCopilot, VisitorChat, FirstVisitIntro, PortraitVideoGate,
                  ThemeSwitcher, DownloadPDFButton, telemetry, analytics
  admin/* fora da árvore pública — tráfego do dono não entra na métrica
  proxy.ts  — negociação e canonicalização de locale na edge

Application (use cases e portas)
  publication: GetPublishedResume · ListResumeVersions · BuildResumeDocument
               PublishPDFResume · StoreResumeArtifact · RetrieveResumeArtifact
  blog: ListArticles · GetArticle · FallbackArticleRepository
  ai: ResumeCopilot      chat: Conversation      presence: TrackVisitors
  theme-feedback · click-analytics · resume-download-gate

Infrastructure (adaptadores)
  renderers: LaTeXResumeRenderer
  compilers: DockerPDFCompiler → PdfKitPDFCompiler (fallback)
  repositories: SupabaseResumeRepository · SupabaseArticleRepository
                SupabasePostRepository · InMemoryPostRepository
  storage: SupabaseStorageRepository
  i18n: negotiate-locale      media: docker-ffmpeg encoder

Domain (TypeScript puro, sem React e sem Next.js)
  resume/types · publication/ResumeVersion · i18n/locale · blog · theme
  intro · media/portrait-video · contact · analytics · chat · presence
  feature-flags · ai/copilot · errors · og/image · portfolio · site
```

## Fora do escopo do MVP, mas já entregue

Estas funcionalidades existem com código, migrations e testes, e **não têm entrada
no catálogo de tarefas** — por isso nunca passaram por revisão de arquitetura nem
por critério de conclusão declarado:

- Chat do visitante e console do dono, com presença, magic-link e limite de taxa
- Copilot de currículo com recuperação lexical e citações (ADR-012)
- Sistema de temas com aplicação antes da primeira pintura
- Trilha sonora sintetizada em Web Audio, sem arquivo (ADR-013)

O problema é de processo, não de código. A correção é criar as entradas no
catálogo, não reescrever o histórico.

## Dívidas conhecidas

Ordenadas por quanto custam deixá-las.

| Dívida | Onde | Custo de corrigir |
|:-------|:-----|:------------------|
| Gate de cobertura não roda no CI | `.github/workflows/ci.yml` | Uma linha |
| `pdf_artifacts` especificada e nunca criada | `contracts-spec.md` vs. banco | Decisão de contrato |
| Contraste de cores nunca medido | tokens de `globals.css` | Script + correções |
| Sem auditoria axe-core | — | Dependência + uma spec por rota |
| RLS nunca exercitado em teste | TASK-044 | Supabase local no CI |
| Sem `getVersion` / histórico de versões | TASK-042, TASK-043 | Decisão de produto primeiro |
| Rate limiting e logging no endpoint de PDF | TASK-033 | Pequeno |
| Matriz de priorização contraditória | `tasks-catalog.md` | Marcar como não autoritativa (feito) |
| Documento de 2026-08-31 afirmava 100% de cobertura | este arquivo | Corrigido |

## Verificação

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:unit:coverage          # o gate; o CI não roda este
npm run build                       # com as flags ligadas, para o e2e
npm run test:e2e
npm run test:e2e:default-flags      # build separado, flags ausentes
```

## Mapa da documentação

| Documento | Para quê |
|---|---|
| [`specs/product/product-spec.md`](../specs/product/product-spec.md) | Épicos, US, critérios de aceite |
| [`specs/tasks/tasks-catalog.md`](../specs/tasks/tasks-catalog.md) | Status por tarefa — **fonte autoritativa** |
| [`specs/architecture/architecture-spec.md`](../specs/architecture/architecture-spec.md) | Camadas, fluxos, ADRs |
| [`specs/contracts/contracts-spec.md`](../specs/contracts/contracts-spec.md) | Schemas, APIs, DB |
| [`DESIGN.md`](../DESIGN.md) | Regras normativas de UI/UX |
| [`docs/feature-flags.md`](feature-flags.md) | As duas flags e por que estão desligadas |
| [`docs/supabase-setup.md`](supabase-setup.md) | Variáveis, auth, analytics |
| [`docs/ERROR_HANDLING.md`](ERROR_HANDLING.md) | Estratégias de erro |
| [`docs/adr/`](adr/) | Decisões arquiteturais |