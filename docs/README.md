# Documentação

## 📚 Estrutura da Documentação

Este projeto utiliza **Spec-Driven Development** como metodologia principal. A documentação está organizada em duas camadas:

### 1. Especificações (Fonte Primária) 🎯
Local: [`/specs/`](../specs/README.md)

As specs são a **fonte única da verdade** para planejamento e execução de tarefas:
- **Product Spec**: Épicos, User Stories, critérios de aceite
- **Architecture Spec**: Arquitetura, fluxos, ADRs  
- **Contracts Spec**: Schemas TypeScript, APIs, banco de dados
- **Tasks Catalog**: Tarefas acionáveis para agentes de IA

👉 **Comece por**: [`specs/README.md`](../specs/README.md)

### 2. Documentação Complementar (Contexto) 📖
Local: `/docs/` (esta pasta)

Documentação técnica detalhada e guias específicos:

| Documento | Descrição |
|-----------|-----------|
| [`architecture.md`](./architecture.md) | Visão geral da arquitetura (legado, consulte specs para versão atualizada) |
| [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md) | Status atual de implementação das features |
| [`ERROR_HANDLING.md`](./ERROR_HANDLING.md) | Estratégias de tratamento de erro |
| [`pdf-reference-contract.md`](./pdf-reference-contract.md) | Contrato de referência para geração de PDF |
| [`latex-template-authoring.md`](./latex-template-authoring.md) | Guia para criação de templates LaTeX |
| [`release-process.md`](./release-process.md) | Processo de release e versionamento |
| [`EXPERIENCES-ENRICHMENT.md`](./EXPERIENCES-ENRICHMENT.md) | Diretrizes para enriquecimento de experiências |

### 3. Pasta Product (Legado) ⚠️
Local: `/docs/product/`

> **Nota:** Os documentos em `docs/product/` foram consolidados em [`specs/product/product-spec.md`](../specs/product/product-spec.md). Use as specs como fonte primária.

| Documento Original | Status |
|-------------------|--------|
| `vision.md` | ✅ Consolidado em Product Spec |
| `requirements.md` | ✅ Consolidado em Product Spec |
| `backlog.md` | ✅ Consolidado em Product Spec |
| `roadmap.md` | ✅ Consolidado em Product Spec |

---

## 🔗 Links Rápidos

- **Índice Geral de Specs**: [`specs/README.md`](../specs/README.md)
- **Guia para Agentes**: [`AGENTS.md`](../AGENTS.md)
- **Contributing**: [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- **README Principal**: [`README.md`](../README.md)

---

As decisões devem acompanhar o código e permanecer em português claro, com termos técnicos preservados quando necessário.
