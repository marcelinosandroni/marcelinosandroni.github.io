---
name: html-to-pdf
description: Use when rendering a print-designed HTML file into a real, ATS-readable PDF, or when a layout that was designed for A4 does not fit the page it claims to fill.
---

# HTML para PDF

Converte um HTML projetado para impressão em um PDF de **texto real**, renderizado
pelo Chromium que já roda a suíte e2e do projeto.

```bash
npm run pdf:from-html -- <entrada.html> [saida.pdf] [paginasEsperadas]
npm run pdf:recruiter        # o currículo de recrutadores, sem asserção de páginas
```

## Quando usar esta skill, e não o LaTeX

O currículo do site é gerado por LaTeX a partir de conteúdo tipado, e isso é
correto quando o código é dono do layout: versionado, diffável e reproduzível a
partir de uma leitura do banco.

Isto é o inverso. Quando o layout foi desenhado deliberadamente em outra
ferramenta, o design **é** o entregável, e reescrevê-lo em LaTeX é um exercício
de tradução com chance real de perder a coisa que o tornou bom. Renderiza-se o
que foi desenhado.

## Por que texto real, e não uma captura

Um ATS lê os operadores `Tj`/`TJ` do PDF e mapeia os glifos pelo CMap
`ToUnicode`. Um PDF feito de imagem parece idêntico e vale zero. `page.pdf()`
produz texto; um screenshot não.

Para conferir depois de gerar: o PDF deve conter operadores de texto e CMaps
`ToUnicode`, e nenhuma imagem XObject.

## Regras que o script aplica

1. **`preferCSSPageSize: true`** — a fonte declara `@page { size: A4; margin: 0 }`
   e desenha sua própria margem de 15mm. Sem isso o Chromium escolhe as margens
   dele, escala a página para caber e quebra todo o layout em milímetros.
2. **margem zero** — somada à margem que a fonte já desenha, não substituindo-a.
3. **`document.fonts.ready`** — sem esperar, o layout é calculado com uma fonte
   de fallback e a quebra de linha do PDF não bate com a da tela.
4. **`networkidle` com 60s** — Tailwind por CDN compila em runtime. Sem esperar, o
   PDF sai sem estilo nenhum, o que parece bug de renderização em vez de tempo.
5. **sem quebra no último `.a4-page`** — cada página pede `page-break-after:
   always`, o que é certo entre elas e errado depois da última: produz uma página
   em branco no fim.

## Quando a contagem de páginas não bate

O script conta as páginas **do PDF**, não do HTML, porque os dois só coincidem
quando nada estoura — que é exatamente a condição que vale checar. Passar o
número esperado transforma um defeito de layout em erro de build.

Estouro produz o pior resultado possível quando não é sinalizado: conteúdo
cortado no meio de um bloco, metade da página em branco e um footer
`position: absolute` preso ao fundo do container esticado, caindo na página
errada. **Não escale o HTML para esconder isso** — escala tipográfica que cabe
em A4 deixa o texto em torno de 7pt, e um currícuo ilegível pontua pior que um
currícuo longo. As saídas honestas são: cortar conteúdo, reduzir espaçamento
com consentimento de quem desenhou, ou aceitar mais páginas com quebras limpas.

## Limites conhecidos

- Requer rede para o Tailwind por CDN e as Google Fonts.
- `scripts/*.ts` compilam como CommonJS: nada de `await` no escopo do módulo.
  Use `tsx scripts/html-to-pdf.ts` ou um wrapper `main()`.
- A recuperação de texto para inspeção tem de respeitar um CMap por fonte; mesclar
  vários num mapa só colide os códigos e produz texto ilegível.