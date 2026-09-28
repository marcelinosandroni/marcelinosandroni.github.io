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
**Status**: 🟢 Concluída (Parcialmente - tipos definidos)  
**Estimativa**: 2h  
**Realizado**: 1h  

**Descrição**: Implementar entidades de domínio representando o currículo com tipagem forte e invariantes.

**O Que Foi Feito**:
- ✅ Interface `ResumeContent` definida em `src/domain/resume/types.ts`
- ✅ Interfaces auxiliares: `ResumeExperience`, `ResumeEducation`, `ResumeSkillGroup`, `CaseStudy`
- ✅ Tipo `Locale` definido como `"pt-BR" | "en-US"`
- ✅ Dados de exemplo implementados em `src/infrastructure/content/resume-data.ts`
- ⚠️ Value Objects ainda não implementados como classes
- ⚠️ Validações de invariantes pendentes
- ⚠️ Testes unitários específicos de domínio pendentes

**Critérios de Conclusão**:
- [x] Interface `Resume` definida em `src/domain/entities/resume.ts`
- [x] Interfaces auxiliares: `Experience`, `Education`, `Skill`, `LanguageProficiency`
- [ ] Value Objects: `LanguageCode`, `MonthYear`, `ContactInfo`
- [ ] Validações de invariantes no construtor/factory
- [x] Zero dependências externas
- [ ] Testes unitários com 90%+ cobertura

**Arquivos Existentes**:
- `src/domain/resume/types.ts` ✅
- `src/domain/publication/resume-version.ts` ✅ (entidade separada)
- `src/domain/errors/index.ts` ✅ (erros de domínio)
- `src/infrastructure/content/resume-data.ts` ✅ (dados de exemplo)

**Próximos Passos**:
1. Criar Value Objects como classes imutáveis
2. Implementar factories com validações
3. Adicionar testes unitários específicos

**Instruções para Agente**:
1. Consulte `specs/contracts/contracts-spec.md` para schemas TypeScript
2. Siga `.github/instructions/domain.instructions.md` para regras de domínio
3. Mantenha entidades imutáveis
4. Defina factories para criação complexa

---

### TASK-002: Implementar componente de visualização
**US Relacionada**: US-01  
**Prioridade**: Crítica  
**Status**: 🔴 Não iniciada  
**Estimativa**: 4h  

**Descrição**: Criar componentes React para exibir o currículo de forma organizada e responsiva.

**Critérios de Conclusão**:
- [ ] Componente `ResumePage` como entry point
- [ ] Componentes separados: `PersonalInfo`, `Summary`, `ExperienceList`, `EducationList`, `SkillsSection`, `LanguagesSection`
- [ ] Layout responsivo (mobile-first)
- [ ] SEO com metadata dinâmica (title, description, Open Graph)
- [ ] Acessibilidade WCAG 2.1 AA (semântica, ARIA, contraste)
- [ ] Tipagem baseada nas entidades de domínio

**Arquivos Esperados**:
- `src/app/[lang]/page.tsx`
- `src/components/resume/personal-info.tsx`
- `src/components/resume/summary.tsx`
- `src/components/resume/experience-list.tsx`
- `src/components/resume/skills-section.tsx`
- `src/components/resume/languages-section.tsx`

**Instruções para Agente**:
1. Consulte `specs/architecture/architecture-spec.md` para fluxos
2. Siga `.github/instructions/typescript-react.instructions.md`
3. Use dados tipados do domínio
4. Separe lógica de apresentação de lógica de negócio

---

### TASK-003: Adicionar testes unitários (90%+ cobertura)
**US Relacionada**: US-01  
**Prioridade**: Crítica  
**Status**: 🟡 Em progresso (testes de aplicação e infra existentes)  
**Estimativa**: 3h  
**Realizado**: 2h  

**Descrição**: Implementar bateria de testes unitários para entidades e componentes.

**O Que Foi Feito**:
- ✅ 13 arquivos de teste existentes
- ✅ Testes de aplicação: `build-resume-document`, `get-published-resume`, `list-versions`, `publish-pdf-resume`, `store-artifact`
- ✅ Testes de infraestrutura: `latex-resume-renderer`, `pdfkit-pdf-compiler`
- ✅ Testes de integração: `pdf-generation`, `pdf-cache`, `bilingual-pdf`
- ✅ Teste de domínio: `resume-version.test.ts`
- ⚠️ Cobertura de domínio ainda incompleta
- ⚠️ Testes de componentes UI pendentes

**Critérios de Conclusão**:
- [ ] Testes para todas as entidades de domínio
- [ ] Testes para value objects
- [ ] Testes para factories e validadores
- [x] Cobertura mínima 90% (parcial - aplicação/infra ok)
- [x] Testes executam em < 30s
- [ ] CI valida cobertura

**Arquivos Existentes**:
- `tests/unit/domain/resume-version.test.ts` ✅
- `tests/unit/application/*.test.ts` ✅ (5 arquivos)
- `tests/unit/infrastructure/*.test.ts` ✅ (2 arquivos)
- `tests/unit/integration/*.test.ts` ✅ (3 arquivos)
- `tests/unit/presentation/content-locale.test.ts` ✅
- `tests/e2e/pdf-download.spec.ts` ✅

**Próximos Passos**:
1. Completar testes de entidades de domínio
2. Adicionar testes de componentes React
3. Configurar validação de cobertura no CI

**Instruções para Agente**:
1. Consulte `.github/instructions/tests.instructions.md`
2. Use Vitest como runner
3. Mock interfaces de infraestrutura
4. Valide invariantes e casos de erro

---

### TASK-004: Validar acessibilidade
**US Relacionada**: US-01  
**Prioridade**: Alta  
**Status**: 🔴 Não iniciada  
**Estimativa**: 2h  

**Descrição**: Auditar e corrigir questões de acessibilidade na interface.

**Critérios de Conclusão**:
- [ ] Navegação completa por teclado
- [ ] Focus indicators visíveis
- [ ] Contraste de cores ≥ 4.5:1 (texto normal)
- [ ] Alt text em imagens (se houver)
- [ ] ARIA labels onde necessário
- [ ] Validação com axe-core ou similar
- [ ] `prefers-reduced-motion` respeitado

**Arquivos Esperados**:
- Relatório de auditoria em `docs/accessibility-audit.md`
- Correções aplicadas nos componentes

**Instruções para Agente**:
1. Execute `npm run test:a11y` (se existir) ou use axe DevTools
2. Corrija violações por severidade
3. Documente decisões de acessibilidade
4. Valide com leitores de tela (VoiceOver, NVDA)

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
**Status**: 🔴 Não iniciada  
**Estimativa**: 3h  

**Descrição**: Criar parser que converte Markdown → Entidades de Domínio com validação de schema.

**Critérios de Conclusão**:
- [ ] Parser lê frontmatter (id, language, version, lastUpdated)
- [ ] Extrai seções: PersonalInfo, Summary, Experiences, Education, Skills, Languages
- [ ] Valida schema obrigatório
- [ ] Lança erros claros para MD inválido
- [ ] Preserva fatos sem invenções
- [ ] Testes com fixtures de MD válido e inválido

**Arquivos Esperados**:
- `src/infrastructure/adapters/markdown-parser.ts`
- `src/infrastructure/adapters/git-files-adapter.ts`
- `tests/unit/infrastructure/parsers/markdown-parser.test.ts`

**Instruções para Agente**:
1. Consulte `specs/contracts/contracts-spec.md` para schema Markdown
2. Use biblioteca `gray-matter` para frontmatter
3. Implemente validações rigorosas
4. Trate encoding UTF-8 corretamente

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
- [ ] Script CLI para validação manual

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

### TASK-013: Adicionar testes de integração
**US Relacionada**: US-02  
**Prioridade**: Alta  
**Status**: 🔴 Não iniciada  
**Estimativa**: 2h  

**Descrição**: Testar fluxo completo de i18n: rota → parser → entidade → UI.

**Critérios de Conclusão**:
- [ ] Teste de fluxo PT-BR completo
- [ ] Teste de fluxo EN-US completo
- [ ] Valida metadata por idioma
- [ ] Testa fallback para idioma inválido
- [ ] Executa em CI com Docker

**Arquivos Esperados**:
- `tests/integration/i18n/resume-i18n.test.ts`

**Instruções para Agente**:
1. Use banco de dados em memória ou mocks
2. Isole testes de i18n de outros testes
3. Valide URLs geradas
4. Teste cenários de erro

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
- [ ] Integração com GitHub Actions
- [x] Cache de camadas Docker

**Arquivos Existentes**:
- `src/infrastructure/pdf/docker-pdf-compiler.ts` ✅
- `scripts/compile-pdf.ts` ✅ (CLI completo)
- `src/infrastructure/pdf/pdfkit-pdf-compiler.ts` ✅ (fallback)
- `tests/unit/infrastructure/pdfkit-pdf-compiler.test.ts` ✅

**Próximos Passos**:
1. Criar workflow GitHub Actions para CI/CD
2. Otimizar imagem Docker (se necessário)
3. Documentar processo de build da imagem

**Instruções para Agente**:
1. Crie `.github/workflows/compile-pdf.yml`
2. Adicione step de build da imagem Docker
3. Configure cache de camadas no GH Actions
4. Teste com push e PR

---


### TASK-033: Implementar endpoint de download
**US Relacionada**: US-04  
**Prioridade**: Alta  
**Status**: 🔴 Não iniciada  
**Estimativa**: 2h  

**Descrição**: Criar API endpoint para download de PDFs versionados.

**Critérios de Conclusão**:
- [ ] GET `/api/versions/:versionId/pdf` funcional
- [ ] Headers corretos: Content-Type, Content-Disposition
- [ ] Tratamento de erro para versão/PDF não encontrado
- [ ] Rate limiting básico
- [ ] Logging de downloads
- [ ] Testes de integração

**Arquivos Esperados**:
- `src/app/api/versions/[versionId]/pdf/route.ts`
- `src/application/use-cases/download-pdf.ts`

**Instruções para Agente**:
1. Consulte `specs/contracts/contracts-spec.md` para contrato de API
2. Use StorageAdapter para buscar PDF
3. Retorne stream para arquivos grandes
4. Implemente cache headers apropriados

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
**Status**: 🔴 Não iniciada  
**Estimativa**: 2h  

**Descrição**: Definir entidade de domínio para versões publicadas.

**Critérios de Conclusão**:
- [ ] Interface `PublishedVersion` com id, versionNumber, publishedAt, status
- [ ] Validação de versionamento semântico
- [ ] Invariante: versão publicada é imutável
- [ ] Relacionamento com Resume e PdfArtifact
- [ ] Testes unitários

**Arquivos Esperados**:
- `src/domain/entities/version.ts`
- `tests/unit/domain/entities/version.test.ts`

**Instruções para Agente**:
1. Siga princípios de modelagem de domínio
2. Garanta imutabilidade após publicação
3. Use semver para versionamento
4. Preveja estados: draft, published, archived

---

### TASK-041: Implementar migração Supabase
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🔴 Não iniciada  
**Estimativa**: 2h  

**Descrição**: Criar migrations SQL para tabelas de versões e artefatos PDF.

**Critérios de Conclusão**:
- [ ] Tabela `published_versions` criada
- [ ] Tabela `pdf_artifacts` criada
- [ ] Índices configurados
- [ ] RLS policies implementadas
- [ ] Seed data para desenvolvimento
- [ ] Migration reversível (down)

**Arquivos Esperados**:
- `supabase/migrations/YYYYMMDDHHMMSS_create_published_versions.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_pdf_artifacts.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_enable_rls.sql`

**Instruções para Agente**:
1. Consulte `specs/contracts/contracts-spec.md` para schema DB
2. Use convenção de naming do Supabase
3. Teste migrations localmente com `supabase start`
4. Documente rollback procedures

---

### TASK-042: Criar adaptador de persistência
**US Relacionada**: US-05  
**Prioridade**: Média  
**Status**: 🔴 Não iniciada  
**Estimativa**: 3h  

**Descrição**: Implementar SupabaseAdapter para operações CRUD de versões.

**Critérios de Conclusão**:
- [ ] Implementa interface `ResumeRepository`
- [ ] Métodos: getByLanguage, getVersion, listVersions
- [ ] Tratamento de erros do Supabase
- [ ] Tipagem segura com generated types
- [ ] Testes com banco emulado/mock
- [ ] Conexão via environment variables

**Arquivos Esperados**:
- `src/infrastructure/adapters/supabase-adapter.ts`
- `src/infrastructure/config/supabase-config.ts`
- `tests/unit/infrastructure/adapters/supabase-adapter.test.ts`

**Instruções para Agente**:
1. Use cliente oficial `@supabase/supabase-js`
2. Gere types com `supabase gen types`
3. Respeite contratos de repository
4. Implemente retry para falhas transitórias

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

## Backlog de Evolução (Pós-MVP)

| ID | Descrição | Épico | Prioridade | Dependências |
|----|-----------|-------|------------|--------------|
| FEAT-01 | Painel autenticado de rascunhos e publicação | EPIC-04 | Média | TASK-041, TASK-042 |
| FEAT-02 | Case studies e portfólio de projetos | EPIC-01 | Baixa | TASK-001, TASK-002 |
| FEAT-03 | Analytics com privacidade | - | Baixa | - |
| FEAT-04 | Geração alternativa com Playwright para PDF web | EPIC-03 | Média | TASK-030 |
| FEAT-05 | Implementação automática de novas habilidades | EPIC-01 | Baixa | TASK-001 |
| FEAT-06 | Interação nas experiências (mídia, desafios) | EPIC-01 | Baixa | TASK-002 |
| FEAT-07 | Anos de experiência por habilidade (cálculo auto) | EPIC-01 | Média | TASK-001 |
| FEAT-08 | Lint automático e regras para Markdown | - | Média | TASK-011 |
| FEAT-09 | Adicionar novo idioma (ex.: es-ES) seguindo o contrato de locale | EPIC-02 | Baixa | TASK-014, TASK-015 |
| FEAT-10 | Verificação de texto fixado residual em componentes (regra de lint) | EPIC-02 | Média | TASK-015 |

---

## Matriz de Priorização

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
| 2026-09-28 | TASK-012, TASK-018 | Versão EN-US reescrita como tradução completa do PT-BR (fonte da verdade), com paridade de estrutura e fatos verificada em CI | opencode |
| 2026-09-28 | TASK-010, TASK-014..017 | Roteamento i18n, catálogos tipados, SEO por idioma e Server Components. EN-US passou a ser o locale padrão. Ver [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md) | opencode |
| 2025-01-15 | Todas | Criação inicial do catálogo | System |
