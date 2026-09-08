# Contrato de Referência do PDF

## Fonte canônica

O PDF anexado pelo usuário em 7 de setembro de 2026 é a referência visual e textual do modelo `REFERENCE` para o currículo PT-BR. O modelo `CLEAN` é o padrão do botão principal e mantém a apresentação editorial existente. A saída `REFERENCE` deve reproduzir sua estrutura, conteúdo, ordem e paginação de duas páginas.

A referência contém:

- Cabeçalho com nome, cargo, localização, telefone, email e LinkedIn.
- Seções `Resumo Executivo`, `Core Skills & Arquitetura de Software`, `Experiência Profissional`, `Formação Acadêmica & Certificações` e `Idiomas`.
- Skills organizadas em pares de rótulo e conteúdo, em duas colunas.
- Experiências com período, cargo, empresa, localidade e bullets de realizações.
- Formação com período, curso, instituição e descrição completa.
- Idiomas na ordem `Inglês Profissional` e `Português Nativo`.
- Paginação final em exatamente duas páginas, com numeração `1/2` e `2/2`.

## Modelos disponíveis

- `CLEAN`: padrão, usado quando `/api/resume/{locale}/pdf` não recebe `template`.
- `REFERENCE`: modelo fiel ao PDF anexado, usado com `/api/resume/{locale}/pdf?template=REFERENCE`.

O botão principal baixa sempre `CLEAN`. A seta abre o menu de modelos e baixa o modelo escolhido. O cache separa versão, locale, conteúdo e modelo.

## Critérios de aceite

1. O conteúdo PT-BR deve ser equivalente ao texto extraído da referência, sem resumos ou substituições inventadas.
2. O renderer deve incluir todos os campos tipados, inclusive telefone e localidade da experiência.
3. A geração deve usar o compilador LaTeX Docker; PDFKit é somente fallback operacional.
4. O workflow de publicação deve construir a imagem LaTeX antes de compilar os artefatos.
5. Alterações visuais devem ser validadas por comparação com a referência anexada, incluindo número de páginas, ordem das seções, quebras de linha e densidade de conteúdo.
6. PT-BR e EN-US devem manter a mesma estrutura, com tradução explícita apenas no conteúdo textual.
7. O modelo `REFERENCE` deve manter a ordem `Resumo Executivo`, `Core Skills & Arquitetura de Software`, `Experiência Profissional`, `Formação Acadêmica & Certificações` e `Idiomas`.

## Implementação

- Conteúdo: `src/infrastructure/content/resume-data.ts`.
- Contrato de domínio: `src/domain/resume/types.ts`.
- Composição: `src/infrastructure/renderers/latex-resume-renderer.ts`.
- Apresentação LaTeX: `src/infrastructure/pdf/latex-templates.ts`.
- Compilação determinística: `Dockerfile.latex` e `src/infrastructure/pdf/docker-pdf-compiler.ts`.
