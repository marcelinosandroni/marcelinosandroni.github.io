# Contratos e Especificações Técnicas (Contracts Spec)

## Visão Geral
Este documento define os contratos técnicos entre camadas, especificações de dados, schemas e formatos para garantir consistência e facilitar a implementação por agentes de IA.

---

## Contrato de Conteúdo do Currículo

### Schema TypeScript

```typescript
// src/domain/entities/resume.ts

interface Resume {
  id: string;
  language: LanguageCode;
  version?: VersionSummary;
  personalInfo: PersonalInfo;
  summary: string;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  languages: LanguageProficiency[];
  lastUpdated: string; // ISO 8601
}

interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: MonthYear;
  endDate?: MonthYear;
  isCurrent: boolean;
  description: string[]; // bullets
  technologies: string[];
  achievements?: string[];
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  startDate: MonthYear;
  endDate?: MonthYear;
  isCurrent: boolean;
}

interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level?: SkillLevel;
  yearsOfExperience?: number;
  firstUsed?: MonthYear;
}

type SkillCategory = 
  | 'backend'
  | 'frontend'
  | 'mobile'
  | 'devops'
  | 'cloud'
  | 'data'
  | 'architecture'
  | 'methodologies'
  | 'soft-skills';

type SkillLevel = 
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

interface LanguageProficiency {
  language: string;
  proficiency: ProficiencyLevel;
}

type ProficiencyLevel = 
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'fluent'
  | 'native';

interface MonthYear {
  month: number; // 1-12
  year: number;
}

interface VersionSummary {
  id: string;
  versionNumber: string; // semver: 1.0.0
  publishedAt: string; // ISO 8601
  language: LanguageCode;
}

type LanguageCode = 'pt-BR' | 'en-US';
```

---

## Contrato de Markdown (Fonte Canônica)

### Estrutura do Arquivo `resume-pt-br.md`

```markdown
---
id: resume-pt-br
language: pt-BR
version: 1.0.0
lastUpdated: 2025-01-15T10:30:00Z
---

# Nome Completo

**Título Profissional**

## Contato

- **Email**: email@exemplo.com
- **Localização**: Cidade, Estado
- **LinkedIn**: linkedin.com/in/usuario
- **GitHub**: github.com/usuario

## Resumo Profissional

Texto em parágrafo único com 3-5 linhas destacando experiência principal, especialidades e valor entregue.

## Experiência Profissional

### Cargo | Empresa

**Período**: Jan 2020 - Presente  
**Tecnologias**: TypeScript, Node.js, React, AWS

- Descrição da responsabilidade ou conquista em formato bullet point
- Foco em resultados mensuráveis e impacto no negócio
- Máximo 5-6 bullets por experiência

### Cargo Anterior | Empresa Anterior

**Período**: Mar 2017 - Dez 2019  
**Tecnologias**: Java, Spring, PostgreSQL

- Bullet point descritivo
- Outro bullet point

## Formação Acadêmica

### Bacharelado em Ciência da Computação | Universidade

**Período**: Fev 2013 - Dez 2016

## Habilidades Técnicas

### Backend

Node.js (expert), TypeScript (expert), Python (advanced), Go (intermediate)

### Frontend

React (expert), Next.js (advanced), Tailwind CSS (advanced)

### Cloud & DevOps

AWS (advanced), Docker (advanced), Kubernetes (intermediate), CI/CD (advanced)

## Idiomas

- **Português**: Nativo
- **Inglês**: Fluente
- **Espanhol**: Intermediário
```

### Validação de Schema Markdown

```yaml
# Frontmatter obrigatório:
id: string (kebab-case)
language: 'pt-BR' | 'en-US'
version: string (semver)
lastUpdated: string (ISO 8601)

# Seções obrigatórias:
- Título H1 (nome)
- Subtítulo (título profissional)
- Seção "Contato" com pelo menos email
- Seção "Resumo Profissional"
- Seção "Experiência Profissional" com pelo menos 1 experiência
- Seção "Formação Acadêmica" com pelo menos 1 formação
- Seção "Habilidades Técnicas" com categorias
- Seção "Idiomas"

# Regras:
- Datas no formato "Mmm AAAA" (Jan 2020)
- Tecnologias listadas após **Tecnologias**:
- Bullets começam com "- "
- Sem informação inventada
```

---

## Contrato de Geração de PDF

### Input para Template LaTeX

```typescript
interface LatexTemplateInput {
  resume: Resume;
  templateVersion: string;
  generatedAt: string; // ISO 8601
}

// Dados já validados e estruturados prontos para interpolação no .tex
```

### Output Esperado

```typescript
interface PdfGenerationResult {
  success: boolean;
  pdfBuffer?: Buffer;
  texSource?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  metadata: {
    compileTimeMs: number;
    dockerImage: string;
    latexVersion: string;
    fileSizeBytes: number;
  };
}
```

### Template LaTeX (Estrutura)

```latex
% Template versionado em: /src/infrastructure/templates/resume-template.tex
\documentclass[a4paper,10pt]{article}
\usepackage[brazil]{babel} % ou [english]
\usepackage[utf8]{inputenc}
\usepackage{hyperref}
\usepackage{geometry}
\usepackage{titlesec}
\usepackage{enumitem}

% Configurações de estilo...

\begin{document}

% Cabeçalho com nome e título
\header{${personalInfo.name}}{${personalInfo.title}}

% Contato
\section{Contato}
\contactinfo{${personalInfo.email}}{${personalInfo.phone}}{${personalInfo.location}}
\sociallinks{${personalInfo.linkedin}}{${personalInfo.github}}{${personalInfo.website}}

% Resumo
\section{Resumo Profissional}
\summary{${summary}}

% Experiência
\section{Experiência Profissional}
\foreach \exp in ${experiences} {
  \experience{\exp.role}{\exp.company}{\exp.startDate}{\exp.endDate}{\exp.isCurrent}
  \techstack{\exp.technologies}
  \begin{itemize}
    \foreach \bullet in \exp.description {
      \item \bullet
    }
  \end{itemize}
}

% Formação
\section{Formação Acadêmica}
\foreach \edu in ${education} {
  \education{\edu.degree}{\edu.institution}{\edu.startDate}{\edu.endDate}
}

% Habilidades
\section{Habilidades Técnicas}
\foreach \category in ${skillCategories} {
  \skillcategory{\category.name}{\category.skills}
}

% Idiomas
\section{Idiomas}
\foreach \lang in ${languages} {
  \language{\lang.language}{\lang.proficiency}
}

\end{document}
```

---

## Contrato de API (Endpoints)

### GET `/api/resume/:language`

**Request**:
```http
GET /api/resume/pt-BR
Accept: application/json
```

**Response (200 OK)**:
```json
{
  "id": "resume-pt-br",
  "language": "pt-BR",
  "personalInfo": {
    "name": "Marcelino Sandroni Dias",
    "title": "Senior Software Engineer",
    "email": "email@exemplo.com"
  },
  "summary": "...",
  "experiences": [],
  "education": [],
  "skills": [],
  "languages": [],
  "lastUpdated": "2025-01-15T10:30:00Z"
}
```

**Response (404 Not Found)**:
```json
{
  "error": {
    "code": "RESUME_NOT_FOUND",
    "message": "Currículo não encontrado para o idioma pt-BR"
  }
}
```

---

### GET `/api/versions/:language`

**Request**:
```http
GET /api/versions/pt-BR
Accept: application/json
```

**Response (200 OK)**:
```json
{
  "versions": [
    {
      "id": "v1.0.0-pt-br-20250115",
      "versionNumber": "1.0.0",
      "publishedAt": "2025-01-15T10:30:00Z",
      "language": "pt-BR"
    }
  ]
}
```

---

### GET `/api/versions/:versionId/pdf`

**Request**:
```http
GET /api/versions/v1.0.0-pt-br-20250115/pdf
Accept: application/pdf
```

**Response (200 OK)**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="curriculo-v1.0.0-pt-br.pdf"
Content-Length: 123456

<PDF binary content>
```

**Response (404 Not Found)**:
```json
{
  "error": {
    "code": "PDF_NOT_FOUND",
    "message": "PDF não encontrado para a versão solicitada"
  }
}
```

---

## Contrato de Banco de Dados (Supabase)

### Tabela `published_versions`

```sql
CREATE TABLE published_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number VARCHAR(20) NOT NULL,
  language_code VARCHAR(5) NOT NULL CHECK (language_code IN ('pt-BR', 'en-US')),
  resume_content JSONB NOT NULL,
  pdf_storage_path TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(version_number, language_code)
);

CREATE INDEX idx_published_versions_status ON published_versions(status);
CREATE INDEX idx_published_versions_language ON published_versions(language_code);
CREATE INDEX idx_published_versions_published_at ON published_versions(published_at DESC);
```

### Tabela `pdf_artifacts`

```sql
CREATE TABLE pdf_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES published_versions(id),
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pdf_artifacts_version_id ON pdf_artifacts(version_id);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE published_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_artifacts ENABLE ROW LEVEL SECURITY;

-- Política: Leitura pública apenas para versões publicadas
CREATE POLICY "Public can view published versions"
  ON published_versions
  FOR SELECT
  TO public
  USING (status = 'published');

-- Política: Escrita apenas para usuários autenticados
CREATE POLICY "Authenticated users can publish versions"
  ON published_versions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política: Leitura pública de PDFs de versões publicadas
CREATE POLICY "Public can download PDFs of published versions"
  ON pdf_artifacts
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM published_versions pv
      WHERE pv.id = pdf_artifacts.version_id
        AND pv.status = 'published'
    )
  );
```

---

## Contrato de Eventos (Futuro - Pub/Sub)

### Evento: VersionPublished

```typescript
interface VersionPublishedEvent {
  type: 'VERSION_PUBLISHED';
  payload: {
    versionId: string;
    language: LanguageCode;
    publishedAt: string;
    pdfUrl?: string;
  };
  metadata: {
    eventId: string;
    timestamp: string;
    source: 'publication-service';
  };
}
```

### Evento: PdfGenerated

```typescript
interface PdfGeneratedEvent {
  type: 'PDF_GENERATED';
  payload: {
    versionId: string;
    storagePath: string;
    fileSizeBytes: number;
    checksumSha256: string;
  };
  metadata: {
    eventId: string;
    timestamp: string;
    source: 'pdf-generation-service';
  };
}
```

---

## Validações e Invariantes

### Validações de Domínio

```typescript
// Invariantes que devem ser validadas antes de qualquer operação

// 1. LanguageCode válido
function isValidLanguageCode(code: string): code is LanguageCode {
  return ['pt-BR', 'en-US'].includes(code);
}

// 2. Versão semântica válida
function isValidSemver(version: string): boolean {
  return /^(\d+)\.(\d+)\.(\d+)$/.test(version);
}

// 3. Data MonthYear válida
function isValidMonthYear(my: MonthYear): boolean {
  return my.month >= 1 && my.month <= 12 && my.year >= 1900 && my.year <= 2100;
}

// 4. Experiência com período coerente
function validateExperiencePeriod(exp: Experience): void {
  if (!exp.isCurrent && exp.endDate) {
    if (exp.endDate.year < exp.startDate.year ||
        (exp.endDate.year === exp.startDate.year && exp.endDate.month < exp.startDate.month)) {
      throw new Error('End date must be after start date');
    }
  }
}

// 5. Skills com categoria válida
function isValidSkillCategory(category: string): category is SkillCategory {
  const validCategories: SkillCategory[] = [
    'backend', 'frontend', 'mobile', 'devops', 'cloud', 
    'data', 'architecture', 'methodologies', 'soft-skills'
  ];
  return validCategories.includes(category as SkillCategory);
}
```

---

## Matriz de Contratos por Camada

| Contrato | Definido Em | Consumido Por | Implementado Por |
|----------|-------------|---------------|------------------|
| Resume Entity | Domain | Application, Presentation | Domain |
| ResumeRepository | Domain (interfaces) | Application | Infrastructure |
| PdfGenerator | Domain (interfaces) | Application | Infrastructure |
| Markdown Schema | Contracts | Infrastructure (parser) | Content Authors |
| LatexTemplateInput | Contracts | Infrastructure | Application |
| API Request/Response | Contracts | Presentation | Presentation |
| Database Schema | Contracts | Infrastructure | Supabase |
| Events | Contracts | Future Services | Future Services |

---

## Guia para Agentes de IA

### Ao Implementar Entidades de Domínio
- Use os schemas TypeScript como referência única
- Mantenha invariantes validadas no construtor/factory
- Nunca use tipos `any` ou opcionais sem justificativa

### Ao Criar Parsers (Markdown → Domain)
- Valide frontmatter obrigatório
- Lance erros claros para schema inválido
- Preserve fidelidade dos fatos (sem invenções)

### Ao Implementar Adapters de Infraestrutura
- Respeite interfaces definidas em Domain
- Use contratos de API e DB como especificação
- Trate erros de forma compreensível

### Ao Desenvolver Componentes React
- Tipagem baseada nas entidades de domínio
- Valide props com os contratos definidos
- Separe lógica de apresentação de lógica de negócio

### Ao Escrever Testes
- Use contratos como oráculo de comportamento esperado
- Valide tanto sucesso quanto falhas contratuais
- Mantenha testes próximos aos contratos que validam
