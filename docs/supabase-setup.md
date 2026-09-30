# Supabase: variáveis, autenticação e analytics

Configuração do Supabase para este site: quais variáveis importam, como o login
do dono funciona, e o que precisa ser feito no painel.

---

## Variáveis de ambiente

A integração do Supabase na Vercel expõe os mesmos valores duas vezes. Este
projeto usa **apenas** as três com prefixo `SUPABASE_`:

| Variável | Para quê |
|---|---|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SECRET_KEY` | Apenas autenticação. Ignora RLS, então nunca vai para o browser |
| `SUPABASE_PUBLISHABLE_KEY` | Leitura de conteúdo: artigos, currículo, artefatos de PDF |

Mais `ADMIN_EMAIL` (a allowlist do dono) e `NEXT_PUBLIC_APP_URL` (origem usada
no redirect do magic link).

O envio do email de acesso usa ainda três variáveis próprias, descritas em
[Entrega do email](#entrega-do-email-trocável): `EMAIL_SENDER`, `RESEND_API_KEY` e
`RESEND_FROM`.

### Por que nenhuma variável `NEXT_PUBLIC_` do Supabase é usada

Só as variantes `NEXT_PUBLIC_` são inlined no bundle do cliente, de forma
permanente e inevitável. Nada neste código consulta o Supabase a partir do
navegador: o pedido de login sai de uma Route Handler e a sessão é lida num
Server Component. Logo, as três com prefixo `SUPABASE_` bastam, e o bundle do
cliente fica **sem credencial nenhuma** — o que é verificado por teste sobre a
saída construída.

### Por que as leituras usam a publishable e não a secret

A key secreta ignora row level security. A migration concede leitura anônima de
propósito, justamente para que um erro em uma query de conteúdo retorne vazio em
vez de retornar um rascunho. Usar a secreta nas leituras removeria essa camada
de defesa sem necessidade.

As duas keys têm nomes parecidos e ficam lado a lado no painel da Vercel, então
trocá-las compila sem erro nenhum. Por isso a separação é afirmada em teste.

### Variáveis que a integração também define e que aqui não importam

- `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
  `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` —
  não há Prisma, ORM nem conexão direta ao banco. O acesso é pela REST API.
- `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` — duplicatas server-side das
  anteriores; são as que o app usa.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` —
  disponíveis, mas não usadas, pelo motivo acima.

Podem continuar no painel sem efeito.

---

## Autenticação do dono

`/admin` usa magic link do Supabase Auth. Não há senha, e a allowlist
`ADMIN_EMAIL` continua sendo a autoridade.

### O caminho

1. O formulário faz `POST /api/auth/magic-link`.
2. A Route Handler avalia a allowlist **antes** de chamar o adaptador de envio. Se
   o endereço não estiver na lista, nenhum token é criado e nenhum email sai.
3. A resposta é idêntica (mesmo status, mesmo corpo) para endereço autorizado,
   não autorizado, inválido ou barrado pelo limite de requisições — é isso que
   impede enumerar quem é o dono.
4. O link leva a `/api/auth/callback`, que troca o código por sessão e grava os
   cookies.
5. `/admin` lê a sessão com `getUser()`, que revalida contra o Supabase em vez
   de confiar nas claims do cookie, e **recalcula** a autorização a partir da
   allowlist.

### Passo a passo no painel do Supabase

1. **Authentication → Providers → Email**: ative o provider.
2. **Authentication → URL Configuration**
   - **Site URL**: `https://marcelinosandroni.com`
   - **Redirect URLs**: inclua
     - `https://marcelinosandroni.com/api/auth/callback`
     - `http://localhost:3000/api/auth/callback` (desenvolvimento)
3. **Authentication → Emails → Templates**: só para `EMAIL_SENDER=supabase` — o
   template de magic link precisa apontar para o callback acima. Com o adaptador
   padrão o template não é usado; a mensagem é montada aqui.
4. Opcional: em **Authentication → Sign In / Up**, desmarque *Confirm email* para
   o link funcionar sem confirmação adicional.

### ⚠️ O limite de requisições do próprio endpoint

O SMTP embutido do Supabase é **fortemente limitado** — cerca de **2 emails por
hora** — e não é para produção. Ele era, na prática, o único limite de requisições
que este endpoint tinha, e ia embora junto com a troca de provedor.

Hoje o limite é do projeto: **5 pedidos por 10 minutos**, em memória, por
instância. A janela é global e **sem chave** — um store por endereço seria um
store que guarda endereços, e o limite só é consultado depois da allowlist, então
só o próprio dono o gasta.

Uma janela esgotada devolve a **mesma** `200 {ok: true}` do envio normal. Isso é
deliberado: um `429` permitiria gastar a cota do dono e depois ler quais
endereços são recusados.

---

## Entrega do email (trocável)

Quem manda o email de acesso é escolhido por configuração, e **Resend é o
padrão**. A decisão está em [ADR-009](../adr/ADR-009-swappable-email-delivery.md).

| Variável | Para quê |
|---|---|
| `EMAIL_SENDER` | `resend` (padrão) ou `supabase`. Valor desconhecido → `503 email_not_configured` |
| `RESEND_API_KEY` | Chave da API do Resend. **Não** é `NEXT_PUBLIC_`, então não vai para o browser |
| `RESEND_FROM` | Remetente num domínio verificado no Resend. Aceita `Nome <endereco@dominio>` |

Nenhuma delas é `NEXT_PUBLIC_`, e nenhuma é lida no cliente. `SUPABASE_SECRET_KEY`
também não aparece no bundle: a rota já é um Route Handler e a sessão é lida num
Server Component.

### Como cada adaptador funciona

| Adaptador | Gera o link | Envia |
|---|---|---|
| `resend` | `auth.admin.generateLink` com a key secreta, e monta `/api/auth/callback?token_hash=…&type=magiclink` | `POST https://api.resend.com/emails` |
| `supabase` | `signInWithOtp`, que manda o Supabase gerar o link | O próprio Supabase, pelo SMTP configurado no painel |

O adaptador `supabase` **continua disponível** e é o caminho de rollback: basta
`EMAIL_SENDER=supabase`. Ele não usa o assunto e o corpo traduzidos — o texto vem
do template no painel do Supabase.

### ⚠️ Pendência: o callback ainda não resgata `token_hash`

`auth.admin.generateLink` não produz link PKCE (os parâmetros de
`GenerateLinkOptions` são apenas `data` e `redirectTo`, sem `code_challenge`), então
o `action_link` devolvido traria a sessão no **fragmento** da URL — que uma Route
Handler não lê. Por isso o adaptador monta o link com `token_hash`, que é
verificável no servidor via `verifyOtp`.

`src/app/api/auth/callback/route.ts` ainda só lê `?code=`. **Enquanto ele não
ganhar um ramo para `token_hash`/`type` chamando `verifyOtp`, o adaptador padrão
envia um link que o callback recusa com `/admin?auth=failed`.** Para testar o
caminho completo antes disso, use `EMAIL_SENDER=supabase`.

### Passo a passo no Resend

1. Criar a conta e obter a chave em **API Keys**.
2. Adicionar e verificar o domínio de envio (**Domains**).
3. Definir `RESEND_API_KEY` e `RESEND_FROM` na Vercel.
4. `SUPABASE_URL` e `SUPABASE_SECRET_KEY` continuam obrigatórias: é o Supabase que
   autentica a sessão, o Resend só entrega a mensagem.

### Hardening recomendado

O Supabase permite criar conta por padrão, então um desconhecido pode se
cadastrar e obter uma sessão válida. Isso **não** abre o `/admin`, porque a
autorização é recalculada a cada requisição a partir de `ADMIN_EMAIL`. Ainda
assim, desativar os cadastros abertos remove as contas.

### Limitação conhecida: refresh de sessão

Não há refresh de token em `proxy.ts`, de propósito. Colocá-lo ali significa uma
ida ao Supabase em **todas** as páginas públicas e desfaz a renderização
estática que o site inteiro se apoia.

Consequência: quando o access token expira, o dono entra de novo com um novo
link. Para uma área de dono único é um inconveniente, não uma funcionalidade
quebrada.

---

## Analytics

Duas medições, propositalmente distintas:

| O quê | Ferramenta | Granularidade |
|---|---|---|
| Visualizações de página | Vercel Analytics | Agregado, sem cookie nem identificador |
| Cliques por elemento | Tabela `click_aggregates` | Contador inteiro por elemento allowlisted |

O Vercel Analytics fica no layout de locale, então a área privada `/admin` está
fora da árvore em que ele se aplica. Tráfego do dono não é sinal público, e
menos dados medidos é melhor.

A tabela de cliques é escrita pelo servidor com a key secreta, porque a migration
concede leitura anônima e escrita negada — é o que impede um scraper de inflar
os contadores.

A migration ainda precisa ser aplicada:

```bash
supabase db push
```

Sem ela, o painel de engajamento responde de um contador em memória, que não é
compartilhado entre instâncias.

---

## Checklist de deploy

- [ ] `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `SUPABASE_PUBLISHABLE_KEY` definidos na Vercel
- [ ] `ADMIN_EMAIL` definido com o endereço do dono
- [ ] `NEXT_PUBLIC_APP_URL` = `https://marcelinosandroni.com`
- [ ] `RESEND_API_KEY` e `RESEND_FROM` definidos (padrão), ou `EMAIL_SENDER=supabase`
- [ ] Domínio de envio verificado no Resend
- [ ] Provider de email ativado no painel do Supabase
- [ ] Site URL e Redirect URLs configurados no painel
- [ ] Migration `click_aggregates` aplicada
