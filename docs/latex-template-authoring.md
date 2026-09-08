# Modelos LaTeX do Currículo

## Objetivo

O aplicativo separa conteúdo e apresentação. O currículo é um objeto `ResumeContent`, com textos PT-BR e EN-US. Um modelo LaTeX recebe esse objeto já normalizado e devolve um documento `.tex`; ele não deve cadastrar, alterar ou duplicar fatos do currículo.

O modelo padrão é `CLEAN`. O modelo `REFERENCE` reproduz a estrutura do PDF anexado: cabeçalho de contato, resumo executivo, skills em duas colunas, experiência, formação e idiomas em duas páginas.

## Onde cada parte fica

- Registro de modelos e modelo padrão: `src/infrastructure/pdf/resume-template-registry.ts`.
- Fábrica visual LaTeX: `src/infrastructure/pdf/latex-templates.ts`.
- Composição semântica das seções: `src/infrastructure/renderers/latex-resume-renderer.ts`.
- Dados PT-BR: `src/infrastructure/content/resume-data.ts`.
- Dados EN-US: `src/infrastructure/content/resume-data-en-us.ts`.
- Contrato tipado: `src/domain/resume/types.ts`.
- Endpoint: `src/app/api/resume/[locale]/pdf/route.ts`.
- Cache: `src/infrastructure/pdf/resume-pdf-cache.ts`.
- Controle de download: `src/components/download-pdf-button.tsx`.

## Como criar um modelo

1. Adicione o novo identificador ao array `RESUME_TEMPLATE_IDS`.
2. Adicione nome e descrição PT-BR/EN-US em `RESUME_TEMPLATES`.
3. Crie a apresentação LaTeX correspondente em `resumeLatexTemplate` ou extraia-a para uma função própria no mesmo arquivo.
4. Use apenas os valores recebidos pela função: `name`, `title`, `location`, `phone`, `email`, `linkedin`, `version`, `locale` e `body`.
5. Não altere o `ResumeContent` para resolver espaçamento, fonte, cor, colunas ou quebras de página.
6. Se o modelo tiver regras próprias, selecione-as por `templateId`, mantendo a composição semântica compartilhada.
7. Adicione um teste que confirme que o modelo contém `\\documentclass`, `\\begin{document}`, todas as seções e seus elementos exclusivos.
8. Gere o PDF dentro da imagem `marcelino-pdf-compiler:latest` e valide `pdfinfo`, número de páginas e texto extraído.

## Instrução para outra IA criar um layout

Use este prompt como base:

```text
Você está criando um modelo visual LaTeX para um currículo versionado.

Fonte de verdade: ResumeContent em src/domain/resume/types.ts e os dados da locale solicitada.
Modelo: <ID_DO_MODELO>.
Referência visual: <DESCREVA OU ANEXE O PDF DE REFERÊNCIA>.

Regras obrigatórias:
- Não invente, remova, resuma ou traduza fatos.
- Não altere o domínio nem os dados para resolver apresentação.
- Preserve a ordem semântica: cabeçalho, resumo, skills, experiência, formação e idiomas.
- Reutilize o renderer compartilhado e injete apenas apresentação no template.
- Escape todo conteúdo dinâmico com escapeLatex antes de interpolar.
- Use compilação determinística com Docker e pdflatex.
- O modelo deve funcionar para pt-BR e en-US com a mesma estrutura.
- Informe margens, fonte, tamanhos, cores, espaçamento, colunas, quebras e número esperado de páginas.
- Adicione testes unitários do renderer e valide o PDF com pdfinfo e pdftotext.
- Registre o novo modelo em resume-template-registry.ts.

Entregue:
1. O template LaTeX.
2. As alterações mínimas no registry.
3. Testes do modelo.
4. Documentação das decisões visuais e dos critérios de aceite.
```

## Contrato de execução

A URL `/api/resume/{locale}/pdf` usa `CLEAN` quando nenhum modelo é informado. Para selecionar outro modelo, use `?template=REFERENCE`. O botão principal sempre chama o padrão `CLEAN`; a seta abre o menu de modelos e baixa o modelo escolhido.

A chave de cache inclui versão, locale, modelo e conteúdo completo. Portanto, mudar o modelo gera um artefato separado mesmo que o conteúdo seja idêntico.

## Checklist visual

- [ ] O conteúdo extraído é equivalente ao currículo da locale.
- [ ] O cabeçalho não corta telefone, email ou LinkedIn.
- [ ] Nenhuma palavra sofre quebra indesejada por largura insuficiente.
- [ ] A ordem e os títulos das seções são preservados.
- [ ] O número de páginas corresponde à referência.
- [ ] PT-BR e EN-US usam o mesmo layout estrutural.
- [ ] O cache não reutiliza o PDF de outro modelo.
- [ ] O download principal continua usando `CLEAN`.
