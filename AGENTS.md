<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes do Projeto e Regras Canônicas de IA

Todas as diretrizes de arquitetura, qualidade, produto e escopo do projeto estão centralizadas na pasta `.github/` como fonte única da verdade (Single Source of Truth). O assistente e os agentes devem seguir e consultar ativamente as regras abaixo:

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

