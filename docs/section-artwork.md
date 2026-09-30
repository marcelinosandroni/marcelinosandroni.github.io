# Arte por Seção (Section Artwork)

> Camada decorativa opcional nas seções da home. Um detalhe, nunca uma
> funcionalidade. Documento em português claro, com os termos técnicos em inglês.

- **Status**: implementado, **desativado por padrão**
- **Camada**: Domínio (`src/domain/artwork/`) → Apresentação (`src/components/artwork/`)
- **ADR relacionado**: ADR-014 (tokens, sem dependência de UI); ADR-009 (a UI é
  descrita exclusivamente por tokens)
- **Testes**: `tests/unit/domain/section-artwork.test.ts`, `tests/e2e/section-artwork.spec.ts`

---

## 1. O que é, e por que existe

O pedido foi: *"colocar imagens das cenas mais marcantes do filme Matrix em cada
seção, ou algumas como fundo nas laterais, de um jeito minimalista e moderno,
sem chamar atenção diretamente, sendo um detalhe"*.

Still de filme não pode ser commitado neste repositório. Então o que foi
entregue é a **fenda**: a regra que decide

- quais seções **podem** ter arte (e duas delas **não podem**, de propósito);
- qual a **intensidade máxima** — e por que esse número é 0.14;
- onde no canto a arte pode ficar;
- o que acontece quando **não há imagem nenhuma** (que é o estado de hoje).

Nenhuma seção tem arte configurada agora. Isso é uma decisão, não uma pendência:
ativar uma delas é uma mudança visual que precisa ser feita com intenção.

---

## 2. Anatomia

| Arquivo | Papel |
|---|---|
| `src/domain/artwork/section-artwork.ts` | Puro. O descritor, o vocabulário de seções, os limites de opacidade, a regra de resolução e a regra de nomenclatura do arquivo. Sem React, sem DOM, sem CSS. |
| `src/components/artwork/section-artwork.tsx` | Ilha cliente. Desenha a resposta: ou a placa gerada (SVG), ou a imagem, ou nada. |
| `src/app/artwork.css` | A camada. Sem `@layer`, sem `@apply`, tokens apenas. |
| `src/components/home/section-shell.tsx` | Wrapper opcional. **É ele que importa o CSS** — e ele ainda não é usado por nenhuma rota. |

### O descritor

```ts
type SectionArtworkDescriptor = {
  section: "kpis" | "arsenal" | "experience" | "blog" | "contact";
  placement: "corner-top-left" | "corner-top-right"
           | "corner-bottom-left" | "corner-bottom-right";
  opacity?: number;              // omito = 0.09 · fora da faixa = fixado no limite
  image?: {
    src: string;                 // tem que ser artworkImageSrc(section, ext)
    width: number;               // px intrínsecos — obrigatório
    height: number;              // px intrínsecos — obrigatório
    title: string;               // o que o quadro mostra — obrigatório
    rights: string;              // quem detém os direitos e sob qual licença — obrigatório
  } | null;                       // null = desenhar a placa gerada
};
```

### A regra de resolução

Uma cadeia de recusas, na ordem do mais permanente para o menos:

| Situação | Resultado |
|---|---|
| Seção fora do vocabulário (`top`, `footer`, `""`, `undefined`) | `none` / `not-decorative` |
| Nenhum descritor para a seção — **o estado de hoje** | `none` / `not-configured` |
| `placement` fora do vocabulário | `none` / `invalid-placement` |
| `image` presente e válido | `image` |
| `image` ausente, `null`, ou inválido | `plate` (a placa gerada) + `rejectedImage` com o caminho recusado |

A função é **total**: nunca lança. Um `src` errado numa camada decorativa tem de
resultar numa página que parece acabada, não num 500.

---

## 3. O número: 0,14

O dono pediu algo que não gritasse. Isso é uma restrição sobre o **pior caso**, não
sobre a intenção — então o número importante é o teto, e o teto é
`ARTWORK_OPACITY_MAX = 0.14`. Três argumentos:

**1. É legível, e isso é medido — não é uma boa intenção.**
O pixel mais claro da placa é o token de acento na opacidade da camada,
composto sobre a superfície da seção. Contra os tokens reais dos três temas
(o teste lê `globals.css` em vez de confiar neste parágrafo), texto corrido em
`--color-text-secondary` ainda passa por **5,6:1** sobre esse pixel no teto —
5,61 no *carbon*, 6,38 no *paper*, 6,90 no *matrix* — contra o piso de 4,5:1 da
WCAG AA. No default (0,09) são 6,40 / 6,86 / 7,71. Ou seja: 0,14 não é "tão baixo
que esperamos que ninguém perceba" — é o ponto em que a AA vira a restrição
dominante. O próximo incremento já seria uma decisão sobre cor de texto, não
sobre arte.

**2. Cabe no vocabulário visual que o site já usa.**
O tom decorativo mais forte que o site já entrega é `bg-primary-container/10` no
cartão de contato; os brilhos difusos são `/5`. A placa não é um blur — ela tem
estrutura de linha, então pesa mais na mesma opacidade. Daí 0,14 em vez de 0,10,
e daí ser um teto duro em vez de um default.

**3. Zero não é expressável.**
`clampArtworkOpacity` tem piso em `ARTWORK_OPACITY_MIN = 0.05`. Não existe
"deixar invisível" como configuração: a única forma de desligar a arte é **apagar
o descritor**, que aparece num diff. Uma camada que se ajusta para zero é uma
camada que alguém vai aumentar de novo achando que a página está vazia.

O default é **0,09**, o meio da faixa.

---

## 4. Anatomia visual

Toda a camada é uma faixa na **margem externa** da seção — nunca no centro, nunca
atrás de um parágrafo.

- A largura da faixa é a **margem externa do container** mais o padding interno
  dele, porque `Section` centra uma coluna de `max-w-[1320px]`. Em 1920px a faixa
  tem ~348px; num notebook de 1280px não há margem nenhuma e ela cai no piso de
  4,5rem.
- A **máscara radial** ancorada no canto é o que garante "nunca atrás de um
  parágrafo". Não é posicionamento: é a máscara que leva a placa a zero literal
  antes de ela chegar na coluna de leitura.
- Abaixo de 48rem a camada **não renderiza**. Numa tela estreita as laterais não
  existem: a coluna de conteúdo começa a 1rem da borda, então qualquer faixa
  estaria *sobre* o texto, e a máscara não tem mais nada atrás do qual se esconder.
  Um detalhe que não pode ser periférico não deve existir. Para reativar, apague
  aquele bloco do `artwork.css`.
- `prefers-reduced-motion`: **nada anima**. Nenhuma regra deste arquivo declara
  `animation`. A media query no fim é a rede de segurança — `globals.css` encurta
  animação para 0,001ms mas deixa `animation-name` definido, e aqui a declaração
  honesta é `animation: none`, que é o que o e2e verifica.

### A placa gerada

Desenhada em código, no vocabulário visual do próprio site. Nenhum binário, nenhum
`data:` URI, nenhuma imagem.

- **16 colunas de glifos**, cada uma um `<line>` tracejado. O tracejado é o que
  faz parecer caracteres caindo e não uma barra de progresso. Largura e padrão de
  tracejado variam por coluna (PRNG com semente fixa), opacidade entre 0,3 e 0,6.
- **16 cabeças** — um trecho sólido e mais brilhante no pé de cada coluna. É o que
  faz a coluna parecer *escrita* em vez de rolada.
- **Uma grade em perspectiva** ao fundo: 6 trilhos horizontais com espaçamento que
  abre para baixo e raios convergindo acima do topo, mais largo que a própria placa.
- **Um bloom de fósforo** em `radial-gradient` CSS atrás dos traços. Não é
  `filter: drop-shadow`: o `rain.css` já fixou esse argumento — um filtro por
  placa é uma camada de composição por seção.

Cores: a grade é `--color-border-prominent`, a chuva é `--color-primary-container`,
o bloom é uma mistura do mesmo acento. Essa **relação de alfa** (fundo mais escuro
que a frente) é a pista de profundidade, e ela é válida nos três temas — inclusive
no *paper*, onde o acento é um oliva escuro sobre creme.

A semente é fixa (`ARTWORK_PLATE_SEED`), pelo mesmo motivo do `MatrixRain`: isto
renderiza no servidor também, e `Math.random()` produziria duas placas diferentes e
um erro de hidratação em toda carga.

---

## 5. Colocar uma imagem licenciada

### A regra de nomenclatura

```
public/artwork/section-<id-da-seção>.<ext>
```

- `<id-da-seção>` ∈ `kpis` · `arsenal` · `experience` · `blog` · `contact`
- `<ext>` ∈ `avif` · `webp` · `jpg` · `png`

Um arquivo por seção. Um still compartilhado por duas seções continua sendo o
crédito de duas seções para escrever, e um caminho escrito à mão é um erro que só
se descobre num celular.

A regra **é** a função `artworkImageSrc(section, extension)`. Não existe um segundo
caminho válido, então um erro de digitação é uma asserção que falha em vez de uma
imagem quebrada. `isArtworkImageSrc` compara com o valor derivado — é a regra de
nomenclatura virando código.

### O passo a passo

1. **Obtenha a licença.** Um still de *The Matrix* é obra de terceiros. A licença
   precisa cobrir este uso, neste site. Sem licença, use a placa gerada — ela é obra
   original e não deve crédito a ninguém.
2. **Coloque o arquivo** em `public/artwork/` com o nome da regra acima.
   Preferência: **AVIF**, depois WebP. Largura máxima recomendada: **1280px** — a
   camada é mascarada, recortada e mostrada a 9%, então um still de 3000px é
   bytes jogados fora. Declare o peso real em `width`/`height`.
3. **Adicione o descritor** ao array que `SectionShell` recebe (ver abaixo).
4. **Escreva o crédito.** `title` e `rights` são **obrigatórios** e não opcionais:
   a única parte de uma atribuição que é difícil adicionar depois é a parte que
   nunca foi digitada. Um crédito com metade vazia é recusado, e a seção cai na
   placa gerada.
5. **Leia o crédito na página.** Ele aparece abaixo do conteúdo da seção, no
   tamanho `--text-label-mono`, na cor `--color-text-muted`, alinhado ao lado onde
   a placa está, e é traduzido nos dois idiomas
   (`en-US: "Image: {title} — {rights}."` / `pt-BR: "Imagem: {title} — {rights}."`).

### Onde entra o descritor

Há duas formas, e a segunda é a que se usa:

**a) Um descritor por seção, no lugar.** `SectionShell` aceita `artwork` direto:

```tsx
<SectionShell
  id={section.id}
  artwork={{ section: "arsenal", placement: "corner-top-right", image: {
    src: artworkImageSrc("arsenal", "avif"),
    width: 1280, height: 853,
    title: "o interior da Nebuchadnezzar",
    rights: "Warner Bros. — licenciado para este site",
  } }}
  artworkCredit={t.artwork.credit}
>
  …
</SectionShell>
```

**b) O registro central `DEFAULT_SECTION_ARTWORK`** em
`src/domain/artwork/section-artwork.ts`, hoje vazio. Preenchê-lo liga a arte em
todas as seções de uma vez, sem tocar em nenhum componente de seção.

---

## 6. Adotar numa seção (uma linha)

Cada seção da home usa `Section` direto. Adotar o shell é uma linha por seção:

```diff
- import { Section } from "@/components/ui";
+ import { SectionShell } from "@/components/home/section-shell";
…
- <Section id={section.id}>
+ <SectionShell id={section.id} artwork={{ section: "arsenal", placement: "corner-top-right" }}>
    …
- </Section>
+ </SectionShell>
```

O shell é opcional de propósito: uma seção que nunca o adota é indistinguível de
uma que não tem arte configurada. É essa propriedade que torna verdadeira a
afirmação de custo zero — não existe estado em que o shell esteja presente e o
custo já tenha sido pago à toa.

### Seções recomendadas

| Seção | Canto | Porquê |
|---|---|---|
| `kpis` | `corner-bottom-left` | Usa `SectionHeading`, cuja nota fica na **coluna direita** em `md+`. Canto inferior. |
| `arsenal` | `corner-top-right` | Cabeçalho é um bloco único alinhado à esquerda; a direita em cima está livre. |
| `experience` | `corner-bottom-right` | `SectionHeading` de novo — a nota ocupa o topo direito. |
| `blog` | `corner-top-left` | A linha do topo carrega o link de CTA do lado **direito**. |
| `contact` | `corner-bottom-left` | O painel externo é opaco; a arte só apareceria nas margens. |

**Não** coloque arte em `top` (a chegada — já tem o retrato, dois brilhos radiais,
e é o LCP) nem em `footer` (árvore de links + nota legal, sem eixo de leitura; arte
na borda de um rodapé lê como anúncio).

---

## 7. O que custa

| Situação | Custo |
|---|---|
| Nenhuma seção configurada (hoje) | **Zero requisições. Zero bytes.** `SectionShell` não é renderizado por nenhuma rota, então `artwork.css` está fora do grafo de entrada do build. O e2e prova as duas metades: nenhuma requisição sob `/artwork/`, e nenhuma ocorrência de `msd-artwork` no CSS compilado da rota. |
| Com a placa gerada | Zero requisições. É SVG inline, ~34 nós por seção, ~5,5 KB de HTML por seção. |
| Com uma imagem | Uma requisição, `loading="lazy"`, `decoding="async"`, `width`/`height` declarados, `alt=""`. `<img>` puro e não `next/image`, porque a camada é mascarada a ~9% e recortada: re-encodar um still licenciado em derivados que ninguém vai ver é custo sem benefício. |

### Onde o `artwork.css` é importado

De `src/components/home/section-shell.tsx`, e **não** do island. Isso é
deliberado, e por dois motivos:

1. É o que tira o arquivo do grafo de entrada enquanto nenhuma seção usa o shell —
   a afirmação de "zero bytes" acima é literal, e um `if` em volta do JSX não
   conseguiria isso.
2. `tsx` e o Node não carregam CSS; o island (`section-artwork.tsx`) precisa ser
   importável pelo e2e para que o markup testado seja o markup de verdade.

A alternativa canônica no App Router seria `src/app/[locale]/layout.tsx`, ao lado
de `rain.css` e `intro.css`. Isso faria o arquivo global em toda rota
(~2 KB), o que é o custo do item 1 da tabela acima. A restrição do Pages Router
("Global CSS cannot be imported from files other than your Custom `<App>`") não
se aplica aqui: ela está desativada quando existe um `app` diretório
(`next/dist/build/webpack/config/blocks/css/index.js:333`), e este projeto compila
com Turbopack, que lista Global CSS como suportado sem restrição de diretório.

---

## 8. Acessibilidade

- A camada inteira é `aria-hidden="true"` e `pointer-events: none`.
- Nada dentro dela é focável, e o `<svg>` declara `focusable="false"`.
- O `alt` da imagem é **vazio**, porque a camada é oculta e o texto que chega ao
  leitor é o crédito.
- O crédito fica **fora** da camada, e é por isso que o `aria-hidden` para na
  borda dela: atribuição não é decoração nem detalhe.
- Nenhuma animação em nenhum estado, em nenhum tema.

---

## 9. Verificação

```bash
npm run typecheck                                             # limpo
npm run lint                                                  # 0 erros, 3 avisos pré-existentes
npx vitest run tests/unit/domain/section-artwork.test.ts      # 40 testes
npx playwright test section-artwork                           # e2e
npm run build                                                 # build de produção
```

O teste unitário de contraste lê `globals.css` do disco e calcula a razão WCAG
entre o texto corrido e o pixel mais claro da placa para **cada** tema. Ele falha
se alguém subir `ARTWORK_OPACITY_MAX` para o ponto em que a arte começa a custar
legibilidade.