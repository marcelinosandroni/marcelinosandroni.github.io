# Geração de PDFs do currículo — guia rápido

## Comandos

### 1. Construir os HTMLs de todas as variantes (pt-BR)
```bash
npm run resume:build-variants
```
Gera `resume-recruiter-pt-br-enterprise-java.html`, `...-enterprise-java-react.html`, `...-enterprise-dotnet.html`, `...-enterprise-dotnet-react.html`, `...-modern-web.html` e `resume-recruiter-pt-br.html` (o geral). Roda o contrato de layout (limites de linhas/caracteres) e falha se algo estourar.

### 2. Construir os HTMLs em inglês
```bash
npm run resume:build-en:all
```
Gera `resume-recruiter-en-us.html` e as variantes `resume-recruiter-en-us-*.html`.

### 3. Renderizar um PDF de UM stack específico (do HTML já construído)
```bash
npm run pdf:from-html -- resume-recruiter-pt-br-enterprise-java.html public/artifacts/fixed/resume-fixed-pt-br-enterprise-java.pdf
```
Ou diretamente com o conversor:
```bash
npx tsx scripts/html-to-pdf.ts resume-recruiter-pt-br-enterprise-java.html public/artifacts/fixed/resume-fixed-pt-br-enterprise-java.pdf
```

### 4. Renderizar todas as variantes de uma vez
```bash
npm run pdf:fixed:variants          # pt-BR (5 variantes + geral)
npm run pdf:fixed:en:variants       # en-US (5 variantes + geral)
```

### 5. Tudo (limpa, constrói, renderiza, verifica)
```bash
npm run pdf:fixed:build
```
Este é o comando que roda no CI. Ele limpa `public/artifacts/fixed/`, reconstrói todos os HTMLs, renderiza todos os 12 PDFs (6 pt-BR + 6 en-US) e roda `verify-fixed-artifacts` (confere que todos existem, têm 2 páginas e não são truncados).

### 6. Medir apenas um documento (altura das páginas)
```bash
npm run resume:measure -- resume-recruiter-pt-br-enterprise-java.html
```
Mostra quantos mm cada página ocupa (limite: 277 mm por página).

---

## Onde alterar o conteúdo

### Detalhes de uma stack específica (headline, resumo, métricas, inventário, roles/bullets)
**`scripts/data/stack-variants.pt-br.ts`** — para português  
**`scripts/data/stack-variants.en-us.ts`** — para inglês

Cada variante é um objeto com `slug`, `label`, `title`, `headline`, `inventory` (grupos de habilidades), `sections` (resumo + 4 métricas) e opcionalmente `roles` (stack e bullets por vaga).

Exemplo: para mudar a stack da variante Java + React, edite o objeto com `slug: "enterprise-java-react"` nesse arquivo.

### Estrutura compartilhada (títulos de seção, contato, educação, idiomas, vagas compartilhadas)
**`resume-shell.html`** — é o "shell" que todas as variantes herdam. Aqui ficam:
- O bloco de contacto (6 campos fixos)
- A linha do tempo de carreira
- As 5 vagas compartilhadas (título, empresa, período, stack, bullets) — só para variantes que **não** declaram `roles` próprias
- Formação e idiomas (uma linha por item, fixos para todos)

### Regras de layout (limites de linhas e caracteres, tipografia fixa)
**`scripts/data/resume-layout-rules.ts`** — a "fonte da verdade" do contrato. Define:
- `BODY_PX = 12.5` (tipo fixo para tudo)
- `CONTACT_PX = 11` e `METRIC_CAPTION_PX = 9` (as duas exceções sancionadas)
- 18 regras com `maxLines` e `maxChars` para cada parte (resumo 5 linhas/500 chars, habilidade 2 linhas/215 chars, stack 1 linha/112 chars, bullet 3 linhas/300 chars, etc.)

**Regra de ouro:** a tipografia não se move para caber conteúdo. Se algo estourar, o texto encurta.

### Regras de geração e validação
- `scripts/build-stack-variants.ts` — constrói as variantes pt-BR a partir do shell + dados
- `scripts/build-english-variants.ts` — constrói as variantes en-US
- `scripts/build-english-resume.ts` — constrói o geral em inglês e exporta o tradutor compartilhado
- `scripts/check-layout.ts` — mede linhas/overflow/caracteres no navegador (Chromium) e falha o build se estourar
- `scripts/paginate-resume.ts` — paginador que decide a quebra de página
- `scripts/verify-fixed-artifacts.ts` — confere que todos os PDFs esperados existem e têm 2 páginas

---

## Fluxo recomendado para editar uma stack

1. Edite `scripts/data/stack-variants.pt-br.ts` (e `.en-us.ts` se quiser o inglês).
2. Rode `npm run resume:build-variants` — se o contrato de layout reclamar, encurte o texto (não reduza a fonte).
3. Rode `npm run resume:measure -- resume-recruiter-pt-br-<slug>.html` para conferir a altura da página 1.
4. Rode `npx tsx scripts/html-to-pdf.ts resume-recruiter-pt-br-<slug>.html public/artifacts/fixed/resume-fixed-pt-br-<slug>.pdf` para gerar só aquele PDF.
5. (Opcional) Rode `npm run pdf:fixed:build` para regenerar tudo e verificar consistência.

---

## Regras que não se mexem

- **Tipografia fixa em 12.5px** (salvo contacto em 11px e legendas de métrica em 9px).
- **Ordem dos blocos obrigatória:** header → resumo → métricas → carreira → habilidades → formação → idiomas → 5× cargo.
- **Uma vaga por data-role:** `dgt`, `bnp-paribas`, `itau`, `zup`, `consultoria`. Declarar `roles` é tudo-ou-nada: ou declara as cinco vagas ou nenhuma.
- **Contato é fixo:** sempre os mesmos seis campos, mesma ordem, mesmo markup (`div` por par, `flex` + `space-between`).
- **Download filename:** gerado pelo domínio (`resume-pdf-filename.ts`), não pelo servidor. Formato: `Marcelino Sandroni - Engenheiro de Software - Java e Angular.pdf`.
