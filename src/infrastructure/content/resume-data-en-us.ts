import type { ResumeContent } from "@/domain/resume/types";

/**
 * English (en-US) resume content.
 *
 * PT-BR (`resume-data.ts`) is the source of truth for every fact in this file.
 * This catalog must mirror it one to one: same experiences in the same order,
 * same periods, same roles, same highlight counts and the same case studies.
 * `tests/unit/presentation/content-locale.test.ts` enforces that parity, so any
 * divergence between the two languages fails the build rather than shipping a
 * weaker English version.
 *
 * Keep the two representations aligned with
 * [ADR-005](../../../docs/adr/ADR-005-internationalization-strategy.md).
 */
export const resumeContentEnUs: ResumeContent = {
  locale: "en-US",
  name: "Marcelino Sandroni Dias",
  title: "Senior Software Engineer",
  location: "Fortaleza, CE, Brazil · Remote",
  contact: {
    phone: "+55 11 91446-1993",
    email: "marcelino.sandroni@gmail.com",
    linkedin: "linkedin.com/in/marcelinosandroni",
  },
  summary:
    "Senior full-stack software engineer with the strategic differentiator of pairing cutting-edge engineering with 15 years of solid experience in business and accounting. Specialist in translating complex corporate financial rules into scalable web architectures and high-volume distributed systems. I work end to end (backend, frontend, mobile and DevOps) to build robust products that maximise financial profitability, scale alongside the company and solve real operational pain points without breaking the system. I work as a technical reference point, combining methodological rigour, mentorship and the use of artificial intelligence to accelerate delivery with clean, sustainable code.",
  experiences: [
    {
      company: "DGT Tecnologia",
      role: "Senior Software Engineer & Tech Lead",
      period: "Jan/2026 – Present",
      location: "Remote",
      summary:
        "Technical leadership in the restructuring and modernisation of critical legacy systems for AI-powered public security monitoring, processing 100 million messages daily. Strategic role as the bridge between business and technology, with the autonomy to define architecture, processes and the technology stack, saving contracts worth R$ 2M/month by delivering 100% accuracy across facial recognition and crime prevention systems.",
      highlights: [
        "Saved a R$ 24M/year contract (R$ 2M/month) in Florianópolis by resolving critical processing bottlenecks handling 50M messages/day, delivering 100% accuracy on AI-based vehicle plate recognition that was at risk of being cancelled.",
        "Architected an AI-powered 'Minority Report' crime prediction system, integrating cameras, drones, digital fencing and statistical models for real-time crime forecasting with predictive maps for public security agents.",
        "Multiplied processing performance by 10x on 100M daily messages by migrating from MySQL to ClickHouse, implementing ETL with Databricks and restructuring the architecture into microservices in Go and .NET.",
        "Led a team of 10 professionals (developers, QA, BA, PO, PM) as Tech Lead, implementing a TDD, DDD and GitFlow culture, rigorous code review automated with AI, and Definition of Ready/Done that raised delivery quality and predictability.",
        "Implemented complete DevOps from scratch: CI/CD with Jenkins, Docker, Kubernetes, Helm, Terraform (IaC), automated pipelines in Bitbucket, SonarQube, Fortify, observability, automatic rollback and ephemeral environments.",
        "Created a corporate Design System and shared libraries (NPM for front end, .NET/Java/Go for back end), establishing a culture of code reuse that reduced duplication and accelerated development by 40%.",
        "Automated E2E testing with Playwright, replacing manual QA work, freeing the team for strategic quality assurance and generating automatic evidence for clients.",
        "Introduced internal LLMs (Claude, GPT) for code review, code generation and documentation, creating the criteria, prompts and AI usage patterns that multiplied the team's productivity.",
      ],
      caseStudies: [
        {
          title: "Minority Report Operation: AI Crime Prediction System",
          challenge:
            "Public security departments needed to anticipate criminal occurrences in order to optimise the allocation of agents, but operated reactively, with no integration between cameras, drones, databases and monitoring systems, resulting in late incident response and inefficient crime prevention.",
          solution:
            "I architected and led the development of a 'Minority Report'-style predictive crime system with: (1) Real-time integration of CCTV feeds, drones and IoT sensors; (2) Statistical and machine learning models for predictive analysis based on historical patterns, seasonality and risk indicators; (3) Dynamic heat maps predicting crime hotspots by region and period; (4) Intelligent alerting system for operations commands with route and patrol positioning suggestions; (5) Executive dashboards with real-time crime KPIs for strategic decision making; (6) Integration APIs with systems from other departments and security forces.",
          result:
            "System operational in multiple cities with capacity to process 100M daily events, 35% reduction in crime rates in monitored areas, 40% optimisation of agent displacement, and national recognition as a reference in intelligent public security. Proprietary technology that became a competitive differentiator for the company.",
          metrics: [
            { label: "Daily Events Processed", value: "100 million", icon: "performance" },
            { label: "Crime Reduction", value: "35%", icon: "performance" },
            { label: "Resource Optimisation", value: "40%", icon: "people" },
            { label: "Response Time", value: "Reduced by 60%", icon: "time" },
          ],
        },
        {
          title: "Rescuing a R$ 24 Million Contract: From 0% to 100% Accuracy",
          challenge:
            "A R$ 2M/month (R$ 24M/year) contract with the city hall of Florianópolis was at imminent risk of cancellation due to low accuracy (<60%) in AI-based vehicle plate recognition on traffic cameras. The client faced operational losses, loss of political confidence and contractual penalties. The legacy system suffered from processing bottlenecks, untreated critical bugs and the absence of automated tests.",
          solution:
            "I took on emergency technical leadership across two fronts simultaneously: (1) Immediate remediation: mapping all critical bugs within 48 hours, prioritisation by business impact, distribution of tasks to a team of 10 developers with pair programming at the most complex points, daily hotfixes deployed to production; (2) Architectural restructuring: database migration from MySQL to ClickHouse for analytical queries, implementation of an ETL pipeline with Databricks for data processing, refactoring the monolith into horizontally scalable microservices in Go for image processing, introduction of TDD and DDD to guarantee quality, and automation of E2E testing with Playwright replacing manual QA validation.",
          result:
            "In 6 weeks I raised accuracy from <60% to 100%, eliminating the cancellation risk and securing contract renewal. R$ 24M annual savings for the company, restoration of client confidence, and establishment of a new quality standard that was replicated across other contracts. The client became a success case and a reference for new sales.",
          metrics: [
            { label: "Contract Value Saved", value: "R$ 24,000,000/year", icon: "money" },
            { label: "Accuracy Delivered", value: "<60% → 100%", icon: "performance" },
            { label: "Time to Resolution", value: "6 weeks", icon: "time" },
            { label: "Critical Bugs Resolved", value: "47 in 48h", icon: "performance" },
          ],
        },
        {
          title: "Performance Revolution: 10x Faster with Microservices",
          challenge:
            "Monolithic legacy systems in .NET suffered from extreme slowness in dashboard queries, timeouts processing camera video, and an inability to scale horizontally during demand peaks. A MySQL database bottleneck stalled critical operations, resulting in daily customer complaints, breached SLAs and churn risk.",
          solution:
            "I carried out a complete architectural modernisation: (1) Database: migration from MySQL to ClickHouse specialised for massive analytical queries, reducing query time from 30s to <200ms; (2) ETL and data pipeline: implementation of ETL pipelines with Databricks for pre-processing and data aggregation, freeing the transactional database; (3) Microservices: decomposition of the monolith into 12 specialised microservices in Go (video/image processing) and .NET Core (business rules), enabling independent horizontal scalability; (4) Messaging: event-driven architecture with RabbitMQ (Topic Exchanges), Circuit Breaker, Dead Letter Queues and retry policies for resilience; (5) Strategic caching: Redis for hot data with intelligent invalidation, reducing load by 70%.",
          result:
            "Performance multiplied by 10x in the processing of 100M daily messages, 99% reduction in dashboard query time (30s → 200ms), elimination of timeouts, 100% SLA compliance, and capacity to scale to 500M messages without degradation. The architecture became an internal reference and was adopted as the standard for new projects.",
          metrics: [
            { label: "Performance Multiplier", value: "10x", icon: "performance" },
            { label: "Messages Processed/Day", value: "100 million", icon: "performance" },
            { label: "Query Time", value: "30s → 200ms", icon: "time" },
            { label: "Database Load Reduction", value: "70%", icon: "performance" },
          ],
        },
        {
          title: "DevOps Transformation: From Zero to Enterprise Continuous Delivery",
          challenge:
            "The company operated with manual deployments, no CI/CD pipeline, inconsistent environments, traumatic rollbacks, no observability and a fear of deploying to production. Release processes took days, bugs were only discovered in production, and there was no change traceability, resulting in frequent downtime and customer dissatisfaction.",
          solution:
            "I built a complete DevOps ecosystem from scratch: (1) CI/CD: automated pipelines in Jenkins with build, unit test, integration test, Playwright E2E test, static analysis (SonarQube), security scanning (Fortify), Docker container build, registry push and automated deployment stages; (2) Orchestration: Kubernetes with standardised Helm charts, Horizontal Pod Autoscaler (HPA) based on CPU/memory, and Pod Disruption Budgets for zero downtime; (3) Infrastructure as Code: Terraform for provisioning the entire infrastructure (VPC, subnets, security groups, RDS, ElastiCache, EKS), guaranteeing reproducibility and versioning; (4) Observability: full stack with Prometheus, Grafana, Jaeger and OpenTelemetry for metrics, logs and distributed traces; (5) GitFlow: implementation of a branch flow with mandatory PRs, code review with checklist, and JIRA integration for traceability.",
          result:
            "95% reduction in deployment time (from 4 hours to 15 minutes), 20x increase in release frequency (from 1/week to 4/day), 80% reduction in production incidents, automatic rollback in <2 minutes, and the establishment of a culture of trust where developers can deploy safely. Estimated savings of 320 hours/year in manual deployment time.",
          metrics: [
            { label: "Deployment Time Reduction", value: "4h → 15min (95%)", icon: "time" },
            { label: "Release Frequency", value: "1/week → 4/day (20x)", icon: "performance" },
            { label: "Incident Reduction", value: "80%", icon: "performance" },
            { label: "Rollback Time", value: "<2 minutes", icon: "time" },
          ],
        },
        {
          title: "Reuse Culture: Design System and Corporate Libraries",
          challenge:
            "Every project reinvented the wheel: duplicated UI components, business logic repeated across multiple repositories, visual inconsistencies between products, effort wasted on existing solutions, and maintenance difficulty. There was no technical standard, documentation was nonexistent, and onboarding new developers took months.",
          solution:
            "I led the standardisation and reuse initiative: (1) Design System: creation of an Angular UI component library with Storybook, documenting every component with examples, props and usage guidelines; (2) Backend libraries: private NPM packages for shared utilities in TypeScript, NuGet libraries for .NET with common middlewares, Maven packages for Java with standard integrations, and Go modules for messaging and logging; (3) Centralised documentation: implementation of a documentation portal with Docusaurus containing the architecture of all projects, data flows, technical decisions (ADRs), operational runbooks and onboarding guides; (4) Governance: establishment of a review committee for new libraries, preventing fragmentation.",
          result:
            "40% reduction in development time for new features thanks to reuse, visual consistency in 100% of products, faster onboarding of new developers (from 3 months to 3 weeks), and the creation of proprietary intellectual property that became a differentiator in commercial proposals. The component library is used in 15+ projects simultaneously.",
          metrics: [
            { label: "Development Time Reduction", value: "40%", icon: "time" },
            { label: "Projects Impacted", value: "15+", icon: "people" },
            { label: "Onboarding Acceleration", value: "3 months → 3 weeks", icon: "time" },
            { label: "Components Created", value: "50+", icon: "performance" },
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
      scope:
        "Critical public security systems with AI, processing 100M messages/day, R$ 24M+/year government contracts, cross-cutting technical leadership defining architecture, processes and stack for multiple projects",
    },
    {
      company: "Antlia",
      role: "Tech Lead & Strategic Consultant",
      period: "Jul/2024 – Dec/2025",
      location: "Remote",
      summary:
        "Technical leadership in the modernisation of critical legacy systems for BNPP Paribas, the bank's largest client, recreating the payments ecosystem and integrating with consolidated systems. Involved from planning through delivery, focusing on scalable distributed systems with Java Spring, an Angular microfrontend, Kafka messaging and complete DevOps (Kubernetes, Jenkins, Helm). Delivery of new applications for asset management with investment funds in the primary/wholesale market, integrating B3, US/European ETFs and large banks/brokers.",
      highlights: [
        "Modernised critical legacy systems (Cobol, VB, C# monoliths) into a scalable architecture on Java Spring and Angular, with a focus on business rules, hexagonal architecture and microservices, building CI/CD pipelines from scratch with Jenkins and Kubernetes.",
        "Delivered a real-time payments system (previously taking 1 day on the legacy system), real-time information for asset managers, improved communication with wholesale clients, and real-time integration with B3 and national/international assets.",
        "Fully automated the orchestration of ETF funds and banking products, guaranteeing internal/external and national/international processing, compliance and payment consolidation, saving R$ 500 thousand in manual processes.",
        "Increased assets under management by 45% in the systems delivered within 1 year, improved information/payment time from 1 day to real time, information visibility from hours to real time, and guaranteed uptime from 95% to 100%.",
        "Reduced delivery time from months to days (or D0) with CI/CD, saving and creating opportunities on a scale of R$ 50 million, while guaranteeing contract compliance at record speed with quality, resulting in new contracts.",
        "Led a team of 8 developers (3 senior), PO, QA, PM and 2 BAs as senior developer and technical reference, introducing hexagonal architecture, microservices, microfrontends, event orientation, Kafka messaging, automated tests with 95%+ coverage, and an enhanced Scrum culture.",
        "Implemented observability, real-time monitoring, critical alerts and integration with client systems, and guaranteed continuous maintenance and improvement through legacy modernisation.",
      ],
      caseStudies: [
        {
          title: "BNPP Paribas Digital Transformation: From Cobol Legacy to Real Time",
          challenge:
            "BNPP Paribas faced critical legacy systems in Cobol, manual integrations in VB and C# monoliths that limited growth, with payment processes taking up to 1 day, no real-time information for asset managers, and an inability to scale to wholesale market demand with B3 integration and international ETFs.",
          solution:
            "I architected and led the complete modernisation: (1) Migration of legacy systems to Java Spring and Angular with hexagonal architecture and scalable microservices; (2) Implementation of Kafka messaging for event orientation and asynchronous processing; (3) Creation of CI/CD pipelines from scratch with Jenkins, Kubernetes, Docker and Helm for continuous delivery; (4) Development of Angular microfrontends for reuse across the ecosystem; (5) Complete automation of ETF fund and financial product orchestration; (6) Real-time integration with B3, US/European exchanges, and the systems of large banks and brokers.",
          result:
            "Operational system with real-time payment processing (previously 1 day), 45% increase in assets under management in 1 year, R$ 500 thousand saved through automation, opportunities created on a scale of R$ 50 million, 100% uptime (previously 95%), delivery reduced from months to days/D0, and contract renewal/expansion due to exceptional quality.",
          metrics: [
            { label: "Assets Under Management Growth", value: "45% in 1 year", icon: "performance" },
            { label: "Savings from Automation", value: "R$ 500,000", icon: "money" },
            { label: "Opportunities Created", value: "R$ 50 million", icon: "money" },
            { label: "Payment Time", value: "1 day → Real Time", icon: "time" },
            { label: "Guaranteed Uptime", value: "95% → 100%", icon: "performance" },
            { label: "Delivery Time", value: "Months → Days/D0", icon: "time" },
          ],
        },
        {
          title: "Real-Time Payments Revolution in the Financial Market",
          challenge:
            "The bank's payment systems operated in batch with processing of up to 1 day, preventing agile decisions by managers, causing dissatisfaction among wholesale clients, and limiting competitiveness against fintechs with real-time solutions. Manual reconciliation and compliance processes consumed valuable resources.",
          solution:
            "I developed a new payments system with: (1) Event-driven architecture with Kafka for asynchronous and scalable processing; (2) Java Spring microservices specialised in validation, processing, reconciliation and compliance; (3) Native integration with B3, correspondent banks and settlement systems; (4) Real-time Angular dashboards for transaction monitoring; (5) Complete automation of approval workflows and regulatory compliance; (6) Circuit breaker and retry policies for resilience during demand peaks.",
          result:
            "Payments processed in real time, eliminating the 1-day delay, instant communication with wholesale clients, total automation of manual compliance and reconciliation processes, and the establishment of a new competitive standard that enabled the acquisition of new institutional clients.",
          metrics: [
            { label: "Processing Speed", value: "24h → <1s", icon: "time" },
            { label: "Automated Processes", value: "100%", icon: "performance" },
            { label: "Active Integrations", value: "B3 + 50+ banks", icon: "performance" },
            { label: "Daily Transactions", value: "Millions", icon: "performance" },
          ],
        },
        {
          title: "Asset Management Ecosystem with Global Integration",
          challenge:
            "The bank's asset management operated with disconnected systems, no unified real-time view of positions, dependence on manual processes to reconcile data from B3, international exchanges (US/Europe) and multiple counterparties, resulting in errors, delays and an inability to offer sophisticated products to high-net-worth clients.",
          solution:
            "I created an integrated asset management ecosystem with: (1) Centralised Angular platform with microfrontends for different asset classes; (2) Java Spring backend with microservices specialised by asset type (fixed income, equities, ETFs, derivatives); (3) Real-time integrations with B3, Bloomberg, Reuters and international custodians; (4) Statistical models for valuation and automatic mark-to-market; (5) Automated workflows for fund subscription, redemption and rebalancing; (6) Standardised APIs for integration with third-party systems (banks, brokers, asset managers).",
          result:
            "Unified real-time view of all assets under management, elimination of manual reconciliation processes, ability to launch new financial products in weeks (previously months), and attraction of institutional investors who demand technological sophistication.",
          metrics: [
            { label: "Assets Under Management", value: "+45% YoY", icon: "money" },
            { label: "Product Launch Time", value: "Months → Weeks", icon: "time" },
            { label: "Global Integrations", value: "B3 + NYSE + LSE + Eurex", icon: "performance" },
            { label: "Valuation Precision", value: "100% Automatic", icon: "performance" },
          ],
        },
        {
          title: "DevOps from Zero: Continuous Delivery Culture at the Bank",
          challenge:
            "The bank operated with manual deployments, inconsistent environments, fear of production and release cycles of months. The absence of automated pipelines, insufficient tests and uncoded infrastructure resulted in frequent incidents and slow response to business demands.",
          solution:
            "I implemented a complete DevOps ecosystem: (1) CI/CD pipelines in Jenkins with build, unit/functional/E2E test stages (95%+ coverage), SonarQube analysis, Docker build and automated deployment to Kubernetes; (2) Standardised Helm charts for all microservices; (3) GitFlow with mandatory PRs and rigorous code review; (4) Observability with real-time metrics, logs and traces; (5) Proactive alerts for anomalies; (6) Ephemeral environments for testing.",
          result:
            "Release cycles reduced from months to days (or D0), 95% increase in deployment frequency, drastic reduction in production incidents, and the establishment of a culture of trust where teams can continuously deliver value safely.",
          metrics: [
            { label: "Release Cycle", value: "Months → Days/D0", icon: "time" },
            { label: "Test Coverage", value: "95%+", icon: "performance" },
            { label: "Orchestrated Microservices", value: "20+", icon: "performance" },
            { label: "Deployments per Day", value: "Multiple", icon: "performance" },
          ],
        },
        {
          title: "Technical Excellence: Hexagonal Architecture and TDD as the Standard",
          challenge:
            "The team followed heterogeneous practices, with poorly testable code, excessive coupling, difficulty evolving, and knowledge concentrated in few individuals. The absence of architectural standards and resistance to automated tests limited delivery speed and quality.",
          solution:
            "I introduced and led the adoption of: (1) Hexagonal architecture to isolate business rules and enable testability; (2) TDD as a mandatory practice with 95%+ unit/functional/E2E coverage; (3) DDD for ubiquitous modelling with the business; (4) SOLID principles and Clean Code in all services; (5) Systematic code review with quality checklists; (6) Mentoring of junior and mid-level developers through pair programming; (7) Collaborative technical/functional/business refinement with clear DoR/DoD definition.",
          result:
            "Highly testable and sustainable code, reduction in production bugs, faster onboarding of new developers, dissemination of technical knowledge, and the establishment of an excellence culture that became a competitive differentiator for the team.",
          metrics: [
            { label: "Test Coverage", value: "95%+", icon: "performance" },
            { label: "Production Bug Reduction", value: "Significant", icon: "performance" },
            { label: "Mentored Developers", value: "8 (Junior/Mid)", icon: "people" },
            { label: "Services with Standardised Architecture", value: "100%", icon: "performance" },
          ],
        },
      ],
      technologies: [
        "Java Spring", "Angular", "Micro-frontends", "Kafka", "Microservices", "Hexagonal Architecture",
        "DDD", "TDD", "Clean Architecture", "SOLID", "Jenkins", "Kubernetes", "Docker", "Helm",
        "CI/CD", "Observability", "Real-Time Monitoring", "B3 Integration", "ETFs",
        "Financial Markets", "Real-Time Payments", "Asset Management", "Compliance Automation",
      ],
      teamSize: 8,
      scope:
        "Modernisation of critical BNPP Paribas systems, payments ecosystem and asset management with B3/global integration, complete technical leadership defining architecture, DevOps processes and quality standards",
    },
    {
      company: "Banco Itaú",
      role: "Full Software Engineer & Tech Lead",
      period: "Mar/2022 – Nov/2022",
      location: "Hybrid",
      summary:
        "Technical leadership in the development of applications for internal management of wholesale market assets, controlling more than R$ 100 billion in assets of large investors and clients. Control and investment ecosystem with intelligence and insights, B3 integration, national and international assets. Worked with a team of 9 people (6 developers, Tech Lead, PO, PM) on technical process improvements, code review, versioning, and mentoring of junior and mid-level developers in front end, back end and mobile.",
      highlights: [
        "Delivered applications for the internal control of managers and internal users to manage wholesale market assets (more than R$ 100 billion), with a smart investment ecosystem, B3 integration and insights to increase the net worth of large investors.",
        "Resolved a critical crisis in the first-phase launch caused by infrastructure errors and bugs in messaging microservices, leading collaborative debugging, identifying event processing and integration failures through observability, and distributing fixes that guaranteed the success of the launch.",
        "Implemented a culture of automated testing on the team, increasing code quality 8x with testable coverage and evidence, applying E2E tests with Cypress (regression model) together with QA, in back end (.NET), front end (Angular) and mobile (Flutter).",
        "Improved the Design System with new components aligned to the bank's features, and applied Hexagonal Architecture standardising the structure of backend microservices with SOLID, TDD and DDD as mandatory practices.",
        "Led a team of 9 people (6 developers, Tech Lead, PO, PM) on improvements to organisation and technical processes, refinement, validations, version control, rigorous code review, development best practices, and mentoring of junior and mid-level developers in front end, back end and mobile.",
        "Guaranteed quality and on-time delivery even under tight deadline pressure, with rapid problem identification, efficient delegation, and direct action on critical points while organising the team for collaborative resolution.",
      ],
      caseStudies: [
        {
          title: "R$ 100 Billion Asset Management: Smart Ecosystem for the Wholesale Market",
          challenge:
            "Itaú needed robust applications for internal managers and high-net-worth clients to manage wholesale market assets, with precise control of more than R$ 100 billion, real-time B3 integration, a unified view of positions, smart insights for investment decisions, and capacity to scale to the demands of large institutional investors.",
          solution:
            "I developed a complete asset management ecosystem with: (1) Internal Angular platform for managers to track positions, performance and risks in real time; (2) .NET and Java Spring backend with microservices specialised by asset class (fixed income, equities, derivatives, ETFs); (3) Native integration with B3, Bloomberg, Reuters and custody systems; (4) Analytical models for valuation, mark-to-market and performance projections; (5) Executive dashboards with net worth, allocation and profitability KPIs; (6) Secure APIs for integration with institutional client systems; (7) Flutter mobile app for on-the-go monitoring.",
          result:
            "Operational ecosystem managing more than R$ 100 billion in assets, unified real-time view for managers and clients, capacity to offer sophisticated products to the wholesale market, and the establishment of a new standard of technological excellence that became an internal reference.",
          metrics: [
            { label: "Assets Under Management", value: "+R$ 100 billion", icon: "money" },
            { label: "Active Integrations", value: "B3 + Custodians", icon: "performance" },
            { label: "Update Time", value: "Real Time", icon: "time" },
            { label: "Users Served", value: "Managers + Clients", icon: "people" },
          ],
        },
        {
          title: "Critical Launch Rescue: From Production Bugs to Success",
          challenge:
            "The first phase of the project faced critical infrastructure errors and bugs in messaging microservices hours before launch. The system was not processing events correctly, integrations with other services were failing, logs were insufficient for rapid diagnosis, and the risk of postponing the launch threatened the credibility of the area and the relationship with wholesale clients.",
          solution:
            "I led an emergency war effort: (1) Emergency meeting with the whole team for collaborative debugging; (2) Implementation of enhanced observability with structured logs, metrics and traces to identify bottlenecks; (3) Mapping of all critical bugs in record time; (4) Strategic distribution of tasks according to each developer's expertise; (5) Simultaneous correction of event processing failures in messaging and broken integrations; (6) Accelerated validation with tests focused on the critical points; (7) Monitored deployment with rollback ready if necessary.",
          result:
            "Launch successfully completed within the deadline, all critical bugs resolved, system stable in production, credibility preserved with stakeholders, and the establishment of observability practices that prevented future problems.",
          metrics: [
            { label: "Critical Bugs Resolved", value: "All in <24h", icon: "performance" },
            { label: "Time to Diagnosis", value: "<4 hours", icon: "time" },
            { label: "Launch", value: "On Schedule", icon: "time" },
            { label: "Post-Launch Stability", value: "100%", icon: "performance" },
          ],
        },
        {
          title: "Quality Revolution: 8x More Automated Tests",
          challenge:
            "The team relied excessively on manual tests, with low automated coverage, frequent production bugs, refactoring difficulty and fear of deploying. QA was overloaded with repetitive validations, developers lacked confidence in changes, and long test cycles delayed deliveries.",
          solution:
            "I implemented a comprehensive automated testing programme: (1) Unit tests in back end (.NET and Java) with 80%+ coverage using xUnit and JUnit; (2) Integration tests with embedded databases and mocks of external services; (3) E2E tests with Cypress for critical front-end flows (Angular); (4) Mobile tests with Flutter Test; (5) CI/CD pipeline running all tests automatically on every commit; (6) Coverage reports visible to the whole team; (7) TDD culture encouraged in dailies and code reviews.",
          result:
            "Code quality increased 8x, drastic reduction in production bugs, confidence to refactor and evolve the system, QA freed for exploratory testing and strategic assurance, and accelerated release cycles with automatic validation.",
          metrics: [
            { label: "Quality Increase", value: "8x", icon: "performance" },
            { label: "Test Coverage", value: "80%+", icon: "performance" },
            { label: "Production Bug Reduction", value: "Significant", icon: "performance" },
            { label: "Automated E2E Tests", value: "Critical Flows", icon: "performance" },
          ],
        },
        {
          title: "Architectural Standardisation: Hexagonal Architecture as the New Standard",
          challenge:
            "Microservices were developed without a consistent standard, with excessive coupling between business rules and frameworks, testability difficulty, duplicated code and concentrated knowledge. Each developer followed their own approach, resulting in heterogeneous and hard-to-maintain systems.",
          solution:
            "I introduced and led the adoption of Hexagonal Architecture (Ports & Adapters) as the corporate standard: (1) Training workshops on benefits and implementation; (2) Refactoring of critical services to isolate the domain at the centre; (3) Clear definition of ports (interfaces) and adapters (infrastructure, API, messaging); (4) Rigorous application of SOLID and Clean Code; (5) TDD as a mandatory practice to guarantee testability; (6) DDD for ubiquitous modelling with the business; (7) Code reviews focused on architectural compliance.",
          result:
            "Highly testable and sustainable services, isolation of business rules allowing technology swaps without impact, faster onboarding of new developers with a clear standard, and the establishment of a technical excellence culture replicated in other projects.",
          metrics: [
            { label: "Standardised Services", value: "100%", icon: "performance" },
            { label: "Testability", value: "High (80%+ coverage)", icon: "performance" },
            { label: "Trained Developers", value: "9", icon: "people" },
            { label: "Coupling Reduction", value: "Significant", icon: "performance" },
          ],
        },
        {
          title: "Mentorship and Team Development: Raising the Technical Level",
          challenge:
            "Team with a mix of levels (junior, mid, senior), uneven knowledge, inconsistent practices and excessive dependence on a few senior individuals. Juniors and mid-level developers needed guidance to grow technically and contribute with more autonomy.",
          solution:
            "I implemented a structured mentorship programme: (1) Regular pair programming between seniors and juniors/mid-levels; (2) Educational code reviews with constructive feedback; (3) Knowledge sharing sessions (internal tech talks); (4) Clear definition of expectations per level; (5) Individual tracking of technical growth; (6) Progressive delegation of responsibilities; (7) Encouragement of certifications and studies.",
          result:
            "Juniors and mid-level developers grew technically with greater autonomy, reduced dependence on seniors, knowledge dissemination across the team, increased delivery speed, and the establishment of a culture of continuous learning.",
          metrics: [
            { label: "Mentored Developers", value: "6 (Junior/Mid)", icon: "people" },
            { label: "Mentorship Sessions", value: "Regular", icon: "time" },
            { label: "Promotions Achieved", value: "Multiple", icon: "performance" },
            { label: "Team Autonomy", value: "High", icon: "performance" },
          ],
        },
      ],
      technologies: [
        ".NET Core", "Java Spring Boot", "Angular", "Flutter", "AWS", "EC2", "S3", "Lambda", "RDS",
        "SQS", "SNS", "CloudWatch", "VPC", "IAM", "KMS", "Secrets Manager", "API Gateway",
        "Hexagonal Architecture", "DDD", "TDD", "SOLID", "Clean Code", "Cypress", "Unit Testing",
        "CI/CD Pipelines", "Design System", "Microservices", "Messaging", "Observability",
      ],
      teamSize: 9,
      scope:
        "Applications for internal management of assets over R$ 100 billion, multidisciplinary team technical leadership, implementation of a testing culture and architectural standardisation, mentoring of junior and mid-level developers",
    },
    {
      company: "Pollux Technologies",
      role: "Full Software Engineer (Promoted in 3 months)",
      period: "Jun/2021 – Jan/2022",
      location: "Remote",
      summary:
        "Work across multiple clients focused on system modernisation, cloud migration and resolution of critical problems. Promoted from Junior to Mid-level in just 3 months due to technical excellence and impact on delivery. Experience in healthcare (electronic medical records and appointment forecasting), finance (AWS migration) and sports (critical delivery in 2 weeks). 30-50% reduction in infrastructure costs, performance improvements of up to 200%, and on-time delivery on 80% of projects (20% delivered early).",
      highlights: [
        "Promoted from Junior to Mid-level Software Engineer in just 3 months due to technical excellence, active participation in architecture decisions, and significant impact across multiple projects and clients.",
        "Resolved a critical problem at a healthcare client: the system was not correctly delivering patient history and medical records for appointment, exam and procedure forecasting. Worked on correcting messaging failures, event orientation and AWS serverless infrastructure, implementing circuit breaker and fixing microservices in Java and TypeScript, achieving 100% data accuracy and 40% forecastability (previously 0%).",
        "Led the migration of a large financial sector client from internal cloud to public AWS, restructuring the system design for better performance and cost reduction. Delivered in 3 months (half the 6-month deadline), with a 2x increase in performance and 30% reduction in infrastructure costs.",
        "Delivered a critical sports system project in just 2 weeks (tight deadline), working as a team to guarantee quality, accuracy and punctuality under extreme pressure.",
        "Stabilised and reduced by 50% the AWS costs of a client facing uncontrolled spending escalation, identifying waste, optimising resources and implementing cloud governance.",
        "Delivered consistent results across multiple clients: 30% reduction in infrastructure costs, performance improvements of up to 200%, early deliveries on 80% of projects (20% ahead of schedule), and improved payment processes with payment system integrations for small clients.",
      ],
      caseStudies: [
        {
          title: "Intelligent Healthcare System: From 0% to 40% Appointment Forecastability",
          challenge:
            "A healthcare client faced a critical problem: the system was not correctly delivering medical record and patient history data from health plans, making it impossible to forecast appointments, exams and procedures. The project was failing with 0% forecast accuracy, messaging and event processing errors, AWS serverless infrastructure gaps, and Java/TypeScript microservices with asynchronous communication failures.",
          solution:
            "I worked intensively with the team to: (1) Investigate and map all messaging and event orientation errors and problems; (2) Fix the AWS serverless infrastructure (Lambda, API Gateway, DynamoDB, EventBridge) eliminating processing gaps; (3) Refactor Java and TypeScript microservices to operate correctly in asynchronous, event-driven mode; (4) Implement Circuit Breaker for resilience in inter-service calls; (5) Correct error cases with retry policies and Dead Letter Queues; (6) Validate 100% accuracy on patient data and history; (7) Develop predictive models for intelligent appointment, exam and procedure suggestions focused on patient health.",
          result:
            "Operational system with 100% accuracy on medical record and patient history data, 40% forecastability on appointment/exam/procedure indications (previously 0%), significant improvement in preventive patient health, and establishment of a technological foundation for evolution with AI and machine learning.",
          metrics: [
            { label: "Data Accuracy", value: "100%", icon: "performance" },
            { label: "Appointment Forecastability", value: "0% → 40%", icon: "performance" },
            { label: "Processing Errors", value: "Eliminated", icon: "performance" },
            { label: "System Resilience", value: "Circuit Breaker", icon: "performance" },
          ],
        },
        {
          title: "Financial Cloud Migration: 6 Months in 3 with 30% Lower Cost",
          challenge:
            "A large financial sector client operated on internal cloud with performance limitations, scalability constraints and high costs. It needed migration to public AWS with a complete restructuring of the system design to gain performance, data flow and cost reduction. The projected 6-month timeline was incompatible with business demands accelerated by digital transformation.",
          solution:
            "I planned and executed the complete migration to AWS: (1) Restructuring of the architectural design of the system and services for cloud-native operation; (2) Migration of workloads to EC2, Lambda, RDS, S3, SQS, SNS with cost optimisation; (3) Implementation of CI/CD pipelines to automate deployments; (4) Configuration of VPC, subnets, security groups and IAM for security; (5) Monitoring with CloudWatch and proactive alerts; (6) Optimisation of queries and indexes for performance; (7) Training of the client's team in cloud operations.",
          result:
            "Migration completed in 3 months (half the 6-month deadline), 2x increase in process and service performance, 30% reduction in cloud infrastructure costs, and establishment of a solid foundation for future innovation and scalability.",
          metrics: [
            { label: "Migration Time", value: "6 months → 3 months", icon: "time" },
            { label: "Performance Increase", value: "2x", icon: "performance" },
            { label: "Cost Reduction", value: "30%", icon: "money" },
            { label: "AWS Services Migrated", value: "EC2, Lambda, RDS, S3, SQS, SNS", icon: "performance" },
          ],
        },
        {
          title: "Critical Delivery in 2 Weeks: Sports System Under Pressure",
          challenge:
            "A sports system client faced an unpostponable 2-week deadline for a critical delivery that impacted its entire operation. Any delay would result in significant financial losses and loss of credibility in the market. The team, under extreme pressure, needed technical leadership to guarantee quality, accuracy and punctuality.",
          solution:
            "I led a focused delivery effort: (1) Rapid mapping of critical features for the MVP; (2) Strategic distribution of tasks according to each developer's expertise; (3) Intensive pair programming at the most complex points; (4) Continuous validation with automated tests; (5) Daily deployments to the homologation environment; (6) Fast client feedback for adjustments; (7) Collaborative team work with constant communication.",
          result:
            "Delivery completed with quality, accuracy and within the 2-week deadline, a satisfied client with the result, and a demonstration of the ability to execute under extreme pressure without compromising quality.",
          metrics: [
            { label: "Delivery Deadline", value: "2 weeks", icon: "time" },
            { label: "Quality Delivered", value: "High Accuracy", icon: "performance" },
            { label: "Client Satisfaction", value: "Maximum", icon: "people" },
            { label: "Features Delivered", value: "100% of Scope", icon: "performance" },
          ],
        },
        {
          title: "AWS Cost Optimisation: 50% Reduction in Cloud Spending",
          challenge:
            "A client faced uncontrolled cost escalation on AWS with no clear visibility of where the waste was. Growing monthly invoices threatened the sustainability of the project, and a lack of cloud governance allowed excessive resource provisioning, idle instances and inefficient architectures.",
          solution:
            "I carried out a complete audit and optimisation: (1) Detailed analysis of all invoices and resource usage; (2) Identification of oversized and idle instances; (3) Implementation of Auto Scaling Groups for automatic sizing; (4) Migration of appropriate workloads to Spot Instances; (5) Query optimisation and reduction of unnecessary data transfers; (6) Configuration of budgets and cost alerts in AWS Budgets; (7) Establishment of tagging policies and cloud governance.",
          result:
            "50% reduction in monthly AWS costs, stabilisation of spending with budget predictability, elimination of waste, and implementation of a culture of continuous cloud cost optimisation.",
          metrics: [
            { label: "Cost Reduction", value: "50%", icon: "money" },
            { label: "Budget Predictability", value: "High", icon: "performance" },
            { label: "Resources Optimised", value: "All", icon: "performance" },
            { label: "Governance Implemented", value: "Complete", icon: "performance" },
          ],
        },
        {
          title: "Consistent Technical Excellence: 80% Early Deliveries",
          challenge:
            "Multiple clients with varied demands needed fast, quality delivery, but the company's history showed frequent delays, budget overruns and client dissatisfaction. It was necessary to establish a new standard of technical excellence and execution discipline.",
          solution:
            "I implemented high-performance engineering practices: (1) Detailed planning with realistic estimates based on historical data; (2) Decomposition of stories into small, estimable tasks; (3) Clear definition of DoR (Definition of Ready) and DoD (Definition of Done); (4) Automated tests from the start (TDD where applicable); (5) Continuous integration with automatic validation; (6) Transparent communication with clients about progress and risks; (7) Retrospectives after each delivery for continuous learning.",
          result:
            "80% of projects delivered ahead of schedule, 20% exactly on schedule (100% punctuality), 30% average reduction in infrastructure costs, performance improvements of up to 200% for clients, and establishment of a reputation for reliability and technical excellence.",
          metrics: [
            { label: "Early Deliveries", value: "80%", icon: "time" },
            { label: "Total Punctuality", value: "100%", icon: "performance" },
            { label: "Average Cost Reduction", value: "30%", icon: "money" },
            { label: "Performance Improvement", value: "Up to 200%", icon: "performance" },
          ],
        },
      ],
      technologies: [
        "Java", "TypeScript", "NestJS", "React", "Next.js", "Vue.js", ".NET", "Go", "Python",
        "AWS", "GCP", "Azure", "PostgreSQL", "MongoDB", "Kubernetes", "Docker", "CI/CD", "Jenkins",
        "Serverless", "Lambda", "API Gateway", "DynamoDB", "EventBridge", "Circuit Breaker",
        "Microservices", "Event-Driven Architecture", "Messaging", "Cloud Migration", "Cost Optimisation",
      ],
      teamSize: 5,
      scope:
        "Work across multiple clients (healthcare, finance, sports) covering system modernisation, cloud migration, AWS cost optimisation, resolution of critical problems, and project delivery under tight deadlines with technical excellence",
    },
    {
      company: "Accounting Consulting Firms",
      role: "Accounting Analyst & Manager",
      period: "Jan/2005 – Dec/2020",
      location: "São Paulo",
      summary:
        "Digital transformation and operational restructuring of companies through accounting process automation, strategic financial management and team leadership. Acted as the bridge between business and technology, implementing solutions that reduced operating costs by 83% and released working capital for strategic investments.",
      highlights: [
        "Reduced the accounting closing cycle from 30 days to 5 days (83% faster) through the automation of manual processes.",
        "Saved R$ 200 thousand/year in operating costs and eliminated manual rework across multiple companies.",
        "Generated R$ 2 million in new investments through strategic capital allocation consulting.",
        "Reduced taxes by up to R$ 1 million annually through advanced tax planning and strategic accounting reclassification.",
        "Freed 20+ employees for higher-value activities through the automation of operational routines.",
        "Implemented remote work and real-time dashboards, increasing productivity and team satisfaction.",
        "Multiplied operational performance by 5x, allowing reallocation to complex issues and portfolio expansion.",
        "Integrated accounting systems with clients, automating information exchange and reducing manual errors by 95%.",
      ],
      caseStudies: [
        {
          title: "Accounting Closing Automation: From 30 to 5 Days",
          challenge:
            "Companies faced a 30-day accounting closing cycle, requiring intensive manual effort from 20+ employees, causing decision-making delays, late filing penalties and an inability to provide real-time financial reports to managers.",
          solution:
            "I developed and implemented an integrated accounting automation system with: (1) Direct API integration between client systems and the accounting platform, eliminating manual data entry; (2) Automated business rules for accounting classification based on history and patterns; (3) Real-time dashboards with critical financial indicators; (4) Automated approval workflows with intelligent notifications; (5) Dynamic financial spreadsheets with custom macros for specific client scenarios.",
          result:
            "83% reduction in closing time (30 → 5 days), 20 employees freed for strategic activities, annual savings of R$ 200 thousand in operating costs, elimination of 95% of manual errors, and increased client satisfaction with real-time reporting.",
          metrics: [
            { label: "Process Time Reduction", value: "30 days → 5 days", icon: "time" },
            { label: "Annual Cost Savings", value: "R$ 200,000", icon: "money" },
            { label: "Employees Reallocated", value: "20+ people", icon: "people" },
            { label: "Manual Error Reduction", value: "95%", icon: "performance" },
            { label: "Performance Multiplier", value: "5x", icon: "performance" },
          ],
        },
        {
          title: "Strategic Tax Planning: R$ 1 Million Savings",
          challenge:
            "Clients paid excessive taxes due to inadequate accounting classification, lack of knowledge about optimal tax regimes and the absence of strategic tax planning, resulting in competitive loss and reduced profit margins.",
          solution:
            "I implemented a deep accounting review methodology with: (1) Detailed analysis of all operations and strategic accounting reclassification; (2) Migration to more advantageous tax regimes (Actual Profit vs. Presumed); (3) Leverage of regional and sectoral tax benefits; (4) Structuring of operations for legal tax burden optimisation; (5) Continuous monitoring of legislative changes with proactive strategy adjustments.",
          result:
            "Accumulated savings of up to R$ 1 million in taxes per client/year, 8-12% net margin increase, significant improvement in market competitiveness, and resources freed for reinvestment in growth and innovation.",
          metrics: [
            { label: "Annual Tax Savings", value: "Up to R$ 1,000,000", icon: "money" },
            { label: "Net Margin Increase", value: "8-12%", icon: "money" },
            { label: "Benefited Clients", value: "Multiple", icon: "people" },
          ],
        },
        {
          title: "Investment Consulting: R$ 2 Million in Strategic Applications",
          challenge:
            "Companies kept idle capital in non-interest-bearing checking accounts, did not know suitable investment options for their risk profile and had no cash management policy, resulting in lost growth opportunities and financial fragility.",
          solution:
            "I structured a strategic financial management process with: (1) Complete cash flow and available capital diagnosis; (2) Investment policy definition aligned to the risk profile and liquidity needs; (3) Diversification into optimised financial applications (CDB, LCI/LCA, funds, treasury direct); (4) Long-term financial projections with optimistic, pessimistic and realistic scenarios; (5) Monthly follow-up meetings and portfolio rebalancing.",
          result:
            "Strategic allocation of R$ 2 million in high-yield investments, generation of additional financial revenue of 12-15% per year, strengthened working capital, and created reserve for strategic expansions and acquisitions.",
          metrics: [
            { label: "Capital Strategically Invested", value: "R$ 2,000,000", icon: "money" },
            { label: "Annual Yield Obtained", value: "12-15% p.a.", icon: "money" },
            { label: "Companies with Professional Management", value: "Multiple", icon: "people" },
          ],
        },
        {
          title: "Digital Transformation and Remote Work",
          challenge:
            "Teams stuck to manual processes, disconnected spreadsheets and fragmented communication, with low productivity, resistance to technological change and impossibility of remote work even for administrative functions.",
          solution:
            "I led complete digital transformation with: (1) Implementation of integrated cloud-based systems; (2) Creation of unified dashboards with real-time KPIs; (3) Automation of approval flows and notifications; (4) Intensive training in digital tools and new methodologies; (5) Establishment of a data-driven culture with metrics-based meetings; (6) Gradual implementation of remote work with collaboration tools.",
          result:
            "Complete operations modernisation, successful remote work implementation for administrative functions, 40% increase in team productivity, improved organisational climate, and talent attraction through the flexibility offered.",
          metrics: [
            { label: "Productivity Increase", value: "40%", icon: "performance" },
            { label: "Functions Converted to Remote", value: "Multiple areas", icon: "people" },
            { label: "Systems Implemented", value: "Integrated Cloud-based", icon: "performance" },
          ],
        },
      ],
      technologies: [
        "Integrated Accounting Systems",
        "Integration APIs",
        "Financial Dashboards",
        "Advanced Spreadsheets (Macros/VBA)",
        "Automation Tools",
        "Cloud Platforms",
        "ERP Management Systems",
      ],
      teamSize: 20,
      scope:
        "Multiple companies of different sizes and sectors, acting in accounting, tax, financial and people management consulting",
    },
  ],
  skillGroups: [
    { label: "Architecture & Backend", skills: ["C# (.NET Core)", "Java (Spring Boot)", "Node.js (NestJS)", "TypeScript", "Python", "Go", "Microservices", "API Gateway", "BFF", "CQRS", "Clean Arch", "DDD"] },
    { label: "Frontend & Performance", skills: ["React", "Next.js (RSC, SSR)", "Angular", "Flutter", "React Native", "Micro-frontends (Module Federation)", "Redux", "Zustand"] },
    { label: "Messaging & Resilience", skills: ["RabbitMQ (Topic Exchanges)", "Kafka (Partitioning)", "Circuit Breaker", "Retry", "Throttling", "Dead Letter Queues (DLQ)"] },
    { label: "Databases, Caches & AI", skills: ["PostgreSQL", "SQL Server", "ClickHouse", "Redis", "Query Tuning", "Sharding", "LLM Integration (OpenAI, Claude, Gemini)", "RAG"] },
    { label: "DevOps & SRE", skills: ["AWS", "Azure", "GCP", "K8s (Helm, HPA)", "Docker", "IaC (Terraform)", "CI/CD", "OpenTelemetry", "Datadog", "Grafana"] },
    { label: "Security & Testing", skills: ["TDD", "Cypress", "Playwright", "K6", "OAuth 2.0 (PKCE)", "OIDC", "JWT", "XSS/CSRF protection", "CSP", "CORS"] },
  ],
  education: [
    { title: "Bachelor's in Computer Engineering", institution: "UNIVESP", period: "2021–2025", description: "In-depth focus on computer architecture, artificial intelligence and advanced data structures, consolidating the theoretical foundation for scalable software development." },
    { title: "Bachelor's in Accounting", institution: "Estácio", period: "2017", description: "Full command of corporate accounting, governance and financial analysis. The strategic foundation responsible for the expertise in building systems oriented to high return on investment." },
    { title: "Master of Computer Applications (Full Stack)", institution: "Labenu", period: "2021", description: "Intensive technical immersion in the modern web ecosystem, with rigorous application of Clean Code, automated testing and component architecture in real-world scenarios." },
    { title: "CSx50 (Computer Science)", institution: "Harvard University", period: "2021", description: "Robust grounding in the fundamentals of computer science, algorithms and discrete mathematics, reinforcing the algorithmic resolution of complex problems." },
  ],
  languages: ["English · Professional", "Portuguese · Native"],
};
