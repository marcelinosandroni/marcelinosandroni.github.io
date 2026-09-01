# Arquitetura inicial

```text
Presentation (Next.js / React)
          |
Application (use cases / ports)
          |
Domain (entities / value objects / invariants)
          |
Infrastructure adapters (Git files / Supabase / Storage / LaTeX)
```

O domínio do currículo não conhece Next.js nem Supabase. A fonte canônica é o conteúdo versionado no Git; o Supabase será usado para publicação, metadados e artefatos quando o adaptador for implementado. A geração LaTeX ocorre em Docker por CLI e GitHub Actions, enquanto a Vercel entrega a aplicação e os arquivos publicados.
