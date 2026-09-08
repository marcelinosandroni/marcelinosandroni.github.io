# Especificação de Arquitetura (Architecture Spec)

## Visão Geral
Este documento descreve a arquitetura do sistema seguindo os princípios de Clean Architecture e Domain-Driven Design (DDD), com separação clara de responsabilidades para facilitar a execução por agentes de IA.

## Documentos Vinculados
- [Arquitetura Inicial](../../docs/architecture.md)
- [Instruções de Domínio](../../.github/instructions/domain.instructions.md)
- [Instruções de Infraestrutura](../../.github/instructions/infrastructure.instructions.md)

---

## Princípios Arquiteturais

1. **Separação de Camadas**: Dependências apontam para dentro (Domínio no centro)
2. **Inversão de Dependência**: Infraestrutura implementa interfaces definidas pelo Domínio/Aplicação
3. **Imutabilidade**: Entidades de domínio são imutáveis; mudanças criam novas instâncias
4. **Tipagem Forte**: TypeScript estrito em todo o código
5. **Testabilidade**: Cada camada é testável isoladamente

---

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION (Next.js / React)             │
│  - Pages, Components, Hooks, i18n Router                │
│  - Depende apenas de Application (Ports)                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              APPLICATION (Use Cases / Ports)            │
│  - Casos de uso, Interfaces (Ports), DTOs               │
│  - Orquestra fluxo entre Presentation e Domain          │
│  - Não conhece Infrastructure                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 DOMAIN (Entities / VO)                  │
│  - Entidades: Resume, Experience, Skill, Version        │
│  - Value Objects: Language, DateRange, ContactInfo      │
│  - Regras de negócio e invariantes                      │
│  - Zero dependências externas                           │
└─────────────────────────────────────────────────────────┘
                          ↑
┌─────────────────────────────────────────────────────────┐
│           INFRASTRUCTURE (Adapters / Implementations)   │
│  - Git Files Adapter (fonte canônica Markdown)          │
│  - Supabase Adapter (persistência, RLS, Storage)        │
│  - LaTeX/PDF Generator (Docker CLI)                     │
│  - Implementa interfaces definidas em Application       │
└─────────────────────────────────────────────────────────┘
```

---

## Bounded Contexts

### Contexto: Currículo (Resume Context)
**Responsabilidade**: Gerenciar conteúdo, estrutura e versionamento do currículo.

**Entidades**:
- `Resume`: Agregado raiz, contém todas as seções
- `Experience`: Experiência profissional com cargo, empresa, período, descrições
- `Education`: Formação acadêmica
- `Skill`: Habilidade técnica ou comportamental
- `Language`: Idioma com nível de proficiência
- `Version`: Versão publicada com ID, data e metadata

**Value Objects**:
- `LanguageCode`: PT-BR ou EN-US
- `DateRange`: Período com início/fim (MonthYear)
- `ContactInfo`: Email, telefone, LinkedIn, GitHub, localização
- `SectionOrder`: Ordem das seções para exibição

**Regras de Negócio**:
- Conteúdo deve ser factual (sem invenções)
- Versões publicadas são imutáveis
- PT-BR e EN-US devem ter equivalência de fatos
- Ordenação cronológica descendente para experiências

---

### Contexto: Publicação (Publication Context)
**Responsabilidade**: Gerenciar publicação, storage e distribuição de versões.

**Entidades**:
- `PublishedVersion`: Versão publicada com status e timestamps
- `PdfArtifact`: Arquivo PDF gerado com hash e metadata

**Regras de Negócio**:
- Apenas versões com status "published" são visíveis publicamente
- PDF deve corresponder exatamente ao conteúdo da versão
- RLS permite leitura pública, escrita apenas autenticada

---

### Contexto: Geração de PDF (PDF Generation Context)
**Responsabilidade**: Gerar PDFs determinísticos a partir de conteúdo estruturado.

**Processo**:
1. Extrair dados tipados do contrato de conteúdo
2. Gerar arquivo `.tex` usando template LaTeX
3. Compilar em container Docker com fontes fixadas
4. Validar saída (código 0, arquivo existe)
5. Armazenar artefato no Storage

**Regras de Negócio**:
- Template LaTeX é versionado junto com o código
- Compilação deve ser reprodutível (mesmo input = mesmo output)
- Falhas na compilação devem gerar erro compreensível

---

## Contratos de Interface (Ports)

### ResumeRepository Port
```typescript
interface ResumeRepository {
  getByLanguage(lang: LanguageCode): Promise<Resume | null>;
  getVersion(versionId: string, lang: LanguageCode): Promise<Resume | null>;
  listVersions(lang: LanguageCode): Promise<VersionSummary[]>;
}
```

### PdfGenerator Port
```typescript
interface PdfGenerator {
  generate(resume: Resume, versionId: string): Promise<PdfResult>;
}

interface PdfResult {
  success: boolean;
  pdfPath?: string;
  error?: string;
}
```

### StorageAdapter Port
```typescript
interface StorageAdapter {
  upload(key: string, content: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}
```

---

## Estrutura de Diretórios

```
src/
├── domain/                    # Domínio (puro, zero deps externas)
│   ├── entities/
│   │   ├── resume.ts
│   │   ├── experience.ts
│   │   ├── skill.ts
│   │   └── version.ts
│   ├── value-objects/
│   │   ├── language-code.ts
│   │   ├── date-range.ts
│   │   └── contact-info.ts
│   └── repositories/          # Interfaces (Ports)
│       ├── resume-repository.ts
│       └── pdf-generator.ts
│
├── application/               # Casos de uso e orquestração
│   ├── use-cases/
│   │   ├── get-resume.ts
│   │   ├── get-version.ts
│   │   └── generate-pdf.ts
│   ├── ports/                 # Re-exporta interfaces do domínio
│   └── dtos/                  # Data Transfer Objects
│
├── infrastructure/            # Implementações concretas
│   ├── adapters/
│   │   ├── git-files-adapter.ts
│   │   ├── supabase-adapter.ts
│   │   └── latex-pdf-adapter.ts
│   └── config/
│
└── presentation/              # Next.js / React
    ├── components/
    ├── pages/
    ├── hooks/
    └── i18n/
```

---

## Fluxos Principais

### Fluxo 1: Visualizar Currículo
```
1. Usuário acessa /pt-br ou /en-us
2. Page Component chama UseCase GetResume
3. UseCase pede ResumeRepository.getByLanguage()
4. GitFilesAdapter lê Markdown versionado
5. Parser converte MD → Entidade Resume
6. Resume retornado para Componente React
7. UI renderiza seções organizadas
```

### Fluxo 2: Baixar PDF
```
1. Usuário clica em "Baixar PDF"
2. Componente chama UseCase GeneratePdf
3. UseCase busca Resume atual
4. PdfGenerator gera .tex a partir de Resume
5. Docker CLI compila .tex → .pdf
6. StorageAdapter salva PDF no Supabase
7. URL de download retornada ao usuário
```

### Fluxo 3: Selecionar Versão
```
1. Usuário seleciona versão na UI
2. Componente chama UseCase GetVersion
3. UseCase pede ResumeRepository.getVersion(id, lang)
4. SupabaseAdapter busca versão publicada
5. Resume retornado (imutável)
6. UI atualiza com conteúdo da versão
```

---

## Decisões de Arquitetura (ADRs)

### ADR-001: Fonte Canônica em Markdown Versionado
**Decisão**: Conteúdo do currículo vive em arquivos `.md` no Git como fonte primária.  
**Motivo**: Versionamento natural, diff claro, edição simples, single source of truth.  
**Consequência**: Parser MD necessário; mudança requer commit.

### ADR-002: Geração LaTeX em Docker
**Decisão**: Compilação de PDF ocorre em container Docker com TeX Live fixado.  
**Motivo**: Reprodutibilidade, fonts consistentes, isola dependências pesadas.  
**Consequência**: Overhead de build; CI precisa de Docker.

### ADR-003: Supabase para Publicação e Storage
**Decisão**: Supabase armazena metadados de versões e artefatos PDF publicados.  
**Motivo**: RLS nativo, storage integrado, fácil deploy, free tier generoso.  
**Consequência**: Vendor lock-in parcial; migração necessária se trocar.

### ADR-004: TypeScript Estrito em Todo o Projeto
**Decisão**: `strict: true` no tsconfig, sem `any` implícitos.  
**Motivo**: Segurança de tipos, melhor DX, menos bugs em runtime.  
**Consequência**: Mais boilerplate inicial; curva de aprendizado.

---

## Matriz de Dependências

| Camada | Pode Depender De | Não Pode Depender De |
|--------|------------------|----------------------|
| Domain | Nada | Qualquer outra camada |
| Application | Domain | Infrastructure, Presentation |
| Infrastructure | Domain, Application (interfaces) | Presentation |
| Presentation | Application, Domain | Infrastructure (diretamente) |

---

## Padrões de Implementação

1. **Repository Pattern**: Abstrai persistência (Git, Supabase)
2. **Factory Pattern**: Criação de entidades complexas
3. **Strategy Pattern**: Diferentes geradores de PDF (LaTeX, Playwright)
4. **Observer Pattern**: Eventos de publicação (futuro)
5. **Immutable Update Pattern**: Entidades atualizadas via spread/copy

---

## Guias para Agentes de IA

### Ao Implementar Domínio
- Consulte: `.github/instructions/domain.instructions.md`
- Nunca importe de `src/infrastructure` ou `src/presentation`
- Mantenha entidades imutáveis
- Defina invariantes claras

### Ao Implementar Infraestrutura
- Consulte: `.github/instructions/infrastructure.instructions.md`
- Implemente interfaces definidas em `src/domain/repositories/`
- Use injeção de dependência (não instancie diretamente)
- Teste com mocks/stubs

### Ao Implementar Apresentação
- Consulte: `.github/instructions/typescript-react.instructions.md`
- Chame apenas use cases da Application layer
- Não acesse infraestrutura diretamente
- Mantenha componentes puros quando possível

### Ao Criar Testes
- Consulte: `.github/instructions/tests.instructions.md`
- Cobertura mínima 90% para domínio e aplicação
- Unitários: isole camadas
- E2E: valide fluxos completos com Playwright
