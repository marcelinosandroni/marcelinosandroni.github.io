# Feature flags — o que o site oferece

Duas decisões sobre o que o site publica, controladas por variável de ambiente e
**desligadas por padrão**.

| Variável | Padrão | Controla |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_WHATSAPP` | `off` | Publica o número de telefone / links `wa.me` |
| `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD` | `off` | Oferece o currículo como arquivo PDF |

Aceitam `1`, `true`, `yes` ou `on` (maiúsculas e espaços tolerados). Qualquer
outra coisa — vazio, espaço, `no`, `off`, `0`, um erro de digitação — é lido como
**desligado**. Uma linha de ambiente pela metade desliga a feature em vez de
ligá-la por acidente.

```bash
# liga as duas
NEXT_PUBLIC_FEATURE_WHATSAPP=on
NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD=on
```

## Por que desligado por padrão

Off é a direção segura das duas, e por motivos diferentes que vale manter
separados:

- **WhatsApp** é um telefone pessoal. Publicar o número de um estranho deve ser um
  ato deliberado, não algo herdado do estado do componente quando foi escrito.
- **Download do currículo** renderiza um documento que o dono pode não querer
  distribuir como arquivo, e o endpoint compila LaTeX numa função serverless.

## O ponto que costuma morder: isto é build-time

Estas páginas são **pré-renderizadas**. O `next build` gera o HTML de `/pt-br/` e
`/pt-br/resume` na máquina de build, então a flag é lida **no build**, não quando
o servidor entrega a página. O prefixo `NEXT_PUBLIC_` existe por causa disso: ele
faz o Next inlinar o valor no HTML gerado, e a regra operacional fica sendo
**mudar a variável e fazer deploy**.

Isso foi medido, não suposto. A primeira versão usava um nome sem prefixo e
parecia um switch de runtime: o e2e subia um servidor com a flag `on` no ambiente
e a página vinha sem nenhum link, porque tinha sido pré-renderizada com a flag
desligada. A mesma build respondia corretamente de uma *route handler* dinâmica,
o que fez o problema parecer um bug de passagem de env por tempo demais.

O que se abre mão: um switch sem rebuild. O que se ganha: a home continua
estática e cacheável, em vez de re-renderizar por requisição para ler dois
booleanos.

## O que cada flag remove

### `NEXT_PUBLIC_FEATURE_WHATSAPP`

O número aparece em **seis** lugares, e todos são gateados juntos:

1. Linha de links do hero
2. Botão principal da seção de contato
3. Lista de canais da seção de contato
4. Colunas de links do rodapé do site
5. Linha de contato do rodapé do site
6. Rodapé da página de currículo

Também trocam de texto as duas strings que **nomeavam** o WhatsApp — a narrativa
e a linha de status da seção de contato. Deixar as duas seria a página descrevendo
um botão que não existe. As variantes novas estão marcadas `TODO(review)` em
`src/infrastructure/content/home/home-pt-br.ts` e vale ler antes de publicar com a
flag ligada: com ela desligada, elas são o único texto de contato que existe.

**O email nunca é gateado.** Um e-mail é a alternativa e sumir junto com o WhatsApp
deixaria uma seção de contato sem nenhuma forma de contato.

### `NEXT_PUBLIC_FEATURE_RESUME_DOWNLOAD`

Desligado, saem as duas coisas:

- o botão não é renderizado (não fica cinza — cinza convida a pergunta "por quê?");
- `GET /api/resume/{locale}/pdf` responde **404** antes de validar o locale ou
  compilar qualquer coisa.

O 404 vem **antes** da validação de propósito: um leitor que distingue "essa rota
está desligada" de "você pediu o idioma errado" ficou sabendo que a rota existe.

A página do currículo continua lendo por completo no site. A flag controla
distribuir como arquivo.

> **Fora do alcance desta flag:** os PDFs também são publicados em
> `public/artifacts` pelo workflow `compile-pdf`, que roda em tags e não é
> gateado por variável. Se o ponto é "não baixável", esse caminho também precisa
> de uma decisão.

## Testes

Os dois lados são cobertos, porque os dois precisam de artefactos diferentes:

- **Ligado** — a suíte principal (`npm run test:e2e`) builda com as duas flags em
  `on`. É o único lugar onde o PDF é testado de verdade: o teste clica no botão e
  confere o arquivo compilado.
- **Desligado** — `npm run test:e2e:default-flags`, contra um build feito com as
  variáveis **ausentes**, que é o que um checkout novo sem `.env` produz.

O caminho desligado tem build e config próprios
(`playwright.default-flags.config.ts`) porque as páginas do build principal já
contêm os links — nada rodando contra aquele artefacto consegue provar ausência.

A política em si é testada em `tests/unit/`, onde o ambiente é parâmetro de função
e não de processo: `parseFeatureFlag`, `visibleChannels` e
`assertResumeDownloadEnabled`.

## Adicionar uma terceira flag

1. o nome em `FEATURE_FLAG_VARIABLES` e o padrão em `FEATURE_FLAG_DEFAULTS`;
2. `assert…Enabled` na camada de application se for uma rota;
3. `visibleChannels` para canais de contato — não replique o filtro no
   componente, foi assim que um `wa.me` sobreviveu no rodapé;
4. um teste em `tests/unit/domain/feature-flags.test.ts` para o parsing e o default.