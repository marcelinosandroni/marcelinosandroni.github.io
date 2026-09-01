# Instruções do projeto

## Missão
Este repositório é o núcleo versionado do currículo de Marcelino Sandroni Dias: uma experiência web visual, interativa, acessível e internacionalizada, com geração determinística de PDF.

## Stack e limites
- Use Next.js App Router, TypeScript e deploy na Vercel.
- Use Supabase apenas por adaptadores de infraestrutura; o domínio não pode importar SDKs de banco.
- Preserve a possibilidade de trocar Supabase por PostgreSQL, filesystem ou outra implementação.
- Use Git como fonte canônica das versões publicadas.
- Gere PDFs em LaTeX dentro de Docker/CI; não dependa de compilação LaTeX no runtime da Vercel.
- Use Docker para desenvolvimento, integração e Playwright E2E.

## Arquitetura
- Organize o código em `src/domain`, `src/application`, `src/infrastructure`, `src/app` e `src/components`.
- Aplique DDD, Clean Architecture, Clean Code e portas/adaptadores.
- Entidades e casos de uso não devem depender de React, Next.js, Supabase ou detalhes de transporte.
- Prefira tipos explícitos, funções pequenas, composição e nomes que expressem intenção.
- Preserve contratos públicos e evite abstrações sem uma necessidade concreta.

## Qualidade
- Desenvolva orientado por testes: primeiro comportamento, depois implementação.
- Mantenha no mínimo 90% de cobertura nos testes unitários.
- Use testes de integração para migrations, RLS, repositórios e sincronização de traduções.
- Use Playwright para fluxos críticos de idioma, versões, navegação, acessibilidade e download de PDF.
- Toda alteração deve passar por lint, typecheck, testes relevantes e build.

## Produto
- A interface deve mostrar resumo, experiências, habilidades, formação, idiomas e contatos.
- Suporte PT-BR e EN-US mantendo estrutura, datas, entidades e fatos equivalentes.
- O currículo atual é a fonte inicial: DGT Tecnologia, Antlia, Banco Itaú, Pollux Technologies e consultoria contábil.
- Habilidades incluem C#/.NET, Java/Spring Boot, Node.js/NestJS, TypeScript, Python, Go, React, Next.js, Angular, Flutter, React Native, DDD, CQRS, Clean Architecture, RabbitMQ, Kafka, PostgreSQL, Redis, AWS, Azure, GCP, Kubernetes, Docker, Terraform, CI/CD, TDD, Playwright, OAuth 2.0, OIDC e JWT.
- Não invente experiência, métricas, certificados ou resultados. Preserve os fatos fornecidos e sinalize afirmações que precisem de confirmação.
- Trate telefone, email, empregadores, detalhes financeiros e métricas como dados públicos sujeitos a revisão de privacidade/confidencialidade.

## UI/UX
- Crie uma interface editorial, profissional, responsiva e visualmente marcante, sem excesso de cards.
- Use hierarquia tipográfica clara, contraste, estados de erro/loading/empty e navegação por teclado.
- Não dependa de cor ou animação para comunicar informação.
- Verifique mobile e desktop antes de concluir.

## Entrega
- Atualize documentação e critérios de aceite quando o comportamento mudar.
- Nunca comite segredos; use `.env.example` e mantenha service-role apenas no servidor/CI.
- Não faça refatorações não relacionadas ao objetivo da tarefa.
