# Supabase

As migrations modelam snapshots imutáveis de versões publicadas do currículo. O Git permanece como fonte canônica; o banco e o Storage funcionam como adaptadores de leitura e distribuição.

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador. O cliente público deve usar somente a URL e a anon key, com RLS ativo.

Para aplicar migrations em um projeto Supabase, use a CLI do Supabase após configurar o projeto e revisar as políticas no ambiente alvo.

## Envio do email de acesso

O link de acesso do dono é entregue pelo Resend, que exige duas variáveis: `RESEND_API_KEY` (chave da API, apenas no servidor) e `RESEND_FROM` (remetente, no formato `Nome <endereco@dominio>`).

`RESEND_FROM` só funciona em um domínio verificado no painel do Resend, e não há valor padrão: sem ele o adaptador não envia e o `/admin` responde que o provedor de email não está acessível. Para o run local, defina as duas. `docs/supabase-setup.md` tem o passo a passo.
