# Especificações do Projeto (Specs)

## Visão Geral
Este diretório contém a documentação estruturada do projeto seguindo **Spec-Driven Development**, organizada para facilitar execução por agentes de IA.

## Estrutura do Diretório

```
specs/
├── README.md                      # Este arquivo - índice e guia de navegação
├── product/                       # Especificações de Produto
│   └── product-spec.md            # Épicos, User Stories, backlog detalhado
├── architecture/                  # Especificações de Arquitetura
│   └── architecture-spec.md       # Camadas, bounded contexts, fluxos, ADRs
├── contracts/                     # Contratos Técnicos
│   └── contracts-spec.md          # Schemas, APIs, DB, eventos, validações
└── tasks/                         # Catálogo de Tarefas
    └── tasks-catalog.md           # Tarefas derivadas com critérios de aceitação
```

---

## Navegação Rápida

### 📋 Para Planejamento de Produto
1. **[Product Spec](./product/product-spec.md)** - Visão completa do produto
   - Épicos e User Stories detalhados
   - Critérios de aceite por US
   - Backlog de evolução (pós-MVP)
   - Matriz de rastreabilidade

### 🏗️ Para Decisões de Arquitetura
2. **[Architecture Spec](./architecture/architecture-spec.md)** - Guia arquitetural
   - Diagrama de camadas (Clean Architecture)
   - Bounded Contexts (DDD)
   - Portos e Adaptadores
   - Fluxos principais
   - ADRs (Architecture Decision Records)

### 🔧 Para Implementação Técnica
3. **[Contracts Spec](./contracts/contracts-spec.md)** - Contratos técnicos
   - Schema TypeScript das entidades
   - Contrato de Markdown (fonte canônica)
   - Contrato de geração de PDF
   - Contratos de API (endpoints)
   - Schema de banco de dados (Supabase)
   - Validações e invariantes

### ✅ Para Execução de Tarefas
4. **[Tasks Catalog](./tasks/tasks-catalog.md)** - Tarefas acionáveis
   - Tarefas por épico e prioridade
   - Critérios de conclusão claros
   - Arquivos esperados
   - Instruções específicas para agentes
   - Status e estimativas

---

## Como Agentes de IA Devem Usar Este Diretório

### Fluxo Recomendado para Nova Funcionalidade

```
1. Leia Product Spec → Entenda a User Story e critérios de aceite
2. Consulte Architecture Spec → Identifique camada e responsabilidades
3. Revise Contracts Spec → Obtenha schemas e interfaces necessárias
4. Pegue tarefa no Tasks Catalog → Siga critérios de conclusão
5. Implemente seguindo instruções da tarefa
6. Atualize status no Tasks Catalog
```

### Exemplo: Implementar Visualização do Currículo (US-01)

```markdown
## Passo 1: Product Spec
- Leia US-01 em specs/product/product-spec.md
- Entenda critérios de aceite

## Passo 2: Architecture Spec
- Veja fluxo "Visualizar Currículo" em specs/architecture/architecture-spec.md
- Identifique componentes necessários

## Passo 3: Contracts Spec
- Obtenha schema Resume em specs/contracts/contracts-spec.md
- Use interfaces tipadas

## Passo 4: Tasks Catalog
- Pegue TASK-001 (modelo de domínio)
- Execute TASK-002 (componentes React)
- Execute TASK-003 (testes unitários)

## Passo 5: Implementação
- Siga instruções específicas de cada tarefa
- Consulte .github/instructions/ para regras da camada

## Passo 6: Conclusão
- Valide todos os critérios de conclusão
- Atualize status para 🟢 no Tasks Catalog
- Solicite review do agent architecture-reviewer
```

---

## Princípios de Spec-Driven Development

1. **Especificação Primeiro**: Nenhuma implementação sem spec clara
2. **Contratos Explícitos**: Interfaces bem definidas entre camadas
3. **Rastreabilidade**: Cada tarefa vinculada a uma User Story
4. **Documentação Viva**: Specs atualizadas com mudanças
5. **Execução por Agentes**: Specs escritas para serem executáveis por IA

---

## Matrizes de Referência

### Matriz: Spec → Documentos Originais

| Spec | Documentos Fonte |
|------|------------------|
| Product Spec | docs/product/vision.md, requirements.md, backlog.md, roadmap.md |
| Architecture Spec | docs/architecture.md, .github/instructions/*.md |
| Contracts Spec | src/domain/**, docs/pdf-reference-contract.md |
| Tasks Catalog | Derivado de todas as specs acima |

### Matriz: Épico → Tarefas

| Épico | Tarefas | Status |
|-------|---------|--------|
| EPIC-01: Visualização | TASK-001, TASK-002, TASK-003, TASK-004 | 🔴 |
| EPIC-02: Internacionalização | TASK-010, TASK-011, TASK-012, TASK-013 | 🔴 |
| EPIC-03: Geração de PDF | TASK-030, TASK-031, TASK-032, TASK-033, TASK-034 | 🔴 |
| EPIC-04: Versionamento | TASK-040, TASK-041, TASK-042, TASK-043, TASK-044 | 🔴 |

---

## Integração com Outras Documentações

### `.github/instructions/`
Regras específicas por camada que complementam as specs:
- `domain.instructions.md` → Regras para domínio
- `infrastructure.instructions.md` → Regras para infra
- `typescript-react.instructions.md` → Regras para apresentação
- `tests.instructions.md` → Regras para testes

### `.github/agents/`
Agentes especializados para review:
- `architecture-reviewer.agent.md` → Revisa decisões arquiteturais
- `resume-reviewer.agent.md` → Revisa conteúdo do currículo

### `.github/skills/`
Skills reutilizáveis:
- `pdf-generation/SKILL.md` → Processo de geração de PDF
- `product-refinement/SKILL.md` → Refinamento de produto

### `docs/`
Documentação complementar:
- `architecture.md` → Visão inicial da arquitetura
- `implementation-status.md` → Status de implementação
- `error-handling.md` → Estratégias de tratamento de erro

---

## Governança de Mudanças

### Quando Atualizar Specs

| Tipo de Mudança | Atualizar | Aprovação Necessária |
|-----------------|-----------|---------------------|
| Novo requisito de negócio | Product Spec | Product Owner |
| Mudança de arquitetura | Architecture Spec + ADR | Architecture Reviewer |
| Alteração de interface/contrato | Contracts Spec | Tech Lead |
| Nova tarefa ou critério | Tasks Catalog | Tech Lead |
| Correção de bug | Tasks Catalog (nova tarefa) | - |
| Refatoração sem mudança externa | Nenhum (ou Architecture Spec se relevante) | - |

### Processo de Mudança

1. **Proposta**: Abra issue ou PR descrevendo mudança
2. **Impacto**: Identifique quais specs serão afetadas
3. **Review**: Agente especializado revisa (architecture-reviewer, etc.)
4. **Aprovação**: Humano aprova mudança crítica
5. **Atualização**: Modifique specs antes de implementar
6. **Implementação**: Execute tarefas do Tasks Catalog
7. **Validação**: Verifique conformidade com specs atualizadas

---

## Checklist para Agentes de IA

### Antes de Iniciar Implementação
- [ ] Li Product Spec e entendi User Story
- [ ] Consultei Architecture Spec para contexto
- [ ] Revisei Contracts Spec para schemas/interfaces
- [ ] Peguei tarefa no Tasks Catalog
- [ ] Entendi critérios de conclusão
- [ ] Verifiquei dependências de outras tarefas

### Durante Implementação
- [ ] Sigo instruções da camada (.github/instructions/)
- [ ] Mantenho contratos definidos
- [ ] Escrevo testes conforme especificado
- [ ] Documento decisões no código

### Após Implementação
- [ ] Todos testes passam localmente
- [ ] Cobertura ≥ 90% (quando aplicável)
- [ ] Critérios de conclusão validados
- [ ] Status atualizado no Tasks Catalog
- [ ] Solicitei review do agente apropriado

---

## Versionamento de Specs

As specs são versionadas implicitamente junto com o código:
- **Main branch**: Specs da versão atual em produção
- **Feature branches**: Specs em evolução para nova funcionalidade
- **Tags Git**: Snapshot de specs por release

Mudanças breaking em contratos devem:
1. Ser documentadas em Contracts Spec
2. Ter período de depreciação
3. Ser comunicadas no CHANGELOG

---

## Contato e Suporte

Para dúvidas sobre specs:
1. Verifique se a dúvida não está respondida na própria spec
2. Consulte documentos vinculados
3. Peça review a agente especializado
4. Escalone para revisão humana se necessário

---

## Histórico de Revisões

| Versão | Data | Mudanças | Autor |
|--------|------|----------|-------|
| 1.0.0 | 2025-01-15 | Criação inicial da estrutura de specs | System |
