# ADR-012: Recuperação no Cliente para o Copiloto do Currículo

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: — (o Product Spec cobre EPIC-01 a EPIC-04 e nenhum deles é o copiloto; a tarefa correspondente precisa ser criada no `specs/tasks/tasks-catalog.md`)
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: — (nunca houve um modelo externo; esta ADR registra uma decisão que já estava no código)

## Contexto

O portfólio tem um copiloto: um recrutador digita uma pergunta e recebe uma
resposta. A pergunta óbvia era chamar um modelo de linguagem.

| Alternativa tentada em silêncio | Por que não serve aqui |
|---|---|
| API de terceiro com o currículo no prompt | O currículo inteiro sai do servidor para um fornecedor a cada pergunta |
| Resposta gerada (temperature > 0) | Um portfólio que inventa um fato é pior do que um que admite não saber |
| Embeddings em serviço de vetor | Infraestrutura e custo por chamada para uma similaridade que ninguém consegue explicar |
| Chave no browser | Uma `NEXT_PUBLIC_` é pública por definição |

O problema real é mais estreito do que "responder uma pergunta": o recrutador
pergunta sobre fatos que **já estão publicados** no site. Então a pergunta não é
"o que um modelo sabe", é "em qual parágrafo do meu currículo isso está".

## Decisão

O copiloto responde de um **retrieval lexical sobre um corpus local**, sem modelo
externo, sem chave e sem rede.

```
src/
├── domain/ai/copilot.ts                   # KnowledgeChunk, Citation, CopilotAnswer
├── application/ai/ask-resume-copilot.ts   # o caso de uso: filtra e monta a resposta
└── infrastructure/ai/
    ├── lexical-retriever.ts               # BM25 + boost de campo em keywords
    └── resume-corpus.ts                   # deriva os chunks do currículo e do blog
```

### 1. O corpus é derivado, nunca escrito à mão

`buildCorpus(locale, articles?)` monta os chunks a partir de `getResumeContent` e
dos artigos publicados. Não existe cópia paralela dos fatos que possa divergir: o
currículo continua sendo a fonte da verdade, e o blog continua sendo o blog.
Chunks são pequenos e autocontidos **para poder ser citados com precisão** — um
chunk que mistura dois fatos não pode ser citado exatamente.

### 2. Scoring BM25 com boost de campo em `keywords`

`LexicalRetriever` indexa `text` e `keywords` juntos, e um termo que o autor
listou como keyword vale 1,4× mais que uma menção acidental na prosa. É o que faz
"Kafka" encontrar uma passagem que nunca escreve a palavra.

O portão é **discriminatividade, não frequência absoluta**: a passagem passa se
casou ao menos um termo da consulta **e** o IDF do melhor termo casado está acima
do piso. Isso importa por um caso concreto que já deu errado: "ClickHouse"
aparece em dezenas de passagens e ainda é a resposta certa, porque está
concentrado em poucas delas. Um portão por frequência absoluta de documento
rejeitava essa pergunta e aceitava uma irrelevante — exatamente o contrário do que
existia para evitar.

`tokenize` normaliza para minúsculas, remove acentos e mantém dígitos, porque
fato tem número. `stem` é um sufixo leve (`ing`, `ed`, `es`, `s`), e não Porter
completo de propósito: Porter super-colide termos de domínio, e num portfólio
"resilience" e "resilient" **devem** continuar distinguíveis — quem pergunta por
um geralmente quer o outro.

### 3. A resposta só sai de passagens recuperadas

`AskResumeCopilot.ask` tem três saídas e nenhum caminho intermediário:

- `answered` — texto montado de até `MAX_ANSWER_PASSAGES` passagens, com até
  `MAX_CITATIONS` citações e o trecho literal que sustenta cada uma;
- `not-found` — nada passou do piso de relevância, e a resposta **diz** que não
  achou, com `citations: []`;
- `rejected` — a pergunta não é uma pergunta (curta demais ou longa demais).

Não existe "gerar algo plausível" em lugar nenhum do módulo, e essa é a razão de o
módulo existir em `domain/`.

### 4. Não há chave, não há rede, não há custo por requisição

`LexicalRetriever` é uma função de scoring transparente. Um recrutador perguntando
"como ele economizou 24M" precisa poder ver **por que** aquela passagem foi
selecionada; uma similaridade opaca não se explica sozinha. E o copiloto não pode
parar de responder porque um fornecedor caiu — o que, num portfólio, é a diferença
entre umafeature e um risco.

### 5. Toda string visível vem do catálogo de mensagens

`CopilotLabels` é injetado, nunca fixado. O copiloto é traduzível e não
reintroduz texto hardcoded — a mesma regra de ADR-005, aplicada ao único lugar onde
um texto novo poderia ter entrado por descuido.

## Consequências

### Positivas

- **O currículo não sai do servidor.** Nenhum byte do conteúdo sai para um
  fornecedor, e não há `NEXT_PUBLIC_` de nenhum serviço de AI.
- **Não há o que cair.** Sem chave, sem rede, sem custo por chamada, sem timeout.
- **Toda resposta é citável e verificável.** A citação é o trecho literal, e a
  passagem é um bloco do conteúdo publicado.
- **"Não sei" é uma resposta de primeira classe**, com status próprio.
- **Testável sem infraestrutura.** `tokenize`, `stem`, `queryTerms` e
  `LexicalRetriever` são puros; `tests/unit/infrastructure/lexical-retriever.test.ts`
  fixa o comportamento do portão.
- **Um post publicado responde sem novo deploy**, porque o corpus lê o mesmo
  `ArticleRepository` do blog.
- **Uma falha de banco não derruba o copiloto.** `buildCorpus` captura a falha e
  devolve só os chunks do currículo, que já respondem a maior parte das perguntas.

### Negativas e riscos

- **Não entende paráfrase.** "Como ele reduziu custo" não acha "economizou 24M" se
  os termos não se cruzarem por stemming. É a maior limitação, e ela é aceita.
- **Não embute semântica.** O corpus é pequeno demais para justify embeddings, mas
  isso significa que a qualidade é a do stemming, não a de um modelo.
- **O corpus é um snapshot por locale.** `AskResumeCopilot.create` constrói por
  locale de propósito, senão o recuperador deriva do idioma que o visitante está
  lendo.
- **Relevância calibrada à mão.** `relevanceFloor = 0.6` e `candidates = 12` são
  padrão com override, não resultado de avaliação. Um conjunto de perguntas reais
  de recrutador mudaria esses números, e nada no código percebe a mudança.
- **Um artigo aumenta o custo do corpus.** Cada bloco `paragraph`/`heading`/`quote`
  de cada artigo é um chunk, e o corpus é montado por requisição. A lista de
  artigos é pequena; um blog com hundreds de artigos mudaria isso.
- **Sem memória entre perguntas.** Cada pergunta é independente, então "e quanto
  tempo isso durou?" não sabe do que se falava antes.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| LLM com o currículo no prompt | O conteúdo sai do servidor a cada pergunta, e a resposta deixa de ser citável |
| LLM com recovery sobre a recuperação | Continua sendo um LLM: alucina, custa e tem chave |
| Embeddings em serviço de vetor | Infraestrutura e custo para poucas centenas de passagens curtas |
| Embeddings locais | Mesma complexidade, e a opacidade continua |
| Stemming Porter completo | Super-colide termo de domínio: "resilience" e "resilient" deixariam de ser distinguíveis |
| Portão por frequência absoluta de documento | Rejeita "ClickHouse" (que está em dezenas de passagens) e aceita a pergunta errada |
| Chave de API no browser | `NEXT_PUBLIC_` é pública; a chave sai no bundle |
| Corpus escrito à mão | Uma segunda cópia dos fatos que diverge do currículo |
| Embeddings por artigo só, sem o currículo | A maior parte das perguntas de recrutador é sobre as experiências |
| Modelos pré-treinados de recuperação (`@xenova/transformers`) | Pesos no bundle, build lento e cold start em dispositivo modesto — para recuperar alguns parágrafos |

## Validação

- `npm run typecheck` — sem erros.
- `npm run lint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run tests/unit/infrastructure/lexical-retriever.test.ts tests/unit/application/resume-copilot.test.ts tests/unit/i18n/dictionaries.test.ts` — tokenização, stop words, portão por IDF, os três status de resposta e a paridade dos rótulos.
- `npm run build` — build de produção sem erros.