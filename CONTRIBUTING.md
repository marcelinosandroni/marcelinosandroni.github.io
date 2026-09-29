# Contribuindo

## Commits

Use Conventional Commits:

```text
<tipo>(<escopo opcional>): <descrição no imperativo>
```

Tipos principais: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci` e `chore`.

Exemplos:

- `feat(domain): add published resume version`
- `fix(pdf): preserve selected locale in artifact`
- `test(resume): cover invalid publication date`

Não misture mudanças sem relação no mesmo commit. O corpo pode explicar motivação e impacto quando necessário.

## Releases

O workflow de Release observa a branch `main` e faz tudo em uma passagem, sem
nenhum pull request intermediário para alguém lembrar de aprovar:

1. lê os commits desde a última tag;
2. atualiza `package.json`, `package-lock.json` e `CHANGELOG.md`;
3. cria uma tag `vX.Y.Z` seguindo SemVer;
4. publica a GitHub Release.

Regras SemVer:

- `fix` e `perf`: patch;
- `feat`: minor;
- `BREAKING CHANGE` ou `!`: major;
- `chore`, `ci`, `docs`, `refactor`, `test`, `build`: sem bump.

A mensagem do commit é validada pelo commitlint no CI
(`npm run lint:commit`). Um type inválido falha o pull request em vez de passar
despercebido e não gerar versão.

A versão exibida no rodapé vem de `package.json` — não escreva a versão em
nenhum outro arquivo. Para ver a próxima versão sem publicar, rode o workflow
`Release` manualmente pelo GitHub Actions: a execução manual é dry run por
padrão.

Detalhes em [docs/release-process.md](docs/release-process.md).

## Validação local

```bash
npm run typecheck
npm run lint
npm run build
```

Testes unitários, integração e E2E serão adicionados aos scripts conforme cada camada for implementada.
