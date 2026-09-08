import type { ResumeContent } from "@/domain/resume/types";

export const resumeContent: ResumeContent = {
  locale: "pt-BR",
  name: "Marcelino Sandroni Dias",
  title: "Engenheiro de Software Sênior",
  location: "Fortaleza, CE (Remoto)",
  contact: {
    phone: "+55 11 91446-1993",
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Engenheiro de Software Sênior Full Stack com o diferencial estratégico de unir engenharia de ponta a 15 anos de sólida experiência em negócios e contabilidade. Especialista em traduzir regras corporativas financeiras complexas em arquiteturas web escaláveis e sistemas distribuídos de alta volumetria. Atuo de ponta a ponta (Backend, Frontend, Mobile e DevOps) para construir produtos robustos que maximizam a rentabilidade financeira, escalam junto com a empresa e resolvem dores reais da operação sem quebrar o sistema. Atuo como referência técnica, combinando rigor metodológico, mentoria e uso de Inteligência Artificial para acelerar entregas com código limpo e sustentável.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Engenheiro de Software Sênior & Tech Lead",
      period: "Jan/2026 – Presente",
      location: "Remoto",
      summary: "Liderança técnica na reestruturação e modernização de sistemas críticos legados para monitoramento de segurança pública com IA, processando 100 milhões de mensagens diárias. Atuação estratégica como ponte entre negócios e tecnologia, com autonomia para definir arquitetura, processos e stack tecnológica, salvando contratos de R$ 2M/mês através de entrega de assertividade de 100% em sistemas de reconhecimento facial e prevenção criminal.",
      highlights: [
        "Salvou contrato de R$ 24M/ano (R$ 2M/mês) em Florianópolis ao resolver gargalos críticos de processamento de 50M de mensagens/dia, entregando assertividade de 100% em reconhecimento de placas veiculares via IA que estava sob risco de cancelamento.",
        "Arquitetou sistema 'Minority Report' de previsão criminal com IA, integrando câmeras, drones, cercamento digital e modelos estatísticos para antecipação de crimes em tempo real com mapas preditivos para agentes de segurança pública.",
        "Multiplicou performance em 10x no processamento de 100M de mensagens diárias migrando de MySQL para ClickHouse, implementando ETL com Databricks e reestruturando arquitetura com microsserviços em Go e .NET.",
        "Liderou time de 10 profissionais (Devs, QA, BA, PO, PM) como Tech Lead, implementando cultura de TDD, DDD, GitFlow, Code Review rigoroso com automação via IA, e Definition of Ready/Done que elevaram qualidade e previsibilidade das entregas.",
        "Implementou DevOps completo do zero: CI/CD com Jenkins, Docker, Kubernetes, Helm, Terraform (IaC), pipelines automatizados no Bitbucket, SonarQube, Fortify, observabilidade, rollback automático e ambientes efêmeros.",
        "Criou Design System corporativo e bibliotecas compartilhadas (NPM para front, .NET/Java/Go para back), estabelecendo cultura de reutilização de código que reduziu duplicidade e acelerou desenvolvimento em 40%.",
        "Automatizou testes E2E com Playwright substituindo trabalho manual de QA, liberando equipe para asseguramento de qualidade estratégico e gerando evidências automáticas para clientes.",
        "Introduziu LLMs internos (Claude, GPT) para code review, geração de código e documentação, criando critérios, prompts e modelos de uso de IA que multiplicaram produtividade da equipe.",
      ],
      caseStudies: [
        {
          title: "Operação Minority Report: Sistema Preditivo de Crimes com IA",
          challenge:
            "Secretarias de Segurança Pública necessitavam de antecipação de ocorrências criminais para otimizar alocação de agentes, mas operavam de forma reativa, sem integração entre câmeras, drones, bases de dados e sistemas de monitoramento, resultando em resposta tardia a incidentes e ineficiência na prevenção.",
          solution:
            "Arquitetei e liderei desenvolvimento de sistema preditivo de crimes estilo 'Minority Report' com: (1) Integração em tempo real de feeds de câmeras de vigilância, drones e sensores IoT; (2) Modelos estatísticos e de Machine Learning para análise preditiva baseada em padrões históricos, sazonalidade e indicadores de risco; (3) Mapas de calor dinâmicos com previsão de hotspots criminais por região e período; (4) Sistema de alertas inteligentes para comandos de operações com sugestão de rotas e posicionamento de viaturas; (5) Dashboards executivos com KPIs de criminalidade em tempo real para tomada de decisão estratégica; (6) APIs de integração com sistemas de outras secretarias e forças de segurança.",
          result:
            "Sistema operacional em múltiplas cidades com capacidade de processar 100M de eventos diários, redução de 35% em índices criminais nas áreas monitoradas, otimização de 40% no deslocamento de agentes, e reconhecimento nacional como referência em segurança pública inteligente. Tecnologia proprietária que se tornou diferencial competitivo da empresa.",
          metrics: [
            { label: "Eventos Processados Diariamente", value: "100 milhões", icon: "performance" },
            { label: "Redução de Criminalidade", value: "35%", icon: "performance" },
            { label: "Otimização de Recursos", value: "40%", icon: "people" },
            { label: "Tempo de Resposta", value: "Reduzido em 60%", icon: "time" },
          ],
        },
        {
          title: "Resgate de Contrato de R$ 24 Milhões: De 0% a 100% de Assertividade",
          challenge:
            "Contrato de R$ 2M/mês (R$ 24M/ano) com Prefeitura de Florianópolis estava sob iminente risco de cancelamento devido à baixa assertividade (<60%) no reconhecimento de placas veiculares via IA em câmeras de trânsito. Cliente enfrentava prejuízos operacionais, perda de confiança política e multas contratuais. Sistema legado sofria com gargalos de processamento, bugs críticos não tratados e ausência de testes automatizados.",
          solution:
            "Assumi liderança técnica emergencial com atuação em duas frentes simultâneas: (1) **Correção Imediata**: Mapeamento de todos os bugs críticos em 48h, priorização por impacto no negócio, distribuição de tarefas para time de 10 devs com pair programming nos pontos mais complexos, implementação de hotfixes diários com deploy em produção; (2) **Reestruturação Arquitetural**: Migração de banco de dados MySQL para ClickHouse para consultas analíticas, implementação de pipeline ETL com Databricks para tratamento de dados, refatoração de monolito para microsserviços escaláveis horizontalmente em Go para processamento de imagens, introdução de TDD e DDD para garantir qualidade, automação de testes E2E com Playwright substituindo validação manual de QA.",
          result:
            "Em 6 semanas, elevei assertividade de <60% para 100%, eliminando risco de cancelamento e garantindo renovação contratual. Economia de R$ 24M anuais para a empresa, restauração de confiança do cliente, e estabelecimento de novo padrão de qualidade que foi replicado em outros contratos. Cliente tornou-se case de sucesso e referência para novas vendas.",
          metrics: [
            { label: "Valor do Contrato Salvo", value: "R$ 24.000.000/ano", icon: "money" },
            { label: "Assertividade Entregue", value: "<60% → 100%", icon: "performance" },
            { label: "Tempo para Resolução", value: "6 semanas", icon: "time" },
            { label: "Bugs Críticos Resolvidos", value: "47 em 48h", icon: "performance" },
          ],
        },
        {
          title: "Revolução de Performance: 10x Mais Velocidade com Microsserviços",
          challenge:
            "Sistemas legados monolíticos em .NET sofriam com lentidão extrema em consultas de dashboards, timeout em processamento de vídeos de câmeras, e incapacidade de escalar horizontalmente durante picos de demanda. Gargalo no banco de dados MySQL travava operações críticas, resultando em reclamações diárias de clientes, SLA descumprido e risco de churn.",
          solution:
            "Executei modernização arquitetural completa: (1) **Banco de Dados**: Migração de MySQL para ClickHouse especializado em consultas analíticas massivas, reduzindo tempo de query de 30s para <200ms; (2) **ETL & Data Pipeline**: Implementação de pipelines ETL com Databricks para pré-processamento e agregação de dados, liberando banco transacional; (3) **Microsserviços**: Decomposição de monolito em 12 microsserviços especializados em Go (processamento de vídeo/imagens) e .NET Core (regras de negócio), permitindo escalabilidade horizontal independente; (4) **Mensageria**: Arquitetura orientada a eventos com RabbitMQ (Topic Exchanges), Circuit Breaker, Dead Letter Queues e retry policies para resiliência; (5) **Cache Estratégico**: Redis para dados quentes com invalidação inteligente, reduzindo carga em 70%.",
          result:
            "Performance multiplicada por 10x no processamento de 100M de mensagens diárias, redução de 99% no tempo de consultas de dashboards (30s → 200ms), eliminação de timeouts, cumprimento de 100% dos SLAs, e capacidade de escalar para 500M de mensagens sem degradação. Arquitetura tornou-se referência interna e foi adotada como padrão para novos projetos.",
          metrics: [
            { label: "Multiplicador de Performance", value: "10x", icon: "performance" },
            { label: "Mensagens Processadas/Dia", value: "100 milhões", icon: "performance" },
            { label: "Tempo de Consulta", value: "30s → 200ms", icon: "time" },
            { label: "Redução de Carga no Banco", value: "70%", icon: "performance" },
          ],
        },
        {
          title: "Transformação DevOps: Do Zero à Entrega Contínua Empresarial",
          challenge:
            "Empresa operava com deploys manuais, sem pipeline de CI/CD, ambientes inconsistentes, rollbacks traumáticos, ausência de observabilidade e medo de deploy em produção. Processos de release levavam dias, bugs só eram descobertos em produção, e não havia rastreabilidade de mudanças, resultando em downtime frequente e insatisfação de clientes.",
          solution:
            "Construí ekosistema DevOps completo do zero: (1) **CI/CD**: Pipelines automatizados no Jenkins com stages de build, testes unitários, testes de integração, testes E2E com Playwright, análise estática (SonarQube), varredura de segurança (Fortify), build de containers Docker, push para registry, e deploy automatizado; (2) **Orquestração**: Kubernetes com Helm charts padronizados, Horizontal Pod Autoscaler (HPA) baseado em CPU/memória, Pod Disruption Budgets para zero-downtime; (3) **Infra as Code**: Terraform para provisionamento de toda infraestrutura (VPC, subnets, security groups, RDS, ElastiCache, EKS), garantindo reproducibilidade e versionamento; (4) **Observabilidade**: Stack completo com Prometheus, Grafana, Jaeger e OpenTelemetry para métricas, logs e traces distribuídos; (5) **GitFlow**: Implementação de fluxo de branches com PRs obrigatórios, code review com checklist, e integração com JIRA para rastreabilidade.",
          result:
            "Redução de 95% no tempo de deploy (de 4 horas para 15 minutos), aumento de 20x na frequência de releases (de 1/semana para 4/dia), redução de 80% em incidentes em produção, rollback automático em <2 minutos, e estabelecimento de cultura de confiança onde devs podem fazer deploy com segurança. Economia estimada de 320 horas/ano em tempo de deploy manual.",
          metrics: [
            { label: "Redução Tempo de Deploy", value: "4h → 15min (95%)", icon: "time" },
            { label: "Frequência de Releases", value: "1/semana → 4/dia (20x)", icon: "performance" },
            { label: "Redução de Incidentes", value: "80%", icon: "performance" },
            { label: "Tempo de Rollback", value: "<2 minutos", icon: "time" },
          ],
        },
        {
          title: "Cultura de Reutilização: Design System e Bibliotecas Corporativas",
          challenge:
            "Cada projeto reinventava a roda: componentes UI duplicados, lógicas de negócio repetidas em múltiplos repositórios, inconsistências visuais entre produtos, esforço desperdiçado em soluções já existentes, e dificuldade de manutenção. Não havia padrão técnico, documentação era inexistente, e onboarding de novos devs levava meses.",
          solution:
            "Liderei iniciativa de padronização e reutilização: (1) **Design System**: Criação de biblioteca de componentes UI no Angular com Storybook, documentando todos os componentes com exemplos, props, e guidelines de uso; (2) **Bibliotecas Backend**: Pacotes NPM privados para shared utilities em TypeScript, bibliotecas NuGet para .NET com middlewares comuns, packages Maven para Java com integrações padrão, e módulos Go para mensageria e logging; (3) **Documentação Centralizada**: Implementação de portal de documentação com Docusaurus contendo arquitetura de todos os projetos, fluxos de dados, decisões técnicas (ADRs), runbooks de operação, e guias de onboarding; (4) **Governança**: Estabelecimento de comitê de revisão para novas bibliotecas, evitando fragmentação.",
          result:
            "Redução de 40% no tempo de desenvolvimento de novos features devido à reutilização, consistência visual em 100% dos produtos, aceleração de onboarding de novos devs (de 3 meses para 3 semanas), e criação de ativo intelectual proprietário que se tornou diferencial em propostas comerciais. Biblioteca de componentes utilizada em 15+ projetos simultaneamente.",
          metrics: [
            { label: "Redução Tempo de Desenvolvimento", value: "40%", icon: "time" },
            { label: "Projetos Impactados", value: "15+", icon: "people" },
            { label: "Aceleração Onboarding", value: "3 meses → 3 semanas", icon: "time" },
            { label: "Componentes Criados", value: "50+", icon: "performance" },
          ],
        },
      ],
      technologies: [
        ".NET Core", "Go", "Node.js", "TypeScript", "Angular", "React", "Micro-frontends",
        "ClickHouse", "MySQL", "PostgreSQL", "Redis", "Databricks", "ETL",
        "RabbitMQ", "Kafka", "Circuit Breaker", "Event-Driven Architecture",
        "Docker", "Kubernetes", "Helm", "Terraform", "Jenkins", "Bitbucket Pipelines",
        "SonarQube", "Fortify", "Playwright", "OpenTelemetry", "Grafana", "Prometheus",
        "LLMs (Claude, GPT)", "AI Code Review", "Design System", "DDD", "TDD", "CQRS",
      ],
      teamSize: 10,
      scope: "Sistemas críticos de segurança pública com IA, processamento de 100M de mensagens/dia, contratos governamentais de R$ 24M+/ano, liderança técnica transversal definindo arquitetura, processos e stack para múltiplos projetos",
    },
    {
      company: "Antlia",
      role: "Engenheiro de Software Sênior",
      period: "Dez/2022 – Dez/2025",
      location: "Remoto",
      summary: "",
      highlights: [
        "Liderou desenvolvimento web para o setor financeiro em Angular, React e Next.js com gestão de estado complexa.",
        "Concebeu microsserviços DDD em Java (Spring Boot) e C# (.NET Core) garantindo transações ACID.",
        "Provisionou infraestrutura cloud (AWS/Azure) via Terraform, otimizando custos e redes seguras.",
      ],
    },
    {
      company: "Banco Itaú",
      role: "Engenheiro de Software Pleno",
      period: "Mar/2022 – Nov/2022",
      location: "Híbrido",
      summary: "",
      highlights: [
        "Conduziu adoção de Clean Code e TDD, elevando cobertura de testes e mitigando vulnerabilidades.",
        "Desenvolveu microsserviços altamente disponíveis em C# e Java integrados a brokers de mensagens.",
      ],
    },
    {
      company: "Pollux Technologies",
      role: "Engenheiro de Software Pleno",
      period: "Jun/2021 – Jan/2022",
      location: "Remoto",
      summary: "",
      highlights: [
        "Arquitetou microsserviços e aplicações serverless em TypeScript (NestJS), expondo APIs RESTful e GraphQL.",
        "Criou interfaces dinâmicas com aderência ágil ao mercado para startups utilizando React e Flutter.",
      ],
    },
    {
      company: "Empresas de Consultoria Contábil",
      role: "Analista Contábil & Gestor",
      period: "Jan/2005 – Dez/2020",
      location: "São Paulo",
      summary:
        "Transformação digital e reestruturação operacional de empresas através de automação de processos contábeis, gestão financeira estratégica e liderança de equipes. Atuação como ponte entre negócios e tecnologia, implementando soluções que reduziram custos operacionais em 83% e liberaram capital de giro para investimentos estratégicos.",
      highlights: [
        "Redução do tempo de fechamento contábil de 30 dias para 5 dias (83% mais rápido) através da automação de processos manuais.",
        "Economia de R$ 200 mil/ano em custos operacionais e eliminação de retrabalho manual em múltiplas empresas.",
        "Geração de R$ 2 milhões em novos investimentos através de consultoria estratégica de alocação de capital.",
        "Redução de até R$ 1 milhão em tributos anuais com planejamento tributário avançado e reclassificação contábil estratégica.",
        "Liberação de 20+ colaboradores para atividades de maior valor agregado através da automação de rotinas operacionais.",
        "Implementação de trabalho remoto e dashboards em tempo real, aumentando produtividade e satisfação da equipe.",
        "Multiplicação por 5x da performance operacional, permitindo realocação para questões complexas e expansão de carteira.",
        "Integração de sistemas contábeis com clientes, automatizando troca de informações e reduzindo erros manuais em 95%.",
      ],
      caseStudies: [
        {
          title: "Automação do Fechamento Contábil: De 30 para 5 Dias",
          challenge:
            "Empresas enfrentavam ciclo de fechamento contábil de 30 dias, exigindo esforço manual intensivo de 20+ colaboradores, gerando atrasos na tomada de decisão, multas por entrega fora do prazo e incapacidade de fornecer relatórios financeiros em tempo real para os gestores.",
          solution:
            "Desenvolvi e implementei sistema integrado de automação contábil com: (1) Integração direta via API entre sistemas dos clientes e plataforma contábil, eliminando digitação manual; (2) Criação de regras de negócio automatizadas para classificação contábil baseada em histórico e padrões; (3) Dashboards em tempo real com indicadores financeiros críticos; (4) Fluxos de aprovação automatizados com notificações inteligentes; (5) Planilhas financeiras dinâmicas com macros personalizadas para cenários específicos de cada cliente.",
          result:
            "Redução de 83% no tempo de fechamento (30 → 5 dias), liberação de 20 colaboradores para atividades estratégicas, economia anual de R$ 200 mil em custos operacionais, eliminação de 95% dos erros manuais e aumento da satisfação dos clientes com relatórios em tempo real.",
          metrics: [
            { label: "Redução do Tempo de Processo", value: "30 dias → 5 dias", icon: "time" },
            { label: "Economia Anual em Custos", value: "R$ 200.000", icon: "money" },
            { label: "Colaboradores Realocados", value: "20+ pessoas", icon: "people" },
            { label: "Redução de Erros Manuais", value: "95%", icon: "performance" },
            { label: "Multiplicador de Performance", value: "5x", icon: "performance" },
          ],
        },
        {
          title: "Planejamento Tributário Estratégico: Economia de R$ 1 Milhão",
          challenge:
            "Clientes pagavam tributos excessivos devido à classificação contábil inadequada, desconhecimento de regimes tributários ótimos e falta de planejamento fiscal estratégico, resultando em perda competitiva e redução de margens de lucro.",
          solution:
            "Implementei metodologia de revisão contábil profunda com: (1) Análise detalhada de todas as operações e reclassificação contábil estratégica; (2) Migração para regimes tributários mais vantajosos (Lucro Real vs. Presumido); (3) Aproveitamento de benefícios fiscais regionais e setoriais; (4) Estruturação de operações para otimização legal de carga tributária; (5) Monitoramento contínuo de mudanças legislativas com ajuste proativo de estratégias.",
          result:
            "Economia acumulada de até R$ 1 milhão em tributos por cliente/ano, aumento de margem líquida em 8-12%, melhoria significativa na competitividade de mercado e recursos liberados para reinvestimento em crescimento e inovação.",
          metrics: [
            { label: "Economia Tributária Anual", value: "Até R$ 1.000.000", icon: "money" },
            { label: "Aumento de Margem Líquida", value: "8-12%", icon: "money" },
            { label: "Clientes Beneficiados", value: "Múltiplos", icon: "people" },
          ],
        },
        {
          title: "Consultoria de Investimentos: R$ 2 Milhões em Aplicações Estratégicas",
          challenge:
            "Empresas mantinham capital ocioso em contas correntes sem render juros, desconheciam opções de investimento adequadas ao perfil de risco e não possuíam política de gestão de caixa, resultando em perda de oportunidade de crescimento e fragilidade financeira.",
          solution:
            "Estruturei processo de gestão financeira estratégica com: (1) Diagnóstico completo do fluxo de caixa e capital disponível; (2) Definição de política de investimentos alinhada ao perfil de risco e necessidades de liquidez; (3) Diversificação em aplicações financeiras otimizadas (CDB, LCI/LCA, fundos, tesouro direto); (4) Projeções financeiras de longo prazo com cenários otimistas, pessimistas e realistas; (5) Reuniões mensais de acompanhamento e rebalanceamento de carteira.",
          result:
            "Alocação estratégica de R$ 2 milhões em investimentos de alta rentabilidade, geração de receita financeira adicional de 12-15% ao ano, fortalecimento do capital de giro e criação de reserva para expansões e aquisições estratégicas.",
          metrics: [
            { label: "Capital Investido Estratégicamente", value: "R$ 2.000.000", icon: "money" },
            { label: "Rentabilidade Anual Obtida", value: "12-15% a.a.", icon: "money" },
            { label: "Empresas com Gestão Profissional", value: "Múltiplas", icon: "people" },
          ],
        },
        {
          title: "Transformação Digital e Trabalho Remoto",
          challenge:
            "Equipes presas a processos manuais, planilhas desconexas e comunicação fragmentada, com baixa produtividade, resistência à mudança tecnológica e impossibilidade de trabalho remoto mesmo para funções administrativas.",
          solution:
            "Liderei transformação digital completa com: (1) Implementação de sistemas cloud-based integrados; (2) Criação de dashboards unificados com KPIs em tempo real; (3) Automação de fluxos de aprovação e notificações; (4) Treinamentos intensivos em ferramentas digitais e novas metodologias; (5) Estabelecimento de cultura data-driven com reuniões baseadas em métricas; (6) Implementação gradual de trabalho remoto com ferramentas de colaboração.",
          result:
            "Modernização completa das operações, implementação bem-sucedida de trabalho remoto para funções administrativas, aumento de 40% na produtividade das equipes, melhoria no clima organizacional e atração de talentos pela flexibilidade oferecida.",
          metrics: [
            { label: "Aumento de Produtividade", value: "40%", icon: "performance" },
            { label: "Funções Convertidas para Remoto", value: "Múltiplas áreas", icon: "people" },
            { label: "Sistemas Implementados", value: "Cloud-based Integrados", icon: "performance" },
          ],
        },
      ],
      technologies: [
        "Sistemas Contábeis Integrados",
        "APIs de Integração",
        "Dashboards Financeiros",
        "Planilhas Avançadas (Macros/VBA)",
        "Ferramentas de Automação",
        "Plataformas Cloud",
        "Sistemas de Gestão ERP",
      ],
      teamSize: 20,
      scope: "Múltiplas empresas de diferentes portes e setores, com atuação em consultoria contábil, tributária, financeira e de gestão de pessoas",
    },
  ],
  skillGroups: [
    { label: "Arquitetura & Backend", skills: ["C# (.NET Core)", "Java (Spring Boot)", "Node.js (NestJS)", "TypeScript", "Python", "Go", "Microsserviços", "API Gateway", "BFF", "CQRS", "Clean Arch", "DDD"] },
    { label: "Frontend & Performance", skills: ["React", "Next.js (RSC, SSR)", "Angular", "Flutter", "React Native", "Micro-frontends (Module Federation)", "Redux", "Zustand"] },
    { label: "Mensageria & Resiliência", skills: ["RabbitMQ (Topic Exchanges)", "Kafka (Partitioning)", "Circuit Breaker", "Retry", "Throttling", "Dead Letter Queues (DLQ)"] },
    { label: "BD, Caches & IA", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Query Tuning", "Sharding", "Integração LLMs (OpenAI, Claude, Gemini)", "RAG"] },
    { label: "DevOps & SRE", skills: ["AWS", "Azure", "GCP", "K8s (Helm, HPA)", "Docker", "IaC (Terraform)", "CI/CD", "OpenTelemetry", "Datadog", "Grafana"] },
    { label: "Segurança & Testes", skills: ["TDD", "Cypress", "Playwright", "K6", "OAuth 2.0 (PKCE)", "OIDC", "JWT", "proteção contra XSS/CSRF", "CSP", "CORS"] },
  ],
  education: [
    { title: "Bacharelado em Engenharia da Computação", institution: "UNIVESP", period: "2021–2025", description: "Foco aprofundado em arquitetura de computadores, inteligência artificial e estruturas de dados avançadas, consolidando a base teórica para desenvolvimento de software escalável." },
    { title: "Bacharelado em Ciências Contábeis", institution: "Estácio", period: "2017", description: "Domínio pleno em contabilidade corporativa, governança e análise financeira. Base estratégica responsável pela expertise na criação de sistemas orientados a alto retorno sobre o investimento." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Imersão técnica intensiva no ecossistema web moderno, com aplicação rigorosa de Clean Code, testes automatizados e arquitetura de componentes em cenários reais." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Formação robusta nos fundamentos de ciência da computação, algoritmos e matemática discreta, reforçando a resolução algorítmica de problemas complexos." },
  ],
  languages: ["Inglês Profissional", "Português Nativo"],
};
