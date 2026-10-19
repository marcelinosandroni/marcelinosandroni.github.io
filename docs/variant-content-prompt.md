# Prompt: escrever o conteúdo de uma variante do currículo

> **Cole este arquivo inteiro, do início ao fim, num modelo de linguagem.** Ele
> descreve o documento todo, não só a parte que muda. Um modelo que recebe só
> "escreva um resumo" escreve um resumo do tamanho que quiser.

Gerado de `scripts/data/resume-layout-rules.ts` por `scripts/write-variant-prompt.ts`.
A fonte da verdade é o código: `npm run resume:prompt` reescreve este arquivo.

---

## 1. O que este currículo é

6 documentos que compartilham **uma estrutura e uma tipografia**:

`pt-BR` — o geral
`pt-BR` — Java + Angular
`pt-BR` — Java + React
`pt-BR` — C# + Angular
`pt-BR` — Node + Go + React
`en-US` — o geral

Dois A4, sempre. **Página 1 vende o perfil; página 2 é a experiência completa.**
A quebra entre as duas é forçada, não automática.

---

## 2. A regra que não se move

> **A tipografia é fixa. O conteúdo é a variável.**

Tudo o que o leitor lê como texto está em **12.5px**. Se algo não cabe, o
build **para e diz qual item e em quantos caracteres**. A correção é escrever
menos.

**Diminuir a tipografia para caber é o erro que este contrato existe para
impedir**, e já aconteceu neste projeto duas vezes: o corpo foi afinado abaixo do
resumo, e a página que saiu deixou de dizer o que se propunha dizer.

Duas exceções, e são só duas — ambas declaradas na tabela abaixo com o limite que
as sustenta: o bloco de contacto a 11px (seis campos de referência não são
prosa) e as legendas das métricas (um cartão de 43mm não comporta duas linhas de
legenda a 12.5px).

---

## 3. A ordem dos blocos — obrigatória

O build recusa um documento fora desta ordem:

- `header`
- `resumo`
- `metricas`
- `carreira`
- `habilidades`
- `formacao`
- `idiomas`
- `cargo`
- `cargo`
- `cargo`
- `cargo`
- `cargo`

Os títulos são casados pelo **texto exato**, então renomear um quebra o build:

- `Resumo Profissional` — `Professional Summary`
- `Principais Métricas de Impacto em Produção` — `Key Production Impact Metrics`
- `Linha do Tempo de Carreira em Engenharia` — `Career Timeline in Engineering`
- `Habilidades Técnicas &amp; Arquitetura de Software` — `Technical Skills &amp; Software Architecture`
- `Formação Acadêmica &amp; Especializações` — `Academic Education &amp; Specializations`
- `Idiomas` — `Languages`
- `Experiência Profissional` — `Professional Experience`

---

## 4. A escala de espaçamento

Três passos, em milímetros, e **toda distância na página é um deles**:

- `--space-1` = **1mm**
- `--space-2` = **2mm**
- `--space-3` = **4mm**

- **1mm** — entre irmãos de uma **lista**: grupos de habilidade, cursos, idiomas, linhas de contacto
- **2mm** — entre **parágrafos** (os bullets), e do título de uma seção ao seu conteúdo
- **4mm** — entre **blocos**

---

## 5. A tabela de limites

**Linhas** é o orçamento renderizado. **Caracteres** é o orçamento de escrita: dá
para saber que se está em 185 de 215 sem rodar nada, e continua dentro. A última
coluna é quanto o documento Java + Angular usa hoje — a folga que sobrou.

| Parte | Linhas | Caracteres | No Java (chars) | Por quê |
|---|---:|---:|---:|---|
| Nome | **1** | **40** | 23 | A name that wraps reads as two words of a company name. |
| Cargo (headline) | **1** | **80** | 51 | The line under the name is the only sentence a recruiter is certain to read, and a two-line headline pushes everything below it down a line. |
| Tagline | **1** | **120** | 77 | One sentence of positioning under the name. |
| Contacto (cada linha) | **1** | **110** | 110 | Three fixed fields on one line, each field a single div so the label and its value stay together, and the three pairs distributed by space-between. |
| Resumo Profissional | **5** | **500** | 473 | Five lines is what the summary is allowed to be on the page. |
| Métrica - valor | **1** | **24** | 14 | A number and its unit. |
| Métrica - destaque | **1** | **26** | 20 | The green label is the name of the achievement, not a sentence. |
| Métrica - descrição | **2** | **64** | 60 | Two lines, in a card 43mm wide. |
| Linha do tempo - empresa | **1** | **14** | 11 | A company name over its own segment. |
| Linha do tempo - nível | **2** | **26** | 23 | The level is what makes the bar a progression and not four rectangles. |
| Linha do tempo - ano | **1** | **4** | 4 | The year ruler. |
| Habilidades Técnicas (cada grupo) | **2** | **215** | 207 | Two lines per group is the whole reason this section is readable: six two-line groups are a list a recruiter can scan, and six four-line groups are a paragraph they will skip. |
| Formação Acadêmica (cada item) | **1** | **80** | 62 | One line: degree, institution, years. |
| Idiomas (cada item) | **1** | **100** | 80 | One line: language, level, what it is used for. |
| Experiência - título do cargo | **1** | **60** | 51 | Title and company on the left, dates on the right, one line. |
| Experiência - período | **1** | **48** | 41 | Tenure and dates together. |
| Experiência - stack | **1** | **112** | 109 | One line, no wrapping. |
| Experiência - bullet | **3** | **300** | 260 | Two to three lines. |

> O limite de caracteres foi medido a partir de quanto texto cabe numa linha
> **nesta tipografia exata**, com folga. Então um texto com exatamente o limite
> ainda pode dar uma linha a mais — por isso **as linhas têm a palavra final**.

---

## 6. O que você escreve, e o que é fixo

### Você escreve

- O headline (cargo + stack), em 1 linha.
- O resumo profissional, em até 5 linhas.
- As quatro métricas: valor, destaque verde e descrição.
- O inventário de habilidades, um grupo por linha de 2.
- A stack e os bullets de cada uma das cinco vagas — se a variante argumentar para outra stack.

### Não se mexe — é fixo em todos os cinco documentos

- Os seis campos de contacto — Localização, Email, WhatsApp, LinkedIn, Git, Portfólio. São fatos, iguais nos cinco documentos.
- A barra da linha do tempo — é montada a partir das datas das vagas, não escrita.
- As datas, as tenures, os títulos dos cargos e os nomes das empresas — são fatos, e existem em um lugar só. Uma variante que reescrevesse a própria vaga criaria um quinto lugar para uma data envelhecer.
- O nível de cada cargo de engenharia — o build exige que toda vaga nomeie o nível (Sênior, Pleno, Sênior & Tech Lead).
- Quantos bullets cada vaga tem — três, três, três, dois, um. É o que faz a página 2 ser escaneável.
- A ordem das seções — o build recusa um documento fora dela.
- A formação e os idiomas — uma linha por item.
- O cabeçalho, a tipografia e os espaçamentos.

---

## 7. O esqueleto de uma vaga

```
FIXO         Linha 1   <titulo do cargo> | <empresa>          à direita: (N anos e M meses) · Início – Fim
             Linha 2   Stack: <uma linha, nunca quebra>       <- você escreve
Bullets       o mais recente leva 3 · o seguinte 3 · o seguinte 3 · o seguinte 2 · o mais antigo 1
             <rótulo curto:> e depois a frase, justificado, 2 a 3 linhas   <- você escreve

Título, empresa, datas e tenure são fixos e compartilhados pelos cinco documentos.
A stack e os bullets são seus. O primeiro bullet de cada cargo começa com um <strong>rótulo curto:</strong>.
Exemplo: <strong>Custódia Institucional Estratégica:</strong> Desenvolvimento full-stack de portal B2B…

Regra do tudo-ou-nada: você declara as CINCO vagas ou nenhuma. Declarar três deixa
duas com o texto do currículo geral, e o documento passa a defender Node em três
vagas e Spring em duas — o contrato de layout não pega isso, porque cada stack e cada
bullet estão dentro dos limites individualmente.
```

O bullet é justificado, como o resumo e o inventário. Cada bullet leva 2 a 3 linhas.

---

## 8. O exemplo, que é o documento Java + Angular

### Headline

```
Engenheiro de Software Sênior | Angular + Java + AI
```

### Resumo profissional

> **Engenheiro de Software unindo quase 8 anos em arquiteturas distribuídas (Java, Spring, Angular, Kafka) a 15 anos de background corporativo e financeiro.** Atuo da concepção de ecossistemas cloud-native do zero ao desacoplamento de sistemas críticos. Foco na construção de microsserviços, micro-frontends e IA corporativa (Agentes/RAG), garantindo alta performance, escalabilidade e resiliência para sistemas de missão crítica, sob extrema cultura de testes e observabilidade.

### As quatro métricas

| valor | destaque | descrição |
|---|---|---|
| **+R$ 500 Bi** | Gestão de Ativos | Plataformas B2B de custódia e orquestração de fundos. |
| **D+0** | Liquidação Real-Time | De 24h (D+1) para menos de 1s, via Kafka e Java. |
| **100M+ msgs/dia** | Alta Escala | Orientada a eventos, tolerante a falhas. |
| **95%** | Cobertura de Testes | Cultura de QA e TDD em backend (JUnit) e frontend (Cypress). |

### Inventário de habilidades

- **Frontend & UI Architecture:** Angular (8 ao 22), TypeScript, JavaScript, HTML5, CSS3, SASS, Micro-frontends, Estado/Reatividade (RxJS, NgRx), SSR, Tailwind CSS, Angular Material, Design Systems.
- **Backend & Frameworks:** Java (8 ao 25), Spring Boot 3.x (AOT/GraalVM), Spring Cloud, Spring WebFlux, Spring Batch, Spring Security (OAuth2, OIDC, JWT, mTLS), Hibernate/JPA (N+1), Tuning de JVM (ZGC/G1GC).
- **Inteligência Artificial & Dados:** LLMs corporativos via Spring AI e LangChain4j, Amazon Bedrock (Claude/Titan), RAG, Agentic Workflows (Function Calling), Vector Databases (pgvector, Milvus).
- **Cloud & DevOps:** AWS (EKS/ECS, S3, RDS, SQS, SNS, Lambda, API Gateway, CloudWatch), Docker, Kubernetes (Helm), Terraform, CI/CD (GitHub Actions, Bitbucket, Jenkins), Observabilidade (OpenTelemetry, Datadog).
- **Arquitetura, APIs & Mensageria:** REST Nível 3, gRPC, GraphQL, WebSockets, Kafka (partições, idempotência), RabbitMQ (exchanges, DLQ), Circuit Breakers, Clean, Hexagonal, DDD, CQRS, SOLID, EDA, Microsserviços.
- **Ecossistema Analítico & Bancos:** Oracle, PostgreSQL, SQL Server, MongoDB, Redis, Cassandra, Neo4j, DynamoDB, DocumentDB, Snowflake, Databricks.

Os seis campos de contacto, em duas linhas de três, um `div` por par:

```
row 1   Localização: Fortaleza, CE (Atuação Remota)
        Email: marcelino.sandroni@gmail.com
        WhatsApp: +55 11 91446-1993
row 2   LinkedIn: linkedin.com/in/marcelinosandroni
        Git: github.com/marcelinosandroni
        Portfólio: marcelinosandroni.com
```

---

## 9. O que o build recusa

Cada um destes já reprovou uma execução:

- **Uma linha a mais** em qualquer item da tabela — o build nomeia o item e a frase.
- **Mais caracteres** que o orçamento, mesmo que ainda caiba em duas linhas. É o aviso-previo.
- **Transbordo horizontal** num item de uma linha. Elemento com `nowrap` não quebra: ele *estoura*, e a contagem de linhas continua 1 — é por isso que o transbordo é medido à parte.
- **Uma regra sem elemento** — se o gancho `data-rule` sumir, o build acusa a regra que parou de verificar alguma coisa.
- **Uma vaga de engenharia sem nível** no título.
- **Uma data fora de ordem** — as vagas são da mais recente para a mais antiga.
- **Uma variante que declara só três das cinco vagas** — as outras duas ficam com o texto do currículo geral. Declare as cinco ou nenhuma.
- **Um número de bullets que não bate com o da vaga** — a contagem é do documento, não da variante.
- **Uma stack numa vaga que não tem linha de stack** — a vaga contábil não é de engenharia, e é de engenharia que uma stack é.
- **Um texto em português no documento inglês**, pela lista de vestígios.

---

## 10. Depois de escrever

```bash
npm run resume:build-variants     # constrói e roda o contrato de layout
npm run resume:measure -- resume-recruiter-pt-br-<sua-variante>.html
npm run pdf:fixed:build          # gera e verifica os cinco PDFs
```

Se o build reclamar de linhas ou caracteres, **o texto é que encurta** — a
tipografia não se move.
