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
      role: "Engenheiro de Software Sênior",
      period: "Jan/2026 – Presente",
      location: "Remoto",
      summary: "",
      highlights: [
        "Modernizou sistemas legados e orquestrou microsserviços de alta volumetria em C# (.NET), Go e Node.js com CQRS e Event-Driven.",
        "Arquitetou mensageria RabbitMQ (Topic Exchanges), Circuit Breaker e DLQs para 10 milhões de msgs/dia.",
        "Liderou cultura DevOps/SRE, CI/CD zero-downtime, Kubernetes com Helm/HPA, e IaC com Terraform.",
        "Desenvolveu arquiteturas reativas em Angular e React Native com Micro-frontends e otimização de Core Web Vitals.",
      ],
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
