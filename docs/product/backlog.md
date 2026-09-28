# Backlog inicial

## MVP

### US-01 Visualizar currículo

Como recrutador, quero compreender o perfil, a experiência, as habilidades e a formação em uma única página para avaliar aderência rapidamente.

**Aceite:** conteúdo organizado por seções; layout responsivo; contatos acessíveis; sem informação inventada.

### US-02 Alternar idioma

Como visitante internacional, quero alternar entre EN-US e PT-BR para ler o currículo no meu idioma.

**Aceite:** mesma estrutura e fatos equivalentes; URL compartilhável e canônica por idioma; metadata, `hreflang` e sitemap corretos por idioma; nenhum texto da interface fixado no código.

> **Status**: entregue em 2026-09-28. Decisão e trade-offs em [ADR-005](../adr/ADR-005-internationalization-strategy.md). EN-US é o idioma padrão.

### US-03 Explorar trajetória

Como visitante, quero explorar a linha do tempo profissional e as habilidades por categoria para entender profundidade e evolução.

**Aceite:** navegação por teclado; fallback sem animação; categorias legíveis em mobile.

### US-04 Baixar currículo

Como recrutador, quero baixar o PDF da versão selecionada para arquivar ou compartilhar.

**Aceite:** artefato corresponde à versão; download funciona em desktop e mobile; falhas mostram estado compreensível.

### US-05 Selecionar versão

Como visitante, quero consultar uma versão publicada para conferir quando o conteúdo foi atualizado.

**Aceite:** versão tem identificador, data e idioma; versão inexistente retorna estado de erro; conteúdo permanece imutável.

## Evoluções

- **EV-01 Painel autenticado para blog**: Como autor, quero um painel administrativo estilo CMS para criar, editar e publicar artigos/blog posts.
  - **Aceite:** autenticação segura; lista de artigos com status (rascunho/publicado); editor visual/Markdown; preview antes de publicar; histórico de publicações; categorias/tags.

- Case studies e portfólio de projetos.
- Analytics com privacidade.
- Implementação automática de novas habilidades com base em experiência e vagas
- Interação nas experiência profissionais verificando os desafios e entregas com imagens, vídeos, projetos, código.
- Adicionar anos de experiência em cada habilidade, com data de início calculando anos automaticamente.
- Lint automático e regras para MD e outros
- Adicionar novo idioma (ex.: es-ES) a partir do contrato de locale existente: um arquivo de catálogo tipado, uma entrada em `SUPPORTED_LOCALES` e um `resume-data-*.ts`.
- Regra de lint que proíba texto visível direto em componentes React, para barrar regressão de conteúdo fixado no código.
- Datas relativas e números localizados por idioma (`Intl.RelativeTimeFormat`, `Intl.NumberFormat`) em datas de experiência e métricas.
