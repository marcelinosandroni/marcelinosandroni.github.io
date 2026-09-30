# ADR-014: Biblioteca de Componentes Própria, Sem Dependência Externa

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: — (o Product Spec cobre EPIC-01 a EPIC-04 e nenhum deles é a camada de UI; a tarefa correspondente precisa ser criada no `specs/tasks/tasks-catalog.md`)
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: — (nunca houve `components.json` nem dependência de biblioteca; esta ADR registra uma decisão que já estava no código)

## Contexto

A pergunta "qual biblioteca de componentes?" aparece em todo projeto Next.js, e a
resposta padrão hoje é shadcn/ui. Este projeto não usa nenhuma.

O que existe no lugar:

```
src/
├── components/ui/
│   ├── primitives.tsx   # 146 linhas: Section, SectionHeading, Chip, StatusPill, ChannelLink
│   ├── icon.tsx         #  97 linhas: Icon + ACCENT_DOT/ACCENT_TEXT/ACCENT_CHIP
│   └── index.ts         # barrel
└── app/globals.css      # @theme do Tailwind v4
```

Verificado no momento em que esta ADR foi escrita:

| Verificação | Resultado |
|---|---|
| `components.json` em qualquer lugar do repositório | não existe |
| `@radix-ui/*` em `package.json` | não existe |
| `shadcn`, `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react` | nenhum |
| `src/components/ui/` | três arquivos próprios, 256 linhas no total |
| Design system | tokens Tailwind v4 em `@theme`, mais as regras normativas de `DESIGN.md` |

Ou seja: **não há biblioteca de componentes**. A camada de UI é própria, e a
superfície dela é pequena o suficiente para ser lida inteira.

## Decisão

Nenhuma biblioteca de componentes e nenhum `components.json`. A camada de UI é
escrita à mão, sobre tokens, com o número de primitivas justificado por uso.

### 1. O design é um documento, não um conjunto de componentes

`DESIGN.md` é a fonte normativa, e ADR-009 (na Architecture Spec) fixa que a UI
é descrita **exclusivamente** por tokens Tailwind v4 em `@theme`. Nenhum componente
contém hex, px ou tamanho de fonte literal; se um valor não tem token, o token é
adicionado primeiro.

Isso inverte a pergunta que shadcn pressupõe. shadcn é ótimo quando o objetivo é
*materializar* um design system de terceiros e manter os arquivos versionados no seu
repositório. Aqui o design system é um documento normativo com regras que um
componente de biblioteca não consegue expressar — "todo botão tem no mínimo 44px de
alvo", "`rounded-full` só onde `DESIGN.md` §8.8 permite", "espaçamento vem de
`space-*` e nunca de `p-[13px]`". Um componente importado carrega as próprias
convenções; ele não carrega as suas regras.

### 2. A lista de primitivas é curta porque o site é

`Section`, `SectionHeading`, `Chip`, `StatusPill`, `ChannelLink`, `Icon`. Tudo mais
é composição. Uma biblioteca de componentes resolve um problema — *muitos* botões,
muitos inputs, muitas tabelas, muitos modais — e um portfólio de uma página com
seis seções não tem esse problema. O que ele tem é o oposto: um punhado de
elementos que precisam ser *idênticos entre si*, e é isso que `SectionHeading`
(mesma cabeçalho de três partes em toda seção) e `StatusPill` (único lugar onde
`rounded-full` é legítimo) existem para garantir.

Cada primitiva aponta para a seção de `DESIGN.md` que ela implementa, no comentário
acima dela. Um componente importado não sabe de onde veio.

### 3. Sem as dependências que acompanham a biblioteca

`class-variance-authority`, `tailwind-merge` e `clsx` são as três peças que fazem
`cn()` funcionar, e são elas que abrem caminho para "qualquer estilo pode ser
sobreposto por props". Sem elas, a variante é escrita no componente:

```tsx
const dotTone =
  tone === "primary" ? "bg-primary-container"
  : tone === "secondary" ? "bg-secondary"
  : "bg-tertiary";
```

Isto é mais verboso e mais difícil de errar. `cva` é uma abstração melhor quando
há dezenas de variantes; com três tons e um default, ela é um arquivo a
depender para escrever um ternário.

### 4. Sem `components.json`, sem CLI

`components.json` é o manifesto que o CLI do shadcn lê para saber onde colocar o
que ele gera e com que aliases importar. Sem ele, não há `npx shadcn add`, e
também não há um caminho pelo qual um componente de biblioteca entre no projeto
por acidente. Um arquivo de configuração ausente é uma restrição que não
depende de disciplina.

### 5. A consequence aceita: escrever de novo

Escrever um `Select` acessível, um popover com focus trap e um `Dialog` com
`aria-modal` **correto** custa mais caro do que importar. Este site não tem nenhum
dos três, e não vai ter sem que alguém decida que precisa — e essa decisão deve
passar por uma ADR como esta.

## Consequências

### Positivas

- **Zero dependência de UI.** `package.json` tem 13 dependências de runtime e
  nenhuma delas é uma biblioteca de componentes.
- **A camada de UI inteira cabe em uma leitura.** 256 linhas em três arquivos.
- **As regras do design são verificáveis.** Um componente com hex ou px literal é
  algo que se procura com `grep`; uma `variant` de biblioteca é algo em que se
  precisa confiar.
- **Nenhuma abstração de `cn()` para mascarar conflito de estilo.** Conflito de
  classe que aparece é um conflito de design, e aparece no componente.
- **Acessibilidade sob controle.** `StatusPill` tem `aria-pressed` no botão que o
  usa, `SoundtrackToggle` distingue estado com duas notas em vez de cor, e
  `LocaleSwitcher` é um `<Link>` de servidor real. Nada disso veio de uma
  biblioteca.
- **Token novo em vez de valor solto** (ADR-009 na Architecture Spec): um valor sem
  token obriga o token primeiro.

### Negativas e riscos

- **Sem primitivas prontas.** Precisa de um `Dialog`, `Select` ou popover acessível
  um dia, ele será escrito do zero.
- **Sem `aria-*` auditado de graça.** Acessibilidade de biblioteca chega pronta; aqui
  é responsabilidade de cada autor.
- **Sem ecossistema.** Correção upstream, Recipe do shadcn e adapters do Radix não
  chegam. Só Tailwind, React e o design system do projeto.
- **Pode ser lido como falta de Senioridade.** Não é: `DESIGN.md` mais `@theme`
  mais 256 linhas de primitivas é um design system explícito, e é verificável. Um
  `components.json` com quarenta aliases seria menos explícito.
- **Um `components.json` pode ser adicionado sem ninguém perceber**, por um
  contributor que siga o tutorial. A proteção é a revisão, não a configuração.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| shadcn/ui | Traria `components.json`, aliases, `cn()`, Radix e quarenta componentes para um site que usa seis primitivas — e cada componente carregaria convenções, não as regras de `DESIGN.md` |
| Radix direto, sem shadcn | Ganha o comportamento acessível e perde o controle do estilo; ainda é uma dependência de primitivas para um punhado de elementos |
| MUI / Chakra | Design opinionado próprio, CSS-in-JS, e o oposto de "a UI é tokens" |
| Manter `class-variance-authority` só | Três linhas de dependência para um ternário de três tons |
| `components.json` sem usar shadcn | Manifesto sem nada que o leia |
| Copiar os componentes do shadcn e congelar | É a mesma forma do shadcn, com o custo do CLI e sem as atualizações |
| Extrair um design system como pacote | Nenhum outro consumidor; seria versionamento próprio para um site só |
| Mais primitivas "por precaução" | Cada primitiva não usada é superfície que precisa casar com `DESIGN.md` e nunca será exercitada |

## Validação

- `npm run typecheck` — sem erros.
- `npm run lint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- Verificação de que a decisão continua verdadeira: nenhum `components.json` no
  repositório; nenhuma ocorrência de `@radix-ui/*`, `class-variance-authority`,
  `tailwind-merge`, `clsx` ou `lucide-react` em `package.json`; nenhum import
  desses módulos em `src/`.
- `npm run build` — build de produção sem erros.