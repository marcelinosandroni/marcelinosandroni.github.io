import { promises as fs } from "node:fs";
import { resolve } from "node:path";

import {
  BODY_PX,
  CONTACT_PX,
  LAYOUT_RULES,
  type LayoutRule,
} from "./data/resume-layout-rules";
import { variants } from "./data/stack-variants.pt-br";
import { REQUIRED_ORDER } from "./paginate-resume";

/**
 * Writes the brief a person hands to another model to write a variant.
 *
 * ## Why it is generated rather than written
 *
 * Because a document of limits that is maintained by hand is a document of limits
 * that is wrong within a month. Every number here comes from
 * `scripts/data/resume-layout-rules.ts`, the section order comes from the paginator,
 * and the worked example is the Java variant's own content read out of the data
 * module. Change a limit and re-run this and the brief says the new one; change the
 * Java variant's inventory and re-run and the example shows the new text.
 *
 * `tests/unit/scripts/variant-prompt.test.ts` fails the build when the file on disk
 * is not what this generates, so the brief cannot be edited into a lie and left
 * there — the same guard the layout contract has.
 *
 * ## Who it is for
 *
 * Someone writing content for one of the stack variants, possibly with a different
 * tool than this repository. It describes the whole document rather than only the
 * part that changes, because a model handed "write me a summary" alone will write a
 * summary of any length it likes.
 */

const OUTPUT = "docs/variant-content-prompt.md";

/** The typography the rules were calibrated at, in one place. */
const SCALE: ReadonlyArray<readonly [string, string]> = [
  ["--space-1", "1mm"],
  ["--space-2", "2mm"],
  ["--space-3", "4mm"],
];

/** The headings the shell carries, which the build matches on. */
const HEADINGS: ReadonlyArray<readonly [string, string]> = [
  ["Resumo Profissional", "Professional Summary"],
  [
    "Principais Métricas de Impacto em Produção",
    "Key Production Impact Metrics",
  ],
  ["Linha do Tempo de Carreira em Engenharia", "Career Timeline in Engineering"],
  ["Habilidades Técnicas &amp; Arquitetura de Software", "Technical Skills &amp; Software Architecture"],
  ["Formação Acadêmica &amp; Especializações", "Academic Education &amp; Specializations"],
  ["Idiomas", "Languages"],
  ["Experiência Profissional", "Professional Experience"],
];

/** What a role block looks like, spelled out rather than pointed at. */
const ROLE_SKELETON = `FIXO         Linha 1   <titulo do cargo> | <empresa>          à direita: (N anos e M meses) · Início – Fim
             Linha 2   Stack: <uma linha, nunca quebra>       <- você escreve
Bullets       o mais recente leva 3 · o seguinte 3 · o seguinte 3 · o seguinte 2 · o mais antigo 1
             <rótulo curto:> e depois a frase, justificado, 2 a 3 linhas   <- você escreve

Título, empresa, datas e tenure são fixos e compartilhados pelos cinco documentos.
A stack e os bullets são seus. O primeiro bullet de cada cargo começa com um <strong>rótulo curto:</strong>.
Exemplo: <strong>Custódia Institucional Estratégica:</strong> Desenvolvimento full-stack de portal B2B…

Regra do tudo-ou-nada: você declara as CINCO vagas ou nenhuma. Declarar três deixa
duas com o texto do currículo geral, e o documento passa a defender Node em três
vagas e Spring em duas — o contrato de layout não pega isso, porque cada stack e cada
bullet estão dentro dos limites individualmente.`;

/** The parts of the document a writer does not touch. */
const FIXED = [
  "Os seis campos de contacto — Localização, Email, WhatsApp, LinkedIn, Git, Portfólio. São fatos, iguais nos cinco documentos.",
  "A barra da linha do tempo — é montada a partir das datas das vagas, não escrita.",
  "As datas, as tenures, os títulos dos cargos e os nomes das empresas — são fatos, e existem em um lugar só. Uma variante que reescrevesse a própria vaga criaria um quinto lugar para uma data envelhecer.",
  "O nível de cada cargo de engenharia — o build exige que toda vaga nomeie o nível (Sênior, Pleno, Sênior & Tech Lead).",
  "Quantos bullets cada vaga tem — três, três, três, dois, um. É o que faz a página 2 ser escaneável.",
  "A ordem das seções — o build recusa um documento fora dela.",
  "A formação e os idiomas — uma linha por item.",
  "O cabeçalho, a tipografia e os espaçamentos.",
];

const EDITABLE = [
  "O headline (cargo + stack), em 1 linha.",
  "O resumo profissional, em até 5 linhas.",
  "As quatro métricas: valor, destaque verde e descrição.",
  "O inventário de habilidades, um grupo por linha de 2.",
  "A stack e os bullets de cada uma das cinco vagas — se a variante argumentar para outra stack.",
];

/** Renders the rules table, in the order a reader meets the document. */
function rulesTable(java: ReadonlyArray<readonly [number, number]>): string {
  return LAYOUT_RULES.map((rule: LayoutRule, index) => {
    const used = java[index];

    return `| ${rule.label} | **${rule.maxLines}** | **${rule.maxChars}** | ${
      used === undefined ? "—" : String(used[1])
    } | ${rule.why.split(/(?<=\.)\s/)[0]} |`;
  }).join("\n");
}

/**
 * What the Java variant uses, in characters, so the writer can see the room left.
 *
 * Read out of the data module rather than typed, because a figure copied by hand is
 * a figure that is wrong the next time the content is edited.
 *
 * Characters only, never a line count. A line count here would have to be guessed —
 * counting sentences tells you nothing about how text wraps at a given measure and
 * font — and a guessed number under a heading of "No Java" is worse than an honest
 * blank. The build measures the real one and prints it on every run.
 */
function javaUsage(): ReadonlyArray<readonly [number, number]> {
  const java = variants.find((variant) => variant.slug === "enterprise-java");

  if (java === undefined) {
    throw new Error("the Java variant is not in the variant data, so there is no example");
  }

  const summary = plain(java.sections.summary);
  const metrics = [
    ...java.sections.metrics.matchAll(/data-rule="metrica-(valor|destaque|descricao)"[^>]*>([^<]*)</g),
  ].map((match) => match[2]!.trim());
  const inventory = (java.inventory ?? []).map((group) => plain(`${group[0]}: ${group[1]}`));

  return LAYOUT_RULES.map((rule) => {
    switch (rule.hook) {
      case "cargo":
        return [1, plain(java.headline).length] as const;
      case "resumo":
        return [0, summary.length] as const;
      case "metrica-valor":
        return [1, longest(metrics, 0)] as const;
      case "metrica-destaque":
        return [1, longest(metrics, 1)] as const;
      case "metrica-descricao":
        return [2, longest(metrics, 2)] as const;
      case "habilidade":
        return [2, Math.max(...inventory.map((group) => group.length))] as const;
      default:
        /* Fixed content, identical in every document. */
        return [rule.maxLines, FIXED_USAGE[rule.hook] ?? 0] as const;
    }
  });
}

/** Strips markup and collapses whitespace, the way the layout contract counts. */
function plain(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

/** The longest of every third metric: the values, the labels, or the captions. */
function longest(metrics: ReadonlyArray<string>, offset: number): number {
  const every = metrics.filter((_, index) => index % 3 === offset);

  return every.length === 0 ? 0 : Math.max(...every.map((value) => value.length));
}

/** What the fixed parts actually use, measured from the Java document. */
const FIXED_USAGE: Readonly<Record<string, number>> = {
  nome: 23,
  tagline: 77,
  contato: 110,
  "tl-empresa": 11,
  "tl-nivel": 23,
  "tl-ano": 4,
  formacao: 62,
  idioma: 80,
  "cargo-titulo": 51,
  "cargo-periodo": 41,
  stack: 109,
  bullet: 260,
};

function javaExample(): string {
  const java = variants.find((variant) => variant.slug === "enterprise-java");

  if (java === undefined) {
    throw new Error("the Java variant is not in the variant data, so there is no example");
  }

  /*
    The summary's lead is a `<strong>` that runs to the end of its own sentence, and
    it carries a trailing space inside the tag so the body follows it. Two ways that
    went wrong when this was first written: marking both the lead and the body gave
    `**…**` immediately followed by `**` again, which reads as a typo; and trimming
    the lead took the space with it, so the bold ran into the next word —
    `financeiro.**Atuo`. Trim for the marker and put the space back.
  */
  const summary = java.sections.summary
    .replace(/<strong>([\s\S]*?)<\/strong>/, (_match, lead: string) => `**${lead.trim()}** `)
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const metrics = [...java.sections.metrics.matchAll(/data-rule="metrica-(valor|destaque|descricao)"[^>]*>([^<]*)</g)].map(
    (match) => match[2]!.trim(),
  );

  const cards: string[] = [];

  for (let i = 0; i < metrics.length; i += 3) {
    cards.push(
      `| **${metrics[i]}** | ${metrics[i + 1]} | ${metrics[i + 2]} |`,
    );
  }

  const groups = (java.inventory ?? []).map(
    (group) => `- **${group[0].replace(/&amp;/g, "&")}:** ${group[1]}`,
  );

  return `### Headline

\`\`\`
${java.headline.replace(/&amp;/g, "&")}
\`\`\`

### Resumo profissional

> ${summary}

### As quatro métricas

| valor | destaque | descrição |
|---|---|---|
${cards.join("\n")}

### Inventário de habilidades

${groups.join("\n")}`;
}

/**
 * The set of documents, read out of the variant data.
 *
 * Written by hand it was correct until a fourth variant was added, at which point it
 * described five documents while the project shipped six - and the brief is the
 * thing handed to another model to write the seventh. A list that quietly falls
 * behind is worse than no list, because it is believed.
 *
 * The leading word is stripped rather than the whole label reproduced, because the
 * brief names the backend and frontend a reader chooses on, and the data's label
 * leads with a register - `Enterprise`, `Modern` - that the reader is not choosing
 * between.
 *
 * The English line is written out rather than derived: `en-US` is rendered by
 * `scripts/build-english-resume.ts` and has no entry in the Portuguese variant data,
 * so there is nothing here to read it from.
 */
function documents(): ReadonlyArray<string> {
  return [
    "`pt-BR` — o geral",
    ...variants.map(
      (variant) => `\`pt-BR\` — ${variant.label.replace(/^[A-Z][a-z]+ /, "")}`,
    ),
    "`en-US` — o geral",
  ];
}

function document_(java: ReadonlyArray<readonly [number, number]>): string {
  return `# Prompt: escrever o conteúdo de uma variante do currículo

> **Cole este arquivo inteiro, do início ao fim, num modelo de linguagem.** Ele
> descreve o documento todo, não só a parte que muda. Um modelo que recebe só
> "escreva um resumo" escreve um resumo do tamanho que quiser.

Gerado de \`scripts/data/resume-layout-rules.ts\` por \`scripts/write-variant-prompt.ts\`.
A fonte da verdade é o código: \`npm run resume:prompt\` reescreve este arquivo.

---

## 1. O que este currículo é

${documents().length} documentos que compartilham **uma estrutura e uma tipografia**:

${documents().join("\n")}

Dois A4, sempre. **Página 1 vende o perfil; página 2 é a experiência completa.**
A quebra entre as duas é forçada, não automática.

---

## 2. A regra que não se move

> **A tipografia é fixa. O conteúdo é a variável.**

Tudo o que o leitor lê como texto está em **${BODY_PX}px**. Se algo não cabe, o
build **para e diz qual item e em quantos caracteres**. A correção é escrever
menos.

**Diminuir a tipografia para caber é o erro que este contrato existe para
impedir**, e já aconteceu neste projeto duas vezes: o corpo foi afinado abaixo do
resumo, e a página que saiu deixou de dizer o que se propunha dizer.

Duas exceções, e são só duas — ambas declaradas na tabela abaixo com o limite que
as sustenta: o bloco de contacto a ${CONTACT_PX}px (seis campos de referência não são
prosa) e as legendas das métricas (um cartão de 43mm não comporta duas linhas de
legenda a ${BODY_PX}px).

---

## 3. A ordem dos blocos — obrigatória

O build recusa um documento fora desta ordem:

${REQUIRED_ORDER.map((id) => `- \`${id}\``).join("\n")}

Os títulos são casados pelo **texto exato**, então renomear um quebra o build:

${HEADINGS.map(([pt, en]) => `- \`${pt}\` — \`${en}\``).join("\n")}

---

## 4. A escala de espaçamento

Três passos, em milímetros, e **toda distância na página é um deles**:

${SCALE.map(([step, value]) => `- \`${step}\` = **${value}**`).join("\n")}

- **1mm** — entre irmãos de uma **lista**: grupos de habilidade, cursos, idiomas, linhas de contacto
- **2mm** — entre **parágrafos** (os bullets), e do título de uma seção ao seu conteúdo
- **4mm** — entre **blocos**

---

## 5. A tabela de limites

**Linhas** é o orçamento renderizado. **Caracteres** é o orçamento de escrita: dá
para saber que se está em 185 de 215 sem rodar nada, e continua dentro. A última
coluna é quanto o documento Java + Angular usa hoje — a folga que sobrou.

| Parte | Linhas | Caracteres | No Java (chars) | Por quê |
|---|---:|---:|---:|---|
${rulesTable(java)}

> O limite de caracteres foi medido a partir de quanto texto cabe numa linha
> **nesta tipografia exata**, com folga. Então um texto com exatamente o limite
> ainda pode dar uma linha a mais — por isso **as linhas têm a palavra final**.

---

## 6. O que você escreve, e o que é fixo

### Você escreve

${EDITABLE.map((line) => `- ${line}`).join("\n")}

### Não se mexe — é fixo em todos os cinco documentos

${FIXED.map((line) => `- ${line}`).join("\n")}

---

## 7. O esqueleto de uma vaga

\`\`\`
${ROLE_SKELETON}
\`\`\`

O bullet é justificado, como o resumo e o inventário. Cada bullet leva 2 a 3 linhas.

---

## 8. O exemplo, que é o documento Java + Angular

${javaExample()}

Os seis campos de contacto, em duas linhas de três, um \`div\` por par:

\`\`\`
row 1   Localização: Fortaleza, CE (Atuação Remota)
        Email: marcelino.sandroni@gmail.com
        WhatsApp: +55 11 91446-1993
row 2   LinkedIn: linkedin.com/in/marcelinosandroni
        Git: github.com/marcelinosandroni
        Portfólio: marcelinosandroni.com
\`\`\`

---

## 9. O que o build recusa

Cada um destes já reprovou uma execução:

- **Uma linha a mais** em qualquer item da tabela — o build nomeia o item e a frase.
- **Mais caracteres** que o orçamento, mesmo que ainda caiba em duas linhas. É o aviso-previo.
- **Transbordo horizontal** num item de uma linha. Elemento com \`nowrap\` não quebra: ele *estoura*, e a contagem de linhas continua 1 — é por isso que o transbordo é medido à parte.
- **Uma regra sem elemento** — se o gancho \`data-rule\` sumir, o build acusa a regra que parou de verificar alguma coisa.
- **Uma vaga de engenharia sem nível** no título.
- **Uma data fora de ordem** — as vagas são da mais recente para a mais antiga.
- **Uma variante que declara só três das cinco vagas** — as outras duas ficam com o texto do currículo geral. Declare as cinco ou nenhuma.
- **Um número de bullets que não bate com o da vaga** — a contagem é do documento, não da variante.
- **Uma stack numa vaga que não tem linha de stack** — a vaga contábil não é de engenharia, e é de engenharia que uma stack é.
- **Um texto em português no documento inglês**, pela lista de vestígios.

---

## 10. Depois de escrever

\`\`\`bash
npm run resume:build-variants     # constrói e roda o contrato de layout
npm run resume:measure -- resume-recruiter-pt-br-<sua-variante>.html
npm run pdf:fixed:build          # gera e verifica os cinco PDFs
\`\`\`

Se o build reclamar de linhas ou caracteres, **o texto é que encurta** — a
tipografia não se move.
`;
}

async function main(): Promise<void> {
  const content = document_(javaUsage());

  await fs.writeFile(resolve(OUTPUT), content, "utf8");

  console.log(`wrote ${OUTPUT} (${content.length} chars, ${LAYOUT_RULES.length} rules)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});