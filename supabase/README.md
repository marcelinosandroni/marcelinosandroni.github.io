# Supabase

As migrations modelam snapshots imutáveis de versões publicadas do currículo. O Git permanece como fonte canônica; o banco e o Storage funcionam como adaptadores de leitura e distribuição.

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador. O cliente público deve usar somente a URL e a anon key, com RLS ativo.

Para aplicar migrations em um projeto Supabase, use a CLI do Supabase após configurar o projeto e revisar as políticas no ambiente alvo.
