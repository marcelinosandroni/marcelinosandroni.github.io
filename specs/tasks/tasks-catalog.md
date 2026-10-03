# Catálogo de Tarefas (Tasks Catalog)

## Visão Geral
Este documento lista todas as tarefas derivadas das User Stories, organizadas por épico e prioridade, com critérios de conclusão claros para execução por agentes de IA.

---

## Status das Tarefas

**Legenda**:
- 🔴 Não iniciada
- 🟡 Em progresso
- 🟢 Concluída
- ⚪ Bloqueada

---

## ÉPICO 01: Visualização do Currículo

### TASK-001: Criar modelo de domínio para Currículo
**US Relacionada**: US-01  
**Prioridade**: Crítica  
**Status**: 🟡 Parcial  
**Estimativa**: 2h  
**Realizado**: 1h  

**Descrição**: Implementar entidades de domínio representando o currículo com tipagem forte e invariantes.

**O Que Foi Feito**:
- ✅ Interface `ResumeContent` definida em `src/domain/resume/types.ts`
- ✅ Interfaces auxiliares: `ResumeExperience`, `ResumeEducation`, `ResumeSkillGroup`, `CaseStudy`
- ✅ Tipo `Locale` definido como `"pt-BR" | "en-US"`
- ✅ Dados de exemplo implementados em `src/infrastructure/content/resume-data.ts`
- ✅ `ResumeVersion` como entidade com SemVer e imutabilidade, em `src/domain/publication/resume-version.ts`
- ⚠️ Value Objects não implementados como classes — ver "Divergência" abaixo
- ⚠️ Sem invariantes validadas em runtime sobre o conteúdo do currículo

**Divergência com a tarefa original**: a tarefa previa `src/domain/entities/resume.ts`.
Esse arquivo nunca existiu; o contrato vive em `src/domain/resume/types.ts` e é
**compilado para nada** — não há uma única instrução emitida a partir dele. Isso é
deliberado e tem duas consequências que os critérios originais não previam:

1. O gate de cobertura exclui o módulo (`vitest.config.ts`), porque o v8 o reportava
   como 0% e tornava o limiar global inalcançável.
2. `LanguageCode`, `MonthYear` e `ContactInfo` como *classes* seriam runtime puro
   sem invariante observável: o compilador já garante a forma. A validação que
   importa — a paridade de fatos entre PT-BR e EN-US — é feita por
   `tests/unit/presentation/content-locale.test.ts`, que compara os dados reais.

**Critérios de Conclusão**:
- [x] Interface `ResumeContent` definida em `src/domain/resume/types.ts`
- [x] Interfaces auxiliares: `ResumeExperience`, `ResumeEducation`, `ResumeSkillGroup`, `CaseStudy`
- [x] Zero dependências externas
- [x] Paridade de fatos entre locales verificada em CI
- [ ] Value Objects runtime (`LanguageCode`, `MonthYear`, `ContactInfo`) — **nãoStreams**
- [ ] Invariantes validadas em runtime sobre o conteúdo do currículo

**Arquivos Existentes**:
- `src/domain/resume/types.ts` ✅ (contrato, só tipos)
- `src/domain/publication/resume-version.ts` ✅ (entidade com invariantes)
- `src/domain/errors/` ✅ (erros de domínio)
- `src/infrastructure/content/resume-data.ts` ✅ (dados de exemplo)

**Próximos Passos**:
1. Decidir, com o architecture-reviewer, se os value objects são invariante real
   ou formalidade — e registrar a decisão como ADR
2. Se forem invariante, implementar as factories com validação

**Instruções para Agente**:
1. Consulte `specs/contracts/contracts-spec.md` para schemas TypeScript
2. Siga `.github/instructions/domain.instructions.md` para regras de domínio
3. Não crie valor-object apenas para ter um: sem invariante observável em runtime,
   ele é custo sem proteção
4. `ResumeVersion` é a entidade que carrega invariantes de verdade — SemVer,
   imutabilidade após publicação

---

### TASK-002: Implementar componente de visualização
**US Relacionada**: US-01  
**Prioridade**: Crítica  
**Status**: 🟢 Concluída  
**Estimativa**: 4h  
**Realizado**: ~5h  

**Descrição**: Criar componentes React para exibir o currículo de forma organizada e responsiva.

**O Que Foi Feito**:
- ✅ `ResumeDocument` em `src/components/resume/resume-document.tsx` renderiza a
  estrutura editorial completa: resumo, habilidades, experiências com estudos de
  caso, formação e idiomas
- ✅ Rota em `src/app/[locale]/resume/page.tsx` com `alternates` e `openGraph` próprios
- ✅ Layout responsivo mobile-first, verificado em `tests/e2e/mobile.spec.ts`
- ✅ SEO por idioma via `generateMetadata` no layout
- ✅ Um único Client Component na página (`DownloadPDFButton`)
- ✅ Fotografia no hero com o loop em vídeo, congelado fora da viewport

**Divergência com a tarefa original**: a tarefa pedia seis componentes separados
(`PersonalInfo`, `Summary`, `ExperienceList`, …). Isso foi decidido contra, e a
razão está registrada no próprio arquivo: a rota do currículo é um **documento**,
lido linearmente e imprimível, e quebrar a única página do site cuja forma é
documental em seis arquivos tornaria a ordem de leitura uma decisão de>import.

**Critérios de Conclusão**:
- [x] Componente de visualização como entry point da rota
- [x] Estrutura completa: resumo, habilidades, experiências, formação, idiomas
- [x] Layout responsivo (mobile-first)
- [x] SEO com metadata dinâmica (title, description, Open Graph, `hreflang`)
- [x] Tipagem baseada nas entidades de domínio
- [x] Um único Client Component; o resto é Server Component
- [~] Acessibilidade WCAG 2.1 AA — semântica e foco verificados em e2e; **contraste
      não medido** (ver TASK-004)

**Arquivos Reais**:
- `src/components/resume/resume-document.tsx` ✅
- `src/app/[locale]/resume/page.tsx` ✅

**Instruções para Agente**:
1. Consulte `specs/architecture/architecture-spec.md` para fluxos
2. Siga `.github/instructions/typescript-react.instructions.md`
3. Um documento não é uma landing page: não introduza o vocabulário de cards da
   home nesta rota
4. Antes de criar outro Client Component, verifique se a interação exige um

---

### TASK-003: Adicionar testes unitários (90%+ cobertura)
**US Relacionada**: US-01  
**Prioridade**: Crítica  
**Status**: 🟢 Concluída  
**Estimativa**: 3h  
**Realizado**: ~6h  

**Descrição**: Implementar bateria de testes unitários para entidades e componentes.

**O Que Foi Feito**:
- ✅ **1.026 testes unitários em 58 arquivos**, cobrindo domínio, aplicação e apresentação
- ✅ Cobertura de **96,46%** no escopo do gate (`src/domain` + `src/application`),
  acima do limiar de 90% em todas as métricas
- ✅ Suíte completa em ~2,5s
- ✅ Módulos apenas-de-tipos excluídos do gate, com o motivo registrado
  (compilam para nada; o v8 os reportava como 0% e tornava o limiar inalcançável)
- ✅ Subdomínios com invariants reais testados: versionamento, locale, tema,
  blog, presence, chat, contact, e-mail, analytics, feature flags, intro, media
- ✅ Suíte e2e Playwright com 295 testes em 22 arquivos

**Critérios de Conclusão**:
- [x] Testes para as entidades de domínio com invariante real
- [x] Testes para factories e validadores
- [x] Cobertura mínima 90% no escopo do gate (96,46%)
- [x] Testes executam em < 30s (~2,5s)
- [x] Testes de interface usuário (e2e Playwright, 295 testes)
- [ ] **CI valida cobertura** — ver "Lacuna" abaixo

**Lacuna conhecida**: `.github/workflows/ci.yml` roda `npm run test:unit`, que é
`vitest run` **sem** `--coverage`. Os limiares estão declarados em
`vitest.config.ts`, mas nada no CI os executa. Na prática a cobertura só é
verificada quando alguém roda `npm run test:unit:coverage` à mão — e pode cair
abaixo de 90% num build verde.

Correção de uma linha: trocar o passo "Unit tests" por
`npm run test:unit:coverage`. Não foi feita aqui porque altera o gate do CI, e
isso é decisão de quem mantém o pipeline.

**Arquivos Existentes**:
- `tests/unit/domain/` — 30 arquivos
- `tests/unit/application/` — 13 arquivos
- `tests/unit/presentation/` — 4 arquivos
- `tests/unit/infrastructure/` — 8 arquivos
- `tests/e2e/` — 22 arquivos, 295 testes

**Instruções para Agente**:
1. Consulte `.github/instructions/tests.instructions.md`
2. Use Vitest como runner
3. Cobertura só vale se for verificada no CI — ver a lacuna acima
4. O escopo do gate é `src/domain` + `src/application`; apresentação é verificada
   por e2e, não por cobertura unitária

---

### TASK-004: Validar acessibilidade
**US Relacionada**: US-01, US-03  
**Prioridade**: Alta  
**Status**: 🟡 Parcial  
**Estimativa**: 2h  
**Realizado**: ~1h (partes abaixo,via e2e)  

**Descrição**: Auditar e corrigir questões de acessibilidade na interface.

**O Que Foi Feito**:
- ✅ Navegação por teclado verificada em `tests/e2e/first-visit-intro.spec.ts`
  (o overlay não prende foco, nada focável é exposto)
- ✅ `prefers-reduced-motion` respeitado em **todo** o site: a chuva, a intro, o
  easter egg, o retrato em vídeo e a transição de navegação
- ✅ Focus indicators visíveis, por token de design (`DESIGN.md` §8)
- ✅ Link "pular para o conteúdo" como primeiro elemento focável da home e do currículo
- ✅ Estrutura de headings verificada em e2e: exatamente um `<h1>` e nenhum nível pulado
- ✅ Vídeo do retrato marcado `aria-hidden`, com o texto alternativo no `<Image>`
  subjacente — duas descrições da mesma pessoa seria pior que uma
- ⚠️ **Contraste de cores nunca medido**
- ⚠️ **Sem auditoria com axe-core**
- ⚠️ **Não validado com leitor de tela real** (VoiceOver, NVDA)

**Critérios de Conclusão**:
- [x] Navegação completa por teclado
- [x] Focus indicators visíveis
- [x] Alt text em imagens
- [x] ARIA labels onde necessário
- [x] `prefers-reduced-motion` respeitado
- [ ] Contraste de cores ≥ 4.5:1 (texto normal) — **não medido**
- [ ] Validação com axe-core ou similar
- [ ] Leitor de tela validado
- [ ] Relatório em `docs/accessibility-audit.md`

**Por que o contraste continua em aberto**: os tokens de cor vêm de
`DESIGN.md` §3 e são declarados por Container Queries, mas ninguém mediu o par
texto/fundo resultante. `text-text-muted` sobre `bg-surface-base` é o suspeito
mais óbvio e é exatamente o que a medição pegaria. Isto não é um bug conhecido —
é uma afirmação que ninguém verificou.

**Instruções para Agente**:
1. Adicione `@axe-core/playwright` e um teste e2e por rota; é a forma mais barata
   de cobrir o critério automaticamente
2. Meça contraste com um script sobre os tokens de `globals.css`, não a olho
3. Corrija violações por severidade
4. Documente as decisões em `docs/accessibility-audit.md`
5. A validação com leitor de tela é manual e não automatizável — registe o que foi
   testado e em qual leitor

---

## ÉPICO 02: Internacionalização

### TASK-010: Configurar roteamento i18n
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 2h  
**Realizado**: 4h  
**ADR**: [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md)

**Descrição**: Implementar roteamento Next.js com suporte a EN-US e PT-BR.

**Critérios de Conclusão**:
- [x] Rotas `/en-us` e `/pt-br` funcionais
- [x] Redirecionamento padrão para EN-US
- [x] Proxy detecta idioma preferido (`Accept-Language`)
- [x] URLs compartilháveis preservam idioma
- [x] Metadata dinâmica por idioma

**O Que Foi Feito**:
- ✅ Contrato de locale em `src/domain/i18n/locale.ts` (tag canônica × segmento de URL)
- ✅ Layout raiz movido para `src/app/[locale]/layout.tsx` com `generateStaticParams`
- ✅ `dynamicParams = false`: locale não suportado retorna 404
- ✅ `src/proxy.ts` no lugar do `middleware.ts` (depreciado no Next.js 16)
- ✅ Redirect 307 de `/` e de `?locale=`/`?lang=` legados
- ✅ Canonicalização 308 de segmento não canônico (`/PT-BR` → `/pt-br`)
- ✅ `generateMetadata` por idioma com `canonical` e `hreflang` (`x-default`)
- ✅ `<html lang>` correto por idioma
- ✅ `sitemap.ts` e `robots.ts`
- ✅ 404 localizado (`app/[locale]/not-found.tsx`) e 404 global
  (`app/global-not-found.tsx` com `experimental.globalNotFound`)

**Arquivos Esperados**:
- `src/domain/i18n/locale.ts` — contrato de locale
- `src/infrastructure/i18n/negotiate-locale.ts` — negociação de header
- `src/app/[locale]/layout.tsx`, `page.tsx`, `not-found.tsx`
- `src/app/global-not-found.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
- `src/proxy.ts`

**Instruções para Agente**:
1. O getter de root param se chama `locale()` porque o segmento é `[locale]`, e
   devolve o segmento **cru** da URL — normalize com `toLocale` antes de usar.
2. Nunca adicione texto visível neste fluxo sem antes adicioná-lo aos catálogos.
3. Ao adicionar um locale, atualize `SUPPORTED_LOCALES` e `LOCALE_SEGMENTS`; o
   compilador vai cobrar o restante.

---

### TASK-014: Criar contrato de locale em domínio
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 1h  
**Realizado**: 1h

**Descrição**: Isolar a noção de idioma em módulo de domínio puro, sem React nem Next.js.

**Critérios de Conclusão**:
- [x] `Locale` (tag BCP-47) e `LocaleSegment` (URL) tipados separadamente
- [x] `DEFAULT_LOCALE = "en-US"`
- [x] `resolveLocale` aceita `pt`, `pt-PT`, `pt_BR`, `en-GB`
- [x] `getAlternateLocale` sempre retorna um locale suportado diferente
- [x] `getAlternateLanguageMap` inclui `x-default`
- [x] Zero dependências de framework (verificado por revisão)

**Arquivos Esperados**:
- `src/domain/i18n/locale.ts`
- `src/domain/i18n/index.ts`

---

### TASK-015: Criar catálogos de mensagem tipados
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 3h  
**Realizado**: 3h

**Descrição**: Eliminar todo texto fixado no código da apresentação.

**Critérios de Conclusão**:
- [x] `en-US` é o locale de referência e define o tipo `Dictionary`
- [x] `pt-BR` tipado como `Dictionary` (chave errada quebra a compilação)
- [x] Cobertura de 100% do texto de interface, metadata, rótulos acessíveis,
      nomes de template de PDF e 404
- [x] `formatMessage` com placeholders `{nome}` testado
- [x] Carregamento por `import()` dinâmico, um chunk por locale
- [x] Nenhum catálogo importado por Client Component
- [x] Teste de paridade de chaves, placeholders e listas não vazias
- [x] `resume-template-registry.ts` sem texto (rótulos movidos para o catálogo)

**Arquivos Esperados**:
- `src/i18n/dictionaries/en-US.ts`, `pt-BR.ts`, `index.ts`
- `src/i18n/format-message.ts`, `src/i18n/index.ts`
- `tests/unit/i18n/dictionaries.test.ts`

---

### TASK-016: Implementar proxy e SEO por idioma
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 2h  
**Realizado**: 2h

**Descrição**: Negociar e canonicalizar locale na edge, e expor a superfície de SEO por idioma.

**Critérios de Conclusão**:
- [x] `src/proxy.ts` com a convenção `proxy` (não `middleware`)
- [x] Matcher ignora `api`, `_next` e arquivos com extensão
- [x] Sem APIs Node no proxy (compatível com edge)
- [x] Caminhos desconhecidos passam direto para o 404, sem redirect em dois saltos
- [x] `canonical` e `hreflang` por idioma
- [x] `sitemap.xml` com alternates e `robots.txt`
- [x] JSON-LD por idioma com `inLanguage` e escape de `<`

**Arquivos Esperados**:
- `src/proxy.ts`
- `src/app/[locale]/layout.tsx`
- `src/app/sitemap.ts`, `src/app/robots.ts`

---

### TASK-017: Tornar a apresentação Server Component
**US Relacionada**: US-01, US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 3h  
**Realizado**: 3h

**Descrição**: Tirar o currículo do bundle do cliente sem perder a única interação real da página.

**Critérios de Conclusão**:
- [x] `ResumeView` é Server Component e resolve locale por `next/root-params`
- [x] Conteúdo do currículo ausente do JavaScript do cliente (verificado por e2e)
- [x] `LocaleSwitcher` virou `<Link>` de servidor (rastreável, copiável, prefetch)
- [x] `DownloadPDFButton` é o único Client Component e recebe strings via props
- [x] Âncoras de seção neutras (`#experience`, `#skills`, `#education`)
- [x] Versão do site lida de `package.json` (fonte única, sem string duplicada)
- [x] Estado de erro do download anunciado com `role="alert"`

**Arquivos Esperados**:
- `src/components/resume-view.tsx`
- `src/components/locale-switcher.tsx`
- `src/components/download-pdf-button.tsx`
- `src/domain/site/site-info.ts`

---

### TASK-011: Implementar parser de Markdown tipado
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: ⚪ Superada  
**Estimativa**: 3h  
**Realizado**: 0h  

**Descrição**: Criar parser que converte Markdown → Entidades de Domínio com validação de schema.

**Por que está superada**: `resume-pt-br.md` e `resume-en-us.md` continuam na raiz
como fonte editorial, mas **não são lidos em runtime**. O conteúdo que a aplicação
consome é TypeScript tipado (`src/infrastructure/content/resume-data.ts` e
`resume-data-en-us.ts`), e a paridade entre os dois idiomas é garantida por
`tests/unit/presentation/content-locale.test.ts`, que compara as estruturas
tipadas — não por um parser.

Um parser seria uma fonte de verdade extra entre o Markdown e o que o site
mostra, e a validação que a tarefa previa (detectar divergência de fato entre
idiomas) já existe e é mais forte: ela compara a estrutura que a aplicação
realmente renderiza. `src/infrastructure/adapters/` nunca existiu.

**Decisão necessária**: ou esta tarefa é removida do catálogo, ou os arquivos
Markdown voltam a ser a fonte e o parser é construído. A segunda opção é um
retrabalho grande e só se justifica se a edição em Markdown for um requisito de
produto — neste momento ela não é.

**Critérios de Conclusão**:
- [ ] Parser lê frontmatter (id, language, version, lastUpdated)
- [ ] Extrai seções: PersonalInfo, Summary, Experiences, Education, Skills, Languages
- [ ] Valida schema obrigatório
- [ ] Lança erros claros para MD inválido
- [ ] Testes com fixtures de MD válido e inválido
- [x] *(equivalente já entregue)* Preserva fatos sem invenções — ver
      `content-locale.test.ts`, 15 testes

**Instruções para Agente**:
1. Não implemente esta tarefa sem a decisão acima
2. Se o parser voltar, consulte `specs/contracts/contracts-spec.md`
3. `gray-matter` é a escolha óbvia para frontmatter

---

### TASK-012: Criar validador de sincronização PT-BR/EN-US
**US Relacionada**: US-02  
**Prioridade**: Média  
**Status**: 🟡 Em progresso (validador automatizado concluído; CLI manual pendente)  
**Estimativa**: 2h  
**Realizado**: 1h  

**Descrição**: Implementar validador que verifica consistência entre versões PT-BR e EN-US.

**O Que Foi Feito**:
- ✅ Validador implementado como suíte de testes em
  `tests/unit/presentation/content-locale.test.ts`, executando no CI a cada build
- ✅ PT-BR declarado explicitamente como **fonte da verdade** no teste
- ✅ Valida identidade e contatos idênticos entre idiomas
- ✅ Valida mesma lista de experiências, na mesma ordem
- ✅ Valida as datas de cada período (dígitos idênticos; apenas meses são traduzidos)
- ✅ Valida contagem de highlights, case studies, métricas, tecnologias, `teamSize` e `scope`
- ✅ Valida education e skill groups
- ✅ Valida que todo número citado em resumo, highlights, `scope` e case studies
  existe também na versão EN (figuras financeiras e de performance preservadas)
- ✅ Valida que a prosa traduzida é substantiva, evitando regressão para resumos
  abreviados

**Critérios de Conclusão**:
- [x] Compara número de experiências
- [x] Valida equivalência de períodos (start/end dates)
- [x] Verifica habilidades equivalentes
- [x] Alerta para divergências de fatos
- [x] Integra no CI como check (via `npm run test:unit`)
- [ ] Script CLI para validação manual — **`scripts/validate-i18n-sync.ts` continua
      inexistente**. O teste é executado no CI a cada build; o que falta é a
      ferramenta para quem está *escrevendo* conteúdo reler o resultado com contexto
      legível, em vez de inferir a divergência de uma falha de asserção.

**Arquivos Existentes**:
- `tests/unit/presentation/content-locale.test.ts` ✅

**Arquivos Pendentes**:
- `scripts/validate-i18n-sync.ts` — CLI para relatar divergências com contexto
  legível, reaproveitando as mesmas regras do teste

**Instruções para Agente**:
1. PT-BR é a fonte da verdade: a versão EN-US é uma tradução, nunca uma resumida
2. Compare estruturas e fatos, não traduções literais
3. Números escritos por extenso são traduzidos ("100 milhões" → "100 million"),
   portanto a invariante é sobre os dígitos, não sobre a string completa
4. Termos técnicos compartilhados entre os idiomas (ex.: "Frontend & Performance")
   são aceitáveis e não devem ser tratados como divergência

---

### TASK-018: Traduzir o currículo EN-US a partir da fonte PT-BR
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 4h  
**Realizado**: 4h  

**Descrição**: A versão EN-US estava muito abreviada em relação ao PT-BR (4 highlights
e nenhum case study em DGT, cargos e datas divergentes em Antlia, Itaú e Pollux).
Reescrever a versão EN-US como tradução completa e fiel do PT-BR.

**O Que Foi Feito**:
- ✅ `summary`, `highlights`, `scope` e `role` traduzidos integralmente em todas
  as 5 experiências
- ✅ 24 case studies traduzidos (challenge, solution, result e metrics)
- ✅ `technologies`, `teamSize` e `scope` adicionados onde faltavam
- ✅ `skillGroups` alinhados à estrutura do PT-BR (6 grupos equivalentes)
- ✅ `education` com períodos e descrições completos do PT-BR
- ✅ Correção de divergências factuais: cargo do DGT, cargo e período da Antlia
  (`Dec/2022 – Dec/2025` → `Jul/2024 – Dec/2025`), cargo do Itaú e cargo do Pollux
- ✅ `languages` alinhado ao conteúdo do PT-BR

**Paridade medida**:
| Métrica | PT-BR | EN-US | EN/PT |
|---|---|---|---|
| Highlights | 35 | 35 | 100% |
| Case studies | 24 | 24 | 100% |
| Métricas de case study | 96 | 96 | 100% |
| Tecnologias | 123 | 123 | 100% |
| Palavras em highlights | 1035 | 992 | 96% |
| Palavras em case studies | 4115 | 3880 | 94% |
| Palavras em summaries | 319 | 314 | 98% |

A leve vantagem de contagem de palavras do inglês é esperada: o inglês é
naturalmente mais compacto que o português para o mesmo conteúdo.

**Nota**: os textos em PT-BR usam marcação markdown (`** Banco de Dados **`),
que os renderizadores LaTeX e PDFKit não interpretam e exibem como asteriscos
literais no PDF. Limitado ao PT-BR por estar fora do escopo desta tarefa;
registrado como follow-up.

**Arquivos Esperados**:
- `src/infrastructure/content/resume-data-en-us.ts` ✅
- `tests/unit/presentation/content-locale.test.ts` ✅

---

### TASK-019: Extrair rótulos do PDF para os catálogos de mensagem
**US Relacionada**: US-02, US-04  
**Prioridade**: Média  
**Status**: 🟢 Concluída  
**Estimativa**: 2h  
**Realizado**: 2h  

**Descrição**: `LaTeXResumeRenderer` continha 20 títulos de seção fixos
("Executive Summary", "Experiência Profissional", "Resumo Executivo"…), que são
texto visível no PDF do cliente e violavam o contrato de "nenhum texto visível
escrito diretamente no código". Investigando um relato anterior de asteriscos
literais no PDF, verificou-se que esse relato era falso (os marcadores `**` só
existem em `caseStudies`, que nenhum renderer consome), mas a investigação
revelou esta violação real.

**O Que Foi Feito**:
- ✅ `pdf.sections` e `pdf.referenceSections` adicionados aos catálogos, com os
  textos **idênticos** aos anteriores, para não alterar o PDF do cliente
- ✅ `labels` tornado **obrigatório** em `ResumeDocumentInput`: o renderer virou
    função pura da entrada
- ✅ `getPdfSectionLabels(dictionary, templateId)` centraliza a escolha por modelo
- ✅ `PublishPDFResume.execute` recebe e encaminha os rótulos
- ✅ `src/i18n/dictionaries/loader.ts` isolado sem dependência de Next.js, para
  que `scripts/compile-pdf.ts` resolva catálogos fora do runtime do Next
- ✅ Chamadas atualizadas: rota de API e script de compilação
- ✅ Testes usam `labelsFor()` via catálogo real, em vez de cópias das strings

**Validação**:
- ✅ Os 20 títulos conferidos um a um contra os literais anteriores: 0 divergências
- ✅ `.tex` gerado com 14.635 bytes, idêntico ao anterior (nenhuma mudança visual)
- ✅ Teste que lê o fonte do renderer e falha se qualquer título reaparecer nele
- ✅ `npm run compile:pdf` gera os dois PDFs com sucesso

**Nota**: `caseStudies` continuam não sendo renderizados. Registrado como
follow-up no backlog.

**Arquivos Esperados**:
- `src/i18n/dictionaries/en-US.ts`, `pt-BR.ts`, `loader.ts` ✅
- `src/infrastructure/pdf/pdf-section-labels.ts` ✅
- `src/infrastructure/renderers/latex-resume-renderer.ts` ✅
- `src/application/publication/build-resume-document.ts`, `publish-pdf-resume.ts` ✅
- `src/app/api/resume/[locale]/pdf/route.ts`, `scripts/compile-pdf.ts` ✅

---

### TASK-013: Adicionar testes de integração
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🟢 Concluída (coberta em e2e, não em `tests/integration`)  
**Estimativa**: 2h  
**Realizado**: ~1h  

**Descrição**: Testar fluxo completo de i18n: rota → dados → entidade → UI.

**Divergência com a tarefa original**: o caminho previsto era
`tests/integration/i18n/resume-i18n.test.ts` com banco em memória. A cobertura
existe, mas em outro lugar e com outro escopo:

- ✅ `tests/e2e/navigation-transition.spec.ts` e `tests/e2e/og-metadata.spec.ts`
  exercitam rota → render nos dois locales
- ✅ `tests/unit/i18n/dictionaries.test.ts` — paridade de chaves, placeholders e
  listas não vazias entre catálogos
- ✅ `tests/unit/presentation/content-locale.test.ts` — paridade de fatos entre
  PT-BR e EN-US, 15 testes
- ✅ `dynamicParams = false` + `proxy.ts` cobrem o locale inválido, verificados em e2e
- ✅ Roda no CI sem Docker e sem Supabase configurado (o caminho degradado)

**Critérios de Conclusão**:
- [x] Teste de fluxo PT-BR completo
- [x] Teste de fluxo EN-US completo
- [x] Valida metadata por idioma
- [x] Testa fallback para idioma inválido
- [x] Executa no CI
- [ ] Executa em CI com Docker — **não se aplica**: não há banco involved no caminho
      testado. O caminho com Supabase configurado continua sem cobertura de integração.

---

## ÉPICO 03: Geração e Download de PDF

### TASK-030: Definir contrato de conteúdo para PDF
**US Relacionada**: US-04  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 1h  
**Realizado**: 1h  

**Descrição**: Especificar dados estruturados necessários para geração de PDF LaTeX.

**O Que Foi Feito**:
- ✅ Interface `ResumeDocumentInput` definida em `build-resume-document.ts`
- ✅ Contrato LaTeX implementado em `latex-templates.ts`
- ✅ Renderer `LaTeXResumeRenderer` implementa contrato completo
- ✅ Template registry com múltiplas versões (REFERENCE, default)
- ✅ Validação de dados integrada no renderer

**Critérios de Conclusão**:
- [x] Interface `LatexTemplateInput` definida
- [x] Mapeamento Resume → LatexTemplateInput documentado
- [x] Contrato versionado junto com template LaTeX
- [x] Validação de dados antes de gerar .tex

**Arquivos Existentes**:
- `src/infrastructure/pdf/latex-templates.ts` ✅
- `src/infrastructure/pdf/resume-template-registry.ts` ✅
- `src/infrastructure/renderers/latex-resume-renderer.ts` ✅
- `src/application/publication/build-resume-document.ts` ✅

**Instruções para Agente**:
Contrato já implementado. Próxima tarefa é evolução do template.

---

### TASK-031: Implementar template LaTeX
**US Relacionada**: US-04  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 4h  
**Realizado**: 3h  

**Descrição**: Criar template LaTeX profissional e reprodutível para o currículo.

**O Que Foi Feito**:
- ✅ Template LaTeX com interpolação de variáveis implementado
- ✅ Estilo profissional consistente (fontes, cores, margens)
- ✅ Suporte a dois templates: REFERENCE (formal) e default (moderno)
- ✅ Hyperlinks funcionais (email, LinkedIn) via `hyperref`
- ✅ Seções renderizadas: Summary, Skills, Experiences, Education, Languages
- ✅ Escape de caracteres especiais LaTeX
- ✅ Testes unitários do renderer

**Critérios de Conclusão**:
- [x] Template `.tex` com interpolação de variáveis
- [x] Estilo consistente com UI web
- [x] Fontes embutidas ou disponíveis no Docker
- [x] Layout A4 otimizado para impressão
- [x] Hyperlinks funcionais (email, LinkedIn, GitHub)
- [x] Teste com dados reais

**Arquivos Existentes**:
- `src/infrastructure/pdf/latex-templates.ts` ✅ (template programático)
- `src/infrastructure/renderers/latex-resume-renderer.ts` ✅ (renderer completo)
- `tests/unit/infrastructure/latex-resume-renderer.test.ts` ✅

**Instruções para Agente**:
Template funcional. Validar visualmente PDF gerado e ajustar detalhes finos se necessário.

---

### TASK-032: Configurar pipeline Docker de compilação
**US Relacionada**: US-04  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 3h  
**Realizado**: 3h  

**Descrição**: Configurar container Docker para compilação reprodutível de PDFs.

**O Que Foi Feito**:
- ✅ `DockerPDFCompiler` implementado com timeout configurável
- ✅ Compilação via Docker com imagem customizada (`marcelino-pdf-compiler:latest`)
- ✅ Script CLI `compile-pdf.ts` funcional
- ✅ Fallback automático para PDFKit se Docker indisponível
- ✅ Suporte a múltiplos locales (pt-BR, en-US)
- ✅ Suporte a múltiplos templates via CLI
- ✅ Detecção automática de disponibilidade do Docker
- ✅ Limpeza de arquivos temporários após compilação

**Critérios de Conclusão**:
- [x] Dockerfile com TeX Live fixado
- [x] Script de compilação retorna código 0 em sucesso
- [x] Logs claros em caso de falha
- [x] Imagem ≤ 500MB (otimizada)
- [x] Integração com GitHub Actions
- [x] Cache de camadas Docker

**O Que Foi Feito (correção)**: a integração com GitHub Actions **existe** desde
antes desta revisão e estava marcada como pendente por engano.
`.github/workflows/compile-pdf.yml` compila os PDFs em tags e publica-os no
release. Todos os critérios desta tarefa estão satisfeitos.

**Arquivos Existentes**:
- `src/infrastructure/pdf/docker-pdf-compiler.ts` ✅
- `scripts/compile-pdf.ts` ✅ (CLI completo)
- `src/infrastructure/pdf/pdfkit-pdf-compiler.ts` ✅ (fallback)
- `.github/workflows/compile-pdf.yml` ✅ (compila e publica em tags)
- `tests/unit/infrastructure/pdfkit-pdf-compiler.test.ts` ✅

**Nota aberta**: `docs/feature-flags.md` registra que os PDFs também são
publicados em `public/artifacts` por esse workflow, **sem gate de variável** — ou
seja, `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD=off` esconde o botão e devolve 404 na
rota, mas o arquivo continuaPublished no release. Se a intenção da flag é
"não distribuível", esse caminho precisa de uma decisão.

---


### TASK-033: Implementar endpoint de download
**US Relacionada**: US-04  
**Prioridade**: Alta  
**Status**: 🟡 Parcial  
**Estimativa**: 2h  
**Realizado**: ~2h  

**Descrição**: Criar API endpoint para download de PDFs versionados.

**O Que Foi Feito**:
- ✅ `GET /api/resume/[locale]/pdf` — rota dinâmica, compilando LaTeX on demand
  com fallback automático para PDFKit quando o Docker não está disponível
- ✅ Headers `Content-Type` e `Content-Disposition` com nome de arquivo correto
- ✅ 404 antes de validar o locale ou compilar quando a feature flag está desligada
- ✅ Gate por `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD`, coberto por
  `tests/unit/application/resume-download-gate.test.ts` (17 testes)
- ✅ Cobertura e2e real: `tests/e2e/pdf-download.spec.ts` clica no botão e confere
  o arquivo compilado nos dois idiomas
- ⚠️ Sem rate limiting
- ⚠️ Sem logging de downloads
- ⚠️ Sem cache headers de artefato

**Divergência com a tarefa original**: a rota é por **locale**
(`/api/resume/[locale]/pdf`), não por `versionId`. O download é versionado pelo
*conteúdo* — a versão vem de `package.json` via `SITE_VERSION` e entra no PDF e
no nome do arquivo — e não por um identificador de versão na URL. Isso é coerente
com o modelo de conteúdo deste site (Git como fonte canônica, uma versão
publicada por deploy), mas significa que **o histórico de versões não é
acessível por URL**, que é o critério central de US-05.

**Critérios de Conclusão**:
- [x] Endpoint de download funcional
- [x] Headers corretos: Content-Type, Content-Disposition
- [x] Tratamento de erro (404 por flag desligada; erros de compilação testados)
- [ ] Rate limiting básico
- [ ] Logging de downloads
- [x] Testes (unitários da flag + e2e do download real)
- [ ] Download por identificador de versão

**Arquivos Reais**:
- `src/app/api/resume/[locale]/pdf/route.ts` ✅
- `src/application/publication/publish-pdf-resume.ts` ✅

---

### TASK-034: Adicionar testes de regressão visual
**US Relacionada**: US-04  
**Prioridade**: Média  
**Status**: 🔴 Não iniciada  
**Estimativa**: 3h  

**Descrição**: Implementar comparação visual de PDFs para detectar mudanças não intencionais.

**Critérios de Conclusão**:
- [ ] Snapshot de PDFs de referência
- [ ] Comparação pixel-a-pixel ou estrutural
- [ ] Limiar de diferença configurável
- [ ] Relatório visual de diferenças
- [ ] Integração no CI

**Arquivos Esperados**:
- `tests/visual/pdf-regression.test.ts`
- `tests/visual/baselines/` com PDFs de referência
- Script de atualização de baselines

**Instruções para Agente**:
1. Use biblioteca de diff de imagens (sharp, pixelmatch)
2. Converta PDF → PNG para comparação
3. Documente mudanças aceitáveis vs bugs
4. Automatize atualização de baselines

---

## ÉPICO 04: Versionamento e Publicação

### TASK-040: Modelar entidade Versão
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🟢 Concluída  
**Estimativa**: 2h  
**Realizado**: ~2h  

**Descrição**: Definir entidade de domínio para versões publicadas.

**O Que Foi Feito**:
- ✅ `ResumeVersion` em `src/domain/publication/resume-version.ts`
- ✅ Validação de versionamento semântico no factory `create()`, não no tipo
- ✅ Invariante de imutabilidade após a criação
- ✅ Testes em `tests/unit/domain/resume-version.test.ts` e
  `tests/unit/publication/resume-version-policy.test.ts`
- ✅ `CurrentResumeVersion` separa "versão atual" de "versão pedida"

**Divergência com a tarefa original**: a entidade chama-se `ResumeVersion`, mora em
`src/domain/publication/` (não `entities/`) e não tem campo `status`. Não há
estados `draft`/`published`/`archived` — a versão publicada é a única que existe, e
`listVersions` devolve o histórico. O campo `id` também não existe: a identidade é
a própria string SemVer.

Nada disso é uma falha; é um modelo mais simples que o previsto, e ele está
coberto por testes. Mas o nome "versão publicada" sugere histórico navegável, e
**histórico navegável não existe** — ver TASK-043.

**Critérios de Conclusão**:
- [x] Entidade com version, locale e publishedAt
- [x] Validação de versionamento semântico
- [x] Invariante: versão publicada é imutável
- [x] Relacionamento com o conteúdo publicado
- [x] Testes unitários
- [ ] Estados `draft` / `published` / `archived` — **não implementados, por decisão**

---

### TASK-041: Implementar migração Supabase
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🟡 Parcial  
**Estimativa**: 2h  
**Realizado**: ~1h  

**Descrição**: Criar migrations SQL para tabelas de versões e artefatos PDF.

**O Que Foi Feito**:
- ✅ `supabase/migrations/20260831000100_resume_publication.sql` cria
  `resume_versions` com type `resume_locale`, coluna `content jsonb`, restrição
  SemVer por regex, `unique (version, locale)`
- ✅ Índice `resume_versions_latest_idx` em `(locale, published_at desc)`
- ✅ RLS habilitado com política de leitura pública condicionada a `published_at <= now()`
- ⚠️ A tabela se chama `resume_versions`, não `published_versions`
- ⚠️ **`pdf_artifacts` não existe** — está especificada em `contracts-spec.md`
  §`Tabela pdf_artifacts` mas **nunca foi criada**. Os artefatos vão para o
  Supabase Storage, não para o banco
- ⚠️ Sem seed data
- ⚠️ Sem migration reversível (down)

**Sobre as seis migrations**: cinco delas (`blog_articles`, `click_aggregates`,
`theme_feedback`, `blog_post_cms`, `presence_and_chat`) pertencem a funcionalidades
que não estão em nenhuma tarefa deste catálogo — ver FEAT-01, FEAT-03 e a área de
chat/presence, que nunca foi especificada aqui.

**Critérios de Conclusão**:
- [x] Tabela de versões criada (`resume_versions`)
- [ ] Tabela `pdf_artifacts` criada — **especificada e não implementada**
- [x] Índices configurados
- [x] RLS policies implementadas
- [ ] Seed data para desenvolvimento
- [ ] Migration reversível (down)

**Divergência a resolver**: `contracts-spec.md` descreve `pdf_artifacts` com uma
política RLS que faz join com `published_versions`. Como a tabela não existe, o
contrato e o banco divergem. Ou a tabela é criada, ou o contrato é atualizado
para refletir que o artefato vive no Storage. Isso é decisão de contrato, e por
governança passa pelo Tech Lead.

---

### TASK-042: Criar adaptador de persistência
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🟡 Parcial  
**Estimativa**: 3h  
**Realizado**: ~2h  

**Descrição**: Implementar adaptador Supabase para operações de versões.

**O Que Foi Feito**:
- ✅ `SupabaseResumeRepository` em `src/infrastructure/repositories/` com
  `findLatest(locale)`, atrás da porta de aplicação `GetPublishedResume`
- ✅ `SupabaseStorageRepository` para artefatos, com `StoreResumeArtifact` e
  `RetrieveResumeArtifact`
- ✅ Conexão via variáveis de ambiente, com `isSupabaseConfigured()` e caminho
  degradado sem credenciais
- ✅ Fallback versionado: sem banco configurado, o site serve do catálogo local
- ✅ Testes dos use cases com repositório em memória
- ⚠️ Sem `getVersion` e sem `listVersions` no adaptador — `listVersions` existe
  como use case mas não tem adaptador
- ⚠️ Sem retry para falhas transitórias
- ⚠️ Sem types gerados por `supabase gen types`

**Divergência com a tarefa original**: a API é `findLatest`, não
`getByLanguage`/`getVersion`/`listVersions`, e o arquivo está em `repositories/`
e não em `adapters/`. `src/infrastructure/adapters/` nunca existiu — o projeto
usa `repositories/` para persistência.

A ausência de `getVersion` é a consequência real: **não há como buscar uma versão
específica**, que é o critério de US-05 ("consultar uma versão publicada").

**Critérios de Conclusão**:
- [x] Adaptador implementando a porta de repositório
- [x] `findLatest(locale)`
- [x] Conexão via environment variables
- [x] Tratamento de ausência de credenciais (caminho degradado)
- [x] Testes com repositório em memória
- [ ] `getVersion(versionId)` — **ausente**
- [ ] `listVersions` no adaptador — **ausente**
- [ ] Retry para falhas transitórias
- [ ] Tipagem com `supabase gen types`

---

### TASK-043: Implementar UI de seleção de versões
**US Relacionada**: US-05  
**Prioridade**: Baixa  
**Status**: 🔴 Não iniciada  
**Estimativa**: 3h  

**Descrição**: Criar interface para listar e selecionar versões publicadas.

**Critérios de Conclusão**:
- [ ] Dropdown ou lista de versões disponíveis
- [ ] Exibe versionNumber e publishedAt formatado
- [ ] Indicador de versão atual
- [ ] Navegação entre versões sem reload completo
- [ ] Estado de carregamento e erro
- [ ] Acessível por teclado

**Arquivos Esperados**:
- `src/components/resume/version-selector.tsx`
- `src/hooks/use-versions.ts`

**Instruções para Agente**:
1. Consulte design system existente
2. Use Suspense para loading states
3. Implemente optimistic updates
4. Teste com lista vazia e muitos itens

---

### TASK-044: Adicionar testes de integração
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🔴 Não iniciada  
**Estimativa**: 3h  

**Descrição**: Testar fluxo completo de versionamento: publish → storage → retrieval.

**Critérios de Conclusão**:
- [ ] Teste de publicação de versão
- [ ] Teste de listagem de versões
- [ ] Teste de recuperação de versão específica
- [ ] Teste de imutabilidade pós-publicação
- [ ] Valida RLS (leitura pública, escrita autenticada)
- [ ] Executa em CI com Supabase local

**Arquivos Esperados**:
- `tests/integration/versioning/publication-flow.test.ts`
- `tests/integration/versioning/rls-policies.test.ts`

**Instruções para Agente**:
1. Use Supabase local (`supabase start`)
2. Isole testes de integração
3. Limpe dados após cada teste
4. Valide políticas de segurança

---

## ÉPICO 05: Design Executivo e Blog

Redesenho da home como landing page executiva a partir do sistema de design
`DESIGN.md`, com todo o conteúdo da home configurável e bilíngue, o currículo
mantido como documento de registro em rota própria, e um blog persistido em
banco. Ver [DESIGN.md](../../DESIGN.md) para as regras normativas de UI/UX.

### TASK-050: Sistema de design e tokens
**US Relacionada**: US-01, US-03  
**Prioridade**: Crítica  
**Status**: 🟢 Concluída  
**Estimativa**: 6h  
**Realizado**: 6h  

**Descrição**: Traduzir o protótipo de referência (`design-assets/`) em tokens de
design utilizáveis pelo código, sem recriar literais nos componentes.

**O Que Foi Feito**:
- ✅ `DESIGN.md` na raiz como regra normativa (cor, tipografia, layout, elevação,
  forma, componentes, a11y, performance, anti-padrões)
- ✅ Tokens Tailwind v4 em `src/app/globals.css` (`@theme`) reproducing os nomes
  de classe do protótipo — `text-display-hero`, `bg-surface-raised`,
  `p-space-xl`, `font-label-mono` — sem *magic numbers* nos componentes
- ✅ Fontes self-hosted via `next/font` (Manrope, JetBrains Mono, Playfair Display)
- ✅ Setores de grid de micro-pontos, trilhas de foco e `prefers-reduced-motion`
- ✅ Conjunto local de ícones SVG (sem CDN de fonte de ícones)
- ✅ Primitivas de UI: `Section`, `SectionHeading`, `StatusPill`, `Chip`, `ChannelLink`

**Critérios de Conclusão**:
- [x] `DESIGN.md` normativo na raiz
- [x] Nomes de classe do protótipo resolvendo para tokens reais
- [x] Zero dependência de CDN em tempo de execução
- [x] Foco visível e `prefers-reduced-motion` respeitados
- [x] `npm run lint` e `npm run typecheck` limpos

**Arquivos Existentes**:
- `DESIGN.md` ✅
- `src/app/globals.css` ✅
- `src/components/ui/icon.tsx` ✅
- `src/components/ui/primitives.tsx` ✅
- `src/app/[locale]/layout.tsx` ✅

**Instruções para Agente**:
1. Nunca adicione hex, px ou tamanho de fonte literal em um componente
2. Se um valor não tem token, adicione o token primeiro
3. Contradições com `DESIGN.md` são bugs, não preferências

---

### TASK-051: Home executiva com conteúdo configurável
**US Relacionada**: US-01, US-03  
**Prioridade**: Crítica  
**Status**: 🟢 Concluída  
**Estimativa**: 8h  
**Realizado**: 9h  

**Descrição**: Home como landing page executiva com cada seção em um componente
independente e todo texto vindo de dados bilíngues.

**O Que Foi Feito**:
- ✅ `HomeContent` em `src/domain/portfolio/home-content.ts` (vocabulário fechado
  de acentos, ícones, escalas de estatística)
- ✅ Catálogos bilíngues em `src/infrastructure/content/home/`
- ✅ Seções desacopladas: `HomeHeroSection`, `KpiMatrixSection`,
  `TechArsenalSection`, `TrackRecordSection`, `BlogPreviewSection`,
  `ContactGatewaySection`, `PortraitFrame`
- ✅ `HomeView` apenas resolve dados e compõe seções
- ✅ Trajetória renderizada a partir dos dados do currículo, unida por `company`
- ✅ Formulário de contato substituído por briefing pré-preenchido em `mailto:`
- ✅ Boot sequence não bloqueante, apenas na primeira visita, ciente de
  `prefers-reduced-motion`

**Critérios de Conclusão**:
- [x] Cada seção em um componente com contrato próprio
- [x] Nenhum texto de usuário final em markup
- [x] Estrutura idêntica entre `pt-BR` e `en-US`
- [x] Anotações da trajetória casam 1:1 com as experiências do currículo
- [x] Nenhum componente com conteúdo virou Client Component

**Arquivos Existentes**:
- `src/domain/portfolio/home-content.ts` ✅
- `src/infrastructure/content/home/` ✅
- `src/components/home/` ✅
- `src/components/site/` ✅

**Instruções para Agente**:
1. Adicionar seção = dado + um componente, nunca editar layout compartilhado
2. Rode `tests/unit/presentation/home-content.test.ts` após qualquer mudança de dados

---

### TASK-052: Rota do currículo como documento de registro
**US Relacionada**: US-01, US-04  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 3h  
**Realizado**: 3h  

**Descrição**: Mover o currículo completo para `/[locale]/resume`, mantendo todo o
conteúdo original intacto.

**O Que Foi Feito**:
- ✅ `ResumeDocument` renderizando a estrutura editorial original (resumo,
  habilidades, experiência com estudos de caso, formação, idiomas)
- ✅ Nenhum fato, ordem ou texto do currículo alterado
- ✅ Rota com `alternates` e `openGraph` próprios (o layout é substituído, não mesclado)
- ✅ `resume-view.tsx` removido; o e2e existente continua verde

**Critérios de Conclusão**:
- [x] Todos os 24 estudos de caso preservados
- [x] Paridade de conteúdo inalterada
- [x] `alternates` completo em rotas aninhadas

**Arquivos Existentes**:
- `src/components/resume/resume-document.tsx` ✅
- `src/app/[locale]/resume/page.tsx` ✅

---

### TASK-053: Blog persistido em banco
**US Relacionada**: US-03  
**Prioridade**: Alta  
**Status**: 🟢 Concluída  
**Estimativa**: 10h  
**Realizado**: 11h  

**Descrição**: Blog com artigos stored no banco, lidos através de uma porta de
domínio, com fallback versionado para builds sem credenciais.

**O Que Foi Feito**:
- ✅ Domínio: `ArticleBlock`, `BlogArticle`, `ArticleSummary`, `ArticleSlug`
  (value object com invariantes de URL), `compareArticleSummaries`
- ✅ Aplicação: `ArticleRepository` (porta), `ListArticles`, `GetArticle`,
  `FallbackArticleRepository`
- ✅ Infra: `SupabaseArticleRepository` com validação de fronteira, deadline de
  2s e circuit breaker de 60s no composition root
- ✅ Migration `blog_articles` com RLS, índices parciais e seed bilíngue
- ✅ Catálogo versionado bilíngue como seed e fallback
- ✅ Rotas `/[locale]/blog` e `/[locale]/blog/[slug]` com `BlogPosting` JSON-LD
- ✅ Sitemap e `hreflang` por artigo

**Critérios de Conclusão**:
- [x] Artigos lidos do banco
- [x] Build e runtime funcionam sem banco configurado
- [x] Draft invisível para o papel anônimo
- [x] Slug malformado vira 404, sem ida ao banco
- [x] Artigo publicado após o build é acessível sem novo deploy

**Arquivos Existentes**:
- `src/domain/blog/` ✅
- `src/application/blog/` ✅
- `src/infrastructure/repositories/supabase-article-repository.ts` ✅
- `src/infrastructure/repositories/index.ts` ✅
- `src/infrastructure/content/blog/` ✅
- `supabase/migrations/20260928000100_blog_articles.sql` ✅
- `src/app/[locale]/blog/` ✅

**Instruções para Agente**:
1. Nunca renderizar corpo de artigo a partir de HTML cru
2. Um novo bloco é um novo tipo em `ArticleBlock` — erro de compilação, não um buraco
3. Seed e `supabase/migrations` descrevem os mesmos documentos; os `id` são a chave

---

### TASK-054: Cobertura e gates de qualidade
**US Relacionada**: -  
**Prioridade**: Média  
**Status**: 🟢 Concluída  
**Estimativa**: 2h  
**Realizado**: 2h  

**Descrição**: O gate de cobertura de 90% estava vermelho na `main` (56.61%).
Corrigir a causa e elevá-lo acima do limiar.

**O Que Foi Feito**:
- ✅ Exclusão de módulos apenas-de-tipos do gate (compilam para nada; v8 os
  reportava como 0% e o limiar global era inalcançável)
- ✅ `DomainError` coberto (comportamento de `isOperational` é o que decide se
  uma mensagem interna vaza)
- ✅ Suíte e2e reorganizada em `pdf-download` / `home-overview` / `blog`
- ✅ `playwright.config.ts` serializado: workers paralelos corrompiam o cache do
  `next dev` e geravam falhas sem relação com o código
- ✅ Supabase não configurado no e2e, para exercitar o caminho degradado

**Critérios de Conclusão**:
- [x] `npm run test:unit:coverage` acima de 90% em todas as métricas
- [x] `npm run test:e2e` verde e determinístico
- [x] `npm run build` sem erro

**Arquivos Existentes**:
- `vitest.config.ts` ✅
- `playwright.config.ts` ✅
- `tests/unit/domain/errors.test.ts` ✅
- `tests/unit/presentation/home-content.test.ts` ✅
- `tests/unit/presentation/blog-catalog.test.ts` ✅

### TASK-055: Retrato em vídeo no hero
**US Relacionada**: US-01, US-03  
**Prioridade**: Média  
**Status**: 🟢 Concluída  
**Estimativa**: —  
**Realizado**: ~6h  

**Descrição**: O retrato do hero é um vídeo em loop em vez de uma fotografia.

> **Retirada do intro em 2026-10-02.** A versão original desta tarefa entregava o
> vídeo também no intro de primeira visita, com o retrato pousando na posição exata
> do hero. Isso foi desfeito pela TASK-056, que trocou o retrato do intro pelo nome.
> O texto abaixo foi reconciliado com o código: os números do encoder e o
> comportamento no currículo estavam errados.

**O Que Foi Feito**:
- ✅ `npm run encode:portrait` gera três derivados a partir do master de 2,8MB:
  WebM 106KB, MP4 178KB, poster WebP 24KB — **309KB no total, 89% menor**
- ✅ Áudio removido (`-an`), 420px quadrado, 20fps, `crop=720:720:0:180`,
  `+faststart` no MP4
- ✅ **Boomerang** (ida e volta) em vez de corte: o master nunca retorna à pose de
  abertura, então um corte de 6s era um salto no meio do gesto. Custa 74KB sobre o
  corte quebrado
- ✅ Loop fixado em **exatamente 9,000000s** por `tpad` + `-frames:v 180` @20fps,
  verificado com ffprobe. Uma build anterior saiu em 8,85s e deslocava o glitch
  150ms por ciclo
- ✅ Nomes com hash de conteúdo (`portrait-loop.6d256292.webm`), porque `next start`
  serve `public/` sem cache
- ✅ `src/domain/media/portrait-video.ts` — caminhos com hash e a decisão de quem vê
  o vídeo (`evaluatePortraitVideoDecision`)
- ✅ `PortraitVideoGate` — só monta o vídeo para quem passou nos dois portões
  (movimento reduzido e conexão limitada)
- ✅ `PortraitVideo` — `<video muted playsInline loop>`, que é HTML declarativo:
  o hero continua um Server Component
- ✅ Loop **congelado fora da viewport** via `IntersectionObserver`, com margem de
  120px; sem observer, o vídeo toca sempre
- ✅ Glitch curtíssimo de tela marcando a emenda do loop, cronometrado por
  `--portrait-loop` a partir de `PORTRAIT_VIDEO.durationMs` com `steps(1, end)`
- ✅ O jitter do glitch vive num filho (`.msd-portrait-media`), nunca no
  `[data-portrait-anchor='hero']`: `getBoundingClientRect` devolve o retângulo já
  transformado, e a antiga assert de pouso exigia 2px
- ✅ **Só no hero.** O currículo não tem retrato — ver TASK-056

**Critérios de Conclusão**:
- [x] Vídeo codificado sem áudio, < 360KB no total (`PORTRAIT_MEDIA_BUDGET_BYTES`)
- [x] Formatos WebM + MP4 com fallback
- [x] Poster antes de qualquer byte de vídeo
- [x] Reprodução automática sem JavaScript adicional no hero
- [x] Congelado fora da viewport
- [x] Movimento reduzido e conexão limitada recebem a fotografia, com zero bytes de
      vídeo
- [x] Loop sem emenda visível, com glitch dimensionado pela duração real
- [x] Retrato ausente do currículo, presente no hero (e2e afirma as duas coisas)

**Bugs preexistentes encontrados e corrigidos** (nenhum visível sem olhar):
- As animações do beat `enter` **nunca executavam**: o CSS casava `[data-phase]` e
  o componente renderiza `data-intro-phase`
- A expansão Matrix não revelava nada: o fundo opaco era propriedade da camada,
  então clipar a chuva deixava uma tela preta
- O `clip-path` começava em 150%, mas a percentage de `circle()` resolve contra a
  diagonal do viewport — 70,7% é o canto em qualquer viewport, então metade do beat
  não fazia nada
- `.msd-portrait-video` vivia em `intro.css`. Um Server Component do hero dependia
  da folha da cortina de chegada; truncar a folha deixaria o loop do hero em
  `opacity: 0` permanente, sem erro nenhum em lugar nenhum. Mudou para
  `portrait-glitch.css`

**Notas abertas**:
- O master `public/portrait-action-video.mp4` (2,8MB) fica no repositório porque
  `npm run encode:portrait` precisa dele. Decisão de quem mantém o repo.
- O glitch existe para marcar uma emenda que a versão boomerang já não tem. Vale
  rever se ele ainda compra alguma coisa — pergunta em aberto, não uma pendência.

---

### TASK-056: Intro escreve o nome em glifos Matrix e sobe para o site
**US Relacionada**: US-01  
**Prioridade**: Média  
**Status**: 🟢 Concluída  
**Estimativa**: —  
**Realizado**: ~7h  

**Descrição**: A intro de primeira visita deixa de mostrar um retrato. Glifos Matrix
caem da tela até resolverem `MARCELINO SANDRONI`, e então a cortina sobe e o site
aparece.

**O Que Foi Feito**:
- ✅ `MatrixName` (`src/components/effects/matrix-name.tsx`) — uma coluna vertical
  por caractere, caindo de fora da tela e parando com a letra travada na linha e uma
  trilha de ruído acima dela
- ✅ `buildMatrixNameCells` é pura e determinística: reusa `MATRIX_GLYPHS` e
  `createSeededRandom` do `MatrixRain` em vez de um segundo alfabeto e um segundo
  gerador — dois texturas significa um nome colado ao lado da chuva
- ✅ O espaço é um **vazio** de `1ch`, não outra coluna de ruído
- ✅ Fases novas em `src/domain/intro.ts`: `connecting` → `locking` → `enter`, total
  6.7s. O tempo foi para o beat do nome, não para o handshake
- ✅ A subida é um `clip-path: inset(0 0 B% 0)` — a cortina recua para cima — com uma
  linha de brilho viajando **na borda**, como elemento separado e não recortado
- ✅ `planIntroLanding`, `IntroLanding`, `measureLanding`, `applyLanding` e o
  `--intro-progress` por quadro foram removidos: nada mais pousa, nada mais lê
  progresso por quadro
- ✅ O nome vive em `SITE_OWNER.introName`, não derivado de `name`

**Critérios de Conclusão**:
- [x] Nenhuma imagem ou vídeo dentro da intro, em nenhum instante (e2e amostra a
      sequência inteira e afirma os três beats)
- [x] As 17 colunas resolvem o nome, com o espaço como gap
- [x] Todas as letras na mesma linha de base, dentro de 1px, no centro da tela
- [x] As colunas caem de verdade: >600px de deslocamento, pouso em zero, subida
      total < 5% da descida
- [x] A cortina sobe em vez de a camada ser removida: clip parcialmente aberto no
      meio do beat com a camada ainda montada
- [x] O brilho viaja na borda que o clip está abrindo (12px, amostrado por quadro)
- [x] O nome cabe em 320px de largura
- [x] Movimento reduzido, revisitante e rota sem intro continuam sem tocar nada
- [x] Testes: 12 de domínio (`matrix-name.test.ts`), 17 de timeline, 18 e2e

**Bugs encontrados e corrigidos** (nenhum visível sem olhar):
- O jitter do stagger era **maior** que o stagger (160ms sobre 42ms), então uma
  coluna podia partir antes da sua vizinha à esquerda e o nome se formava fora de
  ordem — exatamente o que o stagger existe para evitar. O jitter ficou abaixo do
  stagger; a variedade orgânica vem do spread de 520ms nas durações, que não mexe
  na ordem de partida
- As letras ficavam a **87% da altura da tela** (y=788 de 900). A trilha de 9 linhas
  estava no fluxo, então cada tira tinha 10 linhas e o contêiner centralizava uma
  caixa de 880px — as letras são a *última* linha de cada tira. Medido no navegador.
  A trilha saiu do fluxo (`position: absolute`), cada célula ficou com uma linha, e
  a linha de letras passou a ser a linha que a tela centraliza
- O brilho da borda estava **espelhado**: `top: 0% → 100%` enquanto o clip guarda a
  parte de cima. Ficava na metade errada da tela durante o beat inteiro e só cruzava
  a borda real no ponto médio exato — o único instante em que uma animação
  espelhada parece correta. No meio de um beat: clip em 643px, brilho em 257px
- `.msd-portrait-video` estava em `intro.css`; ver TASK-055

**Notas abertas**:
- `FONT` do nome: 17 colunas de `1ch` + tracking precisam caber. A 9vw o nome dava
  393px num viewport de 390px. A 8.2vw dá 359px, com folga em 320px
- O efeito é bom com `JetBrains Mono`; sem a fonte o navegador substitui e a
  métrica de `1ch` por coluna muda. A intro não faz fallback explícito — o resto do
  site também não

---

## Backlog de Evolução (Pós-MVP)

A coluna **Status** foi reconciliada com o código em 2026-10-02. Quatro itens
deste backlog já estavam entregues e não sabíamos — o backlog tinha sido escrito
antes de existirem.

| ID | Descrição | Épico | Prioridade | Status | Dependências |
|----|-----------|-------|------------|--------|--------------|
| FEAT-01 | Painel autenticado de rascunhos e publicação | EPIC-04 | Média | 🟢 Feito | TASK-041, TASK-042 |
| FEAT-02 | Case studies e portfólio de projetos | EPIC-01 | Baixa | 🟡 Parcial | TASK-001, TASK-002 |
| FEAT-03 | Analytics com privacidade | - | Baixa | 🟢 Feito | - |
| FEAT-04 | Geração alternativa com Playwright para PDF web | EPIC-03 | Média | 🔴 Pendente | TASK-030 |
| FEAT-05 | Implementação automática de novas habilidades | EPIC-01 | Baixa | 🔴 Pendente | TASK-001 |
| FEAT-06 | Interação nas experiências (mídia, desafios) | EPIC-01 | Baixa | 🔴 Pendente | TASK-002 |
| FEAT-07 | Anos de experiência por habilidade (cálculo auto) | EPIC-01 | Média | 🔴 Pendente | TASK-001 |
| FEAT-08 | Lint automático e regras para Markdown | - | Média | ⚪ Superado | TASK-011 |
| FEAT-09 | Adicionar novo idioma (ex.: es-ES) seguindo o contrato de locale | EPIC-02 | Baixa | 🔴 Pendente | TASK-014, TASK-015 |
| FEAT-10 | Verificação de texto fixado residual em componentes (regra de lint) | EPIC-02 | Média | 🔴 Pendente | TASK-015 |
| FEAT-11 | Fotografia no hero (`hero.portrait.src` para um arquivo em `public/`) | EPIC-05 | Baixa | 🟢 Feito | TASK-050 |
| FEAT-12 | Rascunhos de artigo (`status: 'draft'`) com service-role e preview por token | EPIC-05 | Média | 🟡 Parcial | TASK-053 |
| FEAT-13 | Índice de sumário automático a partir dos blocos `heading` do artigo | EPIC-05 | Baixa | 🔴 Pendente | TASK-053 |
| FEAT-14 | Sincronização do blog com o repositório de conteúdo versionado (CLI) | EPIC-05 | Média | 🟢 Feito | TASK-053 |
| FEAT-15 | RSS/Atom do blog a partir da tabela `blog_articles` | EPIC-05 | Média | 🔴 Pendente | TASK-053 |

**O que a coluna revelou**

- **FEAT-01 está entregue.** `/admin` com autenticação por magic-link, use case
  `ManagePosts`, editor com rascunho e publicação, migration `blog_post_cms`, e
  cobertura e2e (`admin.spec.ts`, `admin-blog-cms.spec.ts`,
  `admin-root-layout.spec.ts`). O que falta é só o *preview por token* de FEAT-12.
- **FEAT-03 está entregue.** `click_aggregates.sql`, `/api/analytics/click`,
  `ClickAnalytics` e `track-visitors` — agregado, sem cookie, sem identificador
  entre sites, com aviso de privacidade.
- **FEAT-14 está entregue.** `scripts/generate-blog-seed.ts` gera o seed a partir
  do catálogo versionado, e `npm run generate:blog-seed` está no `package.json`.
- **FEAT-02 é parcial.** Os 24 estudos de caso renderizam no currículo e alimentam
  o corpus do copilot. O que falta é um *portfólio* de projetos próprio.
- **FEAT-12 é parcial.** Rascunho e publicação existem no painel; o preview por
  token para rascunho não.
- **FEAT-08 está superado** junto com TASK-011: não há parser de Markdown, então
  não há lint de Markdown para escrever.

---

## Matriz de Priorização

> **Não use esta matriz para decidir o que fazer.** Ela foi escrita para os
> Épicos 01–03 e nunca estendida para o ÉPICO 05, e a coluna "Ordem Sugerida" se
> contradiz (numera TASK-050 como 1 e TASK-001 como 1). O **Status** no cabeçalho
> de cada tarefa é a fonteautoritativa; esta matriz serve apenas como registro do
> que foi planejado originalmente.

| Tarefa | Prioridade | Impacto | Esforço | Risco | Ordem Sugerida |
|--------|------------|---------|---------|-------|----------------|
| TASK-001 | Crítica | Alto | Baixo | Baixo | 1 |
| TASK-002 | Crítica | Alto | Médio | Baixo | 2 |
| TASK-003 | Crítica | Alto | Médio | Baixo | 3 |
| TASK-010 | Alta | Alto | Baixo | Baixo | 4 |
| TASK-011 | Alta | Alto | Médio | Médio | 5 |
| TASK-030 | Alta | Alto | Baixo | Baixo | 6 |
| TASK-031 | Alta | Alto | Médio | Médio | 7 |
| TASK-032 | Alta | Alto | Médio | Alto | 8 |
| TASK-004 | Alta | Médio | Baixo | Baixo | 9 |
| TASK-012 | Média | Médio | Baixo | Baixo | 10 |
| TASK-050 | Crítica | Alto | Médio | Baixo | 1 |
| TASK-051 | Crítica | Alto | Alto | Médio | 2 |
| TASK-053 | Alta | Alto | Alto | Médio | 3 |
| TASK-052 | Alta | Alto | Baixo | Baixo | 4 |
| TASK-054 | Média | Médio | Baixo | Baixo | 5 |

## Tarefas fora do catálogo

Duas funcionalidades foram entregues sem nunca terem tido uma entrada aqui. Elas
têm código, migrations, testes e documentação — apenas não têm número.

| Funcionalidade | Onde está | Observação |
|---|---|---|
| Chat do visitante e console do dono | `src/application/chat/`, `src/components/chat/`, `src/components/admin/chat-console.tsx`, migration `presence_and_chat` | Inclui presença, magic-link e limite de taxa |
| Copilot de currículo | `src/domain/ai/`, `src/application/ai/`, `src/components/ai/`, `/api/copilot` | Recuperação lexical sobre o corpus do currículo, com citações ([ADR-012](../adr/ADR-012-client-side-retrieval-for-the-resume-copilot.md)) |
| Sistema de temas | `src/domain/theme/`, `src/components/theme/`, migrations `theme_feedback` | Múltiplos temas, aplicado antes da primeira pintura |
| Trilha sonora sintetizada | `src/domain/audio/`, `src/components/`, [ADR-013](../adr/ADR-013-synthesised-soundtrack.md) | Web Audio, sem arquivo; troca por gravação é uma variável de ambiente |
| Admin de posts e temas | `/admin`, `/api/admin/posts`, `/api/feedback/theme` | Ver FEAT-01 |

A ausência de entrada no catálogo significou que nenhuma delas passou por
revisão de arquitetura ou por um critério de conclusão declarado. Isso é um
problema de processo, e a correção é criar as entradas — não reescrever o
histórico.

---

## Guia para Agentes de IA

### Ao Pegar uma Tarefa
1. Leia a descrição e critérios de conclusão completamente
2. Consulte documentos vinculados (contratos, arquitetura, instruções)
3. Verifique dependências de outras tarefas
4. Estime tempo realista baseado na complexidade

### Ao Implementar
1. Siga padrões estabelecidos nas instruções da camada
2. Escreva testes antes ou durante implementação (TDD recomendado)
3. Mantenha commits atômicos e descritivos
4. Documente decisões técnicas no código ou docs

### Ao Concluir
1. Execute todos os testes localmente
2. Valide critérios de conclusão um a um
3. Atualize status neste documento
4. Solicite review de agente especializado (architecture-reviewer, resume-reviewer)

### Ao Encontrar Bloqueios
1. Documente o bloqueio claramente
2. Identifique dependências faltantes
3. Sugira alternativas ou workarounds
4. Escalone para revisão humana se necessário

---

## Histórico de Mudanças

| Data | Tarefa | Mudança | Autor |
|------|--------|---------|-------|
| 2026-10-02 | TASK-055 | Retrato em vídeo no hero, com codificação 89% menor, hold pré-paint e glitch de emenda. Reconciliação do catálogo com o código: 5 tarefas marcadas como não iniciadas estavam entregues, 4 itens de backlog idem, e a matriz de priorização foi marcada como não autoritativa. Números e afirmações obsoletas corrigidos (o retrato saiu do intro e do currículo; o loop é boomerang de 9s, não corte de 6s) | opencode |
| 2026-10-02 | TASK-056 | Intro sem retrato: glifos Matrix descem até resolverem `MARCELINO SANDRONI` e a cortina sobe revelando o site. Pouso do retrato, porta e revelo monocromático removidos | opencode |
| 2026-09-28 | TASK-050..054 | ÉPICO 05: home executiva com design system tokenizado, currículo movido para `/[locale]/resume`, blog persistido em `blog_articles` com fallback versionado, e gate de cobertura corrigido (a `main` estava em 56.61%) | opencode |
| 2026-09-28 | TASK-019 | Títulos de seção do PDF movidos dos literais do renderer para os catálogos | opencode |
| 2026-09-28 | TASK-012, TASK-018 | Versão EN-US reescrita como tradução completa do PT-BR (fonte da verdade), com paridade de estrutura e fatos verificada em CI | opencode |
| 2026-09-28 | TASK-010, TASK-014..017 | Roteamento i18n, catálogos tipados, SEO por idioma e Server Components. EN-US passou a ser o locale padrão. Ver [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md) | opencode |
| 2025-01-15 | Todas | Criação inicial do catálogo | System |
