# Processo de release

O repositório usa **Conventional Commits** e **semantic-release**. A versão é
derivada dos commits: ninguém edita o número à mão.

## Fluxo

1. Desenvolva uma mudança pequena.
2. Valide localmente: `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:e2e`, `npm run build`.
3. Faça um commit no formato Conventional Commits. O CI valida a mensagem com commitlint.
4. Abra um pull request para `main`. O CI precisa passar.
5. Ao fazer merge, o workflow **Release** roda em `main` e faz tudo em uma passagem:
   lê os commits desde a última tag, calcula a próxima versão, grava em `package.json`, cria a tag `vX.Y.Z`, publica a GitHub Release e anexa o `CHANGELOG.md`.
6. A tag publicada aciona o **Compile & Publish Resume PDFs** e o deploy de produção.

Não existe pull request de release para alguém lembrar de aprovar. É por isso que
o versionamento é automático de verdade.

## Como a versão é calculada

| Commit | Efeito |
|---|---|
| `feat:` | minor — `0.1.5` → `0.2.0` |
| `fix:` | patch — `0.1.5` → `0.1.6` |
| `perf:` | patch |
| `BREAKING CHANGE:` no corpo, ou `feat!:` | major |
| `chore`, `ci`, `docs`, `refactor`, `test`, `build`, `revert` | não move a versão |

Em `0.x`, `feat` sobe o minor e não o major: a API pública do site ainda é
instável e um `0.2.0` comunica mais que um `1.0.0` prematuro.

Uma tag `vX.Y.Z` **não** deve ser criada à mão. Para quebrar o contrato, use
`BREAKING CHANGE:` no corpo do commit.

### A próxima versão é 1.0.0, não 0.2.0

Existe um `BREAKING CHANGE` real no histórico desde a tag `v0.1.5`, e ele não é
acidental:

```
feat(i18n)!: serve localized static routes and render the resume on the server

BREAKING CHANGE: "/" now redirects to "/en-us" and EN-US is the default
```

A URL raiz passou a redirecionar, que é uma quebra do contrato público do site.
O semantic-release vai computar `major` por causa disso, e a primeira release
automática será **1.0.0**, não 0.2.0 — independentemente de quão pequeno for o
commit que a dispara. A regra `breaking` olha todo o intervalo desde a última
tag, não só o último commit.

Se isso for indesejado, existem duas saídas honestas:

1. Aceitar. A mudança de URL foi anunciada e tem redirect; `1.0.0` descreve o
   estado real do contrato.
2. Criar manualmente uma tag `v0.2.0` com o changelog que você considera
   correto, e deixar o semantic-release seguir a partir dela. Nunca invente
   changelog: o conteúdo da tag precisa descrever o que está no histórico.

## A versão exibida no site

O rodapé renderiza `v{SITE_VERSION}`, e `SITE_VERSION` é lido de
`package.json` em `src/domain/site/site-info.ts`. O número mostrado é sempre o
do build que o serviu, e o link leva à release correspondente no GitHub.

Existe exatamente **uma** fonte da verdade: `package.json`. Não escreva a
versão em `.releaserc.json`, em um manifesto ou em um componente. O teste
`tests/unit/config/release-contract.test.ts` falha se um segundo arquivo
passar a conter um número de versão.

## Testar o cálculo sem publicar

O workflow aceita execução manual e informa a próxima versão sem alterar nada:

```bash
gh workflow run release.yml
```

A opção `dry-run` vem ligada por padrão nessa execução manual. Um push para
`main` sempre publica de verdade.

## Por que não release-please

O repositório usou release-please até 29/09/2026. Ele estava configurado
corretamente e parecia perfeito no CI — seis execuções consecutivas terminaram
com `success` — mas nunca produziu nada: nenhum pull request de release, nenhuma
tag, nenhuma GitHub Release, nenhum `CHANGELOG.md`. O log mostrava
`Set(0) {}`: release-please coletava zero commits e saía sem decidir nada, e o
workflow reportava sucesso mesmo assim. A versão ficou em `0.1.5` e o
`docs/release-process.md` descrevia um fluxo de sete passos que nunca havia
concluído uma vez.

O sintoma é o que importa: **uma ferramenta de release que falha em silêncio é
pior do que nenhuma**, porque o badge verde é uma afirmação falsa. A
substituição por semantic-release remove o estado intermediário (o PR de release
que ninguém mergeava) e o passo de sumir em silêncio, porque um commit inválido
agora falha o commitlint no CI.

A tag `v0.1.5` foi criada à mão, sem os commits `chore(release)` que
release-please teria gerado. O semantic-release a usa apenas como ponto de
partida e não tenta reconstruir esse histórico.
