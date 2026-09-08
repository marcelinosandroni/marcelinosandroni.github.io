# Spec-Driven Development: Guia de Implementação

## Resumo Executivo

Este projeto foi reestruturado seguindo **Spec-Driven Development (SDD)**, uma abordagem onde especificações bem definidas guiam toda a implementação, garantindo:

- ✅ **Documentação organizada** e centralizada
- ✅ **Desacoplamento** entre camadas via contratos explícitos
- ✅ **Execução facilitada** por agentes de IA
- ✅ **Rastreabilidade completa** de requisitos → tarefas → código

---

## Estrutura Criada

```
/workspace/
├── specs/                              # NOVO: Diretório de especificações
│   ├── README.md                       # Índice e guia de navegação
│   ├── product/
│   │   └── product-spec.md             # Épicos, User Stories, backlog
│   ├── architecture/
│   │   └── architecture-spec.md        # Camadas, bounded contexts, ADRs
│   ├── contracts/
│   │   └── contracts-spec.md           # Schemas, APIs, DB, validações
│   └── tasks/
│       └── tasks-catalog.md            # Tarefas acionáveis com critérios
│
├── docs/product/                       # EXISTENTE: Documentação original
│   ├── vision.md                       # Mantido como fonte histórica
│   ├── requirements.md                 # Mantido como fonte histórica
│   ├── backlog.md                      # Consolidado em product-spec.md
│   └── roadmap.md                      # Consolidado em product-spec.md
│
└── .github/                            # EXISTENTE: Instruções e agents
    ├── instructions/                   # Regras por camada (mantidas)
    ├── agents/                         # Agents de review (mantidos)
    └── skills/                         # Skills reutilizáveis (mantidos)
```

---

## O Que Mudou

### Antes (Documentação Fragmentada)
- Backlog em `docs/product/backlog.md` sem detalhamento técnico
- Requisitos soltos sem rastreabilidade
- Arquitetura descrita informalmente
- Nenhuma ligação clara entre US e implementação
- Dificuldade para agentes executarem tarefas autonomamente

### Depois (Spec-Driven Development)
1. **Product Spec**: 5 User Stories detalhadas com:
   - Critérios de aceite claros
   - Especificações técnicas
   - Tarefas derivadas identificadas
   - Matriz de rastreabilidade com requisitos

2. **Architecture Spec**: Arquitetura documentada com:
   - Diagrama de camadas visual
   - Bounded Contexts (DDD) definidos
   - Portos e adaptadores especificados
   - Fluxos principais passo-a-passo
   - ADRs (Architecture Decision Records)
   - Guia específico para agentes de IA

3. **Contracts Spec**: Contratos técnicos explícitos:
   - Schema TypeScript completo das entidades
   - Contrato de Markdown (fonte canônica)
   - Contrato de geração de PDF
   - Contratos de API (request/response)
   - Schema de banco de dados (Supabase)
   - Validações e invariantes codificáveis

4. **Tasks Catalog**: 18 tarefas acionáveis com:
   - Status rastreável (🔴 🟡 🟢 ⚪)
   - Critérios de conclusão checklist
   - Arquivos esperados listados
   - Instruções específicas para agentes
   - Estimativas de esforço
   - Dependências mapeadas

---

## Como Usar: Fluxo para Agentes de IA

### Cenário: Implementar Nova Funcionalidade

```markdown
PASSO 1: Entendimento do Produto
├─ Acesse: specs/README.md
├─ Leia: specs/product/product-spec.md
└─ Identifique: User Story relevante e critérios de aceite

PASSO 2: Contexto Arquitetural
├─ Acesse: specs/architecture/architecture-spec.md
├─ Identifique: Camada responsável e fluxos relacionados
└─ Consulte: Guias para agentes de IA na seção final

PASSO 3: Contratos Técnicos
├─ Acesse: specs/contracts/contracts-spec.md
├─ Obtenha: Schemas TypeScript necessários
└─ Valide: Interfaces e validações requeridas

PASSO 4: Execução da Tarefa
├─ Acesse: specs/tasks/tasks-catalog.md
├─ Pegue: Tarefa correspondente à US
├─ Siga: Critérios de conclusão um a um
└─ Implemente: Arquivos listados como esperados

PASSO 5: Validação e Review
├─ Execute: Todos os testes localmente
├─ Valide: Critérios de conclusão marcados
├─ Atualize: Status no Tasks Catalog
└─ Solicite: Review do agent especializado
```

---

## Benefícios da Reestruturação

### 1. Para Product Owners
- Visão clara de escopo e priorização
- Rastreabilidade requisito → implementação
- Backlog de evolução documentado

### 2. Para Arquitetos
- Decisões arquiteturais documentadas (ADRs)
- Separação de responsabilidades explícita
- Padrões de implementação definidos

### 3. Para Desenvolvedores (Humanos ou IA)
- Tarefas auto-contidas e acionáveis
- Critérios de conclusão objetivos
- Contratos claros entre camadas
- Instruções específicas por contexto

### 4. Para QA/Testes
- Critérios de aceite testáveis
- Validações e invariantes especificadas
- Casos de teste derivados naturalmente

---

## Próximos Passos Recomendados

### Imediato (Sprint 1)
1. [ ] Executar TASK-001: Criar modelo de domínio
2. [ ] Executar TASK-002: Implementar componente de visualização
3. [ ] Executar TASK-003: Adicionar testes unitários

### Curto Prazo (Sprint 2-3)
4. [ ] Executar TASK-010: Configurar roteamento i18n
5. [ ] Executar TASK-011: Implementar parser de Markdown
6. [ ] Executar TASK-030 a TASK-032: Geração de PDF

### Médio Prazo (Sprint 4+)
7. [ ] Executar TASK-040 a TASK-044: Versionamento
8. [ ] Revisar backlog de evolução (FEAT-01 a FEAT-08)

---

## Governança

### Atualização de Specs
- Specs são **documentação viva**: atualize antes de implementar mudanças
- Use o processo definido em `specs/README.md` → "Governança de Mudanças"
- Agents especializados (`architecture-reviewer`, etc.) revisam mudanças críticas

### Versionamento
- Specs versionadas implicitamente com o código
- Tags Git marcam snapshots de specs por release
- Breaking changes em contratos exigem depreciação documentada

---

## Integração com Ferramentas Existentes

### GitHub Copilot / Cursor / Continue
- Configure para ler `specs/` como contexto primário
- Use `specs/tasks/tasks-catalog.md` como lista de tarefas
- Consulte `specs/contracts/contracts-spec.md` para schemas

### Agents Especializados (.github/agents/)
- `architecture-reviewer`: Valida conformidade com Architecture Spec
- `resume-reviewer`: Valida conteúdo do currículo

### Instructions (.github/instructions/)
- Complementam specs com regras específicas por camada
- Mantidas como fonte única para regras de estilo e qualidade

---

## Métricas de Sucesso

| Métrica | Meta | Como Medir |
|---------|------|------------|
| Cobertura de testes | ≥ 90% | `npm run test:coverage` |
| Tarefas concluídas | 100% MVP | `specs/tasks/tasks-catalog.md` |
| Conformidade arquitetural | 0 violações críticas | `architecture-reviewer` |
| Tempo de onboarding de agente | < 5 min | Feedback de novos agents |

---

## FAQ

**P: Preciso mover documentação existente?**  
R: Não. Documentos em `docs/product/` são mantidos como fonte histórica. As specs consolidam e estruturam esse conteúdo.

**P: Posso criar novas tarefas fora do catálogo?**  
R: Sim, mas adicione ao `tasks-catalog.md` para manter rastreabilidade.

**P: E se uma spec estiver desatualizada?**  
R: Atualize a spec **antes** de implementar a mudança. Spec é fonte da verdade.

**P: Como agents descobrem qual tarefa executar?**  
R: Consultam `tasks-catalog.md`, filtram por status 🔴 e prioridade, e pegam a próxima disponível.

---

## Referências

- **Spec-Driven Development**: Metodologia de desenvolvimento guiado por especificações
- **Clean Architecture**: Robert C. Martin (Uncle Bob)
- **Domain-Driven Design**: Eric Evans
- **Architecture Decision Records**: Michael Nygard

---

**Autor**: System (reestruturação por IA)  
**Data**: 2025-01-15  
**Versão**: 1.0.0
