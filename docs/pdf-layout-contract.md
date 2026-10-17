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
| Contacto (cada linha) | 1 | 110 | 11px ⚠ | 110 |
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
limite de 1 linha é o que garante isso: uma linha que não cabe transborda e o
build recusa, em vez de encolher para caber.

**Os campos são fixos.** Não se edita por limite. São sempre estes, nesta ordem,
iguais em todos os cinco documentos:

```
Linha 1   Localização: Fortaleza, CE (Atuação Remota) · Email: · WhatsApp:
Linha 2   LinkedIn: · Git: · Portfólio:
```

O que o orçamento de 110 caracteres cobre é **a linha, não a redação**. Seis URLs
em duas linhas a 11px precisam de mais do que a coluna de texto tem: a primeira
medição disse 46 pixels, e a correção saiu da **caixa**, não do tipo —

- **sem padding horizontal e sem fundo**. Uma caixa que empurra o próprio texto
  gasta milímetros em decoração. Sobrou um fio na borda esquerda, que agrupa as
  duas linhas sem custar um milímetro da medida.
- **quebra a coluna de texto dos dois lados, pelo mesmo valor**, e também se
  acota igual dos dois lados. O texto começa e termina à mesma distância da borda
  do papel, então lê como uma faixa um pouco mais larga que a prosa de cima — que
  é como material de referência deve parecer — e não como algo que escorregou
  para fora.
- **os separadores mantêm o espaçamento.** A primeira tentativa deARRumar espaço
  tirou-o deles e deixou `(Atuação Remota)·Email:` — uma linha que cabe e não se
  lê. O espaço em volta do separador é o que faz três fatos virarem texto corrido;
  os milímetros vieram da quebra, onde não custam nada ao documento.

Sobram 3,2mm de folga na linha mais cheia, e o orçamento de 110 caracteres trava o
conteúdo, então ela não cresce.

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