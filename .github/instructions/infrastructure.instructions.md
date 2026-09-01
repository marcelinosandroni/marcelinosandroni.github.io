---
applyTo: "supabase/**/*.sql,Dockerfile,docker-compose.yml,scripts/**/*.ts,.github/workflows/**/*.yml"
---

- Nunca exponha service-role, tokens ou credenciais no cliente.
- Toda tabela pública deve ter RLS explícito e migrations reproduzíveis.
- Docker deve produzir ambientes determinísticos para app, testes e geração LaTeX.
- Scripts CLI devem falhar cedo, retornar códigos de saída corretos e ser idempotentes quando possível.
- CI deve executar lint, typecheck, testes, cobertura e build antes da publicação.
