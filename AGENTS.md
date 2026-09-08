<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes do Projeto e Regras Canônicas de IA

## 🎯 Spec-Driven Development (SDD) - Metodologia Principal

Este projeto segue **Spec-Driven Development** como metodologia central. TODAS as implementações devem seguir o fluxo definido nas specs.

### 📚 Fontes Primárias de Verdade

1. **Especificações do Projeto (`/specs/`)** - Fonte única para planejamento e execução
   - **[Product Spec](./specs/product/product-spec.md)** - Épicos, User Stories, critérios de aceite
   - **[Architecture Spec](./specs/architecture/architecture-spec.md)** - Camadas, bounded contexts, fluxos, ADRs
   - **[Contracts Spec](./specs/contracts/contracts-spec.md)** - Schemas TypeScript, APIs, DB, validações
   - **[Tasks Catalog](./specs/tasks/tasks-catalog.md)** - Tarefas acionáveis com critérios de conclusão

2. **Guia de Navegação (`/specs/README.md`)** - Índice completo e fluxo para agentes
   - Leia primeiro: [specs/README.md](./specs/README.md)

### 🔄 Fluxo Obrigatório para Agentes de IA

Para QUALQUER nova funcionalidade ou tarefa:

```markdown
PASSO 1: Entenda o Produto
→ Leia specs/product/product-spec.md
→ Identifique Épico e User Story relacionados
→ Anote critérios de aceite

PASSO 2: Consulte Arquitetura
→ Leia specs/architecture/architecture-spec.md
→ Identifique camada (Domain/Application/Infrastructure/Presentation)
→ Revise fluxos e ADRs aplicáveis

PASSO 3: Obtenha Contratos
→ Leia specs/contracts/contracts-spec.md
→ Copie schemas TypeScript necessários
→ Verifique interfaces e invariantes

PASSO 4: Pegue a Tarefa
→ Acesse specs/tasks/tasks-catalog.md
→ Localize tarefa por ID (ex: TASK-001)
→ Leia critérios de conclusão e arquivos esperados

PASSO 5: Implemente
→ Siga instruções da tarefa
→ Respeite regras da camada (.github/instructions/)
→ Mantenha contratos definidos

PASSO 6: Valide
→ Execute testes locais
→ Verifique cobertura ≥ 90%
→ Confirme todos critérios de conclusão

PASSO 7: Atualize Status
→ Marque tarefa como concluída no Tasks Catalog
→ Solicite review do agente apropriado
```

### ✅ Checklist Pré-Implementação (Obrigatório)

Antes de escrever qualquer código:
- [ ] Li [specs/README.md](./specs/README.md) e entendi fluxo SDD
- [ ] Identifiquei User Story em [product-spec.md](./specs/product/product-spec.md)
- [ ] Consultei arquitetura em [architecture-spec.md](./specs/architecture/architecture-spec.md)
- [ ] Obtive schemas em [contracts-spec.md](./specs/contracts/contracts-spec.md)
- [ ] Peguei tarefa em [tasks-catalog.md](./specs/tasks/tasks-catalog.md)
- [ ] Entendi critérios de conclusão da tarefa
- [ ] Verifiquei dependências de outras tarefas

---

## 1. Diretrizes Principais

- **Instruções Globais de IA**: [.github/copilot-instructions.md](.github/copilot-instructions.md)
  *(Missão, Limites de Stack, Clean Architecture/DDD, 90%+ Cobertura de Testes, Não inventar fatos, UI/UX editorial)*

## 2. Regras por Camada e Escopo

- **Domínio & Aplicação** (`src/domain`, `src/application`): [.github/instructions/domain.instructions.md](.github/instructions/domain.instructions.md)
- **Infraestrutura, Docker & Supabase** (`supabase`, `Dockerfile`, `scripts`, `.github/workflows`): [.github/instructions/infrastructure.instructions.md](.github/instructions/infrastructure.instructions.md)
- **TypeScript & React** (`src/**/*.ts`, `src/**/*.tsx`): [.github/instructions/typescript-react.instructions.md](.github/instructions/typescript-react.instructions.md)
- **Testes & Qualidade** (`tests/**/*`, `*.test.ts`, `*.spec.ts`): [.github/instructions/tests.instructions.md](.github/instructions/tests.instructions.md)
- **Conteúdo de Currículo** (`*.md`, `resume-*.md`): [.github/instructions/resume-markdown.instructions.md](.github/instructions/resume-markdown.instructions.md)

## 3. Skills de Projeto

- **Geração de PDF (LaTeX/Docker)**: [.github/skills/pdf-generation/SKILL.md](.github/skills/pdf-generation/SKILL.md)
- **Refinamento de Produto**: [.github/skills/product-refinement/SKILL.md](.github/skills/product-refinement/SKILL.md)

## 4. Agentes e Prompts Especializados

- **Revisor de Arquitetura**: [.github/agents/architecture-reviewer.agent.md](.github/agents/architecture-reviewer.agent.md)
- **Revisor de Conteúdo**: [.github/agents/resume-reviewer.agent.md](.github/agents/resume-reviewer.agent.md)
- **Sincronização de Idiomas**: [.github/prompts/sync-resume.prompt.md](.github/prompts/sync-resume.prompt.md)


## 5. Regras Críticas de Git e Versionamento

### ⚠️ NUNCA MODIFIQUE O `.gitignore` DE FORMA DESTRUTIVA

**Regra Absoluta:** O arquivo `.gitignore` deve ser tratado como imutável em sua estrutura existente. 

- **NÃO** remova, substitua ou altere as entradas existentes do `.gitignore`
- **NÃO** reescreva o arquivo inteiro ao fazer mudanças
- **NÃO** permita que agentes (como qwen, copilot, etc.) modifiquem a estrutura do `.gitignore`
- **APENAS** adicione novos itens específicos quando estritamente necessário, mantendo todo o conteúdo existente
- Se um agente modificar o `.gitignore` removendo entradas existentes, reverta imediatamente com `git checkout HEAD -- .gitignore`

**Justificativa:** Modificações indevidas no `.gitignore` podem causar commit acidental de arquivos sensíveis (build artifacts, node_modules, arquivos temporários), poluindo o repositório e causando problemas de build/deploy.

**Procedimento Correto para Adicionar Entradas:**
```bash
# Append apenas a nova entrada necessária
echo "nova-entrada/" >> .gitignore
```

---

## 📍 Mapa Completo de Documentação

### Especificações (Spec-Driven Development)
| Documento | Localização | Propósito |
|-----------|-------------|-----------|
| **Índice de Specs** | [`specs/README.md`](./specs/README.md) | Navegação e fluxo SDD |
| Product Spec | [`specs/product/product-spec.md`](./specs/product/product-spec.md) | Épicos, US, critérios |
| Architecture Spec | [`specs/architecture/architecture-spec.md`](./specs/architecture/architecture-spec.md) | Arquitetura, fluxos, ADRs |
| Contracts Spec | [`specs/contracts/contracts-spec.md`](./specs/contracts/contracts-spec.md) | Schemas, APIs, DB |
| Tasks Catalog | [`specs/tasks/tasks-catalog.md`](./specs/tasks/tasks-catalog.md) | Tarefas executáveis |

### Documentação Complementar
| Documento | Localização | Propósito |
|-----------|-------------|-----------|
| **Índice Docs** | [`docs/README.md`](./docs/README.md) | Visão geral docs |
| Arquitetura (legado) | [`docs/architecture.md`](./docs/architecture.md) | Visão inicial arquitetura |
| Status Implementação | [`docs/IMPLEMENTATION-STATUS.md`](./docs/IMPLEMENTATION-STATUS.md) | Progresso por feature |
| Error Handling | [`docs/ERROR_HANDLING.md`](./docs/ERROR_HANDLING.md) | Estratégias de erro |
| PDF Reference | [`docs/pdf-reference-contract.md`](./docs/pdf-reference-contract.md) | Contrato geração PDF |
| LaTeX Template | [`docs/latex-template-authoring.md`](./docs/latex-template-authoring.md) | Guia templates LaTeX |
| Release Process | [`docs/release-process.md`](./docs/release-process.md) | Processo de release |

### Pasta Product (Docs Legado)
| Documento | Localização |
|-----------|-------------|
| Vision | [`docs/product/vision.md`](./docs/product/vision.md) |
| Requirements | [`docs/product/requirements.md`](./docs/product/requirements.md) |
| Backlog | [`docs/product/backlog.md`](./docs/product/backlog.md) |
| Roadmap | [`docs/product/roadmap.md`](./docs/product/roadmap.md) |

> ⚠️ **Nota:** A documentação em `docs/product/` foi consolidada em `specs/product/product-spec.md`. Use as specs como fonte primária.

### Instruções por Camada (.github/)
| Arquivo | Camada |
|---------|--------|
| [`copilot-instructions.md`](./.github/copilot-instructions.md) | Global |
| [`domain.instructions.md`](./.github/instructions/domain.instructions.md) | Domínio/Aplicação |
| [`infrastructure.instructions.md`](./.github/instructions/infrastructure.instructions.md) | Infra/DB |
| [`typescript-react.instructions.md`](./.github/instructions/typescript-react.instructions.md) | TS/React |
| [`tests.instructions.md`](./.github/instructions/tests.instructions.md) | Testes |
| [`resume-markdown.instructions.md`](./.github/instructions/resume-markdown.instructions.md) | Conteúdo MD |

### Agents e Skills (.github/)
| Tipo | Arquivo | Propósito |
|------|---------|-----------|
| **Agent** | [`architecture-reviewer.agent.md`](./.github/agents/architecture-reviewer.agent.md) | Review arquitetura |
| **Agent** | [`resume-reviewer.agent.md`](./.github/agents/resume-reviewer.agent.md) | Review conteúdo |
| **Skill** | [`pdf-generation/SKILL.md`](./.github/skills/pdf-generation/SKILL.md) | Geração PDF |
| **Skill** | [`product-refinement/SKILL.md`](./.github/skills/product-refinement/SKILL.md) | Refinamento produto |
| **Prompt** | [`sync-resume.prompt.md`](./.github/prompts/sync-resume.prompt.md) | Sync idiomas |

---

## 🚀 Quick Start para Agentes

### Cenário 1: Nova Funcionalidade do MVP
```bash
# 1. Leia specs na ordem
cat specs/README.md
cat specs/product/product-spec.md  # Encontre US relevante
cat specs/architecture/architecture-spec.md  # Entenda fluxo
cat specs/contracts/contracts-spec.md  # Pegue schemas
cat specs/tasks/tasks-catalog.md  # Pegue tarefa

# 2. Implemente seguindo tarefa
# 3. Rode testes
npm test

# 4. Atualize status no tasks-catalog.md
```

### Cenário 2: Correção de Bug
```bash
# 1. Crie nova tarefa no tasks-catalog.md
# 2. Siga fluxo SDD normal
# 3. Documente lições aprendidas
```

### Cenário 3: Refatoração
```bash
# 1. Verifique se afeta contratos (specs/contracts/)
# 2. Se sim, atualize contracts-spec.md primeiro
# 3. Consulte architecture-reviewer agent
# 4. Implemente com testes
```

---

## 📊 Matriz de Rastreabilidade

```
Product Spec (US-XX)
    ↓
Architecture Spec (Fluxo + ADR)
    ↓
Contracts Spec (Schema + Interface)
    ↓
Tasks Catalog (TASK-XXX)
    ↓
Código (src/**)
    ↓
Testes (tests/**)
```

Toda implementação deve ser rastreável até uma User Story no Product Spec.

---

## 🎓 Governança de Mudanças

### Quando Atualizar Cada Spec

| Mudança | Atualize | Aprovação |
|---------|----------|-----------|
| Novo requisito | `product-spec.md` | PO |
| Mudança arquitetura | `architecture-spec.md` + ADR | Architecture Reviewer |
| Alteração contrato/interface | `contracts-spec.md` | Tech Lead |
| Nova tarefa/critério | `tasks-catalog.md` | Tech Lead |
| Bug fix | `tasks-catalog.md` (nova task) | - |

### Processo de Mudança
1. Proposta via issue/PR
2. Identifique specs afetadas
3. Review por agente especializado
4. Aprovação humana (se crítico)
5. **Atualize specs ANTES de implementar**
6. Execute tarefa
7. Valide conformidade

---

## 🔗 Links Úteis

- [SPEC_DRIVEN_DEVELOPMENT.md](./SPEC_DRIVEN_DEVELOPMENT.md) - Visão geral da metodologia
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guia de contribuição
- [README.md](./README.md) - README principal do projeto
