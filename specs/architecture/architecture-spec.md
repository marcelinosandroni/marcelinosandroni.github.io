# Especificação de Arquitetura (Architecture Spec)

## Visão Geral
Este documento descreve a arquitetura do sistema seguindo os princípios de Clean Architecture e Domain-Driven Design (DDD), com separação clara de responsabilidades para facilitar a execução por agentes de IA.

## Documentos Vinculados
- [Arquitetura Inicial](../../docs/architecture.md)
- [Instruções de Domínio](../../.github/instructions/domain.instructions.md)
- [Instruções de Infraestrutura](../../.github/instructions/infrastructure.instructions.md)

---

## Princípios Arquiteturais

1. **Separação de Camadas**: Dependências apontam para dentro (Domínio no centro)
2. **Inversão de Dependência**: Infraestrutura implementa interfaces definidas pelo Domínio/Aplicação
3. **Imutabilidade**: Entidades de domínio são imutáveis; mudanças criam novas instâncias
4. **Tipagem Forte**: TypeScript estrito em todo o código
5. **Testabilidade**: Cada camada é testável isoladamente

---

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION (Next.js / React)             │
│  - Pages, Components, Hooks, i18n Router                │
│  - Depende apenas de Application (Ports)                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              APPLICATION (Use Cases / Ports)            │
│  - Casos de uso, Interfaces (Ports), DTOs               │
│  - Orquestra fluxo entre Presentation e Domain          │
│  - Não conhece Infrastructure                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 DOMAIN (Entities / VO)                  │
│  - Entidades: Resume, Experience, Skill, Version        │
│  - Value Objects: Language, DateRange, ContactInfo      │
│  - Regras de negócio e invariantes                      │
│  - Zero dependências externas                           │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│           INFRASTRUCTURE (Adapters / Implementations)   │
│  - Git Files Adapter (fonte canônica Markdown)          │
│  - Supabase Adapter (persistência, RLS, Storage)        │
│  - LaTeX/PDF Generator (Docker CLI)                     │
│  - Implementa interfaces definidas em Application       │
└─────────────────────────────────────────────────────────┘
```

---

## Bounded Contexts

### Contexto: Currículo (Resume Context)
**Responsabilidade**: Gerenciar conteúdo, estrutura e versionamento do currículo.

**Entidades**:
- `Resume`: Agregado raiz, contém todas as seções
- `Experience`: Experiência profissional com cargo, empresa, período, descrições
- `Education`: Formação acadêmica
- `Skill`: Habilidade técnica ou comportamental
- `Language`: Idioma com nível de proficiência
- `Version`: Versão publicada com ID, data e metadata

**Value Objects**:
- `LanguageCode`: PT-BR ou EN-US
- `DateRange`: Período com início/fim (MonthYear)
- `ContactInfo`: Email, telefone, LinkedIn, GitHub, localização
- `SectionOrder`: Ordem das seções para exibição

**Regras de Negócio**:
- Conteúdo deve ser factual (sem invenções)
- Versões publicadas são imutáveis
- PT-BR e EN-US devem ter equivalência de fatos
- Ordenação cronológica descendente para experiências

---

### Contexto: Publicação (Publication Context)
**Responsabilidade**: Gerenciar publicação, storage e distribuição de versões.

**Entidades**:
- `PublishedVersion`: Versão publicada com status e timestamps
- `PdfArtifact`: Arquivo PDF gerado com hash e metadata

**Regras de Negócio**:
- Apenas versões com status "published" são visíveis publicamente
- PDF deve corresponder exatamente ao conteúdo da versão
- RLS permite leitura pública, escrita apenas autenticada

---

### Contexto: Geração de PDF (PDF Generation Context)
**Responsabilidade**: Gerar PDFs determinísticos a partir de conteúdo estruturado.

**Processo**:
1. Extrair dados tipados do contrato de conteúdo
2. Gerar arquivo `.tex` usando template LaTeX
3. Compilar em container Docker com fontes fixadas
4. Validar saída (código 0, arquivo existe)
5. Armazenar artefato no Storage

**Regras de Negócio**:
- Template LaTeX é versionado junto com o código
- Compilação deve ser reprodutível (mesmo input = mesmo output)
- Falhas na compilação devem gerar erro compreensível

---

### Contexto: Home Executiva (Executive Overview Context)
**Responsabilidade**: Renderizar a landing page executiva a partir de conteúdo
totalmente configurável, reutilizando o currículo como fonte de fatos.

**Processo**:
1. Resolver `HomeContent` do idioma ativo (Server Component)
2. Compor seções independentes a partir do contrato
3. Juntar anotações da trajetória ao currículo por `company`
4. Emitir JSON-LD `Person` a partir da identidade do site

**Regras de Negócio**:
- Nenhum texto de usuário final existe em markup; tudo vem de `HomeContent` ou do catálogo
- O conteúdo do currículo é somente leitura: a home never o muta
- A home nunca altera estrutura editorial do currículo; o documento de registro vive em `/[locale]/resume`
- Vocabulários de acento, escala e ícone são fechados (`AccentTone`, `StatScale`, `IconName`)
- A home é Server Component; nenhum de seus componentes pode importar conteúdo em um Client Component

**Anti-padrão rejeitado**: inicialização de tela cheia que bloqueia o conteúdo
por 2,5s. Ver [`DESIGN.md`](../../DESIGN.md) §9.

---

### Contexto: Blog (Blog Context)
**Responsabilidade**: Servir artigos long-form persistidos em banco, com
degradação segura para um catálogo versionado.

**Processo**:
1. `ListArticles` / `GetArticle` resolvem via porta `ArticleRepository`
2. `SupabaseArticleRepository` lê `blog_articles` (published only)
3. Em ausência de linhas ou falha, `FallbackArticleRepository` serve o catálogo versionado
4. `ArticleBody` renderiza blocos tipados com a tipografia do design system

**Regras de Negócio**:
- O banco é a fonte da verdade; o catálogo versionado é seed e rede de segurança
- `status = 'draft'` é invisível para o papel anônimo (RLS) e para o repositório
- `ArticleSlug` é um invariante, não uma convenção: kebab-case minúsculo, ≤ 96 chars
- O corpo é uma lista de blocos tipados; nunca HTML
- Slug inválido vira 404 sem tocar o banco
- `dynamicParams` permanece `true`: publicar um artigo não deve exigir novo deploy
- Uma indisponibilidade do banco **não** pode adicionar latência a cada visita (deadline de 2s + circuit breaker de 60s)

---

## Contratos de Interface (Ports)

### ResumeRepository Port
```typescript
interface ResumeRepository {
  getByLanguage(lang: LanguageCode): Promise<Resume | null>;
  getVersion(versionId: string, lang: LanguageCode): Promise<Resume | null>;
  listVersions(lang: LanguageCode): Promise<VersionSummary[]>;
}
```

### PdfGenerator Port
```typescript
interface PdfGenerator {
  generate(resume: Resume, versionId: string): Promise<PdfResult>;
}

interface PdfResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
}
```

### StorageAdapter Port
```typescript
interface StorageAdapter {
  upload(key: string, content: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}
```

### ArticleRepository Port
```typescript
interface ArticleRepository {
  listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]>;
  findPublishedBySlug(locale: Locale, slug: ArticleSlug): Promise<BlogArticle | null>;
}
```

Declarada em `src/application/blog/article-repository.ts`. `BlogArticle` traz o
corpo; `ArticleSummary` é a projeção de lista e nunca inclui o corpo, para que
um payload de índice não carregue o texto completo de um artigo.

Duas implementações satisfazem a mesma porta:
- `SupabaseArticleRepository` — o banco, com validação de fronteira e deadline
- `VersionedArticleRepository` — o catálogo em código, seed e fallback

`FallbackArticleRepository` compõe as duas como decorator, de modo que as páginas
dependem apenas da porta e são indiferentes a qual adapter está em uso.

---

## Estrutura de Diretórios

> **Nota**: a estrutura "alvo" derivada do DDD abaixo é o norte. A estrutura
> **real** evoluiu para o App Router do Next.js e para `domain`/`application` por
> *feature* em vez de por camada. O que existe hoje:

```
src/
├── domain/                          # Puro, zero dependências externas
│   ├── i18n/locale.ts               # Contrato de locale
│   ├── site/
│   │   ├── site-info.ts             # Identidade estática
│   │   └── routes.ts                # Tabela de rotas internas (home/resume/blog)
│   ├── resume/types.ts              # Contrato do currículo (só tipos)
│   ├── portfolio/home-content.ts    # Contrato da home (só tipos)
│   ├── blog/article.ts              # Artigo, ArticleSlug, blocos tipados
│   ├── publication/resume-version.ts# Value object com invariantes
│   └── errors/                      # DomainError + catálogo
│
├── application/                     # Casos de uso e portas
│   ├── publication/                 # GetPublishedResume, PublishPDFResume, ...
│   └── blog/                        # ArticleRepository (porta), ListArticles,
│                                    # GetArticle, FallbackArticleRepository
│
├── infrastructure/                  # Implementações concretas
│   ├── content/
│   │   ├── resume-data{,-en-us}.ts # Currículo por locale (documento de registro)
│   │   ├── home/home-{locale}.ts    # Conteúdo da home por locale
│   │   └── blog/articles-{locale}.ts# Seed do banco + fallback versionado
│   ├── repositories/
│   │   ├── supabase-resume-repository.ts
│   │   ├── supabase-article-repository.ts
│   │   └── index.ts                 # Composition root do blog (+ circuit breaker)
│   ├── storage/supabase-storage-repository.ts
│   ├── supabase/{config,supabase-client}.ts
│   ├── format/format-date.ts        # Intl.DateTimeFormat, pinado a UTC
│   ├── i18n/negotiate-locale.ts     # Edge-safe
│   ├── pdf/                         # Compiladores, cache, registry
│   ├── renderers/latex-resume-renderer.ts
│   └── http/error-handler.ts
│
├── i18n/                            # Catálogos de mensagem (somente servidor)
│   ├── dictionaries/{en-US,pt-BR}.ts
│   ├── dictionaries/{loader,index}.ts
│   └── format-message.ts
│
├── app/                             # App Router
│   ├── globals.css                  # Tokens do design system (@theme Tailwind v4)
│   ├── [locale]/
│   │   ├── layout.tsx               # Layout raiz, fontes, metadata, JSON-LD
│   │   ├── page.tsx                 # Home executiva
│   │   ├── resume/page.tsx          # Documento de registro
│   │   ├── blog/page.tsx            # Índice do blog
│   │   ├── blog/[slug]/page.tsx     # Artigo
│   │   └── not-found.tsx
│   ├── global-not-found.tsx
│   ├── api/resume/[locale]/pdf/route.ts
│   ├── robots.ts
│   └── sitemap.ts
│
├── components/                      # Apresentação (Server Components por padrão)
│   ├── ui/                          # Primitivas e conjunto local de ícones
│   ├── home/                        # Uma seção = um componente
│   ├── resume/resume-document.tsx
│   ├── blog/                        # Cartão, índice, corpo do artigo
│   ├── site/                        # Header, footer, boot sequence
│   ├── locale-switcher.tsx          # Link real (progressive enhancement)
│   └── download-pdf-button.tsx      # Único Client Component de conteúdo
│
└── proxy.ts                         # Negociação e canonicalização de locale (edge)
```

Regras estruturais que a estrutura impõe:

1. `src/domain/portfolio/home-content.ts` e `src/domain/resume/types.ts` são
   **só tipos**. Estão fora do gate de cobertura por compilarem para nada.
2. Nenhum arquivo em `src/components/**` que importe conteúdo pode ser Client
   Component. O e2e verifica isso olhando os chunks JS.
3. Todo link entre páginas é construído por `src/domain/site/routes.ts`.
4. A home tem um componente por seção; o `HomeView` apenas compõe.

---

## Fluxos Principais

### Fluxo 1: Visualizar Currículo
```
1. Usuário acessa /pt-br ou /en-us
2. Page Component chama UseCase GetResume
3. UseCase pede ResumeRepository.getByLanguage()
4. GitFilesAdapter lê Markdown versionado
5. Parser converte MD → Entidade Resume
6. Resume retornado para Componente React
7. UI renderiza seções organizadas
```

### Fluxo 2: Baixar PDF
```
1. Usuário clica em "Baixar PDF"
2. Componente chama UseCase GeneratePdf
3. UseCase busca Resume atual
4. PdfGenerator gera .tex a partir de Resume
5. Docker CLI compila .tex → .pdf
6. StorageAdapter salva PDF no Supabase
7. URL de download retornada ao usuário
```

### Fluxo 3: Selecionar Versão
```
1. Usuário seleciona versão na UI
2. Componente chama UseCase GetVersion
3. UseCase pede ResumeRepository.getVersion(id, lang)
4. SupabaseAdapter busca versão publicada
5. Resume retornado (imutável)
6. UI atualiza com conteúdo da versão
```

### Fluxo 4: Resolver idioma e renderizar currículo
```
1. Requisição chega em `src/proxy.ts` (edge)
2. Se o primeiro segmento é um locale canônico -> segue para renderização
3. Se é `/` -> Negocia por `?locale=`/`?lang>` e, na ausência, por Accept-Language
4. Redireciona (307) para `/{locale-segment}`
5. `app/[locale]/layout.tsx` define <html lang> e metadata via generateMetadata
6. `app/[locale]/page.tsx` renderiza `ResumeView` (Server Component)
7. `ResumeView` resolve o locale por `next/root-params` (getter `locale()`)
8. `requireLocaleForRoute()` normaliza o segmento para a tag canônica
9. `getDictionary(locale)` carrega o catálogo somente no servidor
10. `getResumeContent(locale)` carrega o currículo somente no servidor
11. HTML pré-renderizado (SSG) é enviado ao navegador
12. Único Client Component (`DownloadPDFButton`) recebe strings via props
```

### Fluxo 5: Renderizar a home executiva
```
1. `/pt-br` -> `app/[locale]/page.tsx` (Server Component)
2. `getHomeContent(locale)` carrega o conteúdo configurável da home
3. `getResumeContent(locale)` carrega o documento de registro
4. `RESUME_TEMPLATES` + catálogo produzem as opções do PDF já traduzidas
5. `HomeView` compõe: hero, KPIs, arsenal, trajetória, teasers, contato, rodapé
6. A trajetória casa `HomeExperienceAnnotation.company` com `ResumeExperience.company`
7. BootSequence monta em no máximo 1,1s, na primeira visita, sem bloquear input
8. HTML pré-renderizado; nenhum conteúdo de currículo ou da home no bundle JS
```

### Fluxo 6: Ler o blog
```
1. `/en-us/blog` -> `generateStaticParams` lê o catálogo via `ListArticles`
2. Em tempo de build, cada slug de cada locale é pré-renderizado
3. Na requisição, `ListArticles` -> porta `ArticleRepository`
4. `SupabaseArticleRepository` lê `blog_articles` (published only, deadline 2s)
5. Vazio ou falha -> `VersionedArticleRepository` serve o catálogo versionado
6. Falha abre circuit breaker de 60s: as próximas visitas nem tocam a rede
7. `ArticleBody` renderiza os blocos tipados; nenhum HTML cru
```

### Fluxo 7: Abrir um artigo
```
1. `/en-us/blog/{slug}` -> `GetArticle.execute({ locale, slug })`
2. `ArticleSlug.create` valida antes de qualquer consulta
3. Slug inválido ou artigo ausente -> `notFound()` (404, sem reasonamento exposto)
4. Slug conhecido no build -> HTML estático servido do cache
5. Slug novo -> renderizado na primeira requisição, sem novo deploy
6. `generateMetadata` + JSON-LD `BlogPosting` com `hreflang` por artigo
```

---

## Decisões de Arquitetura (ADRs)

### ADR-001: Fonte Canônica em Markdown Versionado
**Decisão**: Conteúdo do currículo vive em arquivos `.md` no Git como fonte primária.  
**Motivo**: Versionamento natural, diff claro, edição simples, single source of truth.  
**Consequência**: Parser MD necessário; mudança requer commit.

### ADR-002: Geração LaTeX em Docker
**Decisão**: Compilação de PDF ocorre em container Docker com TeX Live fixado.  
**Motivo**: Reprodutibilidade, fonts consistentes, isola dependências pesadas.  
**Consequência**: Overhead de build; CI precisa de Docker.

### ADR-003: Supabase para Publicação e Storage
**Decisão**: Supabase armazena metadados de versões e artefatos PDF publicados.  
**Motivo**: RLS nativo, storage integrado, fácil deploy, free tier generoso.  
**Consequência**: Vendor lock-in parcial; migração necessária se trocar.

### ADR-004: TypeScript Estrito em Todo o Projeto
**Decisão**: `strict: true` no tsconfig, sem `any` implícitos.  
**Motivo**: Segurança de tipos, melhor DX, menos bugs em runtime.  
**Consequência**: Mais boilerplate inicial; curva de aprendizado.

### ADR-005: Internacionalização por Rotas Localizadas e Catálogos de Mensagem
**Decisão**: Layout raiz sob `app/[locale]/` com `generateStaticParams` e
`dynamicParams = false`; `src/proxy.ts` negocia e canonicaliza o locale; todo
texto de interface vive em catálogos tipados (`en-US` como referência, `pt-BR`
tipado contra o contrato) carregados somente no servidor; apresentação é Server
Component com um único Client Component isolado.  
**Motivo**: Elimina texto fixado no código, gera HTML estático por idioma,
remove 74 KB de currículo do bundle do cliente e habilita `hreflang`,
`canonical`, `<html lang>` e sitemap por idioma.  
**Consequência**: Adicionar um idioma passa a ser uma mudança tipada em
`SUPPORTED_LOCALES`, um novo catálogo e um novo arquivo de conteúdo. O 404 global
depende de `experimental.globalNotFound`. Âncoras de seção passaram a ser
neutras (`#experience`, `#skills`, `#education`), o que altera links antigos.  
**Documentação completa**: [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md)

### ADR-006: Design System por Tokens, Não por Literais
**Decisão**: A UI é descrita exclusivamente por tokens Tailwind v4 (`@theme` em
`src/app/globals.css`) e pelas regras normativas de [`DESIGN.md`](../../DESIGN.md).
Nenhum componente contém hex, px ou tamanho de fonte literal.  
**Motivo**: O protótipo de referência é um template, não uma implementação. Tokens
tornam a decisão visual explícita, Revisável e verificável — e impedem que o
design se degrada em `#0A0D12` escrito à mão em quarenta lugares.  
**Consequência**: Se um valor não tem token, o token é adicionado primeiro. Um
conflito com `DESIGN.md` é um bug, não uma preferência.

### ADR-007: Conteúdo da Home como Dado, Currículo como Documento de Registro
**Decisão**: A home é uma landing executiva com todo texto em
`HomeContent` (`src/infrastructure/content/home/`). O currículo original vira o
documento de registro em `/[locale]/resume` e não é reformatado. A home
**reutiliza** fatos do currículo e possui copy própria.  
**Motivo**: Um recrutador precisa de duas leituras: um resumo de 30 segundos e um
documento completo que possa ser conferido e impresso. Forçar os dois no mesmo
template prejudica os dois. Manter o currículo intacto também preserva o pipeline
de PDF e a paridade de conteúdo já verificada em teste.  
**Consequência**: Duas fontes de texto, com um join explícito por `company` entre
as anotações da trajetória e as experiências — coberto por teste que prova que o
join é total e não ambíguo. Adicionar uma seção na home é dado + um componente.

### ADR-008: Blog no Banco com Catálogo Versionado como Fallback
**Decisão**: Artigos vivem em `blog_articles` e são lidos pela porta
`ArticleRepository`. O catálogo em `src/infrastructure/content/blog/` é ao mesmo
tempo o seed da migration e a rede de segurança.  
**Motivo**: O blog é a prova principal de profundidade técnica para um avaliador,
então um blog vazio degradação o site de forma inaceitável. Builds e deploys sem
credenciais (agente de CI, fork, preview) não podem falhar por isso.  
**Consequência**: Duas fontes que precisam concordar — o `id` UUID estável é a
chave de reconciliação, e um teste garante que ambas descrevem os mesmos
documentos. O adapter tem deadline de 2s e o composition root abre um circuit
breaker de 60s, para que uma indisponibilidade do banco não adicione latência a
cada visita. O corpo é blocos tipados, nunca HTML.

---

## Matriz de Dependências

| Camada | Pode Depender De | Não Pode Depender De |
|--------|------------------|----------------------|
| Domain | Nada | Qualquer outra camada |
| Application | Domain | Infrastructure, Presentation |
| Infrastructure | Domain, Application (interfaces) | Presentation |
| Presentation | Application, Domain | Infrastructure (diretamente) |

---

## Padrões de Implementação

1. **Repository Pattern**: Abstrai persistência (Git, Supabase)
2. **Factory Pattern**: Criação de entidades complexas
3. **Strategy Pattern**: Diferentes geradores de PDF (LaTeX, Playwright)
4. **Observer Pattern**: Eventos de publicação (futuro)
5. **Immutable Update Pattern**: Entidades atualizadas via spread/copy

---

## Guias para Agentes de IA

### Ao Implementar Domínio
- Consulte: `.github/instructions/domain.instructions.md`
- Nunca importe de `src/infrastructure` ou `src/presentation`
- Mantenha entidades imutáveis
- Defina invariantes claras

### Ao Implementar Infraestrutura
- Consulte: `.github/instructions/infrastructure.instructions.md`
- Implemente interfaces definidas em `src/domain/repositories/`
- Use injeção de dependência (não instancie diretamente)
- Teste com mocks/stubs

### Ao Implementar Apresentação
- Consulte: `.github/instructions/typescript-react.instructions.md`
- Chame apenas use cases da Application layer
- Não acesse infraestrutura diretamente
- Mantenha componentes puros quando possível

### Ao Criar Testes
- Consulte: `.github/instructions/tests.instructions.md`
- Cobertura mínima 90% para domínio e aplicação
- Unitários: isole camadas
- E2E: valide fluxos completos com Playwright
