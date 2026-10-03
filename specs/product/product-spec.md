# Especificação do Produto (Product Spec)

## Visão Geral
Este documento consolida a visão, requisitos e backlog do produto em um formato estruturado para execução por agentes de IA.

## Documentos Vinculados
- **Visão**: [vision.md](../../docs/product/vision.md)
- **Requisitos**: [requirements.md](../../docs/product/requirements.md)
- **Backlog**: [backlog.md](../../docs/product/backlog.md)
- **Roadmap**: [roadmap.md](../../docs/product/roadmap.md)

---

## Épicos

### EPIC-01: Visualização do Currículo
**Descrição**: Permitir que visitantes visualizem o currículo de forma organizada e responsiva.
**User Stories**: US-01, US-03
**Prioridade**: Crítica
**Status**: 🟢 Concluída — exceto auditoria de acessibilidade (TASK-004)

### EPIC-02: Internacionalização
**Descrição**: Suportar múltiplos idiomas (EN-US e PT-BR) com conteúdo sincronizado.
**User Stories**: US-02
**Prioridade**: Alta
**Status**: 🟢 Concluída — TASK-011 (parser de Markdown) está superada; a paridade é validada sobre os dados tipados, não sobre o arquivo

### EPIC-03: Geração e Download de PDF
**Descrição**: Gerar e disponibilizar PDFs determinísticos e versionados.
**User Stories**: US-04
**Prioridade**: Alta
**Status**: 🟢 Concluída — exceto regressão visual (TASK-034) e rate limiting (TASK-033)

### EPIC-04: Versionamento e Publicação
**Descrição**: Gerenciar versões publicadas do currículo com metadados e imutabilidade.
**User Stories**: US-05
**Prioridade**: Média
**Status**: 🟡 Parcial — modelo, migration e adaptador existem; falta histórico navegável (TASK-043)

---

## User Stories Detalhadas

### US-01: Visualizar currículo
**Épico**: EPIC-01  
**Como**: Recrutador  
**Quero**: Compreender o perfil, experiência, habilidades e formação em uma única página  
**Para**: Avaliar aderência rapidamente  

**Critérios de Aceite**:
- [x] Conteúdo organizado por seções (Experiência, Habilidades, Formação, Idiomas)
- [x] Layout responsivo (mobile, tablet, desktop)
- [x] Contatos acessíveis no topo
- [x] Sem informação inventada (conteúdo factual)
- [~] Carregamento em < 2 segundos — **não medido**. O gate de cobertura e a suíte
      e2e passam, mas não existe medição de performance de carga

**Especificações Técnicas**:
- Componente React com dados tipados
- SEO com metadata dinâmica
- Acessibilidade WCAG 2.1 AA — **parcial**: semântica, foco e `prefers-reduced-motion`
  verificados em e2e; contraste nunca medido, sem axe-core

**Tarefas**:
- [ ] TASK-001: Criar modelo de domínio para Currículo — 🟡 parcial (contrato tipado
      e `ResumeVersion` com invariantes; value objects não implementados por decisão)
- [x] TASK-002: Implementar componente de visualização
- [x] TASK-003: Adicionar testes unitários (90%+ cobertura) — 96,46%; lacuna: o CI
      roda `test:unit`, não `test:unit:coverage`
- [ ] TASK-004: Validar acessibilidade — 🟡 parcial (contraste e axe-core pendentes)

---

### US-02: Alternar idioma
**Épico**: EPIC-02  
**Como**: Visitante internacional  
**Quero**: Alternar entre EN-US e PT-BR  
**Para**: Ler o currículo no meu idioma  

**Critérios de Aceite**:
- [x] Mesma estrutura e fatos equivalentes
- [x] URL compartilhável por idioma (`/en-us`, `/pt-br`)
- [x] Metadata correta por idioma (title, description, Open Graph, `hreflang`)
- [x] Sincronização automática entre idiomas
- [x] EN-US é o idioma padrão; PT-BR é a segunda opção
- [x] Visitante sem URL de idioma é redirecionado conforme `Accept-Language`
- [x] Nenhum texto da interface fica fixado no código (ver [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md))
- [x] Nenhum texto fixado em outro idioma: catálogos, rótulos acessíveis, âncoras e metadados seguem o idioma selecionado

**Especificações Técnicas**:
- Roteamento Next.js App Router com segmento dinâmico `[locale]`
- Contrato de locale em domínio puro (`src/domain/i18n`)
- Catálogos de mensagem tipados por locale (`src/i18n/dictionaries`)
- `proxy.ts` para negociação e canonicalização de URL
- Fonte canônica: arquivos Markdown versionados
- Validação de consistência entre idiomas

**Tarefas**:
- [x] TASK-010: Configurar roteamento i18n
- [x] TASK-014: Criar contrato de locale em domínio
- [x] TASK-015: Criar catálogos de mensagem tipados
- [x] TASK-016: Implementar `proxy.ts` e SEO por idioma
- [x] TASK-017: Tornar a apresentação Server Component
- [ ] TASK-011: Implementar parser de Markdown tipado — ⚪ **superada**: o conteúdo
      em runtime é TypeScript tipado, e a paridade é validada sobre ele
- [ ] TASK-012: Criar validador de sincronização PT-BR/EN-US — 🟡 o validador
      automatizado está no CI; falta só o CLI manual
- [x] TASK-013: Adicionar testes de integração — coberta em e2e, não em `tests/integration`

---

### US-03: Explorar trajetória
**Épico**: EPIC-01  
**Como**: Visitante  
**Quero**: Explorar linha do tempo profissional e habilidades por categoria  
**Para**: Entender profundidade e evolução  

**Critérios de Aceite**:
- [x] Navegação por teclado completa
- [x] Fallback sem animação (reduzido movimento)
- [x] Categorias legíveis em mobile
- [x] Timeline cronológica ordenada

**Especificações Técnicas**:
- Componente de timeline com progressão visual — `src/components/home/track-record.tsx`
- Agrupamento de habilidades por categoria — `src/components/resume/resume-document.tsx`
- Animações CSS com `prefers-reduced-motion`

**Tarefas**:
- [ ] TASK-020: Modelar Experiência e Habilidade no domínio — ⚪ **superada**: o
      contrato está em `src/domain/resume/types.ts`; o número não foi reatribuído
- [ ] TASK-021: Implementar componente de timeline — ✅ entregue em `track-record.tsx`
- [ ] TASK-022: Implementar componente de habilidades — ✅ entregue em `resume-document.tsx`
- [ ] TASK-023: Adicionar testes E2E com Playwright — ✅ entregue; a suíte e2e tem
      295 testes em 22 arquivos, incluindo `mobile.spec.ts`

**Nota**: TASK-020..023 nunca foram escritas no catálogo, mas o comportamento
delas está entregue e coberto. Elas precisam ser criadas ou removidas para que a
rastreabilidade volte a funcionar.

---

### US-04: Baixar currículo
**Épico**: EPIC-03  
**Como**: Recrutador  
**Quero**: Baixar o PDF da versão selecionada  
**Para**: Arquivar ou compartilhar  

**Critérios de Aceite**:
- [x] Artefato corresponde à versão exibida
- [x] Download funciona em desktop e mobile
- [x] Falhas mostram estado compreensível
- [x] PDF determinístico e reprodutível

**Especificações Técnicas**:
- Geração LaTeX em Docker, com fallback para PDFKit
- Template LaTeX versionado junto com o contrato
- Storage de artefatos no Supabase Storage
- Endpoint de download seguro, gateado por feature flag

**Tarefas**:
- [x] TASK-030: Definir contrato de conteúdo para PDF
- [x] TASK-031: Implementar template LaTeX
- [x] TASK-032: Configurar pipeline Docker de compilação — a integração com GitHub
      Actions **existe** (`compile-pdf.yml`); estava marcada como pendente por engano
- [ ] TASK-033: Implementar endpoint de download — 🟡 a rota existe e é testada em
      e2e; falta rate limiting e logging
- [ ] TASK-034: Adicionar testes de regressão visual — 🔴 `tests/visual/` não existe

---

### US-05: Selecionar versão
**Épico**: EPIC-04  
**Como**: Visitante  
**Quero**: Consultar uma versão publicada  
**Para**: Conferir quando o conteúdo foi atualizado  

**Critérios de Aceite**:
- [x] Versão tem identificador único, data e idioma
- [ ] Versão inexistente retorna estado de erro claro — **não há como pedir uma
      versão específica**: o adaptador só expõe `findLatest`
- [x] Conteúdo permanece imutável após publicação
- [ ] Histórico de versões acessível — **não existe UI nem rota de histórico**

**Esta é a história menos satisfeita do conjunto, e vale dizer por quê**: o modelo
de domínio, a migration com RLS e o adaptador estão prontos, mas o produto nunca
ganhou a tela. Como a versão vem de `package.json` e o Git é a fonte canônica,
há uma versão publicada por deploy e o site sempre mostra a atual — o que torna
"histórico de versões" uma pergunta que o site ainda não faz.

**Especificações Técnicas**:
- Modelo de versão com SemVer validado no factory — `ResumeVersion`
- RLS no Supabase para leitura pública de versões publicadas
- Cache estratégico na Vercel

**Tarefas**:
- [ ] TASK-040: Modelar entidade Versão — 🟢 entregue como `ResumeVersion`, com
      SemVer e imutabilidade testados
- [ ] TASK-041: Implementar migração Supabase — 🟡 `resume_versions` com índice e
      RLS existe; `pdf_artifacts` está especificada e nunca criada
- [ ] TASK-042: Criar adaptador de persistência — 🟡 `findLatest` existe;
      `getVersion` e `listVersions` não
- [ ] TASK-043: Implementar UI de seleção de versões — 🔴 não existe
- [ ] TASK-044: Adicionar testes de integração — 🔴 RLS nunca exercitado

---

## Backlog de Evolução (Pós-MVP)

Status reconciliado com o código em 2026-10-02. A tabela completa, com dependências
e o que falta em cada item parcial, está em
[`tasks-catalog.md`](../tasks/tasks-catalog.md).

| ID | Descrição | Prioridade | Épico Relacionado | Status |
|----|-----------|------------|-------------------|--------|
| FEAT-01 | Painel autenticado de rascunhos e publicação | Média | EPIC-04 | 🟢 Feito |
| FEAT-02 | Case studies e portfólio de projetos | Baixa | EPIC-01 | 🟡 Parcial |
| FEAT-03 | Analytics com privacidade | Baixa | - | 🟢 Feito |
| FEAT-04 | Geração alternativa com Playwright para PDF web | Média | EPIC-03 | 🔴 Pendente |
| FEAT-05 | Implementação automática de novas habilidades | Baixa | EPIC-01 | 🔴 Pendente |
| FEAT-06 | Interação nas experiências (desafios, entregas, mídia) | Baixa | EPIC-01 | 🔴 Pendente |
| FEAT-07 | Anos de experiência por habilidade (cálculo automático) | Média | EPIC-01 | 🔴 Pendente |
| FEAT-08 | Lint automático e regras para Markdown | Média | - | ⚪ Superado |

---

## Matriz de Rastreabilidade

| User Story | Requisitos Funcionais | Requisitos Não-Funcionais |
|------------|----------------------|---------------------------|
| US-01 | RF-01, RF-02 | RNF-01, RNF-04, RNF-06 |
| US-02 | RF-01, RF-05 | RNF-01, RNF-05 |
| US-03 | RF-02, RF-03 | RNF-01, RNF-04, RNF-06 |
| US-04 | RF-04 | RNF-01, RNF-03, RNF-07, RNF-08 |
| US-05 | RF-03, RF-05 | RNF-01, RNF-07, RNF-08 |

**Legenda**:
- RF-01: Exibir currículo em PT-BR e EN-US
- RF-02: Navegar por experiência, habilidades, formação e idiomas
- RF-03: Selecionar uma versão publicada
- RF-04: Baixar o PDF correspondente
- RF-05: Compartilhar URL estável por idioma e versão
- RNF-01: TypeScript estrito e arquitetura por camadas
- RNF-03: E2E com Playwright em Docker
- RNF-04: Acessibilidade WCAG
- RNF-05: SEO com metadata, sitemap, Open Graph e JSON-LD
- RNF-06: Core Web Vitals adequado
- RNF-07: RLS e nenhum segredo no cliente
- RNF-08: Deploy reprodutível na Vercel e geração LaTeX em CI
