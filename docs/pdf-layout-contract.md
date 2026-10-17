# Contrato de Layout dos Currículos de Recrutador

A tabela de limites que os cinco documentos de recrutador respeitam: para cada
parte, quantas linhas ela ocupa e quantos caracteres pode ter.

**A fonte da verdade é [`scripts/data/resume-layout-rules.ts`](../scripts/data/resume-layout-rules.ts).**
Esta página é a mesma tabela em prosa, para quem vai escrever conteúdo. Um teste
(`tests/unit/scripts/pdf-layout-contract.test.ts`) compara as duas e falha o build
se divergirem — um documento que descreve limites que o código não tem é pior do
que não ter documento.

---

## A regra que não se move

> **A tipografia é fixa. O conteúdo é a variável.**

Se algo não cabe, o build para e diz qual item e em quantos caracteres. A correção
é escrever menos. **Diminuir a tipografia para caber é o erro que este contrato
existe para impedir** — e já aconteceu neste projeto: duas rodadas de "economia"
afinaram o corpo do documento abaixo do resumo, e o resultado foi uma página que
não dizia mais o que se propunha dizer.

Isso vale para os dois registros abaixo também: **subir um limite é fácil e
loud**, mudar um tamanho de fonte invalida de uma vez todos os números de
caractere desta tabela, porque todos foram medidos a partir de quanto texto cabe
numa linha.

---

## A tabela

`Linhas` é o orçamento renderizado. `Caracteres` é o orçamento de escrita: dá para
saber que se está em 185 de 215 sem rodar nada, e continua dentro.

| Parte | Linhas | Caracteres | Tipografia | Usado hoje |
|---|---:|---:|---|---:|
| Nome | 1 | 40 | 30px (display) | 23 |
| Cargo (headline) | 1 | 80 | 16px (display) | 51 |
| Tagline | 1 | 120 | 12.5px | 77 |
| Contacto (as duas linhas) | 2 | 230 | 11px ⚠ | 218 |
| Resumo Profissional | 5 | 500 | 12.5px | 468 |
| Métrica — valor | 1 | 24 | 16px (display) | 16 |
| Métrica — destaque | 1 | 26 | 9px ⚠ | 23 |
| Métrica — descrição | 2 | 64 | 9px ⚠ | 60 |
| Linha do tempo — empresa | 1 | 14 | 12.5px | 11 |
| Linha do tempo — nível | 2 | 26 | 12.5px | 23 |
| Linha do tempo — ano | 1 | 4 | 12.5px | 4 |
| Habilidades Técnicas (cada grupo) | 2 | 215 | 12.5px | 208 |
| Formação Acadêmica (cada item) | 1 | 80 | 12.5px | 62 |
| Idiomas (cada item) | 1 | 100 | 12.5px | 80 |
| Experiência — título do cargo | 1 | 60 | 13px | 51 |
| Experiência — período | 1 | 48 | 12.5px | 45 |
| Experiência — stack | 1 | 112 | 12.5px | 109 |
| Experiência — bullet | 3 | 300 | 12.5px | 260 |

⚠ = abaixo do corpo, e são **os dois únicos**. Ver [As duas exceções](#as-duas-exceções).

"Usado hoje" é o pior caso medido entre os cinco documentos — o geral, os três de
stack e o en-US. O build imprime essa tabela a cada execução, com `OVER` no que
estourou.

---

## Por que dois números e não um

**Linhas** é o que quebra a página, e só se descobre renderizando. **Caracteres**
conta sem navegador, o que faz dele o orçamento com que se escreve.

O limite de caracteres foi calibrado a partir da capacidade de linha medida nesta
tipografia exata, com uma margem para onde as palavras caem. Ele é um proxy
conservador: um parágrafo com exatamente o limite ainda pode dar uma linha a mais.
Por isso **as linhas têm a palavra final**, e os caracteres são o aviso-previo.

O limite de `cargo-periodo` (48) foi calibrado pelo documento em **inglês**, que é
o mais largo dos dois: a forma inglesa de uma tenure é maior que a portuguesa, e
um número tirado do português deixaria passar a inglesa.

---

## A estrutura de uma vaga

Cada vaga, nesta ordem, com estes orçamentos:

```
Linha 1   título · empresa        à esquerda   |   (N anos e M meses) · Início – Fim   à direita
Linha 2   Stack: ...                                                          nowrap, 1 linha
Bullets   3 / 3 / 3 / 2 / 1        da mais recente para a mais antiga
```

- A **Linha 1** é um flex: título à esquerda, período à direita, alinhados na
  mesma linha base. Um título que quebra empurra as datas para uma linha própria e
  quebra a varredura — o olho encontra vagas pela empresa e pelas datas juntas.
- A **Stack** é `nowrap`. Uma lista de tecnologias que quebra deixa de ser lista e
  vira parágrafo, e a quebra cai no meio da frase.
- Os **bullets** são de 2 a 3 linhas. Os três primeiros (as três mais recentes)
  levam três cada; o quarto, dois; o quinto (o mais antigo), um.
- A vaga **Analista Contábil** não tem Stack — é um cargo de negócio, não de
  engenharia, e a linha seria inventada.

---

## As duas exceções

Tudo o que o leitor lê como texto está em **12.5px**. Dois elementos não, e ambos
estão nesta tabela com o limite que os sustenta.

### Contacto — 11px

Seis campos de referência não são prosa. São a parte da página que ninguém lê de
perto, e um passo abaixo tira o olho do nome e do resumo. Continua legível, e o
limite de 2 linhas e nenhum transbordo horizontal são o que garantem isso: um
campo que não cabe empurra a grade para fora da coluna e o build recusa, em vez de
encolher para caber.

**Os campos são fixos.** Não se edita por limite. São sempre estes, nesta ordem,
iguais em todos os cinco documentos:

```
Linha 1   Localização:  Fortaleza, CE (Atuação Remota)      Email:   marcelino.sandroni@gmail.com   WhatsApp: +55 11 91446-1993
Linha 2   LinkedIn:     linkedin.com/in/marcelinosandroni  Git:     github.com/marcelinosandroni    Portfólio: marcelinosandroni.com
```

O orçamento de 230 caracteres cobre **as duas linhas, não a redação**. Um campo que
crescesse empurraria a grade para fora da coluna de texto e reprovaria o build — que
é o lugar certo para isso falhar.

### A grade de seis colunas, e por que ela cabe

Duas linhas de texto solto **não se alinhavam**: `Localização:` é mais larga que
`LinkedIn:`, então os seis valores começavam em seis lugares diferentes e o bloco lia
como duas listas em vez de uma tabela. Uma grade de seis colunas — rótulo e valor
separados — põe todos os rótulos numa linha de base e todos os valores noutra, e as
colunas se alinham pelas duas linhas porque é a mesma grade.

E **uma grade cabe onde duas linhas de texto não cabiam.** A coluna de uma grade é
dimensionada pelo mais largo que há nela, e a largura do bloco é a soma de seis
máximos mais cinco vãos — não a soma das doze células, que é o que o inline custava.
Foi essa diferença que permitiu os seis campos dentro da coluna de texto sem sair
dela.

Por isso o bloco **não tem padding, nem fundo, nem margem negativa**: ele fica
exatamente na medida do texto. A versão anterior, para caber, tinha de sair da coluna
4mm de cada lado — e ficava em 10,0mm enquanto o nome e os títulos de seção ficavam
em 14,0mm. Esse era o desalinhamento.

Medido agora:

| | |
|---|---|
| Fonte | **11px** |
| Bloco | **14,0mm**, largura 182mm |
| Nome (`h1`) | 14,0mm |
| Títulos de seção | 14,0mm |
| Rótulos, nas **duas** linhas | **14,0 / 81,8 / 136,2mm** |
| Valores, nas **duas** linhas | **32,7 / 91,3 / 152,9mm** |
| Transbordo horizontal | 0px |

### Sem sublinhado nos valores

Cinco dos seis valores eram links, e o estilo de link sublinha. Isso punha uma régua
embaixo de cinco valores e deixava `Fortaleza, CE` assentando diferente do resto — as
linhas pareciam desalinhadas porque duas das três coisas que deviam bater não batiam.
Sublinhado também é ruído no papel: uma URL não é uma referência que o leitor precise
marcada, porque ela já é o endereço.

No hover o sublinhado volta na tela, onde há um cursor apontando. Na impressão não
há.

### Legenda das métricas — 9px

Isto é aritmética, não gosto. O cartão tem 43mm de largura. A 12.5px, uma legenda
de duas linhas cabe cerca de 50 caracteres — e "Arquitetura de processamento
assíncrono de eventos" não cabe em 50. Medido: 63 caracteres ainda fazem duas
linhas; 68 fazem três.

Então a escolha era entre uma legenda correndo quatro linhas numa caixa feita para
duas, ou uma legenda no tamanho para o qual a caixa foi desenhada. Ela está no
tamanho certo, e **o limite de duas linhas é verificado acima dela** — o que
significa que uma legenda não pode mais ser encurtada ficando menor. Era
justamente essa a propriedade que valia a pena ter.

---

## Como editar sem quebrar a estrutura

1. **Escreva dentro do orçamento de caracteres.** A tabela acima é o orçamento.
2. **Rode o build.** Ele imprime a tabela e diz o que estourou, com o texto que
   estourou.
3. **Se estourou, corte o texto.** Não a fonte.

Para conferir um documento já gerado, sem reconstruir:

```bash
npx tsx scripts/check-layout.ts resume-recruiter-pt-br.html
npx tsx scripts/check-layout.ts resume-recruiter-*.html
```

E para ver o que cabe em cada folha:

```bash
npm run resume:measure -- resume-recruiter-pt-br-enterprise-java.html
```

---

---

## A escala de espaçamento

Três passos, em milímetros, e **toda distância na página é um deles**. A razão é
1 : 2 : 4, numa base de milímetro — porque a página édiagramada em milímetros e o
encaixe é medido em milímetros, então nenhum valor tem que sobreviver a uma
conversão.

| Passo | Onde |
|---:|---|
| **1mm** | Entre irmãos de uma **lista**: grupos de habilidade, cursos, idiomas, linhas de contacto, as três partes de um cartão de métrica, as linhas da barra do tempo. Apertado de propósito — uma lista de itens de uma ou duas linhas deve ler como um bloco. |
| **2mm** | Entre **parágrafos** (os bullets de uma vaga), e do **título de uma seção ao seu conteúdo**. Também entre as partes de uma vaga: título → stack. |
| **4mm** | Entre **blocos**. Um valor só, em toda parte. É o que faz a página parecer um documento e não cinco seções empilhadas. |

### O que existia antes

Oito valores para quatro tipos de distância: **1px, 2px, 4px, 0,2mm, 0,5mm,
0,6mm, 8px e 16px**. Cada um foi adicionado quando alguma coisa não cabia, e nada
registrou que o valor adicionado era um valor novo. Medido, o resultado era:

| Onde | Antes |
|---|---|
| Entre seções (a maioria) | 4,23mm |
| Entre `métricas` e `linha do tempo` | **2,12mm** |
| Entre grupos de habilidade | **0,21mm** |
| Entre cursos | **0,29mm** |
| Título da vaga → stack | **0,26mm** |
| Entre dois bullets de 3 linhas | **0,53mm** |

Uma página sem ritmo vertical lê como montada em vez de composta, e ninguém
consegue dizer o que está errado — dá para ver no papel e não aparece em diff.

### Onde a escala mora

`resume-shell.html`, no `:root`, como `--space-1`, `--space-2` e `--space-3`. **As
classes de margem saíram do markup** (`mb-4`, `mb-2`, `mb-5`): o snapshot compilado
do Tailwind vem *depois* dessa folha de estilo, então uma classe utilitária e um
seletor de atributo com a mesma especificidade são decididos pela ordem do
arquivo — e o snapshot venceria. Espaçamento que mora no markup é espaçamento que
pode ser mudado um bloco por vez, que é exatamente como surgiram os oito valores.

O bloco de impressão **não decide nenhuma distância**. Ele já decidia três — a
margem de topo do título, o entrelinhamento do inventário e a margem de baixo dos
cursos — e cada uma valia para uma parte da página. Um documento cujo espaçamento
difere entre a página em que é impresso e a página em que é lido, e difere entre
seções da mesma página, não tem ritmo nenhum.

### A lista quebrada precisa dizer o que é

O paginador parte uma seção quebrável — inventário, cursos, idiomas — em uma
unidade por entrada, e cada unidade carrega o id da seção. Sem mais nada, cada uma
seria indistinguível de uma seção inteira e levaria 4mm: **sete entradas, sete
gaps de 4mm, 28mm de ar** onde caberiam 6.

Por isso o paginador emite `data-gap="item"` ou `data-gap="section"`. A última
entrada de uma seção é dona do espaço até o que vem depois; toda as outras são
entradas de uma lista.

### O que a escala custou

Page one subiu ~12mm no documento Java, que é o mais cheio: de 15mm de folga para
**3mm**. É o preço honesto de um ritmo que se veja, e o build reporta a folha
exata se ela estourar. Os outros quatro documentos têm de 25mm a 37mm.

---

## O nome do arquivo

```
Marcelino Sandroni - Engenheiro de Software.pdf
Marcelino Sandroni - Software Engineer.pdf

Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf
Marcelino Sandroni - Software Engineer - Java and Angular.pdf
```

Nome, depois **o cargo no idioma em que o documento está escrito**, depois a stack
quando o documento é para uma stack. Um traço antes de cada parte, para que as
peças se vejam separadas em vez de virarem um caldo de title case.

O **locale e o prefixo `enterprise-` saíram**. O leitor sabe qual documento pediu e
não precisa ver de volta o que já escolheu; e um arquivo que se chama
`...-pt-BR-...-CLEAN.pdf` diz menos do que um que nomeia o cargo.

Os **variantes são sempre backend + frontend**, e só isso:

| Slug | pt-BR | en-US |
|---|---|---|
| `enterprise-java` | Java e Angular | Java and Angular |
| `enterprise-dotnet` | C# e Angular | C# and Angular |
| `modern-web` | Node e React | Node and React |

Os rótulos antigos puxavam por senioridade — `Enterprise Java + Angular`,
`Modern Node + Go + React` — e faziam dois dos três parecerem mais abertos para
trabalho mais sénior que o terceiro. Não é isso que os separa, e não é por isso que
alguém escolhe entre eles. `modern-web` cobre Node, Go e React e é nomeada pelo par
que se procura; a lista inteira fica no headline do documento.

O rótulo do botão e o nome do arquivo vêm **da mesma tabela** — um rótulo e um
filename que discordam são como a mesma stack acaba escrita de dois jeitos na mesma
página.

### Onde isso mora

`src/domain/publication/resume-variant.ts` (a tabela de stacks e o resolvedor de
slug) e `src/domain/publication/resume-pdf-filename.ts` (o esquema). É domínio, e
não infraestrutura, por dois motivos: um nome de arquivo é uma decisão, e a decisão
precisa chegar ao navegador — o botão baixa o PDF como blob e salva com o nome que
**ele** compõe, então o `Content-Disposition` do servidor só é visto por quem abre
a URL direto. Uma regra que só o servidor tem é uma regra que o cliente quebra em
silêncio.

Os **nomes de arquivo em disco** continuam sendo `resume-fixed-pt-BR-enterprise-java.pdf`:
esses nomeiam um artefato de build, e o outro nomeia o entregável. São diferentes de
propósito.

---

## O que é fixo e o que é editável

Vale deixar explícito, porque é a linha que separa "não mexe" de "pode mudar":

| | |
|---|---|
| **Tipografia** | **Fixa.** Não responde a comprimento. |
| **Campos de contato** | **Fixos.** Seis campos, esta ordem, todos os cinco documentos. |
| **Estrutura da experiência** | **Fixa.** 3 / 3 / 3 / 2 / 1 bullets, do mais recente ao mais antigo. |
| **Títulos de cargo** | **Fixos.** Cargo + nível, nível obrigatório em toda engenharia. |
| **Datas e tenures** | **Fixas.** A tenure é calculada das datas; não se escreve à mão. |
| Resumo, métricas, skills, bullets, stack | **Editáveis**, dentro do orçamento acima. |
| Nomes de seção | **Fixos.** O build casa com eles e falha se mudarem. |

Tudo que está na coluna "fixo" já falhou o build uma vez ao ser mudado por engano,
ou teria falhado se não fosse verificado.

---

## Onde cada coisa mora

| O quê | Onde |
|---|---|
| A tabela (fonte da verdade) | `scripts/data/resume-layout-rules.ts` |
| A medição e a recusa | `scripts/check-layout.ts` |
| Chamada no build pt-BR | `scripts/build-stack-variants.ts` |
| Chamada no build en-US | `scripts/build-english-resume.ts` |
| Os ganchos `data-rule` | `resume-shell.html` |
| Os ganchos da barra | `scripts/data/career-timeline.ts` |

`data-rule` é o gancho: o contrato encontra os elementos por ele, não por classe
nem por posição. Ele sobrevive à paginação e à tradução, então uma regra não pode
parar de valer porque um wrapper foi renomeado. E uma regra que **não encontra
nada** é reportada como violação — uma regra que não casa com nada passa em
silêncio, que é a falha que este desenho elimina.

`data-rule` é diferente de `data-block` e `data-item`, que são da paginação. São
três concerns independentes com três atributos independentes.

---

## Por que Formação e Idiomas são uma coluna só

Eram duas colunas para economizar 43mm, e essa foi a economia errada. Um documento
lido coluna por coluna lê os cursos, depois os idiomas; um documento lido em ordem
visual — que é o que um olho humano faz e o que muitos filtros fazem — lê os dois
cursos e depois os dois idiomas. O documento fica mais difícil de ler para uma
máquina a fim de economizar milímetros para uma pessoa, e a pessoa não é a que está
sendo lida.

Então são empilhados, e os milímetros saem de onde não custa: é o conteúdo que dá,
sob os limites desta tabela.