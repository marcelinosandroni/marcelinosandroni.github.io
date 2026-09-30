# ADR-013: Trilha Sonora Sintetizada na Web Audio API

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: — (o Product Spec cobre EPIC-01 a EPIC-04 e nenhum deles é a trilha sonora; a tarefa correspondente precisa ser criada no `specs/tasks/tasks-catalog.md`)
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: — (nunca houve um arquivo de áudio; esta ADR registra uma decisão que já estava no código)

## Contexto

A home tem um botão de trilha sonora. A escolha óbvia era um arquivo.

| Problema com um arquivo | Impacto |
|---|---|
| A trilha do filme é de Don Davis | Licenciar a trilha original para um site pessoal não é uma coisa que acontece |
| Um arquivo royalty-free de 1–3 MB no repositório | Binário que nunca pode ser diffado, revisado nem testado |
| Um megabyte de binário no bundle | Um site cuja principal conquista é quase não enviar nada ao browser enviaria um megabyte para tocar ambiência |
| Nenhum parâmetro ajustável | "Um pouco mais grave" exigiria editar o arquivo e reprocessar |
| Zero asserção possível | O teste mais minucioso seria "o arquivo existe" |

## Decisão

A trilha é **sintetizada em runtime pela Web Audio API**, em algumas centenas de
bytes de código, e nunca toca sem um clique.

```
src/
├── domain/audio/soundtrack.ts               # estado, chave versionada, resolução segura
├── application/audio/matrix-soundtrack.ts   # o grafo de áudio e o loop
└── components/audio/soundtrack-toggle.tsx   # o botão; único Client Component
```

### 1. Três sons, três parâmetros, nenhum arquivo

| Camada | O que é | Por quê |
|---|---|---|
| Pulso sub-grave | Senoide a 38 Hz, envelope com decaimento exponencial | O coração batendo por baixo de tudo |
| Chuva | Ruído branco em buffer de 2 s, lowpass em `rainHz` com Q 0,7, `loop = true` | "Ruído" não é uma onda da API; o lowpass é o que transforma chiado em clima |
| Sino | Duas quadradas a uma quinta (220/330 Hz), desafinadas −6 e +7 cents | Desafinar é o que transforma dois osciladores idênticos em um acorde |

A desafinação é o detalhe que faz o sino soar como acorde e não como dois bips.

### 2. O sino é escasso, e por escolha

`pump()` reagenda o pulso a cada batida e o sino em **um terço** delas
(`Math.random() < 0.34`). Uma máquina pensando não é um metrônomo, e um arpejo
constante disputaria a atenção com a página. O pulso mantém o chão; o sino é o que
ocasionalmente interrompe.

A chuva é a única camada que se mantém sozinha, porque é a única que é um
`AudioBufferSourceNode` com `loop = true`. Um oscilador com envelope não se
repete — sem `pump()`, a textura morre depois de um segundo e meio e sobra só
chuva.

### 3. O grafo é um objeto, e parar é descartar as referências

Um único objeto dono do próprio grafo, sem scheduler solto: `stop()` cancela o
pump **antes** do fade — cancelar depois deixaria um tick agendar osciladores
contra um contexto prestes a fechar, que é o vazamento clássico de Web Audio e a
razão de um loop ingênuo ser difícil de desmontar. Depois, o fade de 0,35 s roda
antes de `close()` (sem os 400 ms de espera, parar seria um estalo), os nós são
desconectados um a um e o contexto fecha.

`pump()` relê `this.master` do campo em vez de capturá-lo: o callback dispara
depois de um atraso, e `stop()` já pôs `this.master` em `null`. Uma referência
capturada agendaria osciladores num grafo que já foi desmontado.

### 4. `AudioContext` é injetado, nunca alcançado

`MatrixSoundtrack` recebe um `AudioContextLike` — não o `AudioContext` concreto. O
teste unitário passa um fake com a mesma forma e afirma **sobre o que foi
agendado**, que é a única parte com comportamento. Nada ali toca o DOM, então roda
em Node.

O tipo declara `AudioContextState` localmente ("suspended" | "running" | "closed")
em vez de importar `AudioState` da lib DOM: importar um tipo para uma union de
string não vale uma augmentação global das types do projeto.

O `schedule`/`cancel` também são injetados, pelo motivo de `PostIdFactory` em
ADR-010: um teste afirma sobre repetição sem relógio real.

### 5. A decisão morre no domínio, e morre em silêncio

O arquivo de domínio existe porque a regra que importa não é "está tocando", e sim
**o que é mais defensável fazer com uma preferência ausente, obsoleta, corrompida ou
hostil**. E essa resposta é silêncio, sempre.

`resolveSoundtrack(stored)` devolve `false` para qualquer valor que não seja
literalmente `"on"`. `readSoundtrackPreference` engole toda falha, porque uma API de
storage bloqueada não pode derrubar a página por causa de áudio de fundo. E a chave
é versionada (`msd:soundtrack:v1`), para que uma mudança futura do que "on"
significa não leia um valor escrito sob o esquema antigo e comece a tocar num volume
que ninguém escolheu.

### 6. Nada toca sozinho, e o botão diz o que está audível

Todo browser bloqueia autoplay com som, e isso não é uma limitação a contornar: é o
resultado correto. Som em um portfólio é interrupção, não aprimoramento.

O `AudioContext` é criado **dentro do clique**, não preguiçosamente no mount: um
contexto criado fora de um gesto do usuário começa `suspended` e a falha é silenciosa
— o botão viraria "on" e nenhum som sairia. O volume padrão é 0,16 e o fade-in é de
0,6 s, porque som que aparece de uma vez é um susto.

A preferência é lida com `useSyncExternalStore` e **não** copiada para state no
mount: o servidor não tem `localStorage`, então o snapshot do servidor é sempre
"off", e hidratar para outro valor seria um mismatch. Voltar à página também nunca
toca som — o botão mostra o que foi escolhido e fica em silêncio até ser
pressionado, que é a única leitura honesta de "lembrado". Uma `storage` event faz a
escolha aparecer nas outras abas.

Falha ao iniciar é engolida e o estado volta para "off": som ambiente não vale um
diálogo de erro, e a preferência não é gravada como `"on"` para um loop que nunca
soou.

## Consequências

### Positivas

- **Zero bytes de áudio no repositório e no bundle.** A trilha inteira são funções.
- **Nenhum problema de licenciamento.** A obra é nossa.
- **Cada parâmetro é um número que um teste pode afirmar** — frequência do pulso,
  corte da chuva, frequência do sino, desafinação, envelope.
- **Testável em Node**, com um `AudioContextLike` falso e um relógio falso.
- **A preferência é um domínio testável**, sem browser: ausente, obsoleta, corrompida
  e hostil, todas resolvem para silêncio.
- **Desmontagem limpa.** O vazamento clássico de Web Audio é evitado por construção,
  não por cuidado.
- **Acessível sem cor.** Os dois estados usam notas diferentes (♫ e ♪), então o
  estado é legível sem depender de cor.

### Negativas e riscos

- **Não há loop com timestamps perfeitos.** `pump()` reagenda com `setTimeout`, que
  sofre throttling em aba de fundo. A trilha perde o ritmo em aba escondida; aceito,
  porque ninguém está ouvindo.
- **A qualidade é a de três osciladores.** Não é uma trilha de cinema e não finge ser.
- **Autoplay bloqueado é o comportamento, não um bug.** Em vários navegadores o
  contexto só pode ser criado dentro do clique, e por isso a criação está no clique.
- **Nenhum teste visual do som.** O teste prova que os osciladores foram agendados
  com os parâmetros certos; ninguém ouve a mixagem.
- **`Math.random()` na decisão do sino** torna a sequência irreprodutível entre
  sessões. É intencional — um padrão fixo seria um metrônomo — mas significa que
  duas execuções não são idênticas.
- **Safari e iOS exigem o desbloqueio do contexto.** `start()` faz `resume()` quando
  o estado é `suspended`; o que o browser faz depois disso não é controlado por
  este módulo.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| A trilha original do filme | É de Don Davis; licenciar não é uma opção real |
| Arquivo royalty-free de 1–3 MB | Binário não-diffável no repositório e megabyte no bundle |
| `<audio>` com `loop` | Mesma poluição de bundle, e nenhum parâmetro ajustável nem testável |
| Web Audio com um `.wav` decodificado em runtime | Continua sendo um arquivo; só troca o lugar de onde ele vem |
| Áudio ambiente pré-gravado de 30 s em loop | Corta no ponto de emenda e não é o que o botão promete |
| Sintetizar **e** comprimir em um arquivo no build | Um artefato de build para substituir código que já funciona |
| `AudioContext` alcançado pelo global | Não testável; o teste unitário precisa injetar |
| Timer com `requestAnimationFrame` | Suspende em aba de fundo, e o áudio continuaria — pior que o contrário |
| Preferência em cookie para o servidor | O servidor não tem por que saber que o site faz barulho |
| Estado de áudio em `useState` | A regra que importa (valor ausente/hostil) fica no componente e deixa de ser testável |

## Validação

- `npm run typecheck` — sem erros.
- `npm run lint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run tests/unit/application/matrix-soundtrack.test.ts tests/unit/domain/soundtrack.test.ts` — parâmetros agendados, ordem de parada, injeção de relógio, e a resolução da preferência para ausente/obsoleto/corrompido/hostil.
- `npm run build` — build de produção sem erros; nenhum asset de áudio no bundle.