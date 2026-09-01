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

O workflow de Release Please observa a branch `main` e cria um pull request de release. Ao fazer merge:

1. atualiza `package.json`, `package-lock.json` e `CHANGELOG.md`;
2. cria uma tag `vX.Y.Z` seguindo SemVer;
3. publica a GitHub Release.

Regras SemVer:

- `fix` e `perf`: patch;
- `feat`: minor;
- `BREAKING CHANGE` ou `!`: major.

A aplicação na Vercel deve ser ligada à `main` e usar o commit/tag publicado como referência de produção.

## Validação local

```bash
npm run typecheck
npm run lint
npm run build
```

Testes unitários, integração e E2E serão adicionados aos scripts conforme cada camada for implementada.
