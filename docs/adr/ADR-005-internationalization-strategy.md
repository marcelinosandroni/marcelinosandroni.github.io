# ADR-005: Estratégia de Internacionalização com Rotas Localizadas e Catálogos de Mensagem

- **Status**: Aceito
- **Data**: 2026-09-28
- **Épico**: EPIC-02 — Internacionalização
- **User Stories**: US-02 (Alternar idioma), US-01 (Visualizar currículo)
- **Tarefas**: TASK-010, TASK-014, TASK-015, TASK-016, TASK-017
- **Substitui**: a seleção de idioma por query string (`/?locale=pt-BR`) implementada em `src/components/resume-view.tsx`

## Contexto

A implementação anterior atendia aos critérios de aceite de US-02 apenas parcialmente:

| Problema | Impacto |
|---|---|
| O idioma era lido de `?locale=` no cliente e guardado em `useState` | Uma única URL renderizava dois idiomas; não havia URL canônica por idioma |
| Não existia `<html lang>` por idioma | Leitores de tela, tradutores e buscadores perdiam o idioma do documento |
| Não existia `hreflang`, `canonical` nem `sitemap` por idioma | Os dois idiomas não eram reconhecidos como tradução um do outro |
| `ResumeView` era um Client Component e importava `getResumeContent` | Os dois currículos (62 KB em PT-BR + 12 KB em EN-US) eram enviados ao navegador |
| Textos fixados com `isEn ? "..." : "..."` em ~30 pontos | Sem tipagem, sem paridade verificável, alto custo de manutenção |
| Sem negociação de `Accept-Language` | Visitantes sem query string recebiam sempre PT-BR |
| `sitemap.xml`, `robots.txt` e 404 inexistentes | Superfície de SEO e de erro incompleta |

Além disso, o requisito de produto mudou: **o idioma padrão passou a ser EN-US**, com PT-BR como segunda opção.

## Decisão

Adotar roteamento internacionalizado por segmento de caminho com catálogo de mensagens tipado, resolvido inteiramente no servidor.

### 1. Contrato de locale em domínio puro

`src/domain/i18n/locale.ts` é a única fonte de verdade, sem dependências de React ou Next.js:

- `Locale`: tag BCP-47 canônica (`"en-US" | "pt-BR"`) — usada no domínio, conteúdo e artefatos.
- `LocaleSegment`: segmento de URL em minúsculas (`"en-us" | "pt-br"`) — usado nas rotas.
- `DEFAULT_LOCALE = "en-US"`, conforme o novo requisito de produto.
- `LOCALE_LABELS`: endônimo e sigla de UI por locale.

A separação entre tag canônica e segmento de URL é deliberada: URLs em minúsculas são canônicas e evitam variantes duplicadas (`/PT-BR` e `/pt-br`) competindo na indexação.

### 2. Rotas sob `app/[locale]/`

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx        # layout raiz: <html lang>, metadata, JSON-LD
│   │   ├── page.tsx          # página do currículo (Server Component)
│   │   └── not-found.tsx     # 404 dentro de um locale válido
│   ├── global-not-found.tsx  # 404 para URLs sem locale
│   ├── sitemap.ts
│   ├── robots.ts
│   └── api/resume/[locale]/pdf/route.ts   # fora de [locale] por ser Route Handler
├── proxy.ts                  # negociação e canonicalização na edge
├── domain/i18n/              # contrato de locale (puro)
└── i18n/dictionaries/        # catálogos de mensagem (somente servidor)
```

O layout raiz fica sob o segmento dinâmico, padrão documentado pelo Next.js. `generateStaticParams` pré-renderiza `/en-us` e `/pt-br` e `dynamicParams = false` faz qualquer outro locale resultar em 404, mantendo tudo estático e impedindo crescimento ilimitado de rotas.

### 3. `proxy.ts` no lugar de `middleware.ts`

`middleware` está depreciado no Next.js 16 e foi renomeado para `proxy`. O proxy executa na edge antes da renderização e:

1. redireciona `/` para o locale negociado (307);
2. reescreve `?locale=`/`?lang=` legados para o caminho canônico (307);
3. canonicaliza a caixa do segmento (`/PT-BR` → `/pt-br`, 308);
4. **deixa passar** qualquer outro caminho, para que rotas desconhecidas caiam no 404 global em vez de redirecionar para um 404.

A negociação usa `@formatjs/intl-localematcher` com `negotiator`, conforme o guia de internacionalização do Next.js, e está isolada em `src/infrastructure/i18n/negotiate-locale.ts` (sem APIs Node, compatível com edge). O matcher ignora `api`, `_next` e arquivos com extensão para não entrar no caminho crítico dos assets.

### 4. Catálogos de mensagem tipados

`src/i18n/dictionaries/en-US.ts` define o contrato `Dictionary`; `pt-BR.ts` é tipado como `Dictionary`. Consequências:

- chave ausente, com erro de digitação ou com forma errada **quebra a compilação**;
- `en-US` é a referência, então a adição de um idioma novo é uma entrada no registry;
- os catálogos são carregados por `import()` dinâmico, um chunk por locale;
- como todo consumidor é Server Component, **nenhum texto traduzido vai para o bundle do navegador**.

Placeholders usam `{nome}` e são resolvidos por `formatMessage`, que mantém placeholders desconhecidos visíveis em vez de renderizar buracos silenciosos.

### 5. Apresentação como Server Component

`ResumeView` deixou de ser Client Component. Ele resolve o locale por `next/root-params` (o getter se chama `locale()` porque o segmento é `[locale]`), carrega o catálogo e o conteúdo no servidor, e repassa ao único Client Component (`DownloadPDFButton`) apenas as strings e os templates já traduzidos, via props.

O `LocaleSwitcher` virou um `<Link>` de servidor: é rastreável, copiável, clicável com o botão do meio e pré-carregado pelo router — uma melhoria progressiva real em relação a um botão com estado.

### 6. Âncoras de seção neutras

Os ids de seção passaram de `#experiencia`, `#habilidades`, `#formacao` (português fixado no app) para `#experience`, `#skills`, `#education`. Fragmentos de URL são texto visível e compartilhável, portanto também precisam ser independentes de idioma.

## Consequências

### Positivas

- **Performance**: o conteúdo do currículo (74 KB de fonte) sai totalmente do bundle do cliente. Medido no build de produção: o chunk de 72.853 bytes que continha o currículo bilíngue desapareceu e o total de JavaScript do cliente caiu de 438.665 para 405.248 bytes.
- **Estático**: `/en-us` e `/pt-br` são SSG; o tempo de resposta não depende de renderização em runtime.
- **SEO**: `canonical`, `hreflang` (incluindo `x-default`), `openGraph.locale` por idioma, `sitemap.xml` com alternates, `robots.txt` e JSON-LD com `inLanguage`.- **Acessibilidade**: `<html lang>` correto por idioma, rótulos `aria-label` traduzidos, alternador de idioma como link real.
- **Manutenção**: paridade de chaves garantida em tempo de compilação e em tempo de execução por teste.
- **Erros**: 404 localizado dentro de um locale e 404 global com estilo do site.

### Negativas e riscos

- **Mudança de URL**: `/` agora redireciona para `/en-us` e as âncoras mudaram. Links antigos com `?locale=` continuam funcionando por redirecionamento; âncoras antigas deixam de resolver.
- **Adicionar um idioma** exige: entrada em `SUPPORTED_LOCALES` e `LOCALE_SEGMENTS` (tipados, então o compilador cobra o resto), novo arquivo de catálogo, registro em `getResumeContent` e novo `resume-data-*.ts`.
- **Dois `getDictionary`**: `getDictionary(locale)` para código com locale explícito e `getDictionaryForRoute()` para Server Components. O segundo usa `next/root-params` e, por isso, não pode ser importado por Client Components.
- **`global-not-found.tsx` é experimental**: exige `experimental.globalNotFound`. É a única forma de compor um 404 consistente quando o layout raiz está sob um segmento dinâmico de topo.
- **A paridade de conteúdo do currículo** (fatos, datas, employers) continua sendo responsabilidade dos dados e dos testes bilíngues existentes; os catálogos de mensagem garantem paridade de *interface*, não de *fato*.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| `next-intl` | Biblioteca madura, porém adiciona runtime, formatação ICU e abstração própria de roteamento. O volume de texto deste projeto é pequeno e o custo da dependência não se justifica. |
| Manter `?locale=` com Client Component | Não produz URL canônica, `hreflang` nem `<html lang>`; mantém todo o conteúdo no cliente. |
| Domínio por subdomínio (`en.exemplo.com`) | Exige DNS e certificados wildcard para um site de página única. |
| Serializar apenas o locale ativo no cliente | Continua exigindo JavaScript para exibir texto e não gera HTML estático por idioma. |
| Bundler de i18n com verificação em tempo de compilação | `tsc` já garante a paridade com custo zero e sem toolchain adicional. |

## Validação

- `npx tsc --noEmit` — sem erros.
- `npx eslint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run` — 61 testes, incluindo paridade de catálogos, contrato de locale e negociação.
- `npx next build` — `/en-us` e `/pt-br` como `● (SSG)`.
- `npx playwright test` — 13/13, incluindo negociação por `Accept-Language`, `hreflang`, 404 e um teste que garante que nenhum conteúdo do currículo está no JavaScript do cliente.
