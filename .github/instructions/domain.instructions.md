---
applyTo: "src/domain/**/*.ts,src/application/**/*.ts"
---

- Modele invariantes no domínio, não em handlers ou componentes.
- Use entidades, objetos de valor, serviços e portas quando houver comportamento de negócio.
- Casos de uso devem depender de interfaces, nunca de Supabase, Next.js ou filesystem.
- Retorne resultados previsíveis e erros de domínio identificáveis.
- Mantenha bounded contexts de conteúdo, publicação, geração de documento e apresentação separados.
