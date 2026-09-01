# Processo de release

O repositório usa Conventional Commits e Release Please.

## Fluxo

1. Desenvolva uma mudança pequena.
2. Valide com typecheck, lint, testes e build.
3. Faça um commit no formato Conventional Commits.
4. Envie para `main` por pull request.
5. O Release Please calcula a próxima versão SemVer e atualiza o changelog.
6. Após o merge do release PR, a tag `vX.Y.Z` e a GitHub Release são criadas.
7. A tag publicada aciona os artefatos de PDF e o deploy de produção.

Não crie tags manuais para mudanças comuns. Use `BREAKING CHANGE:` no corpo ou `feat!:` somente quando houver quebra real de contrato.
