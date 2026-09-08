# Backlog inicial

## MVP

### US-01 Visualizar currículo

Como recrutador, quero compreender o perfil, a experiência, as habilidades e a formação em uma única página para avaliar aderência rapidamente.

**Aceite:** conteúdo organizado por seções; layout responsivo; contatos acessíveis; sem informação inventada.

### US-02 Alternar idioma

Como visitante internacional, quero alternar entre PT-BR e EN-US para ler o currículo no meu idioma.

**Aceite:** mesma estrutura e fatos equivalentes; URL compartilhável; metadata correta por idioma.

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

- Painel autenticado de rascunhos e publicação.
- Case studies e portfólio de projetos.
- Analytics com privacidade.
- Geração alternativa com Playwright para PDF web.
- Implementação automática de novas habilidades com base em experiência e vagas
- Interação nas experiência profissionais verificando os desafios e entregas com imagens, vídeos, projetos, código. **(Implementado - Item 6)**
- Adicionar anos de experiência em cada habilidade, com data de início calculando automaticamente. **(Implementado - Item 5)**
- Lint automático e regras para MD e outros

## Débitos Técnicos

### Testes e Qualidade de Código
- **Coverage de testes unitários**: Atingir >90% de coverage em todos os serviços e componentes críticos
  - Serviço `CalculateSkillExperience` (recém implementado)
  - Componente `ExperienceMediaGallery` (recém implementado)
  - Componentes de domínio existentes
- **Testes de integração**: Validar fluxos completos entre serviços e repositórios
  - Integração cálculo de experiência com dados reais
  - Integração galeria multimídia com renderização
- **Testes E2E**: Cobrir jornadas completas do usuário
  - Navegação entre idiomas com validação de conteúdo
  - Galeria multimídia interativa (abrir modal, navegar assets)
  - Download de PDF em diferentes cenários
  - Validação de versão e estados de erro
- **GitHub Actions E2E**: Configurar pipeline rodando testes E2E em PRs e main branch
