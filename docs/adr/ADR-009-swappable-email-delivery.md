# ADR-009: Entrega de email trocável para o login do dono

- **Status**: Aceito
- **Data**: 2026-09-30
- **Épico**: — (o Product Spec cobre EPIC-01 a EPIC-04 e nenhum deles é o login do dono; a tarefa correspondente precisa ser criada no `specs/tasks/tasks-catalog.md`)
- **User Stories**: —
- **Tarefas**: —
- **Substitui**: o envio direto de `signInWithOtp` dentro de `src/app/api/auth/magic-link/route.ts`

## Contexto

O endpoint de magic link pedia a um único provedor a geração **e** o envio do
mensagem. Trocar de provedor, portanto, significava editar a rota:

| Problema | Impacto |
|---|---|
| O provedor estava escrito dentro da rota | Trocar Resend por Supabase (ou o contrário) era um commit de código, não de configuração |
| O SMTP padrão do Supabase limita o projeto a ~2 mensagens/hora | Um dono que entra duas vezes seguidas fica sem o segundo link — já aconteceu |
| Trocar o SMTP no painel do Supabase não cabia na arquitetura | A decisão de produto ("usar Resend") virava uma configuração de third party que ninguém no repositório enxerga |
| Não havia limite de requisições próprio | A proteção vinha de um limite de third party que ia embora junto com a troca |
| O assunto e o corpo do email não eram do projeto | A cópia do login dependia do template no painel do Supabase, fora do catálogo de mensagens |

O risco mais importante **não** é o provedor. É a propriedade de segurança do
endpoint, e ela precisa sobreviver intacta a qualquer troca:

1. a allowlist é verificada **antes** da criação do token, então um endereço não
   autorizado nunca gera email; e
2. "autorizado" e "não autorizado" devolvem a **mesma** resposta, byte a byte,
   porque o endpoint não pode servir de oráculo para descobrir quem é o dono.

Uma abstração de envio que não preserve os dois é pior que a ausência de
abstração.

## Decisão

Adotar um porto de domínio `EmailSender` com dois adaptadores de infraestrutura,
selecionados por variável de ambiente, com **Resend como padrão**.

```
src/
├── domain/email/email.ts                        # EmailSender, MagicLinkMessage,
│                                                # EmailDeliveryError, EmailAdapterId
├── application/email/send-owner-magic-link.ts   # use case: allowlist + rate limit
├── infrastructure/email/
│   ├── resend-email-sender.ts                   # generateLink + Resend REST
│   ├── supabase-email-sender.ts                 # signInWithOtp
│   └── index.ts                                 # getEmailSender(): composição
└── app/api/auth/magic-link/route.ts             # HTTP: parse, i18n, resposta
```

### 1. O porto tem um método, não dois

`EmailSender.sendMagicLink(message)` recebe assunto e corpo já traduzidos. Não
existe `createLink()` separado de `send()`, e isso é consequência de manter os
dois adaptadores: o link só existe dentro do envio, e o adaptador do Supabase é
incapaz de devolver um link — ele não tem o link, ele tem o email que o Supabase
monta. Uma porta de duas metades descreveria um adaptador e obrigaria o outro a
mentir sobre qual metade implementa.

A consequência assumida: o adaptador do Supabase **ignora** assunto e corpo, e a
redação volta para o template no painel. Isso está escrito na porta, não
escondido.

### 2. Adaptador `resend` (padrão)

O Resend não emite sessão Supabase e não sabe o que é um magic link. O link é
montado em duas metades, e é essa divisão que torna o provedor trocável:

1. `auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } })`
   com a **key secreta** devolve `properties.hashed_token`;
2. `POST https://api.resend.com/emails` entrega o link por Resend.

`fetch` puro, sem o SDK: a chamada é um bearer token e um corpo JSON, e uma
dependência a mais seria um pacote para auditar e atualizar sem remover uma
linha de lógica. `RESEND_API_KEY` e `RESEND_FROM` são as duas variáveis; nenhuma
delas é `NEXT_PUBLIC_`, então nenhuma entra no bundle.

### 3. O link chega ao callback como `token_hash`, e não como `?code=`

Isto é a consequência técnica mais importante da decisão, e ela não é uma
escolha de gosto.

`generateLink` **não produz link PKCE**. Os parâmetros de `GenerateLinkOptions`
são apenas `data` e `redirectTo` (ver `lib/types.d.ts` do `@supabase/auth-js`
instalado) — não existe `code_challenge` —, então o token devolvido não carrega
o prefixo `pkce_`. No lado do GoTrue, `internal/api/verify.go` decide o formato do
redirect só pelo prefixo do token:

```go
if strings.HasPrefix(params.Token, PKCEPrefix) {
    flowType = models.PKCEFlow   // -> ?code=
}                                 // senão -> sessão no fragment da URL
```

Ou seja: o `action_link` do `generateLink` devolveria a sessão no **fragmento**,
que uma Route Handler não lê, e poria um token no histórico do navegador. Por
isso o link é montado à mão:

```
{origin}/api/auth/callback?token_hash={hashed_token}&type=magiclink
```

Esse é o formato que a documentação do Supabase prescreve para template de email
customizado, e é verificável **no servidor**: o callback o resgata com
`verifyOtp` e não precisa confiar em nada que o navegador pudesse editar.

**Pendência**: `src/app/api/auth/callback/route.ts` hoje só lê `?code=` e chama
`exchangeCodeForSession`. Com o adaptador `resend` ele precisa de um ramo para
`token_hash`/`type` chamando `verifyOtp`. Esse arquivo não fazia parte do
escopo desta mudança e **não foi alterado**; enquanto o ramo não existir, o
default (`resend`) envia um link que o callback recusa com `/admin?auth=failed`.
O adaptador `supabase` não é afetado.

### 4. Adaptador `supabase` (mantido)

Mantido exatamente como estava: `signInWithOtp` em um cliente ligado aos cookies
da requisição. O vínculo com os cookies não é detalhe — `@supabase/ssr` grava o
verifier PKCE num cookie ao pedir o OTP e `/api/auth/callback` troca o código com
o mesmo cliente, então um cliente sem o cookie de origem emitiria um link cujo
código não pode ser trocado. É por isso que esse adaptador só roda no servidor e
só é testável com um stub.

### 5. Como trocar

```bash
EMAIL_SENDER=supabase   # volta ao signInWithOtp
EMAIL_SENDER=resend     # padrão; generateLink + Resend
```

Um valor desconhecido **não** cai para o padrão em silêncio: responde
`503 email_not_configured` nomeando a variável. Um deploy que acha estar no
Supabase e está mandando email pelo Resend é pior do que um deploy quebrado.

Seleção ausente ou incorreta nunca diz nada sobre o endereço: as duas respostas
de falha são sobre ambiente, e por isso podem ser expostas.

### 6. Limite de requisições próprio

O SMTP padrão do Supabase era, na prática, o limite. Trocá-lo remove a
proteção, então ela é reconstruída em `MagicLinkRateLimiter`: janela fixa de
**5 pedidos por 10 minutos**, no processo.

A janela é **global, sem chave**. Um store por endereço seria um store que
guarda endereços, neste endpoint, que é exatamente onde essa lista não pode
existir — e também não protegeria nada, já que só um endereço autorizado chega ao
contador. O que se reproduz é a propriedade que o limite removido realmente
tinha: um orçamento por projeto, não por endereço.

E uma consequência que parece paradoxa: uma janela esgotada devolve **a mesma
`200 {ok: true}`** do envio normal. Um `429` ali seria um segundo oráculo — gastar a
cota do dono e depois ler quais endereços são recusados. O limite limita o que se
pede ao provedor; ele não vota na resposta.

O limite é contagem em memória de uma instância. Em deploy com várias instâncias
o teto é por instância e um cold start zera. É mais fraco que um store
compartilhado, e é aceitável porque a allowlist — não o contador — é o que impede
um desconhecido de provocar um envio.

## Consequências

### Positivas

- **A troca é configuração.** `EMAIL_SENDER` e duas variáveis, sem commit de
  código e sem deploy.
- **A rota não conhece provedor nenhum.** Ela valida a entrada e devolve a
  resposta; a escolha é da raiz de composição.
- **O rate limit é do projeto**, e não efeito colateral de um SMTP de terceiro.
- **A cópia do email passou a ser do projeto**, nos dois idiomas, com o
  placeholder `{link}` como contrato verificado por teste.
- **Nenhuma credencial no browser.** `RESEND_API_KEY`, `RESEND_FROM` e
  `SUPABASE_SECRET_KEY` não são `NEXT_PUBLIC_`.
- **O adaptador do Supabase continua disponível** como caminho de rollback —
  que é a razão de ele ter sido mantido em vez de apagado.

### Negativas e riscos

- **O caminho feliz do adaptador padrão está incompleto**: o callback ainda não
  resgata `token_hash` (ver §3). É a pendência mais urgente desta ADR.
- **Trocar para Resend abandona o PKCE no caminho do link.** A garantia muda de
  "o código só é trocável por quem tem o verifier" para "o token de uso único só
  é trocável uma vez, por quem abrir o link". Para um dono único, aceito
  conscientemente; não é aceitável para um fluxo com muitos usuários.
- **A SMTP do Supabase volta a valer se alguém apontar `EMAIL_SENDER=supabase`**
  sem trocar o SMTP no painel. O limite de 2/hora continua lá.
- **A raiz de composição conhece os dois adaptadores.** É o preço de uma porta
  com duas implementações, e está confinado a um arquivo.
- **O limite é por instância**, como descrito acima.
- **O teste de paridade dos catálogos** garante que as chaves existam nos dois
  idiomas, mas a paleta do email não tem teste visual.

## Alternativas Considered

| Alternativa | Por que não |
|---|---|
| `EMAIL_SENDER` com um único valor e Supabase no painel | Mantém a decisão de produto escondida num painel de terceiro, e o limite de 2/hora continua mandando |
| Só Resend, apagando o caminho do Supabase | Elimina o rollback e o teste e2e passaria a depender de uma chave de terceiro |
| Porta com `createLink()` e `send()` separados | Descreve só o adaptador do Resend e obriga o do Supabase a inventar um link que não tem |
| Usar o `action_link` do `generateLink` como está | Traz a sessão no fragmento da URL: invisível para a Route Handler e no histórico do navegador |
| SMTP do Resend configurado no Supabase | Resolve o limite, mas mantém o envio nas mãos do Supabase — o provedor continua não sendo trocável pelo repositório |
| SDK `resend` em vez de `fetch` | Uma dependência de runtime para uma chamada HTTP; `fetch` já está no runtime |
| Rate limit por IP | Guarda um atributo de visitante e ainda não protege o dono de um botnet |
| Rate limit por endereço | Guarda endereços, que é a lista que este endpoint existe para não ter |
| Devolver `429` quando a cota acaba | Cria um segundo oráculo para a allowlist |

## Validação

- `npx tsc --noEmit` — sem erros.
- `npx eslint` — 0 erros (3 avisos pré-existentes em arquivos não alterados).
- `npx vitest run tests/unit/domain/email.test.ts tests/unit/application/send-owner-magic-link.test.ts` — 51 testes: contrato da porta, gate na criação do token, limite de requisições, seleção do adaptador e o formato exato do link.
- `npx next build` — build de produção sem erros.
- `npx playwright test tests/e2e/admin.spec.ts` — contrato sem credenciais: `503 auth_not_configured` para qualquer corpo, inclusive malformado.
