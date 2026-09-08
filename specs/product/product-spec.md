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
**Status**: Em progresso

### EPIC-02: Internacionalização
**Descrição**: Suportar múltiplos idiomas (PT-BR e EN-US) com conteúdo sincronizado.
**User Stories**: US-02
**Prioridade**: Alta
**Status**: Planejado

### EPIC-03: Geração e Download de PDF
**Descrição**: Gerar e disponibilizar PDFs determinísticos e versionados.
**User Stories**: US-04
**Prioridade**: Alta
**Status**: Planejado

### EPIC-04: Versionamento e Publicação
**Descrição**: Gerenciar versões publicadas do currículo com metadados e imutabilidade.
**User Stories**: US-05
**Prioridade**: Média
**Status**: Planejado

---

## User Stories Detalhadas

### US-01: Visualizar currículo
**Épico**: EPIC-01  
**Como**: Recrutador  
**Quero**: Compreender o perfil, experiência, habilidades e formação em uma única página  
**Para**: Avaliar aderência rapidamente  

**Critérios de Aceite**:
- [ ] Conteúdo organizado por seções (Experiência, Habilidades, Formação, Idiomas)
- [ ] Layout responsivo (mobile, tablet, desktop)
- [ ] Contatos acessíveis no topo
- [ ] Sem informação inventada (conteúdo factual)
- [ ] Carregamento em < 2 segundos

**Especificações Técnicas**:
- Componente React com dados tipados
- SEO com metadata dinâmica
- Acessibilidade WCAG 2.1 AA

**Tarefas**:
- [ ] TASK-001: Criar modelo de domínio para Currículo
- [ ] TASK-002: Implementar componente de visualização
- [ ] TASK-003: Adicionar testes unitários (90%+ cobertura)
- [ ] TASK-004: Validar acessibilidade

---

### US-02: Alternar idioma
**Épico**: EPIC-02  
**Como**: Visitante internacional  
**Quero**: Alternar entre PT-BR e EN-US  
**Para**: Ler o currículo no meu idioma  

**Critérios de Aceite**:
- [ ] Mesma estrutura e fatos equivalentes
- [ ] URL compartilhável por idioma (`/pt-br`, `/en-us`)
- [ ] Metadata correta por idioma (title, description, Open Graph)
- [ ] Sincronização automática entre idiomas

**Especificações Técnicas**:
- Roteamento Next.js com i18n
- Fonte canônica: arquivos Markdown versionados
- Validação de consistência entre idiomas

**Tarefas**:
- [ ] TASK-010: Configurar roteamento i18n
- [ ] TASK-011: Implementar parser de Markdown tipado
- [ ] TASK-012: Criar validador de sincronização PT-BR/EN-US
- [ ] TASK-013: Adicionar testes de integração

---

### US-03: Explorar trajetória
**Épico**: EPIC-01  
**Como**: Visitante  
**Quero**: Explorar linha do tempo profissional e habilidades por categoria  
**Para**: Entender profundidade e evolução  

**Critérios de Aceite**:
- [ ] Navegação por teclado completa
- [ ] Fallback sem animação (reduzido movimento)
- [ ] Categorias legíveis em mobile
- [ ] Timeline cronológica ordenada

**Especificações Técnicas**:
- Componente de timeline com progressão visual
- Agrupamento de habilidades por categoria
- Animações CSS com `prefers-reduced-motion`

**Tarefas**:
- [ ] TASK-020: Modelar Experiência e Habilidade no domínio
- [ ] TASK-021: Implementar componente de timeline
- [ ] TASK-022: Implementar componente de habilidades
- [ ] TASK-023: Adicionar testes E2E com Playwright

---

### US-04: Baixar currículo
**Épico**: EPIC-03  
**Como**: Recrutador  
**Quero**: Baixar o PDF da versão selecionada  
**Para**: Arquivar ou compartilhar  

**Critérios de Aceite**:
- [ ] Artefato corresponde à versão exibida
- [ ] Download funciona em desktop e mobile
- [ ] Falhas mostram estado compreensível
- [ ] PDF determinístico e reprodutível

**Especificações Técnicas**:
- Geração LaTeX em Docker
- Template LaTeX versionado
- Storage de artefatos no Supabase
- Endpoint de download seguro

**Tarefas**:
- [ ] TASK-030: Definir contrato de conteúdo para PDF
- [ ] TASK-031: Implementar template LaTeX
- [ ] TASK-032: Configurar pipeline Docker de compilação
- [ ] TASK-033: Implementar endpoint de download
- [ ] TASK-034: Adicionar testes de regressão visual

---

### US-05: Selecionar versão
**Épico**: EPIC-04  
**Como**: Visitante  
**Quero**: Consultar uma versão publicada  
**Para**: Conferir quando o conteúdo foi atualizado  

**Critérios de Aceite**:
- [ ] Versão tem identificador único, data e idioma
- [ ] Versão inexistente retorna estado de erro claro
- [ ] Conteúdo permanece imutável após publicação
- [ ] Histórico de versões acessível

**Especificações Técnicas**:
- Modelo de versão com ID semântico
- RLS no Supabase para leitura pública
- Cache estratégico na Vercel

**Tarefas**:
- [ ] TASK-040: Modelar entidade Versão
- [ ] TASK-041: Implementar migração Supabase
- [ ] TASK-042: Criar adaptador de persistência
- [ ] TASK-043: Implementar UI de seleção de versões
- [ ] TASK-044: Adicionar testes de integração

---

## Backlog de Evolução (Pós-MVP)

| ID | Descrição | Prioridade | Épico Relacionado |
|----|-----------|------------|-------------------|
| FEAT-01 | Painel autenticado de rascunhos e publicação | Média | EPIC-04 |
| FEAT-02 | Case studies e portfólio de projetos | Baixa | EPIC-01 |
| FEAT-03 | Analytics com privacidade | Baixa | - |
| FEAT-04 | Geração alternativa com Playwright para PDF web | Média | EPIC-03 |
| FEAT-05 | Implementação automática de novas habilidades | Baixa | EPIC-01 |
| FEAT-06 | Interação nas experiências (desafios, entregas, mídia) | Baixa | EPIC-01 |
| FEAT-07 | Anos de experiência por habilidade (cálculo automático) | Média | EPIC-01 |
| FEAT-08 | Lint automático e regras para Markdown | Média | - |

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
