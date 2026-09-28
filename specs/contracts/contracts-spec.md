# Contratos e Especificações Técnicas (Contracts Spec)

## Visão Geral
Este documento define os contratos técnicos entre camadas, especificações de dados, schemas e formatos para garantir consistência e facilitar a implementação por agentes de IA.

---

## Contrato de Internacionalização

> Implementado conforme [ADR-005](../../docs/adr/ADR-005-internationalization-strategy.md).
> Este é o contrato que governa **todo texto** exibido pela aplicação.

### Contrato de Locale (`src/domain/i18n/locale.ts`)

| Símbolo | Tipo | Valor / Regra |
|---|---|---|
| `SUPPORTED_LOCALES` | `readonly ["en-US", "pt-BR"]` | Locales suportados, em tag BCP-47 canônica |
| `DEFAULT_LOCALE` | `"en-US"` | Idioma padrão; destino de `x-default` e de fallback |
| `Locale` | `"en-US" \| "pt-BR"` | Tag canônica; usada em domínio, conteúdo e artefatos |
| `LocaleSegment` | `"en-us" \| "pt-br"` | Segmento de URL em minúsculas |
| `LOCALE_SEGMENTS` | `Record<Locale, LocaleSegment>` | Mapeamento canônico entre tag e segmento |
| `LOCALE_LABELS` | `Record<Locale, {endonym, short}>` | Endônimo e sigla de UI por locale |

**Funções do contrato**

| Função | Assinatura | Comportamento |
|---|---|---|
| `isLocale` | `(value: string) => value is Locale` | `true` apenas para tags canônicas exatas |
| `isLocaleSegment` | `(value: string) => value is LocaleSegment` | Case-insensitive |
| `canonicalizeSegment` | `(segment: string) => LocaleSegment \| null` | Minúscula canônica ou `null` |
| `toLocaleSegment` | `(locale: Locale) => LocaleSegment` | Total |
| `toLocale` | `(segment: string) => Locale \| null` | Lenient, aceita qualquer caixa |
| `toLocaleFromSegment` | `(segment: LocaleSegment) => Locale` | Total; exige narrowing prévio |
| `resolveLocale` | `(tag: string) => Locale \| null` | Aceita `pt`, `pt-PT`, `pt_BR`; `null` se idioma não suportado |
| `getAlternateLocale` | `(locale: Locale) => Locale` | Sempre um locale suportado diferente do recebido |
| `getAlternateLanguageMap` | `(suffix?: string) => Record<string, string>` | Mapa `hreflang` com todos os locales + `x-default`; `suffix` aponta para rotas aninhadas |
| `getAlternateOpenGraphLocales` | `(locale: Locale) => string[]` | Locales Open Graph exceto o ativo |
| `toOpenGraphLocale` | `(locale: Locale) => string` | `pt-BR` → `pt_BR` |

**Invariantes**
1. `toLocaleSegment` sempre produz minúsculas.
2. `toLocale` e `toLocaleFromSegment` são inversas uma da outra para segmentos válidos.
3. `getAlternateLocale(l)` ∈ `SUPPORTED_LOCALES` e ≠ `l`.
4. `SUPPORTED_LOCALE_SEGMENTS` é sempre derivado de `SUPPORTED_LOCALES`.
5. O domínio não importa React, Next.js nem `negotiator`.
6. `getAlternateLanguageMap(suffix)` sempre inclui `x-default` apontando para o
   locale de referência, com o mesmo `suffix`. Uma rota aninhada que redeclare
   `alternates` precisa declarar o conjunto **completo**: o Next.js substitui o
   objeto do layout em vez de mesclá-lo, então declarar apenas `canonical`
   removeria os `hreflang` do layout.

### Contrato de Negociação (`src/infrastructure/i18n/negotiate-locale.ts`)

```typescript
function negotiateLocale(acceptLanguage: string | null | undefined): Locale;
```

- Usa `@formatjs/intl-localematcher` + `negotiator` (RFC 4647 lookup, com `q` values).
- **Nunca lança**: header ausente, vazio ou malformado retorna `DEFAULT_LOCALE`.
- Compatível com edge: sem APIs Node, sem estado global.

### Contrato do Catálogo de Mensagens (`src/i18n/dictionaries/`)

```typescript
// en-US.ts — locale de REFERÊNCIA. Define o contrato.
export const enUS = { metadata: {...}, nav: {...}, hero: {...}, ... };
export type Dictionary = typeof enUS;

// pt-BR.ts —-DEVE satisfazer o contrato.
export const ptBR: Dictionary = { ... };
```

**Invariantes**
1. Todo locale satisfaz `Dictionary`; chave ausente ou com forma errada **quebra a compilação**.
2. Todo valor é `string` não vazio ou `string[]` não vazio.
3. Listas não contêm entradas duplicadas nem entradas em branco.
4. Placeholders `{nome}` são idênticos entre locales para a mesma chave.
5. `metadata.knowsAbout` e as chaves de `pdf.templates` correspondem um a um entre locales.
6. `metadata.keywords` **não** precisa ter o mesmo tamanho entre locales: conjuntos de SEO são específicos por idioma.
7. Catálogos são carregados por `import()` dinâmico, um chunk por locale, e **nunca** são importados por Client Components.

**Placeholders** são resolvidos por `formatMessage(template, values)`. Placeholders
sem valor permanecem visíveis no texto, para que a falha apareça na interface em
vez de virar um buraco silencioso.

```typescript
function formatMessage(template: string, values?: Record<string, string | number>): string;
```

### Contrato de Acesso ao Catálogo (`src/i18n/dictionaries/index.ts`)

| Função | Uso | Restrição |
|---|---|---|
| `getDictionary(locale)` | Código com locale explícito (metadata, 404) | Server only |
| `getDictionaryForRoute()` | Server Components aninhados | Server only; usa `next/root-params` |
| `requireLocaleForRoute()` | Componentes que precisam do `Locale` canônico | Server only; chama `notFound()` se inválido |

`getDictionaryForRoute` e `requireLocaleForRoute` importam `locale` de
`next/root-params`. O nome do getter deriva do nome do segmento (`app/[locale]`),
e o valor devolvido é o segmento **cru** da URL (`pt-br`), que precisa ser
normalizado para a tag canônica. Importar qualquer um deles em um Client
Component é erro de build.

### Contrato de Rotas

| Rota | Tipo | Idioma | Descrição |
|---|---|---|---|
| `/` | redirect 307 | negociado | Redireciona para `/{locale}` |
| `/en-us` | SSG | `en-US` | Home executiva em inglês |
| `/pt-br` | SSG | `pt-BR` | Home executiva em português |
| `/en-us/resume`, `/pt-br/resume` | SSG | por locale | Currículo completo — documento de registro |
| `/en-us/blog`, `/pt-br/blog` | SSG | por locale | Índice do blog, lido de `blog_articles` |
| `/en-us/blog/{slug}`, `/pt-br/blog/{slug}` | SSG + runtime | por locale | Artigo. Slugs conhecidos no build são pré-renderizados; os demais renderizam na primeira requisição (`dynamicParams` default), para que publicar não exija novo deploy |
| `/en-us/blog/Not%20ASlug` | 404 | — | `ArticleSlug.create` falha antes de qualquer consulta |
| `/PT-BR`, `/pt_BR` | redirect 308 | — | Canonicalização do segmento |
| `/?locale=pt-BR`, `/?lang=pt` | redirect 307 | — | Compatibilidade com links legados |
| `/fr` | 404 | — | Locale não suportado (`dynamicParams = false`) |
| `/sitemap.xml` | static | — | Home, currículo, blog e artigos, por locale, com `hreflang` |
| `/robots.txt` | static | — | Permite `/`, bloqueia `/api/` |
| `/api/resume/{locale}/pdf` | dynamic | — | Route Handler, fora de `[locale]` |

Links entre páginas são construídos exclusivamente por
`src/domain/site/routes.ts` (`homePath`, `resumePath`, `blogPath`, `articlePath`),
de modo que nenhum componente duplica uma string de rota e nenhum leitor pt-BR
chega a uma página em inglês.

### Contrato de Metadados por Idioma

Gerados por `generateMetadata` em `app/[locale]/layout.tsx`:

| Campo | Origem |
|---|---|
| `title`, `description` | `metadata.title` / `metadata.description` do catálogo |
| `keywords` | `metadata.keywords` do catálogo |
| `alternates.canonical` | `/{segmento}` |
| `alternates.languages` | `getAlternateLanguageMap()` (inclui `x-default`) |
| `openGraph.locale` | `toOpenGraphLocale(locale)` |
| `openGraph.alternateLocale` | demais locales suportados |
| `openGraph.siteName`, `twitter.*` | `metadata.*` do catálogo |
| JSON-LD `inLanguage` | `locale` canônico |
| JSON-LD `description`, `jobTitle`, `knowsAbout` | `metadata.*` do catálogo |

Rotas aninhadas (`/resume`, `/blog`, `/blog/[slug]`) possuem `generateMetadata`
próprio e **redeclaram `alternates` e `openGraph` por inteiro**, incluindo o
conjunto `hreflang` e o par `og:locale`. Declarar apenas `canonical` removeria
esses campos, porque o Next.js substitui (não mescla) esses objetos.

A home declara **apenas** `title` e `description` em `generateMetadata`. A copy
vem de `home.hero.name` + `home.hero.role` e `home.hero.metaDescription`; o
layout continua sendo dono de `alternates`, `openGraph` e `twitter`.

O artigo emite `BlogPosting` (JSON-LD) com `headline`, `datePublished`,
`dateModified`, `author`, `wordCount` e `timeRequired`, e retorna
`robots: { index: false }` quando o slug é desconhecido ou inválido.

Regras transversais de SEO que também são contrato:

- **Nenhum texto visível pode ser escrito diretamente em componentes.** Toda
  string exibida vem de um catálogo.
- **Rótulos acessíveis** (`aria-label`, `role`, `alt`) também são traduzidos.
- **Âncoras de seção são neutras**: `#experience`, `#skills`, `#education`.
- **Identificadores técnicos** não são traduzidos: `ResumeTemplateId` (`CLEAN`,
  `REFERENCE`) e `RESUME_TEMPLATE_IDS` permanecem estáveis, pois são contrato
  com o endpoint de PDF.
- **Metadados de arquivo** não são traduzidos: o PDF mantém o nome do autor.

### Contrato de Paridade de Conteúdo do Currículo

**PT-BR é a fonte da verdade.** A versão EN-US é uma tradução completa e fiel do
currículo em português, nunca uma versão resumida.

| Elemento | Invariante |
|---|---|
| Identidade e contatos | Idênticos entre idiomas |
| Experiências | Mesmo número, mesma ordem, mesmas empresas |
| Período | Mesmos dígitos; apenas nomes de mês são traduzidos (`Dez` → `Dec`, `Presente` → `Present`) |
| Cargo | Traduzido sem perder senioridade nem o papel de liderança |
| Highlights | Mesmo número por experiência; tamanho comparável ao original |
| Case studies | Mesmo número, com `challenge`, `solution` e `result` preenchidos |
| Métricas | Mesmo número; `icon` idêntico; `value` com os mesmos dígitos |
| Figuras | Todo número citado em EN-US também existe em PT-BR |
| `technologies`, `teamSize`, `scope` | Presentes e alinhados |
| `education`, `skillGroups`, `languages` | Mesmo número de entradas |

**Regras de tradução**
1. Termos técnicos compartilhados podem permanecer iguais entre idiomas
   (ex.: `Frontend & Performance`). Não é divergência.
2. Números escritos por extenso são traduzidos (`100 milhões` → `100 million`),
   portanto a invariante é sobre os **dígitos**, não sobre a string.
3. `**negrito**` não é suportado pelos renderizadores de PDF e não deve ser
   introduzido em texto traduzido.

**Validação**: `tests/unit/presentation/content-locale.test.ts` executa no CI a
cada build. Uma versão EN-US abreviada ou com fatos divergentes falha o build.

### Contrato de Rótulos do PDF

O PDF gerado também é interface: os títulos das seções são texto visível e
obedecem à mesma regra dos catálogos.

| Elemento | Origem |
|---|---|
| Títulos de seção do template `CLEAN` | `pdf.sections` do catálogo |
| Títulos de seção do template `REFERENCE` | `pdf.referenceSections` do catálogo |
| Nomes e descrições de template | `pdf.templates.{CLEAN,REFERENCE}` do catálogo |
| Rótulos de ação e erro | `pdf.download`, `pdf.generating`, `pdf.failed`, `pdf.unknownError`, `pdf.chooseTemplate` |

**Contrato de entrada**

```typescript
type ResumeSectionLabels = {
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
};

type ResumeDocumentInput = {
  version: ResumeVersion;
  locale: Locale;
  content: ResumeContent;
  templateId?: string;
  labels: ResumeSectionLabels;  // obrigatório
};
```

`labels` é **obrigatório**: o renderer é função pura da sua entrada e não pode
conter texto próprio. O chamador resolve via
`getPdfSectionLabels(dictionary, templateId)`.

**Regras**
1. O renderer não contém nenhum literal de título. Isso é verificado por teste
   que lê o fonte do renderer.
2. Os títulos são preservados **exatamente** como eram antes da extração, para
   que o PDF do cliente não mude. "Core Skills & Arquitetura de Software" é
   intencional: o modelo REFERENCE reproduz os títulos do PDF de referência.
3. `src/i18n/dictionaries/loader.ts` não importa Next.js, permitindo que o
   script `compile-pdf.ts` resolva os catálogos fora do runtime do Next.
4. `caseStudies` **não** são renderizados por nenhum renderer. Todo o conteúdo de
   case study, incluindo a marcação markdown `**`, está fora do PDF atual.

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

## Contrato de Conteúdo da Home (Executive Overview)

A home é uma landing page executiva cujo **todo** texto lido por um visitante é
dado, não markup. O contrato vive em `src/domain/portfolio/home-content.ts`; os
dados em `src/infrastructure/content/home/home-{locale}.ts`.

### Divisão de responsabilidade

| Origem | Contém | Exemplo |
| --- | --- | --- |
| `ResumeContent` | documento de registro, fonte da trajetória | cargos, destaques, tecnologias, formação |
| `HomeContent` | enquadramento da home | KPIs, arsenal, badges de impacto, copy do hero, blog teasers, contato, rodapé |
| `Dictionary` | chrome de UI | rótulos, aria, unidades, formatos |

O currículo **não** é reformatado pelo design da home. A home **reusa** fatos do
currículo (trajetória, formação) e possui copy própria. Ver
[`DESIGN.md`](../../DESIGN.md) §12.

### Vocabulários fechados

Dados nunca nomeiam uma cor nem um glifo livremente:

```ts
type AccentTone = "primary" | "secondary" | "tertiary";   // lime | mint | slate
type StatScale  = "monumental" | "headline";              // 48px | 32px
type IconName   = /* 21 nomes, ver src/domain/portfolio/home-content.ts */;
```

Um `IconName` que a camada de apresentação não sabe renderizar é um erro de
compilação, não um glifo ausente.

### Junção com o currículo

`HomeExperienceAnnotation` liga-se a `ResumeExperience` por `company`, nunca por
posição — reordenar o currículo nunca reaponta um badge em silêncio. O join é
verificado como total e não ambíguo para ambos os idiomas por
`tests/unit/presentation/home-content.test.ts`.

### Invariantes verificadas

- `locale` bate com o registro consultado
- Todo texto de usuário final é não-vazio e sem placeholder
- Ids de seção são únicos e existem como âncora renderizada
- `hero.secondaryAction.href` aponta para `#trackRecord.id`
- Todo `href` interno resolve para uma rota real (`resume`, `blog`) ou para uma
  âncora renderizada
- Slugs de blog teaser são `ArticleSlug` válidos
- Contagens (KPIs, clusters, canais, colunas) e escalas de estatística são
  idênticas entre `pt-BR` e `en-US`

### `hero.portrait.src`

Opcional por contrato. `null` renderiza um monograma desenhado — um asset
intencional, não uma imagem quebrada. Apontar para um arquivo em `public/`
(por exemplo `"/portrait.jpg"`) é a única mudança necessária para usar uma
fotografia; `next/image` assume dimensões e evita layout shift.

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

> ⚠️ **Drift conhecido:** esta seção descreve `published_versions` e
> `pdf_artifacts`, mas a migration aplicada
> (`supabase/migrations/20260831000100_resume_publication.sql`) criou a tabela
> única `resume_versions`, com `version`/`locale`/`content`/`published_at` e uma
> policy `FOR SELECT` para `anon, authenticated`. Trate a migration como a
> verdade; reconcilie esta seção em uma tarefa própria antes de construir sobre
> `published_versions`.

### Tabela `blog_articles`

Fonte da verdade do blog. Uma linha por (artigo, idioma); o corpo é um array
JSONB de blocos tipados, espelhando `ArticleBlock` em
`src/domain/blog/article.ts`.

```sql
create type public.blog_category as enum (
  'distributed-systems', 'data-platforms', 'leadership', 'ai-ml', 'fintech'
);
create type public.article_status as enum ('published', 'draft');

create table public.blog_articles (
  id uuid primary key,
  locale text not null check (locale in ('pt-BR', 'en-US')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 96),
  category public.blog_category not null,
  status public.article_status not null default 'draft',
  title text not null check (length(btrim(title)) > 0),
  excerpt text not null check (length(btrim(excerpt)) > 0),
  reading_time_minutes smallint not null check (reading_time_minutes between 1 and 120),
  published_at date not null,
  updated_at date,
  featured boolean not null default false,
  tags text[] not null default '{}',
  body jsonb not null check (jsonb_typeof(body) = 'array' and jsonb_array_length(body) > 0),
  created_at timestamptz not null default now(),
  unique (locale, slug)
);

create index blog_articles_feed_idx
  on public.blog_articles (locale, published_at desc)
  where status = 'published';

create index blog_articles_featured_idx
  on public.blog_articles (locale, published_at desc)
  where status = 'published' and featured;
```

Invariantes:

- `id` é um UUID **estável**, compartilhado com o catálogo versionado em
  `src/infrastructure/content/blog/`. É a chave de reconciliação entre a migration
  e o código; nunca deve ser regenerado.
- `slug` obedece ao mesmo invariante de `ArticleSlug.create`. O CHECK do banco e
  o value object são a mesma regra em duas camadas.
- `body` nunca é HTML. Blocos tipados apenas
  (`paragraph`, `heading`, `list`, `quote`, `code`, `callout`).
- Um artigo é uma linha por idioma: `pt-BR` e `en-US` compartilham `id` e `slug`.

### RLS de `blog_articles`

```sql
alter table public.blog_articles enable row level security;

-- Somente publicado, e somente a partir da data de publicação.
create policy "published blog articles are publicly readable"
  on public.blog_articles
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= current_date);
```

Não existe policy de `INSERT`/`UPDATE`/`DELETE`: o site não tem UI de autoria, e
toda escrita passa por service-role ou por uma migration revisada. Um `draft` é
invisível para o papel anônimo mesmo com a tabela exposta.

### Contrato de leitura (porta `ArticleRepository`)

```ts
interface ArticleRepository {
  listPublished(locale: Locale, limit?: number): Promise<ArticleSummary[]>;
  findPublishedBySlug(locale: Locale, slug: ArticleSlug): Promise<BlogArticle | null>;
}
```

Regras de composição, em `src/infrastructure/repositories/index.ts`:

1. Sem `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` → `VersionedArticleRepository`
   diretamente (sem import dinâmico do adapter, sem chamada de rede).
2. Com banco configurado → `FallbackArticleRepository(Supabase, Versioned)`.
3. Falha do primário → `onFallback` abre um circuit breaker de 60s; durante a
   janela, o catálogo versionado responde sem tocar a rede.
4. O adapter tem deadline de 2s por requisição. Um blog nunca deve segurar o
   render de uma página.

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
